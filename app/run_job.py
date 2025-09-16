# run_job.py

import subprocess
import sys
import os
import traceback

if os.getenv("IS_COMPOSABLE"):
    os.chdir("/home/cdsw/synthetic-data-studio")





# Get the current notebook's directory
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


import json
from app.models.request_models import SynthesisRequest
from app.services.synthesis_service import SynthesisService
from app.services.synthesis_legacy_service import SynthesisLegacyService
import asyncio
import nest_asyncio  # Add this import

# Enable nested event loop
nest_asyncio.apply()

async def run_synthesis(request, job_name, request_id):
    """Run standard synthesis job for question-answer pairs"""
    try:
        job = SynthesisLegacyService()
        if request.input_path:
            result = await job.generate_result(request, job_name, is_demo=False, request_id=request_id)
        else:
            result = await job.generate_examples(request, job_name, is_demo=False, request_id=request_id)
        
        return result
    except Exception as e:
        print(f"Error in synthesis: {e}")
        raise

async def run_freeform_synthesis(request, job_name, request_id):
    """Run freeform data synthesis job"""
    try:
        job = SynthesisService()
        result = await job.generate_freeform(request, job_name, is_demo=False, request_id=request_id)
        return result
    except Exception as e:
        print(f"Error in freeform synthesis: {e}")
        raise

if __name__ == "__main__":
    try:
        file_name = os.environ.get('file_name', '')   # Get filename from environment variables

        # Read JSON file
        with open(file_name, 'r') as f:
            params = json.load(f)
        
        job_name = params.pop('job_name')
        request_id  = params.pop('request_id')
        print(f"Starting job: {job_name}")
        print(f"Parameters: {params}")
        
        # Clean up the params file after reading
        os.remove(file_name)
        
        # Check if this is a freeform generation request
        is_freeform = params.pop('generation_type', None) == 'freeform'
        
        # Create request object
        request = SynthesisRequest.model_validate(params)
        
        # Get current loop or create new one
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Run appropriate synthesis based on type
        if is_freeform:
            print("Running freeform data generation job")
            result = loop.run_until_complete(run_freeform_synthesis(request, job_name, request_id))
        else:
            print("Running standard question-answer generation job")
            result = loop.run_until_complete(run_synthesis(request, job_name, request_id))
            
        print(f"Job completed successfully: {result}")
        
    except Exception as e:
        print(f"Error in job execution: {e}")
        traceback.print_exc()
        sys.exit(1)