import boto3
import json
import uuid
import time
import csv
from typing import List, Dict, Optional, Tuple
import uuid
from datetime import datetime, timezone
import os
from huggingface_hub import HfApi, HfFolder, Repository
from concurrent.futures import ThreadPoolExecutor
from functools import partial
import math
import asyncio
from fastapi import FastAPI, BackgroundTasks, HTTPException
from app.core.exceptions import APIError, InvalidModelError, ModelHandlerError, JSONParsingError
from app.core.data_loader import DataLoader
import pandas as pd
import numpy as np

from app.models.request_models import SynthesisRequest, Example, ModelParameters
from app.core.model_handlers import create_handler
from app.core.prompt_templates import PromptBuilder, PromptHandler
from app.core.config import UseCase, Technique, get_model_family
from app.services.aws_bedrock import get_bedrock_client
from app.core.database import DatabaseManager
from app.services.check_guardrail import ContentGuardrail
from app.services.doc_extraction import DocumentProcessor
import logging
from logging.handlers import RotatingFileHandler
import traceback
from app.core.telemetry_integration import track_llm_operation
import uuid 


class SynthesisService:
    """Service for generating synthetic freeform data (Freeform technique only)"""
    QUESTIONS_PER_BATCH = 5  # Maximum questions per batch
    MAX_CONCURRENT_TOPICS = 5  # Limit concurrent I/O operations


    def __init__(self):
        self.bedrock_client = get_bedrock_client()
        self.db = DatabaseManager() 
        self._setup_logging()
        self.guard = ContentGuardrail()


    def _setup_logging(self):
        """Set up logging configuration"""
        os.makedirs('logs', exist_ok=True)
        
        self.logger = logging.getLogger('synthesis_service')
        self.logger.setLevel(logging.INFO)
        
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        # File handler for general logs
        file_handler = RotatingFileHandler(
            'logs/synthesis_service.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # File handler for errors
        error_handler = RotatingFileHandler(
            'logs/synthesis_service_errors.log',
            maxBytes=10*1024*1024,
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        self.logger.addHandler(error_handler)

    #@track_llm_operation("process_single_freeform") 
    def process_single_freeform(self, topic: str, model_handler: any, request: SynthesisRequest, num_questions: int, request_id=None) -> Tuple[str, List[Dict], List[str], List[Dict]]:
        """
        Process a single topic to generate freeform data.
        Attempts batch processing first (default batch size), falls back to single item processing if batch fails.
        
        Args:
            topic: The topic to generate freeform data for
            model_handler: Handler for the AI model
            request: The synthesis request object
            num_questions: Total number of data items to generate
        
        Returns:
            Tuple containing:
            - topic (str)
            - list of generated data items
            - list of error messages
            - list of output dictionaries with topic information
        """
        topic_results = []
        topic_output = []
        topic_errors = []
        questions_remaining = num_questions
        omit_questions = []
        
        try:
            # Process data in batches
            for batch_idx in range(0, num_questions, self.QUESTIONS_PER_BATCH):
                if questions_remaining <= 0:
                    break
                    
                batch_size = min(self.QUESTIONS_PER_BATCH, questions_remaining)
                self.logger.info(f"Processing topic: {topic}, attempting batch {batch_idx+1}-{batch_idx+batch_size}")
                
                try:
                    # Attempt batch processing
                    prompt = PromptBuilder.build_freeform_prompt(
                        model_id=request.model_id,
                        use_case=request.use_case,
                        topic=topic,
                        num_questions=batch_size,
                        omit_questions=omit_questions,
                        example_custom=request.example_custom or [],
                        example_path=request.example_path,
                        custom_prompt=request.custom_prompt,
                        schema=request.schema,
                    )
                    #print(prompt)
                    batch_items = None
                    try:
                        batch_items = model_handler.generate_response(prompt, request_id=request_id)
                    except ModelHandlerError as e:
                        self.logger.warning(f"Batch processing failed: {str(e)}")
                        if isinstance(e, JSONParsingError):
                            # For JSON parsing errors, fall back to single processing
                            self.logger.info("JSON parsing failed, falling back to single processing")
                            continue
                        else:
                            # Don't raise - add to errors and continue
                            error_msg = f"ModelHandlerError in batch processing for topic {topic}: {str(e)}"
                            self.logger.error(error_msg)
                            topic_errors.append(error_msg)
                            continue
                    
                    if batch_items:
                        # Process batch results
                        valid_items = []
                        valid_outputs = []
                        invalid_count = 0
                        
                        for item in batch_items:
                            if self._validate_freeform_item(item):
                                valid_items.append(item)
                                
                                # Create a new dict with Topic field added
                                output_item = {"Topic": topic}
                                output_item.update(item)
                                valid_outputs.append(output_item)
                                
                                # Initialize item_identifier variable
                                item_identifier = None 
                                    # First try the specific potential keys
                                for potential_key in ["id", "name", "title", "question", "prompt", "key"]:
                                    if potential_key in item and isinstance(item[potential_key], str):
                                        #item_identifier = item[potential_key]
                                        item_identifier = f"{potential_key} : {item[potential_key]} "
                                        break
                                
                                # If no suitable identifier found among preferred keys, look for any string value
                                if not item_identifier:
                                    for key, value in item.items():
                                        if isinstance(value, str) and value.strip():  # Check for non-empty string
                                            #item_identifier = value
                                            item_identifier = f"{key} : {value} "
                                            break
                                
                                # If still no string value found, use a blank string
                                if not item_identifier:
                                    item_identifier = ""
                                        
                                omit_questions.append(item_identifier)
                        #print("topic :", topic, '\n',omit_questions)        
                            
                        invalid_count = batch_size - len(valid_items)
                        
                        if valid_items:
                            topic_results.extend(valid_items)
                            topic_output.extend(valid_outputs)
                            questions_remaining -= len(valid_items)
                            omit_questions = omit_questions[-100:]  # Keep last 100 items
                            self.logger.info(f"Successfully generated {len(valid_items)} items in batch for topic {topic}")
                        
                        print("invalid_count:", invalid_count, '\n', "batch_size: ", batch_size, '\n', "valid_items: ", len(valid_items))
                        # If all items were valid, skip fallback
                        if invalid_count <= 0:
                            continue
                    
                        # Fall back to single processing for remaining or failed items
                        self.logger.info(f"Falling back to single processing for remaining items in topic {topic}")
                        remaining_batch = invalid_count
                        print("remaining_batch:", remaining_batch, '\n', "batch_size: ", batch_size, '\n', "valid_items: ", len(valid_items))
                        
                        for _ in range(remaining_batch):
                            if questions_remaining <= 0:
                                break
                                
                            try:
                                # Single item processing
                                prompt = PromptBuilder.build_freeform_prompt(
                                     model_id=request.model_id,
                                        use_case=request.use_case,
                                        topic=topic,
                                        num_questions=batch_size,
                                        omit_questions=omit_questions,
                                        example_custom=request.example_custom or [],
                                        example_path=request.example_path,
                                        custom_prompt=request.custom_prompt,
                                        schema=request.schema,
                                )
                                
                                try:
                                    single_items = model_handler.generate_response(prompt, request_id=request_id)
                                except ModelHandlerError as e:
                                    self.logger.warning(f"Single processing failed: {str(e)}")
                                    if isinstance(e, JSONParsingError):
                                        self.logger.info("JSON parsing failed in single processing")
                                        continue
                                    else:
                                        # Don't raise - add to errors and continue
                                        error_msg = f"ModelHandlerError in single processing for topic {topic}: {str(e)}"
                                        self.logger.error(error_msg)
                                        topic_errors.append(error_msg)
                                        continue
                                
                                if single_items and len(single_items) > 0:
                                    item = single_items[0]
                                    if self._validate_freeform_item(item):
                                        # Create a new dict with Topic field added
                                        output_item = {"Topic": topic}
                                        output_item.update(item)
                                        
                                        topic_results.append(item)
                                        topic_output.append(output_item)
                                        
                                        # Initialize item_identifier variable
                                        item_identifier = None 
                                       # First try the specific potential keys
                                        for potential_key in ["id", "name", "title", "question", "prompt", "key"]:
                                            if potential_key in item and isinstance(item[potential_key], str):
                                                #item_identifier = item[potential_key]
                                                item_identifier = f"{potential_key} : {item[potential_key]} "
                                                break
                                        
                                        # If no suitable identifier found among preferred keys, look for any string value
                                        if not item_identifier:
                                            for key, value in item.items():
                                                if isinstance(value, str) and value.strip():  # Check for non-empty string
                                                    #item_identifier = value
                                                    item_identifier = f"{key} : {value} "
                                                    break
                                        
                                        # If still no string value found, use a blank string
                                        if not item_identifier:
                                            item_identifier = ""
                                                
                                        omit_questions.append(item_identifier)
                                        omit_questions = omit_questions[-100:]
                                        
                                        questions_remaining -= 1
                                        self.logger.info(f"Successfully generated single item for topic {topic}")
                                    else:
                                        error_msg = f"Invalid item structure in single processing for topic {topic}"
                                        self.logger.warning(error_msg)
                                        topic_errors.append(error_msg)
                                else:
                                    error_msg = f"No item generated in single processing for topic {topic}"
                                    self.logger.warning(error_msg)
                                    topic_errors.append(error_msg)
                                    
                            except ModelHandlerError as e:
                                # Don't raise - add to errors and continue
                                error_msg = f"ModelHandlerError in single processing for topic {topic}: {str(e)}"
                                self.logger.error(error_msg)
                                topic_errors.append(error_msg)
                                continue
                                
                except ModelHandlerError as e:
                    # Don't raise - add to errors and continue
                    error_msg = f"ModelHandlerError in batch processing for topic {topic}: {str(e)}"
                    self.logger.error(error_msg)
                    topic_errors.append(error_msg)
                    continue
                except Exception as e:
                    error_msg = f"Error processing batch for topic {topic}: {str(e)}"
                    self.logger.error(error_msg)
                    topic_errors.append(error_msg)
                    continue
                    
        except ModelHandlerError as e:
            # Don't raise - add to errors and return partial results
            error_msg = f"ModelHandlerError in topic {topic}: {str(e)}"
            self.logger.error(error_msg)
            topic_errors.append(error_msg)
            
        except Exception as e:
            # Don't raise - add to errors and return partial results  
            error_msg = f"Error processing topic {topic}: {str(e)}"
            self.logger.error(error_msg)
            topic_errors.append(error_msg)
            
        return topic, topic_results, topic_errors, topic_output

    def _validate_freeform_item(self, item: Dict) -> bool:
        """
        Validate a freeform data item.
        For freeform data, we just check that it's a non-empty dictionary.
        """
        return isinstance(item, dict) and len(item) > 0

    async def generate_freeform(self, request: SynthesisRequest, job_name=None, is_demo: bool = True, request_id=None) -> Dict:
        """Generate freeform data based on request parameters"""
        try:
            output_key = request.output_key 
            output_value = request.output_value
            st = time.time()
            self.logger.info(f"Starting freeform data generation - Demo Mode: {is_demo}")
            
            # Use default parameters if none provided
            model_params = request.model_params or ModelParameters()
            
            # Create model handler
            self.logger.info("Creating model handler")
            model_handler = create_handler(
                request.model_id, 
                self.bedrock_client, 
                model_params=model_params, 
                inference_type=request.inference_type, 
                caii_endpoint=request.caii_endpoint
            )

            # Handle topics from documents or direct topics
            if request.doc_paths:
                processor = DocumentProcessor(chunk_size=1000, overlap=100)
                paths = request.doc_paths
                topics = []
                for path in paths:
                    chunks = processor.process_document(path)
                    topics.extend(chunks)
                
                print("total chunks: ", len(topics))
                if request.num_questions <= len(topics):
                    topics = topics[0:request.num_questions]
                    num_questions = 1
                    print("num_questions :", num_questions)
                else:
                    num_questions = math.ceil(request.num_questions/len(topics))
                
                total_count = request.num_questions
            else:
                if request.topics:
                    topics = request.topics
                    num_questions = request.num_questions
                    total_count = request.num_questions * len(request.topics)
                else:
                    self.logger.error("Generation failed: No topics provided")
                    raise RuntimeError("Invalid input: No topics provided")

            # Track results for each topic
            results = {}
            all_errors = []
            final_output = []
            
            # Create thread pool
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor(max_workers=self.MAX_CONCURRENT_TOPICS) as executor:
                topic_futures = [
                    loop.run_in_executor(
                        executor,
                        self.process_single_freeform,
                        topic,
                        model_handler,
                        request,
                        num_questions, request_id
                    )
                    for topic in topics
                ]
                
                # Wait for all futures to complete (no exceptions now since process_single_freeform doesn't raise)
                completed_topics = await asyncio.gather(*topic_futures)

            # Process results
            for topic, topic_results, topic_errors, topic_output in completed_topics:
                if topic_errors:
                    all_errors.extend(topic_errors)
                if topic_results and is_demo:
                    results[topic] = topic_results
                if topic_output:
                    final_output.extend(topic_output)

            generation_time = time.time() - st
            self.logger.info(f"Generation completed in {generation_time:.2f} seconds")

            # Initialize variables outside conditional blocks to fix scope issues
            timestamp = datetime.now(timezone.utc).isoformat()
            time_file = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')[:-3] 
            mode_suffix = "test" if is_demo else "final"
            model_name = get_model_family(request.model_id).split('.')[-1]
            file_path = f"freeform_data_{model_name}_{time_file}_{mode_suffix}.json"
            
            # Save partial results if we have any data
            if final_output:
                # Transform output
                if request.doc_paths:
                    final_output = [{'Generated_From': item['Topic'], **{k: v for k, v in item.items() if k != 'Topic'}} for item in final_output]
                else:
                    final_output = [{'Seeds': item['Topic'], **{k: v for k, v in item.items() if k != 'Topic'}} for item in final_output]
                
                with open(file_path, "w") as f:
                    json.dump(final_output, indent=2, fp=f)
                self.logger.info(f"Saved {len(final_output)} results to {file_path}")

            # Find the first critical model error message
            first_critical_error = None
            for _, _, topic_errors, _ in completed_topics:
                if topic_errors:
                    for error in topic_errors:
                        if "ModelHandlerError" in error:
                            first_critical_error = error
                            break
                    if first_critical_error:
                        break

            # After saving (or if no data), check for critical errors
            if first_critical_error:
                if final_output:
                    self.logger.info(f"Saved {len(final_output)} results before failing due to model errors")
                else:
                    self.logger.info("No results to save before failing due to model errors")
                raise APIError(first_critical_error)

            # Handle custom prompt, examples and schema
            custom_prompt_str = PromptHandler.get_default_custom_prompt(request.use_case, request.custom_prompt)
            
            # For examples
            if request.example_path:
                try:
                    # Use DataLoader to load the file, limiting to 10 rows
                    df = DataLoader.load(request.example_path, sample_rows=10)
                    
                    # Convert DataFrame to list of dictionaries
                    example_upload = df.head(10).to_dict(orient='records')
                    
                    # Handle non-serializable objects
                    def json_serializable(obj):
                        if isinstance(obj, (pd.Timestamp, np.datetime64)):
                            return obj.isoformat()
                        elif isinstance(obj, np.integer):
                            return int(obj)
                        elif isinstance(obj, np.floating):
                            return float(obj)
                        elif isinstance(obj, np.ndarray):
                            return obj.tolist()
                        else:
                            return str(obj)
                    
                    # Convert to JSON string with custom serialization
                    examples_str = json.dumps(example_upload, indent=2, default=json_serializable)
                    
                except Exception as e:
                    print(f"Error processing example file: {str(e)}")
                    examples_str = ""
            else:
                examples_value = request.example_custom if hasattr(request, 'example_custom') else None
                examples_str = self.safe_json_dumps(examples_value)

            # For topics
            topics_value = topics if not getattr(request, 'doc_paths', None) else None
            topic_str = self.safe_json_dumps(topics_value)

            # For doc_paths and input_path
            doc_paths_str = self.safe_json_dumps(getattr(request, 'doc_paths', None))
            input_path_str = self.safe_json_dumps(getattr(request, 'input_path', None))

             # For schema
            schema_value = (
                PromptHandler.get_default_schema(request.use_case, request.schema)
                if hasattr(request, 'schema') 
                else None
            )
            schema_str = self.safe_json_dumps(schema_value)
        
            metadata = {
                'timestamp': timestamp,
                'technique': request.technique,
                'model_id': request.model_id,
                'inference_type': request.inference_type,
                'caii_endpoint': request.caii_endpoint,
                'use_case': request.use_case,
                'final_prompt': custom_prompt_str,
                'model_parameters': json.dumps(model_params.model_dump()) if model_params else None,
                'generate_file_name': os.path.basename(file_path),
                'display_name': request.display_name,
                'output_path': {'local': file_path},
                'num_questions': getattr(request, 'num_questions', None),
                'topics': topic_str,
                'examples': examples_str,
                "total_count": total_count,
                'schema': schema_str,
                'doc_paths': doc_paths_str,
                'input_path': input_path_str,
                'input_key': request.input_key,
                'output_key': request.output_key,
                'output_value': request.output_value,
                'completed_rows': len(final_output) if final_output else 0
            }
            
            if is_demo:
                self.db.save_generation_metadata(metadata)
                return {
                    "status": "completed" if results else "failed",
                    "results": results,
                    "errors": all_errors if all_errors else None,
                    "export_path": {'local': file_path}
                }
            else:
                job_status = "ENGINE_SUCCEEDED" if final_output else "ENGINE_FAILED"
                generate_file_name = os.path.basename(file_path) if final_output else ''
                final_output_path = file_path if final_output else ''
                
                self.db.update_job_generate(job_name, generate_file_name, final_output_path, timestamp, job_status, len(final_output) if final_output else 0)
                self.db.backup_and_restore_db()
                return {
                    "status": "completed" if final_output else "failed",
                    "export_path": {'local': file_path}
                }
        except APIError:
            raise
            
        except Exception as e:
            # Initialize variables for exception handling if they don't exist
            if 'timestamp' not in locals():
                timestamp = datetime.now(timezone.utc).isoformat()
            if 'time_file' not in locals():
                time_file = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')[:-3] 
            if 'mode_suffix' not in locals():
                mode_suffix = "test" if is_demo else "final"
            if 'model_name' not in locals():
                model_name = get_model_family(request.model_id).split('.')[-1]
            if 'file_path' not in locals():
                file_path = f"freeform_data_{model_name}_{time_file}_{mode_suffix}.json"
            
            # Try to save partial results if any exist before failing
            saved_partial_results = False
            if 'final_output' in locals() and final_output:
                try:
                    # Transform output
                    if request.doc_paths:
                        final_output = [{'Generated_From': item['Topic'], **{k: v for k, v in item.items() if k != 'Topic'}} for item in final_output]
                    else:
                        final_output = [{'Seeds': item['Topic'], **{k: v for k, v in item.items() if k != 'Topic'}} for item in final_output]
                    
                    with open(file_path, "w") as f:
                        json.dump(final_output, indent=2, fp=f)
                    saved_partial_results = True
                    self.logger.info(f"Saved {len(final_output)} partial results to {file_path} before failing")
                except Exception as save_error:
                    self.logger.error(f"Failed to save partial results: {str(save_error)}")
            
            # Continue with original error handling
            self.logger.error(f"Generation failed: {str(e)}", exc_info=True)
            if is_demo:
                raise APIError(str(e))
            else:
                job_status = "ENGINE_FAILED"
                if saved_partial_results:
                    # Update with actual file information for partial results
                    generate_file_name = os.path.basename(file_path)
                    final_output_path = file_path   
                    completed_rows = len(final_output) if final_output else 0
                else:
                    # No results saved, use empty values
                    generate_file_name = ''
                    final_output_path = ''
                    completed_rows = 0
                self.db.update_job_generate(job_name, generate_file_name, final_output_path, timestamp, job_status, completed_rows = completed_rows )
                raise

    def get_health_check(self) -> Dict:
        """Get service health status"""
        try:
            test_body = {
                "prompt": "\n\nHuman: test\n\nAssistant: ",
                "max_tokens_to_sample": 1,
                "temperature": 0
            }
            
            self.bedrock_client.invoke_model(
                modelId="anthropic.claude-instant-v1",
                body=json.dumps(test_body)
            )

            status = {
                "status": "healthy",
                "timestamp": datetime.now().isoformat(),
                "service": "SynthesisService",
                "aws_region": self.bedrock_client.meta.region_name
            }
            self.logger.info("Health check passed", extra=status)
            return status

        except Exception as e:
            status = {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "service": "SynthesisService",
                "aws_region": self.bedrock_client.meta.region_name
            }
            self.logger.error("Health check failed", extra=status, exc_info=True)
            return status
        
    def safe_json_dumps(self, value):
        """Convert value to JSON string only if it's not None"""
        return json.dumps(value) if value is not None else None
