# run_eval_job.py


import subprocess
import sys
import os

if os.getenv("IS_COMPOSABLE"):
    
    os.chdir("/home/cdsw/synthetic-data-studio")


notebook_dir = os.getcwd()

# Detect the Python version dynamically
python_version = f"python{sys.version_info.major}.{sys.version_info.minor}"

# Path for Linux virtual environment structure
venv_path = os.path.join(notebook_dir, '.venv', 'lib', python_version, 'site-packages')

# Add to path if not already there and if it exists
if os.path.exists(venv_path) and venv_path not in sys.path:
    sys.path.insert(0, venv_path)
    print(f"Added virtual environment path: {venv_path}")
else:
    print(f"Virtual environment path not found: {venv_path}")


import sys
import json
from app.models.request_models import EvaluationRequest, ModelParameters

from app.services.evaluator_service import EvaluatorService
from app.services.evaluator_legacy_service import EvaluatorLegacyService
import asyncio
import nest_asyncio  

# Enable nested event loop
nest_asyncio.apply()

async def run_eval(request, job_name, request_id):
    try:
        
        job = EvaluatorLegacyService()
        result = job.evaluate_results(request,job_name, is_demo=False, request_id=request_id)
        return result
    except Exception as e:
        print(f"Error in evaluation: {e}")
        raise

async def run_freeform_eval(request, job_name, request_id):
    """Run freeform data synthesis job"""
    try:
        job = EvaluatorService()
        result = job.evaluate_row_data(request, job_name, is_demo=False, request_id=request_id)
        return result
    except Exception as e:
        print(f"Error in freeform synthesis: {e}")
        raise

if __name__ == "__main__":
    try:
        #print(sys.argv[1], '\n')
        file_name = os.environ.get('file_name', '')   # Get filename from arguments

        # Read JSON file
        with open(file_name, 'r') as f:
            params = json.load(f)
        job_name = params.pop('job_name')
        request_id = params.pop('request_id')
        print(params)
        os.remove(file_name)
        # Check if this is a freeform generation request
        is_freeform = params.pop('generation_type', None) == 'freeform'
        
        request = EvaluationRequest.model_validate(params)
        # Get current loop or create new one
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        # Run appropriate synthesis based on type
        if is_freeform:
            print("Running freeform data generation job")
            result = loop.run_until_complete(run_freeform_eval(request, job_name, request_id))  
        else:
            result = loop.run_until_complete(run_eval(request, job_name, request_id))
        #print(result)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)