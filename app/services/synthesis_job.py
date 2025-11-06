from datetime import datetime, timezone
import json
import uuid
import os
from typing import Dict, Any, Optional
from app.services.evaluator_legacy_service import EvaluatorLegacyService
from app.models.request_models import SynthesisRequest, EvaluationRequest, Export_synth, ModelParameters, CustomPromptRequest, JsonDataSize, RelativePath
from app.services.synthesis_legacy_service import SynthesisLegacyService
from app.services.export_results import Export_Service
from app.core.prompt_templates import PromptBuilder, PromptHandler
from app.core.config import UseCase, USE_CASE_CONFIGS
from app.core.database import DatabaseManager
from app.core.exceptions import APIError, InvalidModelError, ModelHandlerError
from app.services.model_alignment import ModelAlignment
from app.core.model_handlers import create_handler
from app.services.aws_bedrock import get_bedrock_client
from app.migrations.alembic_manager import AlembicMigrationManager
from app.core.config import responses, caii_check
from app.core.path_manager import PathManager
from app.core.telemetry import telemetry_manager
from app.core.telemetry_integration import track_job
import cmlapi

# Initialize services
synthesis_service = SynthesisLegacyService()
evaluator_service = EvaluatorLegacyService()
export_service = Export_Service()
db_manager = DatabaseManager()

#Initialize path manager
path_manager = PathManager()

class SynthesisJob:
    def __init__(
        self,
        project_id: str,
        client_cml: Any,
        path_manager: Any,
        db_manager: Any,
        runtime_identifier: str
    ):
        self.project_id = project_id
        self.client_cml = client_cml
        self.path_manager = path_manager
        self.db_manager = db_manager
        self.runtime_identifier = runtime_identifier

    def _create_and_run_job(
        self,
        script_name: str,
        job_prefix: str,
        params: Dict[str, Any],
        cpu: int,
        memory: int,
        request_id = None,
        freeform = None
    ) -> tuple:
        """Common job creation and execution logic"""
        script_path = self.path_manager.get_str_path(f"app/{script_name}")
        random_id = uuid.uuid4().hex[:4]
        
        display_name = params.get('display_name', '')
        job_name = f"{display_name}_{random_id}" if display_name else f"{job_prefix}_{random_id}"
        params['job_name'] = job_name
        params['request_id'] = request_id
        if freeform:
            params['generation_type'] = 'freeform'
        file_name = f"{job_prefix}_args_{random_id}.json"
        
        # Write parameters to file
        with open(file_name, 'w') as f:
            json.dump(params, f)

        # Create job instance
        job_instance = cmlapi.CreateJobRequest(
            project_id=self.project_id,
            name=job_name,
            script=script_path,
            runtime_identifier=self.runtime_identifier,
            cpu=cpu,
            memory=memory,
            environment={'file_name': file_name}
        )

        # Create and run job
        created_job = self.client_cml.create_job(
            project_id=self.project_id,
            body=job_instance
        )
        job_run = self.client_cml.create_job_run(
            cmlapi.CreateJobRunRequest(),
            project_id=self.project_id,
            job_id=created_job.id
        )

        return job_name, job_run, file_name


    def _get_job_creator_name(self, job_run_id: str) -> str:
        """Get the name of the job creator"""
        return self.client_cml.list_job_runs(
            self.project_id,
            job_run_id,
            sort="-created_at",
            page_size=1
        ).job_runs[0].creator.name
    
    #@track_job("generate")
    def generate_job(self, request: Any, cpu: int = 2, memory: int = 4, request_id = None, freeform = False) -> Dict[str, str]:
        """Create and run a synthesis generation job"""
        json_str = request.model_dump_json()
        params = json.loads(json_str)
        
        job_name, job_run, file_name = self._create_and_run_job(
            "run_job.py",
            "synth_job",
            params,
            cpu=cpu,
            memory=memory,
            request_id=request_id,
          freeform = freeform
            
        )

        # Calculate total count
        total_count = self._calculate_total_count(request)
        
        # Handle custom prompts and parameters
        custom_prompt_str = PromptHandler.get_default_custom_prompt(
            request.use_case,
            request.custom_prompt
        )
        model_params = request.model_params or ModelParameters()
        
        # Prepare metadata
        metadata = {
            'technique': request.technique,
            'model_id': request.model_id,
            'inference_type': request.inference_type,
            'caii_endpoint': request.caii_endpoint,
            'use_case': request.use_case,
            'final_prompt': custom_prompt_str,
            'model_parameters': json.dumps(model_params.model_dump()) if model_params else None,
            'display_name': request.display_name,
            'num_questions': request.num_questions,
            'topics': synthesis_service.safe_json_dumps(self._get_topics(request)),
            'examples': synthesis_service.safe_json_dumps(self._get_examples(request)),
            'total_count': total_count,
            'schema': synthesis_service.safe_json_dumps(self._get_schema(request)),
            'doc_paths': synthesis_service.safe_json_dumps(getattr(request, 'doc_paths', None)),
            'input_path': synthesis_service.safe_json_dumps(getattr(request, 'input_path', None)),
            'job_name': job_name,
            'job_id': job_run.job_id,
            'job_status': self.get_job_status(job_run.job_id),
            'input_key': request.input_key,
            'output_key': request.output_key,
            'output_value': request.output_value,
            'job_creator_name': self._get_job_creator_name(job_run.job_id),
            
        }

        
        self.db_manager.save_generation_metadata(metadata)
        return {"job_name": job_name, "job_id": job_run.job_id}
    
    #@track_job("evaluate")
    def evaluate_job(self, request: Any, cpu: int = 2, memory: int = 4, request_id = None, freeform = None) -> Dict[str, str]:
        """Create and run an evaluation job"""
        json_str = request.model_dump_json()
        params = json.loads(json_str)
        
        job_name, job_run, file_name = self._create_and_run_job(
            "run_eval_job.py",
            "eval_job",
            params,
            cpu=cpu,
            memory=memory,
            request_id=request_id,
            freeform = freeform
        )

        custom_prompt_str = PromptHandler.get_default_custom_eval_prompt(
            request.use_case,
            request.custom_prompt
        )
        model_params = request.model_params or ModelParameters()
        
        metadata = {
            'model_id': request.model_id,
            'inference_type': request.inference_type,
            'caii_endpoint': request.caii_endpoint,
            'use_case': request.use_case,
            'custom_prompt': custom_prompt_str,
            'model_parameters': json.dumps(model_params.model_dump()) if model_params else None,
            'generate_file_name': os.path.basename(request.import_path),
            'display_name': request.display_name,
            'examples': evaluator_service.safe_json_dumps(self._get_eval_examples(request)),
            'job_name': job_name,
            'job_id': job_run.job_id,
            'job_status': self.get_job_status(job_run.job_id),
            'job_creator_name': self._get_job_creator_name(job_run.job_id),
            
        }
        
        self.db_manager.save_evaluation_metadata(metadata)
        return {"job_name": job_name, "job_id": job_run.job_id}

    #@track_job("export")
    # In the file containing synthesis_job
    def export_job(self, request: Any, cpu: int = 2, memory: int = 4) -> Dict[str, str]:
        """Create and run an export job"""
        params = request.model_dump()
        
        # Generate job name based on export type
        if "s3" in request.export_type and request.s3_config:
            job_name_prefix = f"s3_{request.s3_config.bucket}"
        elif "huggingface" in request.export_type and request.hf_config:
            job_name_prefix = f"hf_{request.hf_config.hf_repo_name}"
        else:
            job_name_prefix = "export"
        
        job_name, job_run, file_name = self._create_and_run_job(
            "run_export_job.py",
            job_name_prefix,
            params,
            cpu=cpu,
            memory=memory
        )

        # Initialize export paths
        export_paths = {}
        
        # Add HF export path if applicable
        if "huggingface" in request.export_type and request.hf_config:
            repo_id = f"{request.hf_config.hf_username}/{request.hf_config.hf_repo_name}"
            export_paths['huggingface'] = f"https://huggingface.co/datasets/{repo_id}"
        
        # Add S3 export path if applicable
        if "s3" in request.export_type and request.s3_config:
            key = request.s3_config.key or os.path.basename(request.file_path)
            if request.display_name and not request.s3_config.key:
                key = f"{request.display_name}.json"
            export_paths['s3'] = f"s3://{request.s3_config.bucket}/{key}"
        
        metadata = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "display_export_name": request.display_name or os.path.basename(request.file_path),
            "display_name": request.display_name,
            "local_export_path": request.file_path,
            "hf_export_path": export_paths.get('huggingface', ''),
            "s3_export_path": export_paths.get('s3', ''),
            "job_id": job_run.job_id,
            "job_name": job_name,
            "job_status": self.get_job_status(job_run.job_id),
            "job_creator_name": self._get_job_creator_name(job_run.job_id),
            "cpu": cpu,
            "memory": memory
        }
       
        self.db_manager.save_export_metadata(metadata)
        
        result = {
            "job_name": job_name,
            "job_id": job_run.job_id,
        }
        
        # Add export paths to result
        if 'huggingface' in export_paths:
            result["hf_link"] = export_paths['huggingface']
        if 's3' in export_paths:
            result["s3_link"] = export_paths['s3']
        
        return result


    def _calculate_total_count(self, request: Any) -> int:
        """Calculate total count based on request parameters"""
        if request.input_path:
            inputs = []
            for path in request.input_path:
                try:
                    with open(path) as f:
                        data = json.load(f)
                        inputs.extend(item.get(request.input_key, '') for item in data)
                except Exception as e:
                    print(f"Error processing {path}: {str(e)}")
            return len(inputs)
        elif request.doc_paths:
            return request.num_questions
        else:
            return request.num_questions * len(request.topics)

    def _get_topics(self, request: Any) -> Optional[list]:
        """Get topics if applicable"""
        if not getattr(request, 'doc_paths', None):
            return request.topics if hasattr(request, 'topics') else None
        return None

    def _get_examples(self, request: Any) -> Optional[Any]:
        """Get examples for generation job"""
        return (
            PromptHandler.get_default_example(request.use_case, request.examples)
            if hasattr(request, 'examples')
            else None
        )

    def _get_eval_examples(self, request: Any) -> Optional[Any]:
        """Get examples for evaluation job"""
        return (
            PromptHandler.get_default_eval_example(request.use_case, request.examples)
            if hasattr(request, 'examples')
            else None
        )

    def _get_schema(self, request: Any) -> Optional[Any]:
        """Get schema if applicable"""
        return (
            PromptHandler.get_default_schema(request.use_case, request.schema)
            if hasattr(request, 'schema')
            else None
        )
    def get_job_status(self, job_id: str) -> str:
        """
        Get the status of a job run
        
        Args:
            job_id (str): The ID of the job to check
            
        Returns:
            str: The status of the most recent job run
        """
        response = self.client_cml.list_job_runs(
            self.project_id, 
            job_id, 
            sort="-created_at", 
            page_size=1
        )
        return response.job_runs[0].status

    
    def get_job_status(self, job_id: str) -> str:
        """
        Get the status of a job run
        
        Args:
            job_id (str): The ID of the job to check
            
        Returns:
            str: The status of the most recent job run
        """
        response = self.client_cml.list_job_runs(
            self.project_id, 
            job_id, 
            sort="-created_at", 
            page_size=1
        )

        status = response.job_runs[0].status
        try:

            # Add telemetry tracking for completed jobs
            if status in ["ENGINE_SCHEDULING", "ENGINE_STARTING", "ENGINE_RUNNING", "ENGINE_STOPPING", "ENGINE_STOPPED", "ENGINE_UNKNOWN","ENGINE_SUCCEEDED", "ENGINE_FAILED", "ENGINE_TIMEDOUT"]:
                # Get metrics_id from database if available
                metrics_id = telemetry_manager.get_job_telemetry_id(job_id)
                if metrics_id:
                    from app.core.telemetry_integration import record_job_completion
                    error = None
                    if status == "ENGINE_FAILED":
                        # Try to get error information from logs
                        error = "Job execution failed" 
                    
                    record_job_completion(
                        job_id=job_id,
                        metrics_id=metrics_id,
                        status=status,
                        error=error
                    )
        except:
            pass

        return status