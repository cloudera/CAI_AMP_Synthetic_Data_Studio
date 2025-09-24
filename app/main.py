import os
import boto3
from datetime import datetime, timezone
from typing import Any, Dict
from botocore.config import Config
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from asyncio import TimeoutError, wait_for
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import subprocess
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager
import time
import math
import requests
from requests.exceptions import ReadTimeout
from urllib3.exceptions import ReadTimeoutError
import sys
import json
import uuid 
from fastapi.encoders import jsonable_encoder
import os, json, csv
from fastapi import Query


#print(os.getcwd())
# Setup absolute paths
ROOT_DIR = Path(__file__).parent.parent  # Goes up one level from app/main.py to reach project root
print("root: ", Path(__file__))
APP_DIR = ROOT_DIR / "app"

UPLOAD_DIR = ROOT_DIR / "document_upload" 

# Add the project root to Python path to enable absolute imports
sys.path.append(str(ROOT_DIR))

from app.services.evaluator_service import EvaluatorService
from app.services.evaluator_legacy_service import EvaluatorLegacyService
from app.models.request_models import SynthesisRequest, EvaluationRequest, Export_synth, ModelParameters, CustomPromptRequest, JsonDataSize, RelativePath, Technique, AddCustomEndpointRequest, CustomEndpointListResponse
from app.services.synthesis_service import SynthesisService
from app.services.synthesis_legacy_service import SynthesisLegacyService
from app.services.export_results import Export_Service

from app.core.prompt_templates import PromptBuilder, PromptHandler
from app.core.config import UseCase, USE_CASE_CONFIGS, USE_CASE_CONFIGS_EVALS
from app.core.database import DatabaseManager
from app.core.exceptions import APIError, InvalidModelError, ModelHandlerError
from app.services.model_alignment import ModelAlignment
from app.core.model_handlers import create_handler, UnifiedModelHandler
from app.services.aws_bedrock import get_bedrock_client
from app.migrations.alembic_manager import AlembicMigrationManager
from app.core.config import responses, caii_check
from app.core.path_manager import PathManager
from app.core.model_endpoints import collect_model_catalog, sort_unique_models, list_bedrock_models
from app.core.custom_endpoint_manager import CustomEndpointManager

# from app.core.telemetry_middleware import TelemetryMiddleware
# from app.routes.telemetry_routes import router as telemetry_router
#from app.core.telemetry import telemetry_manager


#****************************************Initialize************************************************

# Initialize services
synthesis_service = SynthesisService()  # Freeform only
synthesis_legacy_service = SynthesisLegacyService()  # SFT and Custom_Workflow
evaluator_service = EvaluatorService()  # Freeform only
evaluator_legacy_service = EvaluatorLegacyService()  # SFT and Custom_Workflow
export_service = Export_Service()
db_manager = DatabaseManager()
custom_endpoint_manager = CustomEndpointManager()


#Initialize path manager
path_manager = PathManager()

# Initialize the migration manager
alembic_manager = AlembicMigrationManager("metadata.db")




project_id = os.getenv("CDSW_PROJECT_ID", "local")
if project_id != "local":

    import cmlapi
    from app.services.synthesis_job import SynthesisJob


    # Initialize required components
    client_cml = cmlapi.default_client()
    project_id = os.getenv("CDSW_PROJECT_ID")
    path_manager = PathManager()  # Make sure this is imported
    db_manager = DatabaseManager()  # Make sure this is imported

    # Get runtime_identifier
    base_job_name = 'Synthetic_data_base_job'
    base_job_id = client_cml.list_jobs(project_id,
                                    search_filter='{"name":"%s"}' % base_job_name).jobs[0].id
    template_job = client_cml.get_job(
        project_id=project_id,
        job_id=base_job_id
    )
    runtime_identifier = template_job.runtime_identifier

    #*************************Initialize JOB******************************
    #Initialize SynthesisJob with required parameters
    synthesis_job = SynthesisJob(
        project_id=project_id,
        client_cml=client_cml,
        path_manager=path_manager,
        db_manager=db_manager,
        runtime_identifier=runtime_identifier
    )


def get_job_status( job_id: str) -> str:
    """
    Get the status of a job run
    
    Args:
        job_id (str): The ID of the job to check
        
    Returns:
        str: The status of the most recent job run
    """
    response = client_cml.list_job_runs(
        project_id, 
        job_id, 
        sort="-created_at", 
        page_size=1
    )

    status = response.job_runs[0].status

    # # Add telemetry tracking for completed jobs
    # if status in ["ENGINE_SCHEDULING", "ENGINE_STARTING", "ENGINE_RUNNING", "ENGINE_STOPPING", "ENGINE_STOPPED", "ENGINE_UNKNOWN","ENGINE_SUCCEEDED", "ENGINE_FAILED", "ENGINE_TIMEDOUT"]:
    #     # Get metrics_id from database if available
    #     metrics_id = telemetry_manager.get_job_telemetry_id(job_id)
    #     if metrics_id:
    #         from app.core.telemetry_integration import record_job_completion
    #         error = None
    #         if status == "ENGINE_FAILED":
    #             # Try to get error information from logs
    #             error = "Job execution failed" 
            
    #         record_job_completion(
    #             job_id=job_id,
    #             metrics_id=metrics_id,
    #             status=status,
    #             error=error
    #         )

    return status

def get_total_size(file_paths):
  
    file_sizes = []
    for file_path in file_paths:
        
        final_path =  path_manager.get_str_path(file_path)
        file_sizes.append(client_cml.list_project_files(project_id, final_path).files[0].file_size)
        
    total_bytes = sum(int(float(size)) for size in file_sizes) 
    total_gb = math.ceil(total_bytes / (1024 ** 3))

    return total_gb

def restart_application():
    """Restart the CML application"""
    try:
        cml = cmlapi.default_client()
        project_id = os.getenv("CDSW_PROJECT_ID")
        apps_list = cml.list_applications(project_id).applications
        found_app_list = list(filter(lambda app: 'Synthetic Data Studio' in app.name, apps_list))
            
        if len(found_app_list) > 0:
            app = found_app_list[0]
            if app.status == "APPLICATION_RUNNING":
                try:
                    cml.restart_application(project_id, app.id)
                except Exception as e:
                    raise (f"Failed to restart application {app.name}: {str(e)}")
        else:
            raise ValueError("Synthetic Data Studio application not found")
                
    except Exception as e:
        print(f"Error restarting application: {e}")
        raise

def deep_sanitize_nans(obj: Any) -> Any:
    """
    Recursively traverse all data structures and replace NaN with None.
    This handles all nested structures.
    """
    if isinstance(obj, dict):
        return {k: deep_sanitize_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [deep_sanitize_nans(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(deep_sanitize_nans(item) for item in obj)
    elif isinstance(obj, set):
        return {deep_sanitize_nans(item) for item in obj}
    elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    elif isinstance(obj, (pd.Timestamp, np.datetime64)):
        return obj.isoformat()
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return deep_sanitize_nans(obj.tolist())
    elif pd.isna(obj):
        return None
    return obj


# Add these models
class StudioUpgradeStatus(BaseModel):
    git_local_commit: str
    git_remote_commit: str
    updates_available: bool

class StudioUpgradeResponse(BaseModel):
    success: bool
    message: str
    git_updated: bool
    frontend_rebuilt: bool






@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for the FastAPI application"""
    # Startup code
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"Document upload directory created at: {UPLOAD_DIR}")
    
    # Run database migrations (init_db() already called by DatabaseManager)
    try:
        print("Running database migrations via external script...")
        result = subprocess.run(
            ["uv", "run", "python", "run_migrations.py"],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"Migration completed: {result.stdout}")
    except subprocess.CalledProcessError as e:
        print(f"Migration warning: {e.stderr}")
    
    yield
    print("Application shutting down...")


app = FastAPI(
    title="LLM Data Synthesis API",
    description="API for generating synthetic question-answer pairs using LLMs",
    version="1.0.0",
    lifespan=lifespan
)

# app.add_middleware(TelemetryMiddleware)

# # Add telemetry router to the FastAPI app
# # Add this line after other app.include_router() calls
# app.include_router(telemetry_router)

@app.middleware("http")
async def global_middleware(request: Request, call_next):
    try:
        timeout_seconds = get_timeout_for_request(request)
        response = await wait_for(
            call_next(request),
            timeout=timeout_seconds
        )
        return response
        
    except TimeoutError:
        endpoint_name = request.url.path.split('/')[-1]
        return JSONResponse(
            status_code=504,
            content={
                "status": "failed", 
                "error": f"Operation '{endpoint_name}' timed out after {timeout_seconds} seconds"
            }
        )
    except APIError as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"status": "failed", "error": e.message}
        )
    except RuntimeError as e:
        return JSONResponse(
            status_code=400,
            content={"status": "failed", "error": str(e)}
        )
    
    except InvalidModelError as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"status": "failed", "error": e.message}
        )
    
    
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "failed", "error": str(e)}
        )
    
def get_timeout_for_request(request: Request) -> float:
    """
    Get timeout duration based on endpoint
    """
    path = request.url.path
    
    # Longer timeouts for job creation endpoints
    if path.endswith("/generate"):
        return 200.0  # 2 minutes for generation
    elif path.endswith("/freeform"):
        return 300.0  # 5 minutes for generation
    elif path.endswith("/create_custom_prompt"):
        return 300.0  # 5 minutes for generation
    elif path.endswith("/evaluate"):
        return 200.0  # 2 minutes for evaluation
    elif path.endswith("/export_results"):
        return 200.0  # 2 minutes for export
    elif "health" in path:
        return 5.0    # Quick timeout for health checks
    elif path.endswith("/upgrade"):
        return 2000  # timeout increase for upgrade  
    else:
        return 60.0   # Default timeout


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# @app.on_event("startup")
# async def startup_event():
#     """Check for and apply any pending migrations on startup"""
#     success, message = await alembic_manager.handle_database_upgrade()
#     if not success:
#         print(f"Warning: {message}")

@app.post("/get_project_files", include_in_schema=True, responses = responses, 
           description = "get project file details")
async def get_project_files(request: RelativePath):
    file_path = path_manager.get_str_path(request.path)
    return client_cml.list_project_files(project_id, file_path)
    
    

@app.post("/json/dataset_size", include_in_schema=True, responses = responses,
          description = "get total dataset size for jsons")
async def get_dataset_size(request:JsonDataSize):

    if request.input_path:
        inputs = []
        file_paths = request.input_path
        for path in file_paths:
            try:
                with open(path) as f:
                    data = json.load(f)
                    if not data:
                        raise ValueError(f"Empty JSON data in file: {path}")
                    
                    # Check if input_key exists in at least one item
                    key_exists = any(request.input_key in item for item in data)
                    if not key_exists:
                        raise KeyError(f"Input key '{request.input_key}' not found in any item in file: {path}")
                    
                    # Collect values, raising error if any item is missing the key
                    for item in data:
                        if request.input_key not in item:
                            raise KeyError(f"Input key '{request.input_key}' missing in item: {item}")
                        inputs.append(item[request.input_key])
                        
            except json.JSONDecodeError as e:
                error_msg = f"Invalid JSON format in file {path}: {str(e)}"
                print(error_msg)
                return JSONResponse(
                    status_code=400,
                    content={"status": "failed", "error": error_msg}
                )
            except (KeyError, ValueError) as e:
                print(str(e))
                return JSONResponse(
                    status_code=400,
                    content={"status": "failed", "error": str(e)}
                )
            except Exception as e:
                error_msg = f"Error processing {path}: {str(e)}"
                print(error_msg)
                return JSONResponse(
                    status_code=400,
                    content={"status": "failed", "error": error_msg}
                )
            
    return {"dataset_size": len(inputs)}



@app.post("/json/get_content", include_in_schema=True, responses = responses,
          description = "get json content")
async def get_dataset_size(request: RelativePath):

    MAX_ROWS = 20

    def _truncate(rows: List[Dict]) -> List[Dict]:
        return rows[:MAX_ROWS]
    
    def _flatten(d: dict, parent_key:str = "", sep:str=".") -> dict:
        flat = {}
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                flat.update(_flatten(v, new_key, sep=sep))
            else:
                flat[new_key] = v
        return flat


    if not request.path:
        return JSONResponse(status_code=400, content={"status": "failed", "error": "path missing"})

    path = request.path
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"status": "failed", "error": "file not found"})

    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".json":
            with open(path) as f:
                raw = json.load(f)

            if isinstance(raw, list):
                data = _truncate(raw)

            elif isinstance(raw, dict):      # flatten & wrap
                data = _truncate([_flatten(raw)])

            else:
                raise ValueError("Unsupported JSON structure")


        elif ext == ".csv":
            with open(path, newline="") as f:
                reader = csv.DictReader(f)
                data = _truncate([row for row in reader])

        else:
            return JSONResponse(status_code=400, content={"status": "failed", "error": "unsupported file type"})

        return {"data": data}
    
    except json.JSONDecodeError as e:
        err = f"Invalid JSON in {path}: {e}"
    except ValueError as e:
        err = str(e)
    except Exception as e:
        err = f"Error processing {path}: {e}"

    return JSONResponse(status_code=400, content={"status": "failed", "error": err})

@app.post("/json/get_seeds_list", include_in_schema=True, responses = responses,
          description = "get json content")
async def get_dataset_size(request: RelativePath):

    if not request.path:
        return JSONResponse(status_code=400, content={"status": "failed", "error": "path missing"})

    path = request.path
    if not os.path.exists(path):
        return JSONResponse(status_code=404, content={"status": "failed", "error": "file not found"})

    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".json":
            with open(path) as f:
                raw = json.load(f)


        return {"data": raw}
    
    except json.JSONDecodeError as e:
        err = f"Invalid JSON in {path}: {e}"
    except ValueError as e:
        err = str(e)
    except Exception as e:
        err = f"Error processing {path}: {e}"

    return JSONResponse(status_code=400, content={"status": "failed", "error": err})


@app.post("/synthesis/generate", include_in_schema=True,
    responses=responses,
    description="Generate question-answer pairs")
async def generate_examples(request: SynthesisRequest):
    """Generate question-answer pairs"""
    
    # Generate a request ID
    request_id = str(uuid.uuid4())

    if request.inference_type == "CAII":
        caii_endpoint = request.caii_endpoint
       
        caii_check(caii_endpoint)
       
    
    is_demo = request.is_demo
    mem = 4
    core = 2
    if project_id != "local":
        if request.doc_paths:
            paths = request.doc_paths
            data_size = get_total_size(paths)
            if data_size > 1 and data_size <=10:
                is_demo = False
                mem = data_size +2
                core = max(2,data_size//2)
                
            elif data_size >10:
                return JSONResponse(
                        status_code=413,  # Payload Too Large
                        content={
                            "status": "failed",
                            "error": f"Total dataset size ({data_size:} GB) exceeds limit of 10 GB. Please select smaller datasets."
                        }
                    )
            else:
                is_demo = request.is_demo
                mem = 4
                core = 2
  
    
    if is_demo== True:
        if request.input_path:
            # Custom_Workflow technique - route to legacy service
            return await synthesis_legacy_service.generate_result(request,is_demo, request_id=request_id)
        else:
            # SFT technique - route to legacy service
            return await synthesis_legacy_service.generate_examples(request,is_demo, request_id=request_id)
    else:
       return synthesis_job.generate_job(request, core, mem, request_id=request_id)
    

@app.post("/synthesis/freeform", include_in_schema=True,
    responses=responses,
    description="Generate freeform structured data")
async def generate_freeform_data(request: SynthesisRequest):
    """Generate freeform structured data based on provided examples and custom instructions"""
    
    request_id = str(uuid.uuid4())

    if request.inference_type == "CAII":
        caii_endpoint = request.caii_endpoint
        caii_check(caii_endpoint)
    
    is_demo = request.is_demo
    mem = 4
    core = 2
    if project_id != "local":
        if request.doc_paths:
            paths = request.doc_paths
            data_size = get_total_size(paths)
            if data_size > 1 and data_size <= 10:
                is_demo = False
                mem = data_size + 2
                core = max(2, data_size // 2)
            elif data_size > 10:
                return JSONResponse(
                    status_code=413,  # Payload Too Large
                    content={
                        "error": f"Total dataset size ({data_size:} GB) exceeds limit of 10 GB. Please select smaller datasets."
                    }
                )
            else:
                is_demo = request.is_demo
                mem = 4
                core = 2
    
    if is_demo:
        result = await synthesis_service.generate_freeform(request, is_demo=is_demo, request_id=request_id )
          # Apply our deep sanitization to handle all NaN values
        sanitized_result = deep_sanitize_nans(result)
        
        # Then use jsonable_encoder for FastAPI-specific conversions
        final_result = jsonable_encoder(sanitized_result)

        return final_result
    else:
        # Pass additional parameter to indicate this is a freeform request
        request_dict = request.model_dump()
        freeform = True
        # Convert back to SynthesisRequest object
        freeform_request = SynthesisRequest(**request_dict)

        return synthesis_job.generate_job(freeform_request, core, mem, request_id=request_id, freeform = freeform)

@app.post("/synthesis/evaluate", 
    include_in_schema=True,
    responses=responses,
    description="Evaluate generated QA pairs")
async def evaluate_examples(request: EvaluationRequest):
    """Evaluate generated QA pairs"""
    request_id = str(uuid.uuid4())

    if request.inference_type == "CAII":
        caii_endpoint = request.caii_endpoint
        caii_check(caii_endpoint)
   
    is_demo = request.is_demo
    if is_demo:
       # SFT and Custom_Workflow evaluation - route to legacy service
       return evaluator_legacy_service.evaluate_results(request, request_id=request_id)
    
    else:
        return synthesis_job.evaluate_job(request, request_id=request_id)
    
@app.post("/synthesis/evaluate_freeform", 
    include_in_schema=True,
    responses=responses,
    description="Evaluate data rows")
async def evaluate_freeform(request: EvaluationRequest):
    """Evaluate data rows"""
    request_id = str(uuid.uuid4())

    if request.inference_type == "CAII":
        caii_endpoint = request.caii_endpoint
        caii_check(caii_endpoint)
        
   
    is_demo = getattr(request, 'is_demo', True)
    if is_demo:
        return evaluator_service.evaluate_row_data(request, request_id=request_id)
    else:
        request_dict = request.model_dump()
        freeform = True
        # Convert back to SynthesisRequest object
        freeform_request = EvaluationRequest(**request_dict)
        return synthesis_job.evaluate_job(freeform_request, request_id=request_id,freeform = freeform)


@app.post("/model/alignment",
          include_in_schema=True,
          responses=responses,
          description="Generate model alignment data in DPO and KTO formats")
async def generate_alignment_data(
    synthesis_request: SynthesisRequest,
    evaluation_request: EvaluationRequest,
    job_name: str = None,
    is_demo: bool = True
) -> Dict:
    """
    Generate model alignment data using synthesis and evaluation services.
    
    Args:
        synthesis_request: Parameters for synthesis generation
        evaluation_request: Parameters for evaluation
        job_name: Optional job identifier for tracking
        is_demo: Whether this is a demo run
        
    Returns:
        Dictionary containing DPO and KTO formatted data
    """
    try:
        alignment_service = ModelAlignment()
        result = await alignment_service.model_alignment(
            synthesis_request=synthesis_request,
            evaluation_request=evaluation_request,
            job_name=job_name,
            is_demo=is_demo
        )

        
        return {
            "status": "success",
            "dpo": result["dpo"],
            "kto": result["kto"]
        }
        
    except APIError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")



@app.post("/export_results", include_in_schema=True)
async def export_results(request:Export_synth):
    try: 
        return synthesis_job.export_job(request)
    
    except Exception as e:

        return JSONResponse(
            status_code=500,
            content={"status": "failed", "error": f"Unexpected error: {str(e)}"}
        )

@app.post("/create_custom_prompt")
async def create_custom_prompt(request: CustomPromptRequest, request_id = None):
    """Allow users to customize prompt. Only part of the prompt which can be customized"""
    try:
        bedrock_client =   get_bedrock_client()
        model_params = ModelParameters()
        model_handler = create_handler(request.model_id, bedrock_client, model_params, inference_type = request.inference_type, caii_endpoint =  request.caii_endpoint, custom_p = True)
        prompt = PromptBuilder.build_custom_prompt(
                model_id=request.model_id,
                custom_prompt=request.custom_prompt,
                example_path= request.example_path,
                example = request.example
            )
        #print(prompt)
        prompt_gen = model_handler.generate_response(prompt, request_id=request_id)

        return {"generated_prompt":prompt_gen}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    



@app.get("/model/model_ID", include_in_schema=True)
async def get_model_id():
    try:
        bedrock_list = list_bedrock_models()

    except Exception as e:
        print(f"Error while listing Bedrock models: {str(e)}")
        bedrock_list = []

    models = {
        "aws_bedrock": bedrock_list,
        "CAII": [],
        "OpenAI" : [],
        "Google Gemini" : []
    }

    return {"models": models}
    

    
   

@app.get("/model/model_id_filter", include_in_schema=True)
async def get_model_id_filtered():

    """
    Return two lists per provider: **enabled** (responds within 5 s) and **disabled**.
    CAII is queried only when running inside a CDP project and it returns pair of endpoints and model IDs.
    """
    try:
        models = await collect_model_catalog()
    except Exception as exc:
        # Fail closed – return *something* so the UI never breaks
        models = {
            "aws_bedrock": {"enabled": [], "disabled": []},
            "CAII":        {"enabled": [], "disabled": []},
        }
        # Log for operators
        print("Error while building model catalog: ", exc)

    return {"models": models}
    

@app.get("/use-cases", include_in_schema=True)
async def get_use_cases():
    """Get available use cases"""
    return {
   "usecases": [
       {"id": UseCase.CODE_GENERATION, "name": "Code Generation", "description": "Generates paired programming questions and answers with runnable, well-formatted code plus explanations. Ideal for building Q-and-A datasets across programming languages like Python.", "tag": ["Supervised Finetuning", "Data Generation"]},
       {"id": UseCase.TEXT2SQL, "name": "Text to SQL", "description": "Creates natural-language questions matched to clean, executable SQL queries spanning basics, joins, aggregates, subqueries, and window functions. Great for training and evaluation.", "tag": ["Supervised Finetuning", "Data Generation"]},
       {"id": UseCase.CUSTOM, "name": "Custom", "description": "A blank template meant for any user-defined synthetic data task.", "tag": []},
       {"id": UseCase.LENDING_DATA, "name": "Lending Data", "description": "Produces realistic LendingClub-style loan records—complete borrower, loan, and credit-profile fields—while respecting privacy and intricate cross-field logic (grades, DTI, employment, etc.).", "tag": ["Data Generation", "Tabular Data"]},
       {"id": UseCase.CREDIT_CARD_DATA, "name": "Credit Card Data", "description": "Builds user profiles with chronological credit-status histories, maintaining ID consistency and evolving payment behavior. Supports training for credit scoring models without real user data.", "tag": ["Data Generation", "Tabular Data"]},
       {"id": UseCase.TICKETING_DATASET, "name": "Ticketing Dataset", "description": "Generates support queries with labelled ticket classification intent (cancel_ticket, customer_service, or report_payment_issue). Perfect for intent-classification or help-desk automation training.", "tag": ["Data Generation", "Intent Classification"]},
   ]
}

@app.get("/model/parameters", include_in_schema=True)
async def get_model_parameters() -> Dict:
   

    return {
        "parameters": {
            "temperature": {"min": 0.0, "max": 2.0, "default": 0.0},
            "top_p": {"min": 0.0, "max": 1.0, "default": 1.0},
            #"min_p": {"min": 0.0, "max": 1.0, "default": 0.0},
            "top_k": {"min": 0, "max": 300, "default": 50},
            "max_tokens": {"min": 1, "max": 8192, "default": 8192}
        }
    }



@app.post("/complete_gen_prompt")
async def complete_prompt(request: SynthesisRequest):
    """Allow users to see whole prompt which goes finally into LLM"""
    try:
        topic = request.topics[0]
        batch_size = 5 if request.num_questions>=5 else request.num_questions
        omit_questions = []

        if request.technique == Technique.Freeform:
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
        elif request.technique == Technique.Custom_Workflow:

            inputs = []
            path = None # Initialize path

            try:
                if not request.input_path:
                    raise ValueError("input_path must not be empty or None")
                if not isinstance(request.input_path, (list, tuple)):
                    # Or handle a single string case if needed, e.g., path = request.input_path
                    raise TypeError("input_path must be a list or tuple of paths")
                if not request.input_path[0]:
                    raise ValueError("First path in input_path is empty")

                path = request.input_path[0]

            except (ValueError, TypeError, IndexError) as e: # Catch specific errors for clarity
                # Raise appropriate HTTP exception for bad request data
                raise HTTPException(status_code=400, detail=f"Invalid input_path: {str(e)}")
            except Exception as e: # Catch any other unexpected errors getting the path
                raise HTTPException(status_code=500, detail=f"Unexpected error getting input path: {str(e)}")


            # Proceed only if path was successfully retrieved
            try:
                with open(path) as f:
                    data = json.load(f)

                    # Assuming data is a list of dicts
                    if not isinstance(data, list):
                        raise ValueError(f"Expected JSON data in {path} to be a list, but got {type(data).__name__}")

                    inputs.extend(item.get(request.input_key, '') for item in data if isinstance(item, dict)) # Ensure item is a dict

            except FileNotFoundError:
                raise HTTPException(status_code=404, detail=f"Input file not found: {path}")
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail=f"Invalid JSON in file: {path}")
            except ValueError as e: # For the list/dict structure check
                raise HTTPException(status_code=400, detail=f"Invalid data structure in {path}: {str(e)}")
            except Exception as e: # Catch any other unexpected file processing errors
                raise HTTPException(status_code=500, detail=f"Error processing file {path}: {str(e)}")


            # Check if inputs list is empty before accessing index 0
            if not inputs:
                # Raise an error indicating no data was extracted based on the key
                raise HTTPException(status_code=400, detail=f"No data extracted from {path} using key '{request.input_key}'. The file might be empty, the key might not exist, or the JSON structure is unexpected.")

            input_data = inputs[0] 

            prompt = PromptBuilder.build_generate_result_prompt(
                model_id=request.model_id,
                use_case=request.use_case,
                input=input_data,
                examples=request.examples or [],
                schema=request.schema,
                custom_prompt=request.custom_prompt,
            )
        elif request.technique == Technique.SFT:
             prompt = PromptBuilder.build_prompt(
                        model_id=request.model_id,
                        use_case=request.use_case,
                        topic=topic,
                        num_questions=batch_size,
                        omit_questions=omit_questions,
                        examples=request.examples or [],
                        technique=request.technique,
                        schema=request.schema,
                        custom_prompt=request.custom_prompt,
                    )

        return {"complete_prompt":prompt}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/complete_eval_prompt")
async def complete_prompt(request: EvaluationRequest):
    """Allow users to see whole prompt which goes finally into LLM"""
    try:
      

        if request.technique == Technique.Freeform:
            with open(request.import_path, 'r') as file:
                data = json.load(file)
            
                # Ensure data is a list of rows
            rows = data if isinstance(data, list) else [data]
            prompt = PromptBuilder.build_freeform_eval_prompt(
                request.model_id,
                request.use_case,
                rows[0],
                request.examples,
                request.custom_prompt
            )
  
        elif request.technique == Technique.SFT or request.technique == Technique.Custom_Workflow:
                  
                with open(request.import_path, 'r') as file:
                    data = json.load(file)
                qa_pairs =  [{
                request.output_key: item.get(request.output_key, ''),  # Use get() with default value
                request.output_value: item.get(request.output_value, '')   # Use get() with default value
            } for item in data]
                qa_pair = qa_pairs[0]
                prompt = PromptBuilder.build_eval_prompt(
                    request.model_id,
                    request.use_case,
                    qa_pair[request.output_key],
                    qa_pair[request.output_value],
                    request.examples,
                    request.custom_prompt
                )

        return {"complete_prompt":prompt}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.get("/{use_case}/gen_prompt")
async def customise_prompt(use_case: UseCase):
    """Allow users to customize prompt. Only part of the prompt which can be customized"""
    try:
        return PromptHandler.get_default_custom_prompt(use_case,custom_prompt=None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/{use_case}/gen_freeform_prompt")
async def customise_prompt(use_case: UseCase):
    """Allow users to customize prompt. Only part of the prompt which can be customized"""
    try:
        return USE_CASE_CONFIGS[use_case].prompt
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/{use_case}/eval_prompt")
async def customise_prompt(use_case: UseCase):
    """Allow users to customize prompt. Only part of the prompt which can be customized"""
    try:
        return USE_CASE_CONFIGS_EVALS[use_case].prompt
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sql_schema")
async def customise_prompt():
    """Allow users to customize prompt. Only part of the prompt which can be customized"""
    try:
        use_case = "text2sql"
        return PromptHandler.get_default_schema(use_case,schema=None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
   
@app.get("/generations/history", include_in_schema=True)
async def get_generation_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page")
):
    """Get history of all generations with pagination"""
    pending_job_ids = db_manager.get_pending_generate_job_ids()
    
    if pending_job_ids:
        job_status_map = {
            job_id: get_job_status(job_id)
            for job_id in pending_job_ids
        }
        db_manager.update_job_statuses_generate(job_status_map)
    
    # Get paginated data
    #total_count, results = db_manager.get_paginated_generate_metadata(page, page_size)
    total_count, results = db_manager.get_paginated_generate_metadata_light(page, page_size)
    
    # Return in the structure expected by the frontend
    return {
        "data": results,  # Changed from "datasets" to "data" for consistency
        "pagination": {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    }
# @app.get("/generations/history", include_in_schema=True)
# async def get_generation_history():
#     """Get history of all generations"""
#     pending_job_ids = db_manager.get_pending_generate_job_ids()

#     if not pending_job_ids:
#         return db_manager.get_all_generate_metadata()

#     job_status_map = {
#             job_id: get_job_status(job_id) 
#             for job_id in pending_job_ids
#         }
#     db_manager.update_job_statuses_generate(job_status_map)
    
#     return db_manager.get_all_generate_metadata()

@app.get("/generations/{file_name}", include_in_schema=True)
async def get_generation_by_filename(file_name: str):
    """Get generation metadata by filename"""
    result = db_manager.get_metadata_by_filename(file_name)
    
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No generation found with filename: {file_name}"
        )
    
    return result

@app.get("/dataset_details/{file_path}", include_in_schema=True)
async def get_dataset(file_path: str):
    with open(file_path) as f:
            data = json.load(f)
    
   
    if 'qa_pairs' and 'evaluated' in file_path:
            for key in data:
                if key != "Overall_Average" and isinstance(data[key], dict):
                    data[key]["evaluated_pairs"] = data[key]["evaluated_pairs"][:100]
            return {"evaluation": data}
            
    elif 'qa_pairs' in file_path:
            return {'generation': data[0:100]}

@app.get("/exports/history", include_in_schema=True)
def get_exports_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page")
):
    """Get history of all exports with pagination"""
    pending_job_ids = db_manager.get_pending_export_job_ids()
    
    if pending_job_ids:
        job_status_map = {
            job_id: get_job_status(job_id)
            for job_id in pending_job_ids
        }
        db_manager.update_job_statuses_export(job_status_map)
    
    # Get paginated data
    total_count, results = db_manager.get_paginated_export_metadata(page, page_size)
    
    return {
        "data": results,  # Keep the same response format for backward compatibility
        "pagination": {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    }
    

@app.get("/evaluations/history", include_in_schema=True)
async def get_evaluation_history(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page")
):
    """Get history of all evaluations with pagination"""
    pending_job_ids = db_manager.get_pending_evaluate_job_ids()
    
    if pending_job_ids:
        job_status_map = {
            job_id: get_job_status(job_id)
            for job_id in pending_job_ids
        }
        db_manager.update_job_statuses_evaluate(job_status_map)
    
    # Get paginated data
    total_count, results = db_manager.get_paginated_evaluate_metadata(page, page_size)
    
    return {
        "data": results,  # Keep the same response format for backward compatibility
        "pagination": {
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    }


@app.get("/evaluations/{file_name}", include_in_schema=True)
async def get_evaluation_by_filename(file_name: str):
    """Get generation metadata by filename"""
    result = db_manager.get_evaldata_by_filename(file_name)
    
    if result is None:
        raise HTTPException(
            status_code=404,
            detail=f"No evaluation found with filename: {file_name}"
        )
    
    return result



@app.put("/generations/display-name")
async def update_display_name_generate(file_name: str, display_name: str):
    """Update display name for a generation"""
    db_manager.update_generate_display_name(file_name, display_name)
    return {"message": "Display name updated successfully"}

@app.put("/evaluations/display-name")
async def update_display_name_evaluate(file_name: str, display_name: str):
    """Update display name for a generation"""
    db_manager.update_evaluate_display_name(file_name, display_name)
    return {"message": "Display name updated successfully"}

@app.delete("/generations/{file_name}")
async def delete_generation(file_name: str, file_path: Optional[str] = None):
    """Delete generation metadata and optionally delete the local file"""
    db_manager.delete_generate_data(file_name, file_path)
    return {"message": f"Generation data for '{file_name}' has been deleted successfully."}


@app.delete("/evaluations/{file_name}")
async def delete_evaluation(file_name: str, file_path: Optional[str] = None):
    """Delete evaluation metadata and optionally delete the local file"""
    db_manager.delete_evaluate_data(file_name, file_path)
    return {"message": f"Evaluation data for '{file_name}' has been deleted successfully."}





@app.get("/use-cases/{use_case}/topics")
async def get_topics(use_case: UseCase):
    """Get available topics for a specific use case"""
   
    topics = USE_CASE_CONFIGS[use_case].topics

    return {"topics":topics}

@app.get("/{use_case}/gen_examples")
async def get_gen_examples(use_case: UseCase):
        if use_case ==UseCase.CUSTOM:
            return {"examples":[]}
        else:
            return {"examples": USE_CASE_CONFIGS[use_case].default_examples}

@app.get("/{use_case}/eval_examples")
async def get_eval_examples(use_case: UseCase):
    
    if use_case ==UseCase.CUSTOM:
        examples = []

    else:
        examples = USE_CASE_CONFIGS_EVALS[use_case].default_examples
    
    
    return {"examples": examples}

@app.get("/{use_case}/custom_gen_examples")
async def get_custom_gen_examples(use_case: UseCase):
    
                
    if use_case == UseCase.CODE_GENERATION:
        examples = [
        """#Here's how to create and modify a list in Python:
        # Create an empty list\n
        my_list = []
        #  Add elements using append\n
        my_list.append(1)\n
        my_list.append(2)\n\n
        # # Create a list with initial elements
        my_list = [1, 2, 3]
        """,

        """#Here's how to implement a basic stack:class Stack:
        def __init__(self):
        self.items = []
        def push(self, item):
        self.items.append(item)
        def pop(self):
        if not self.is_empty():
        return self.items.pop()
        def is_empty(self):
        return len(self.items) == 0"""
    ]
        
        
    
    elif use_case == UseCase.TEXT2SQL:

        examples = [ """
                    SELECT e.name, d.department_name
                    FROM employees e
                    JOIN departments d ON 
                    e.department_id = d.id;""",

                    """SELECT *
                        FROM employees
                        WHERE salary > 50000;"""
        ]
        
        
    elif use_case == UseCase.CUSTOM:
        examples = []
        
                   
        
    return {"examples": examples}

@app.get("/health")
async def health_check():
    """Get API health status"""
    #return {"status": "healthy"}
    return synthesis_legacy_service.get_health_check()

@app.get("/{use_case}/example_payloads")
async def get_example_payloads(use_case:UseCase):
    """Get example payloads for different use cases"""
    if use_case == UseCase.CODE_GENERATION:
        payload = {
                    "use_case": "code_generation",
                    "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
                    "num_questions": 3,
                    "technique": "sft",
                    "topics": ["python_basics", "data_structures"],
                    "is_demo": True,
                    "max_concurrent_topics": 5,
                    "examples":  [
                {
                    "question": "How do you create a list in Python and add elements to it?",
                    "solution": "Here's how to create and modify a list in Python:\n\n```python\n# Create an empty list\nmy_list = []\n\n# Add elements using append\nmy_list.append(1)\nmy_list.append(2)\n\n# Create a list with initial elements\nmy_list = [1, 2, 3]\n```"
                },
                {
                    "question": "How do you implement a stack using a list in Python?",
                    "solution": "Here's how to implement a basic stack:\n\n```python\nclass Stack:\n    def __init__(self):\n        self.items = []\n    \n    def push(self, item):\n        self.items.append(item)\n    \n    def pop(self):\n        if not self.is_empty():\n            return self.items.pop()\n    \n    def is_empty(self):\n        return len(self.items) == 0\n```"
                }
                ],
                    
                    "model_params": {
                        "temperature": 0.0,  # More precise responses
                        "top_p": 1.0,
                        "top_k": 250,
                        "max_tokens": 4096  # Updated for Claude-3
                    }
                }
    elif use_case == UseCase.TEXT2SQL:
        payload = {
                    "use_case": "text2sql",
                    "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
                    "num_questions": 3,
                    "technique": "sft",
                    "topics": ["basic_queries", "joins"],
                    "is_demo": True,
                    "max_concurrent_topics": 5,
                    "schema": "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(100), email VARCHAR(255));\nCREATE TABLE orders (id INT PRIMARY KEY, user_id INT, amount DECIMAL(10,2), FOREIGN KEY (user_id) REFERENCES users(id));",
                    "examples":[
                                {
                                    "question": "How do you select all employees from the employees table?",
                                    "solution": "Here's the SQL query:\n```sql\nSELECT *\nFROM employees;\n```"
                                },
                                {
                                    "question": "How do you join employees and departments tables to get employee names with their department names?",
                                    "solution": "Here's the SQL query:\n```sql\nSELECT e.name, d.department_name\nFROM employees e\nJOIN departments d ON e.department_id = d.id;\n```"
                                }
                            ],
                   
                    "model_params": {
                        "temperature": 0.0,  # More precise responses
                        "top_p": 1.0,
                        "top_k": 250,
                        "max_tokens": 4096  # Updated for Claude-3
                    }
                }
    elif use_case == UseCase.CUSTOM:
        payload = {
            "use_case": "custom",
            "model_id": "us.anthropic.claude-3-5-haiku-20241022-v1:0",
            "num_questions": 3,
            "technique": "sft",
            "topics": ["topic 1", "topic 2"],
            "custom_prompt": "Give your instructions here",
            "is_demo": True,
            "max_concurrent_topics": 5,
            
            "examples":[
                        {
                            "question": "question 1",
                            "solution": "solution 1"
                        },
                        {
                            "question": "question 2",
                            "solution": "solution 2"
                        }
                    ],
            "export_type": ["local", "huggingface"],
            "model_params": {
                "temperature": 0.0,  
                "top_p": 1.0,
                "top_k": 250,
                "max_tokens": 4096  
            }
        }

    return payload


@app.get("/synthesis-studio/check-upgrade", response_model=StudioUpgradeStatus)
async def check_upgrade_status():
    """Check if any upgrades are available"""
    try:
        # Fetch latest changes
        subprocess.run(["git", "fetch"], check=True, capture_output=True)
        
        # Get current branch
        branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            check=True, 
            capture_output=True, 
            text=True
        ).stdout.strip()
        
        # Get local and remote commits
        local_commit = subprocess.run(
            ["git", "rev-parse", branch],
            check=True,
            capture_output=True,
            text=True
        ).stdout.strip()
        
        remote_commit = subprocess.run(
            ["git", "rev-parse", f"origin/{branch}"],
            check=True,
            capture_output=True,
            text=True
        ).stdout.strip()
        
        updates_available = local_commit != remote_commit
        
        return StudioUpgradeStatus(
            git_local_commit=local_commit,
            git_remote_commit=remote_commit,
            updates_available=updates_available
        )
        
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Git error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/synthesis-studio/upgrade", response_model=StudioUpgradeResponse)
async def perform_upgrade():
    """
    Perform upgrade process:
    1. Pull latest code
    2. Run database migrations
    3. Build frontend (includes dependency sync)
    4. Restart application
    """
    try:
        messages = []
        git_updated = False
        frontend_rebuilt = False
        db_upgraded = False
        
        PROJECT_ROOT = Path(os.getcwd())
        
        # 1. Git operations
        try:
            # Stash any changes
            subprocess.run(["git", "stash"], check=True, capture_output=True)
            
            # Pull updates
            subprocess.run(["git", "pull"], check=True, capture_output=True)
            
            # Try to pop stash
            try:
                subprocess.run(["git", "stash", "pop"], check=True, capture_output=True)
            except subprocess.CalledProcessError:
                messages.append("Warning: Could not restore local changes")
            
            git_updated = True
            messages.append("Git repository updated")
            
        except subprocess.CalledProcessError as e:
            messages.append(f"Git update failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

        # 2. Database migrations
        try:
            result = subprocess.run(
                ["uv", "run", "python", "run_migrations.py"],
                capture_output=True,
                text=True,
                check=True,
                cwd=PROJECT_ROOT
            )
            
            print(result.stdout)
            db_upgraded = True
            messages.append("Database migrations completed")
        except subprocess.CalledProcessError as e:
            messages.append(f"Database migration failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        
        # 3. Build frontend (build_client.sh handles uv and dependencies)
        try:
            subprocess.run(
                ["bash", "build/shell_scripts/build_client.sh"], 
                check=True,
                cwd=PROJECT_ROOT
            )
            frontend_rebuilt = True
            messages.append("Frontend rebuilt successfully")
        except subprocess.CalledProcessError as e:
            messages.append(f"Frontend build failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        
        # 4. Restart application
        if git_updated or frontend_rebuilt or db_upgraded:
            try:
                time.sleep(5)
                restart_application()
                messages.append("Application restart initiated")
                
                return StudioUpgradeResponse(
                    success=True,
                    message="; ".join(messages),
                    git_updated=git_updated,
                    frontend_rebuilt=frontend_rebuilt
                )
                
            except Exception as e:
                messages.append(f"Application restart failed: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upgrade failed: {str(e)}")


# ────────────────────────────────────────────────────────────────
# Custom Model Endpoint Management APIs
# ────────────────────────────────────────────────────────────────

@app.post("/add_model_endpoint", include_in_schema=True, responses=responses,
          description="Add a custom model endpoint")
async def add_custom_model_endpoint(request: AddCustomEndpointRequest):
    """Add a new custom model endpoint"""
    try:
        unique_key = custom_endpoint_manager.add_endpoint(request.endpoint_config)
        
        return {
            "status": "success",
            "message": f"Custom endpoint for '{request.endpoint_config.model_id}' ({request.endpoint_config.provider_type}) added successfully",
            "model_id": request.endpoint_config.model_id,
            "provider_type": request.endpoint_config.provider_type,
            "unique_key": unique_key
        }
        
    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add custom endpoint: {str(e)}")


@app.get("/custom_model_endpoints", include_in_schema=True, responses=responses,
         description="List all custom model endpoints", response_model=CustomEndpointListResponse)
async def list_custom_model_endpoints(provider_type: Optional[str] = None):
    """List all custom model endpoints, optionally filtered by provider type"""
    try:
        if provider_type:
            endpoints = custom_endpoint_manager.get_endpoints_by_provider(provider_type)
        else:
            endpoints = custom_endpoint_manager.get_all_endpoints()
        
        return CustomEndpointListResponse(
            endpoints=endpoints,
            total=len(endpoints)
        )
        
    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list custom endpoints: {str(e)}")


@app.get("/custom_model_endpoints/{model_id}/{provider_type}", include_in_schema=True, responses=responses,
         description="Get a specific custom model endpoint")
async def get_custom_model_endpoint(model_id: str, provider_type: str):
    """Get details of a specific custom model endpoint"""
    try:
        endpoint = custom_endpoint_manager.get_endpoint(model_id, provider_type)
        
        if not endpoint:
            raise HTTPException(
                status_code=404,
                detail=f"Custom endpoint for model '{model_id}' with provider '{provider_type}' not found"
            )
        
        return {
            "status": "success",
            "endpoint": endpoint
        }
        
    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get custom endpoint: {str(e)}")


@app.put("/custom_model_endpoints/{model_id}/{provider_type}", include_in_schema=True, responses=responses,
         description="Update a custom model endpoint")
async def update_custom_model_endpoint(model_id: str, provider_type: str, request: AddCustomEndpointRequest):
    """Update an existing custom model endpoint"""
    try:
        # Ensure the model_id and provider_type in the request match the URL parameters
        if request.endpoint_config.model_id != model_id or request.endpoint_config.provider_type != provider_type:
            raise HTTPException(
                status_code=400,
                detail="Model ID and provider type in request body must match the URL parameters"
            )
        
        success = custom_endpoint_manager.update_endpoint(model_id, provider_type, request.endpoint_config)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Custom endpoint for model '{model_id}' with provider '{provider_type}' not found"
            )
        
        return {
            "status": "success",
            "message": f"Custom endpoint for '{model_id}' ({provider_type}) updated successfully"
        }
        
    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update custom endpoint: {str(e)}")


@app.delete("/custom_model_endpoints/{model_id}/{provider_type}", include_in_schema=True, responses=responses,
           description="Delete a custom model endpoint")
async def delete_custom_model_endpoint(model_id: str, provider_type: str):
    """Delete a custom model endpoint"""
    try:
        success = custom_endpoint_manager.delete_endpoint(model_id, provider_type)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Custom endpoint for model '{model_id}' with provider '{provider_type}' not found"
            )
        
        return {
            "status": "success",
            "message": f"Custom endpoint for '{model_id}' ({provider_type}) deleted successfully"
        }
        
    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete custom endpoint: {str(e)}")


@app.get("/custom_model_endpoints_stats", include_in_schema=True, responses=responses,
         description="Get statistics about custom model endpoints")
async def get_custom_model_endpoints_stats():
    """Get statistics about custom model endpoints"""
    try:
        stats = custom_endpoint_manager.get_endpoint_stats()
        
        return {
            "status": "success",
            "stats": stats
        }
        
    except APIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get endpoint statistics: {str(e)}")


#****** comment below for testing just backend**************
current_directory = os.path.dirname(os.path.abspath(__file__))
client_build_path = os.path.join(current_directory, "client", "dist")
app.mount("/static", StaticFiles(directory=client_build_path, html=True), name="webapp")

#app.mount("/", StaticFiles(directory=client_build_path, html=True), name="webapp")

@app.get("/")
async def serve_index():
   return FileResponse(os.path.join(client_build_path, "index.html"))

@app.get("/{path_name:path}")
async def serve_react_app(path_name: str):
   file_path = os.path.join(client_build_path, path_name)

   if os.path.exists(file_path) and os.path.isfile(file_path):
       return FileResponse(file_path)

   return FileResponse(os.path.join(client_build_path, "index.html")) 