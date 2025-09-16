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

class EvaluatorService:
    """Service for evaluating freeform data rows using Claude with parallel processing (Freeform technique only)"""
    
    def __init__(self, max_workers: int = 5):
        self.bedrock_client = get_bedrock_client()
        self.db = DatabaseManager()
        self.max_workers = max_workers  # Default max workers (configurable via request)
        self.guard = ContentGuardrail()
        self._setup_logging()

    def _setup_logging(self):
        """Set up logging configuration"""
        os.makedirs('logs', exist_ok=True)
        
        self.logger = logging.getLogger('evaluator_service')
        self.logger.setLevel(logging.INFO)
        
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        
        # File handler for general logs
        file_handler = RotatingFileHandler(
            'logs/evaluator_service.log',
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # File handler for errors
        error_handler = RotatingFileHandler(
            'logs/evaluator_service_errors.log',
            maxBytes=10*1024*1024,
            backupCount=5
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        self.logger.addHandler(error_handler)

    def evaluate_single_row(self, row: Dict[str, Any], model_handler, request: EvaluationRequest, request_id = None) -> Dict:
        """Evaluate a single data row"""
        try:
            # Default error response
            error_response = {
                "row": row,
                "evaluation": {
                    "score": 0,
                    "justification": "Error during evaluation"
                }
            }

            try:
                self.logger.info(f"Evaluating row data...")
            except Exception as e:
                self.logger.error(f"Error logging row data: {str(e)}")

            try:
                # Build prompt for row evaluation
                prompt = PromptBuilder.build_freeform_eval_prompt(
                    request.model_id,
                    request.use_case,
                    row,
                    request.examples,
                    request.custom_prompt
                )
            except Exception as e:
                error_msg = f"Error building row evaluation prompt: {str(e)}"
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
                if score == "no score key":
                    self.logger.info(f"Unsuccessful row evaluation with score: {score}")
                    justification = "The evaluated row did not generate valid score and justification"
                    score = 0
                else:
                    self.logger.info(f"Successfully evaluated row with score: {score}")
                
                return {
                    "row": row,
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
            self.logger.error(f"Critical error in evaluate_single_row: {str(e)}")
            return error_response
        
    #@track_llm_operation("evaluate_all_rows")
    def evaluate_rows(self, rows: List[Dict[str, Any]], model_handler, request: EvaluationRequest, request_id=None) -> Dict:
        """Evaluate all data rows in parallel"""
        try:
            self.logger.info(f"Starting row evaluation with {len(rows)} rows")
            evaluated_rows = []
            failed_rows = []

            try:
                max_workers = request.max_workers or self.max_workers
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    try:
                        evaluate_func = partial(
                            self.evaluate_single_row,
                            model_handler=model_handler,
                            request=request, request_id=request_id
                        )
                        
                        future_to_row = {
                            executor.submit(evaluate_func, row): row 
                            for row in rows
                        }
                        
                        for future in as_completed(future_to_row):
                            try:
                                result = future.result()
                                evaluated_rows.append(result)
                            except ModelHandlerError:
                                raise  
                            except Exception as e:
                                error_msg = f"Error processing future result: {str(e)}"
                                self.logger.error(error_msg)
                                failed_rows.append({
                                    "error": error_msg,
                                    "row": future_to_row[future]
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
                scores = [row["evaluation"]["score"] for row in evaluated_rows if row.get("evaluation", {}).get("score") is not None]
                
                if scores:
                    average_score = sum(scores) / len(scores)
                    average_score = round(average_score, 2)
                    min_score = min(scores)
                    max_score = max(scores)
                else:
                    average_score = min_score = max_score = 0

                evaluation_stats = {
                    "average_score": average_score,
                    "min_score": min_score,
                    "max_score": max_score,
                    "evaluated_rows": evaluated_rows,
                    "failed_rows": failed_rows,
                    "total_evaluated": len(evaluated_rows),
                    "total_failed": len(failed_rows)
                }
                
                self.logger.info(f"Completed row evaluation. Average score: {evaluation_stats['average_score']:.2f}")
                return evaluation_stats

            except Exception as e:
                error_msg = f"Error calculating evaluation statistics: {str(e)}"
                self.logger.error(error_msg)
                return {
                    "average_score": 0,
                    "min_score": 0,
                    "max_score": 0,
                    "evaluated_rows": evaluated_rows,
                    "failed_rows": failed_rows,
                    "error": error_msg
                }
        except ModelHandlerError:
            raise  
        except Exception as e:
            error_msg = f"Critical error in evaluate_rows: {str(e)}"
            self.logger.error(error_msg)
            return {
                "average_score": 0,
                "min_score": 0,
                "max_score": 0,
                "evaluated_rows": [],
                "failed_rows": [],
                "error": error_msg
            }
        
    #@track_llm_operation("evaluate_freeform_data")
    def evaluate_row_data(self, request: EvaluationRequest, job_name=None, is_demo: bool = True, request_id = None) -> Dict:
        """Evaluate rows of data with parallel processing"""
        try:
            self.logger.info(f"Starting row evaluation process - Demo Mode: {is_demo}")
            
            model_params = request.model_params or ModelParameters()
            
            self.logger.info(f"Creating model handler for model: {request.model_id}")
            model_handler = create_handler(
                request.model_id,
                self.bedrock_client,
                model_params=model_params,
                inference_type=request.inference_type,
                caii_endpoint=request.caii_endpoint
            )
            
            self.logger.info(f"Loading data rows from: {request.import_path}")
            with open(request.import_path, 'r') as file:
                data = json.load(file)
            
            # Ensure data is a list of rows
            rows = data if isinstance(data, list) else [data]
            
            # Evaluate all rows
            evaluated_results = self.evaluate_rows(rows, model_handler, request, request_id=request_id)
            all_scores = [row["evaluation"]["score"] for row in evaluated_results["evaluated_rows"]]
            
            overall_average = sum(all_scores) / len(all_scores) if all_scores else 0
            overall_average = round(overall_average, 2)
            evaluated_results['Overall_Average'] = overall_average
            
            self.logger.info(f"Row evaluation completed. Overall average score: {overall_average:.2f}")
            
            timestamp = datetime.now(timezone.utc).isoformat()
            time_file = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')[:-3] 
            model_name = get_model_family(request.model_id).split('.')[-1]
            output_path = f"row_data_{model_name}_{time_file}_evaluated.json"
            
            self.logger.info(f"Saving row evaluation results to: {output_path}")
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
            
            metadata = {
                'timestamp': timestamp,
                'model_id': request.model_id,
                'inference_type': request.inference_type,
                'caii_endpoint': request.caii_endpoint,
                'use_case': request.use_case,
                'custom_prompt': custom_prompt_str,
                'model_parameters': json.dumps(model_params.model_dump()) if model_params else None,
                'generate_file_name': os.path.basename(request.import_path),
                'evaluate_file_name': os.path.basename(output_path),
                'display_name': request.display_name,
                'local_export_path': output_path,
                'examples': examples_str,
                'Overall_Average': overall_average,
                'evaluation_type': 'row'
            }
            
            self.logger.info("Saving row evaluation metadata to database")
            
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
            error_msg = f"Error in row evaluation process: {str(e)}"
            self.logger.error(error_msg, exc_info=True)
            if is_demo:
                raise APIError(str(e))
            else:
                time_stamp = datetime.now(timezone.utc).isoformat()
                job_status = "ENGINE_FAILED"
                file_name = ''
                output_path = ''
                overall_average = ''
                self.db.update_job_evaluate(job_name, file_name, output_path, time_stamp, overall_average, job_status)
                
                raise

    def safe_json_dumps(self, value):
        """Convert value to JSON string only if it's not None"""
        return json.dumps(value) if value is not None else None
