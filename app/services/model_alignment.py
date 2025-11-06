import logging
from logging.handlers import RotatingFileHandler
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import partial

import asyncio
from datetime import datetime, timezone
from typing import Dict, Optional
from app.services.synthesis_legacy_service import SynthesisLegacyService
from app.services.evaluator_legacy_service import EvaluatorLegacyService
from app.models.request_models import SynthesisRequest, EvaluationRequest
from app.models.request_models import  ModelParameters
from app.services.aws_bedrock import get_bedrock_client
from app.core.model_handlers import create_handler
from app.core.database import DatabaseManager
from app.core.exceptions import APIError
import json

class ModelAlignment:
    """Service for aligning model outputs through synthesis and evaluation"""
    
    def __init__(self):
        self.synthesis_service = SynthesisLegacyService()
        self.evaluator_service = EvaluatorLegacyService()
        self.db = DatabaseManager()
        self.bedrock_client = get_bedrock_client()  # Add this line
        self._setup_logging()

    def _setup_logging(self):
        """Set up logging configuration"""
        os.makedirs('logs', exist_ok=True)
        
        self.logger = logging.getLogger('model_alignment')
        self.logger.setLevel(logging.INFO)
        
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        # File handler for general logs
        file_handler = RotatingFileHandler(
            'logs/model_alignment.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # File handler for errors
        error_handler = RotatingFileHandler(
            'logs/model_alignment_errors.log',
            maxBytes=10*1024*1024,
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        self.logger.addHandler(error_handler)

    async def alternate_result(
        self,
        synthesis_request,
    
    ) -> Dict:
        """
        Align model by running synthesis followed by evaluation
        
        Args:
            synthesis_request: Request parameters for synthesis
            evaluation_request: Request parameters for evaluation
            job_name: Optional job name for tracking
            is_demo: Whether this is a demo run
            
        Returns:
            Dictionary containing alignment results
        """
        try:
            self.logger.info(f"Starting model alignment process ")
            print("hi there")
            # Step 1: Generate results using synthesis service


            # Use default parameters if none provided
            model_params = synthesis_request.model_params or ModelParameters()
            
            # Create model handler
            self.logger.info("Creating model handler")
            model_handler = create_handler(synthesis_request.model_id, self.bedrock_client, model_params = model_params, inference_type = synthesis_request.inference_type, caii_endpoint =  synthesis_request.caii_endpoint, custom_p = True)

            path = synthesis_request.input_path
            inputs = []
            initial_response = []
            with open(path[0]) as f:
                data = json.load(f)
                inputs.extend(item.get(synthesis_request.output_key, '') for item in data)
                initial_response.extend(item.get(synthesis_request.output_value, '') for item in data)

            MAX_WORKERS = 5
            
            
            # Create thread pool
            print(MAX_WORKERS)
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                # Create futures for each input
                input_futures = [
                    loop.run_in_executor(
                        executor,
                        lambda x: asyncio.run(self.synthesis_service.process_single_input(x, model_handler, synthesis_request)),
                        input
                    )
                    for input in inputs
                ]
                
                # Wait for all futures to complete
                final_output = await asyncio.gather(*input_futures)
            

            result = [{
                            synthesis_request.output_key: item['question'],  
                            synthesis_request.output_value: init_resp,  
                            "Alternate_Completion": item['solution']
                        } for item, init_resp in zip(final_output, initial_response)]
            return result
        
        except Exception as e:
            error_msg = f"Model alignment failed: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            raise APIError(error_msg)

# Step 2: Update evaluation request with synthesis output

    async def evaluate_generation(self, result, output_key, output_value, evaluation_request
                                  ) -> Dict:
            
            model_params = evaluation_request.model_params or ModelParameters()
            
            self.logger.info(f"Creating model handler for model: {evaluation_request.model_id}")
            model_handler = create_handler(
                evaluation_request.model_id,
                self.bedrock_client,
                model_params=model_params,
                inference_type = evaluation_request.inference_type,
                caii_endpoint =  evaluation_request.caii_endpoint
            )


            qa_pairs =[]
            for item in result:
                qa_pair = {
                output_key: item.get(output_key, ''),  # Use get() with default value
                output_value: item.get(output_value, '')   # Use get() with default value
            }
                qa_pairs.append(qa_pair)
                
            with ThreadPoolExecutor(max_workers=4) as executor:
                try:
                    # Create list of futures for parallel execution
                    evaluated_pairs = []
                    failed_pairs = []
                    futures = [
                        executor.submit(
                            self.evaluator_service.evaluate_single_pair,
                            qa_pair=pair,
                            model_handler=model_handler,
                            request=evaluation_request
                        ) 
                        for pair in qa_pairs
                    ]
                    
                    # Process completed futures
                    for future in as_completed(futures):
                        try:
                            result = future.result()
                            evaluated_pairs.append(result)
                        except Exception as e:
                            error_msg = f"Error processing evaluation result: {str(e)}"
                            self.logger.error(error_msg)
                            failed_pairs.append({
                                "error": error_msg,
                                "pair": qa_pairs[futures.index(future)]  # Get original pair that failed
                            })
                    scores = [pair["evaluation"]["score"] for pair in evaluated_pairs if pair.get("evaluation", {}).get("score") is not None]  

                    return scores
                    
                except Exception as e:
                    error_msg = f"Error in parallel evaluation execution: {str(e)}"
                    self.logger.error(error_msg)
                    raise

    async def model_alignment(self,
        synthesis_request: SynthesisRequest,
        evaluation_request: EvaluationRequest,
        job_name: Optional[str] = None,
        is_demo: bool = True
    ) -> Dict:
            print("started")
            result = await self.alternate_result(synthesis_request)
            scores_initial = await self.evaluate_generation(result, 
                                synthesis_request.output_key, 
                                synthesis_request.output_value, evaluation_request)
            alt_output = "Alternate_Completion"
            synthesis_request.output_value = alt_output
            evaluation_request.output_value = alt_output
            scores_alternate = await self.evaluate_generation(result, 
                                                        synthesis_request.output_key, 
                                                        synthesis_request.output_value, evaluation_request)
            
            # Create aligned results
            dpo_data = []
            for idx, item in enumerate(result):
                # Get scores for this index
                initial_score = scores_initial[idx]
                alternate_score = scores_alternate[idx]
                
                # Determine chosen and rejected based on scores
                if initial_score > alternate_score:
                    chosen_response = item[synthesis_request.output_value]
                    rejected_response = item['Alternate_Completion']
                    chosen_score = initial_score
                    rejected_score = alternate_score
                else:
                    chosen_response = item['Alternate_Completion']
                    rejected_response = item[synthesis_request.output_value]
                    chosen_score = alternate_score
                    rejected_score = initial_score

                dpo_pair = {
                    "instruction": item[synthesis_request.output_key],
                    "chosen_response": chosen_response,
                    "rejected_response": rejected_response,
                    "chosen_rating": chosen_score,
                    "rejected_rating": rejected_score
                }
                
                dpo_data.append(dpo_pair)

            kto_data = []

# Create two entries for each aligned pair - one for chosen and one for rejected
            for item in dpo_data:
                # Entry for chosen response
                chosen_entry = {
                    "Prompt": item["instruction"],
                    "Completion": item["chosen_response"],
                    "Label": True,  # True for chosen response
                    "Rating": item["chosen_rating"]
                }
                kto_data.append(chosen_entry)
                
                # Entry for rejected response
                rejected_entry = {
                    "Prompt": item["instruction"],
                    "Completion": item["rejected_response"],
                    "Label": False,  # False for rejected response
                    "Rating": item["rejected_rating"]
                }
                kto_data.append(rejected_entry)

            return {"dpo": dpo_data, "kto":kto_data }
            
           
        