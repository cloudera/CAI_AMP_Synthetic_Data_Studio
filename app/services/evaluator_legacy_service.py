import boto3
from typing import Dict, List, Optional, Any
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from app.models.request_models import Example, ModelParameters, EvaluationRequest
from app.core.model_handlers import create_handler
from app.core.prompt_templates import PromptBuilder, PromptHandler
from app.services.aws_bedrock import get_bedrock_client
from app.core.database import DatabaseManager
from app.core.config import UseCase, Technique, get_model_family
from app.services.check_guardrail import ContentGuardrail
from app.core.exceptions import APIError, InvalidModelError, ModelHandlerError
import os
from datetime import datetime, timezone
import json
import logging
from logging.handlers import RotatingFileHandler
from app.core.telemetry_integration import track_llm_operation
from functools import partial

class EvaluatorLegacyService:
    """Legacy service for evaluating generated QA pairs using Claude with parallel processing (SFT and Custom_Workflow only)"""
    
    def __init__(self, max_workers: int = 4):
        self.bedrock_client = get_bedrock_client()
        self.db = DatabaseManager()
        self.max_workers = max_workers  # Default max workers (configurable via request)
        self.guard = ContentGuardrail()
        self._setup_logging()

    def _setup_logging(self):
        """Set up logging configuration"""
        os.makedirs('logs', exist_ok=True)
        
        self.logger = logging.getLogger('evaluator_legacy_service')
        self.logger.setLevel(logging.INFO)
        
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        # File handler for general logs
        file_handler = RotatingFileHandler(
            'logs/evaluator_legacy_service.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # File handler for errors
        error_handler = RotatingFileHandler(
            'logs/evaluator_legacy_service_errors.log',
            maxBytes=10*1024*1024,
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        self.logger.addHandler(error_handler)

    
    #@track_llm_operation("evaluate_single_pair")
    def evaluate_single_pair(self, qa_pair: Dict, model_handler, request: EvaluationRequest, request_id=None) -> Dict:
        """Evaluate a single QA pair"""
        try:
            # Default error response
            error_response = {
                request.output_key: qa_pair.get(request.output_key, "Unknown"),
                request.output_value: qa_pair.get(request.output_value, "Unknown"),
                "evaluation": {
                    "score": 0,
                    "justification": "Error during evaluation"
                }
            }

            try:
                self.logger.info(f"Evaluating QA pair: {qa_pair.get(request.output_key, '')[:50]}...")
            except Exception as e:
                self.logger.error(f"Error logging QA pair: {str(e)}")

            try:
                # Validate input qa_pair structure
                if not all(key in qa_pair for key in [request.output_key, request.output_value]):
                    error_msg = "Missing required keys in qa_pair"
                    self.logger.error(error_msg)
                    error_response["evaluation"]["justification"] = error_msg
                    return error_response

                prompt = PromptBuilder.build_eval_prompt(
                    request.model_id,
                    request.use_case,
                    qa_pair[request.output_key],
                    qa_pair[request.output_value],
                    request.examples,
                    request.custom_prompt
                )
                #print(prompt)
            except Exception as e:
                error_msg = f"Error building evaluation prompt: {str(e)}"
                self.logger.error(error_msg)
                error_response["evaluation"]["justification"] = error_msg
                return error_response

            try:
                response = model_handler.generate_response(prompt, request_id=request_id)
            except ModelHandlerError as e:
                self.logger.error(f"ModelHandlerError in generate_response: {str(e)}")
                raise  
            except Exception as e:
                error_msg = f"Error generating model response: {str(e)}"
                self.logger.error(error_msg)
                error_response["evaluation"]["justification"] = error_msg
                return error_response

            if not response:
                error_msg = "Failed to parse model response"
                self.logger.warning(error_msg)
                error_response["evaluation"]["justification"] = error_msg
                return error_response

            try:
                score = response[0].get('score', "no score key")
                justification = response[0].get('justification', 'No justification provided')
                if score== "no score key":
                    self.logger.info(f"Unsuccessful QA pair evaluation with score: {score}")
                    justification = "The evaluated pair did not generate valid score and justification"
                    score = 0
                else:
                    self.logger.info(f"Successfully evaluated QA pair with score: {score}")
                
                return {
                    "question": qa_pair[request.output_key],
                    "solution": qa_pair[request.output_value],
                    "evaluation": {
                        "score": score,
                        "justification": justification
                    }
                }
            except Exception as e:
                error_msg = f"Error processing model response: {str(e)}"
                self.logger.error(error_msg)
                error_response["evaluation"]["justification"] = error_msg
                return error_response
            
        except ModelHandlerError:
            raise 
        except Exception as e:
            self.logger.error(f"Critical error in evaluate_single_pair: {str(e)}")
            return error_response
        
    #@track_llm_operation("evaluate_topic")
    def evaluate_topic(self, topic: str, qa_pairs: List[Dict], model_handler, request: EvaluationRequest, request_id=None) -> Dict:
        """Evaluate all QA pairs for a given topic in parallel"""
        try:
            self.logger.info(f"Starting evaluation for topic: {topic} with {len(qa_pairs)} QA pairs")
            evaluated_pairs = []
            failed_pairs = []

            try:
                max_workers = request.max_workers or self.max_workers
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    try:
                        evaluate_func = partial(
                            self.evaluate_single_pair,
                            model_handler=model_handler,
                            request=request, request_id=request_id
                        )
                        
                        future_to_pair = {
                            executor.submit(evaluate_func, pair): pair 
                            for pair in qa_pairs
                        }
                        
                        for future in as_completed(future_to_pair):
                            try:
                                result = future.result()
                                evaluated_pairs.append(result)
                            except ModelHandlerError:
                                raise  
                            except Exception as e:
                                error_msg = f"Error processing future result: {str(e)}"
                                self.logger.error(error_msg)
                                failed_pairs.append({
                                    "error": error_msg,
                                    "pair": future_to_pair[future]
                                })
                                
                    except Exception as e:
                        error_msg = f"Error in parallel execution: {str(e)}"
                        self.logger.error(error_msg)
                        raise

            except ModelHandlerError:
                raise              
            except Exception as e:
                error_msg = f"Error in ThreadPoolExecutor setup: {str(e)}"
                self.logger.error(error_msg)
                raise

            try:
                # Calculate statistics only from successful evaluations
                scores = [pair["evaluation"]["score"] for pair in evaluated_pairs if pair.get("evaluation", {}).get("score") is not None]
                
                if scores:
                    average_score = sum(scores) / len(scores)
                    average_score = round(average_score, 2)
                    min_score = min(scores)
                    max_score = max(scores)
                else:
                    average_score = min_score = max_score = 0

                topic_stats = {
                    "average_score": average_score,
                    "min_score": min_score,
                    "max_score": max_score,
                    "evaluated_pairs": evaluated_pairs,
                    "failed_pairs": failed_pairs,
                    "total_evaluated": len(evaluated_pairs),
                    "total_failed": len(failed_pairs)
                }
                
                self.logger.info(f"Completed evaluation for topic: {topic}. Average score: {topic_stats['average_score']:.2f}")
                return topic_stats

            except Exception as e:
                error_msg = f"Error calculating topic statistics: {str(e)}"
                self.logger.error(error_msg)
                return {
                    "average_score": 0,
                    "min_score": 0,
                    "max_score": 0,
                    "evaluated_pairs": evaluated_pairs,
                    "failed_pairs": failed_pairs,
                    "error": error_msg
                }
        except ModelHandlerError:
            raise  
        except Exception as e:
            error_msg = f"Critical error in evaluate_topic: {str(e)}"
            self.logger.error(error_msg)
            return {
                "average_score": 0,
                "min_score": 0,
                "max_score": 0,
                "evaluated_pairs": [],
                "failed_pairs": [],
                "error": error_msg
            }
    
    #@track_llm_operation("evaluate_results")
    def evaluate_results(self, request: EvaluationRequest, job_name=None,is_demo: bool = True, request_id=None) -> Dict:
        """Evaluate all QA pairs with parallel processing"""
        try:
            self.logger.info(f"Starting evaluation process - Demo Mode: {is_demo}")
            
            model_params = request.model_params or ModelParameters()
            
            self.logger.info(f"Creating model handler for model: {request.model_id}")
            model_handler = create_handler(
                request.model_id,
                self.bedrock_client,
                model_params=model_params,
                inference_type = request.inference_type,
                caii_endpoint =  request.caii_endpoint
            )
            
            self.logger.info(f"Loading QA pairs from: {request.import_path}")
            with open(request.import_path, 'r') as file:
                data = json.load(file)
            
            evaluated_results = {}
            all_scores = []

            transformed_data = {
                            "results": {},
                           }
            for item in data:
                topic = item.get('Seeds')
                
                # Create topic list if it doesn't exist
                if topic not in transformed_data['results']:
                    transformed_data['results'][topic] = []
                    
                # Create QA pair
                qa_pair = {
                request.output_key: item.get(request.output_key, ''),  # Use get() with default value
                request.output_value: item.get(request.output_value, '')   # Use get() with default value
            }
                
                # Add to appropriate topic list
                transformed_data['results'][topic].append(qa_pair)
            
            max_workers = request.max_workers or self.max_workers
            self.logger.info(f"Processing {len(transformed_data['results'])} topics with {max_workers} workers")
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_topic = {
                    executor.submit(
                        self.evaluate_topic,
                        topic,
                        qa_pairs,
                        model_handler,
                        request, request_id=request_id
                    ): topic
                    for topic, qa_pairs in transformed_data['results'].items()
                }
                
                for future in as_completed(future_to_topic):
                    try:
                        topic = future_to_topic[future]
                        topic_stats = future.result()
                        evaluated_results[topic] = topic_stats
                        all_scores.extend([
                            pair["evaluation"]["score"] 
                            for pair in topic_stats["evaluated_pairs"]
                        ])
                    except ModelHandlerError as e:
                        self.logger.error(f"ModelHandlerError in future processing: {str(e)}")
                        raise APIError(f"Model evaluation failed: {str(e)}")

            
            overall_average = sum(all_scores) / len(all_scores) if all_scores else 0
            overall_average = round(overall_average, 2)
            evaluated_results['Overall_Average'] = overall_average
            
            self.logger.info(f"Evaluation completed. Overall average score: {overall_average:.2f}")
            
            
            timestamp = datetime.now(timezone.utc).isoformat()
            time_file = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')[:-3] 
            model_name = get_model_family(request.model_id).split('.')[-1]
            output_path = f"qa_pairs_{model_name}_{time_file}_evaluated.json"
            
            self.logger.info(f"Saving evaluation results to: {output_path}")
            with open(output_path, 'w') as f:
                json.dump(evaluated_results, f, indent=2)
            
            custom_prompt_str = PromptHandler.get_default_custom_eval_prompt(
                request.use_case, 
                request.custom_prompt
            )
            

            examples_value = (
            PromptHandler.get_default_eval_example(request.use_case, request.examples) 
            if hasattr(request, 'examples') 
            else None
        )
            examples_str = self.safe_json_dumps(examples_value)
            #print(examples_value, '\n',examples_str)
            
            metadata = {
                'timestamp': timestamp,
                'model_id': request.model_id,
                'inference_type': request.inference_type,
                'caii_endpoint':request.caii_endpoint,
                'use_case': request.use_case,
                'custom_prompt': custom_prompt_str,
                'model_parameters': json.dumps(model_params.model_dump()) if model_params else None,
                'generate_file_name': os.path.basename(request.import_path),
                'evaluate_file_name': os.path.basename(output_path),
                'display_name': request.display_name,
                'local_export_path': output_path,
                'examples': examples_str,
                'Overall_Average': overall_average
            }
            
            self.logger.info("Saving evaluation metadata to database")
            
            
            if is_demo:
                self.db.save_evaluation_metadata(metadata)
                return {
                    "status": "completed",
                    "result": evaluated_results,
                    "output_path": output_path
                }
            else:

                
                job_status = "ENGINE_SUCCEEDED"
                evaluate_file_name = os.path.basename(output_path)
                self.db.update_job_evaluate(job_name, evaluate_file_name, output_path, timestamp, overall_average, job_status)
                self.db.backup_and_restore_db()
                return {
                    "status": "completed",
                    "output_path": output_path
                }
        except APIError:
            raise   
        except ModelHandlerError as e:
            # Add this specific handler
            self.logger.error(f"ModelHandlerError in evaluation: {str(e)}")
            raise APIError(str(e))   
        except Exception as e:
            error_msg = f"Error in evaluation process: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            if is_demo:
                raise APIError(str(e))
            else:
                time_stamp = datetime.now(timezone.utc).isoformat()
                job_status = "ENGINE_FAILED"
                file_name = ''
                output_path = ''
                overall_average = ''
                self.db.update_job_evaluate(job_name,file_name, output_path, time_stamp, job_status)
                
                raise

    def safe_json_dumps(self, value):
        """Convert value to JSON string only if it's not None"""
        return json.dumps(value) if value is not None else None
