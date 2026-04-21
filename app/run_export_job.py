# run_export_job.py

import subprocess
import sys
import os

if os.getenv("IS_COMPOSABLE"):
    
    os.chdir("/home/cdsw/synthetic-data-studio")


# Get the current notebook's directory
notebook_dir = os.getcwd()

# Detect the Python version dynamically
python_version = f"python{sys.version_info.major}.{sys.version_info.minor}"

# Determine venv location - check UV_PROJECT_ENVIRONMENT or CDSW_PROJECT for CML
venv_base = os.environ.get('UV_PROJECT_ENVIRONMENT')
if not venv_base and os.environ.get('CDSW_PROJECT'):
    venv_base = '/tmp/sds-venv'
if not venv_base:
    venv_base = os.path.join(notebook_dir, '.venv')

# Path for Linux virtual environment structure
venv_path = os.path.join(venv_base, 'lib', python_version, 'site-packages')

# Add to path if not already there and if it exists
if os.path.exists(venv_path) and venv_path not in sys.path:
    sys.path.insert(0, venv_path)
    print(f"Added virtual environment path: {venv_path}")
else:
    print(f"Virtual environment path not found: {venv_path}")


import sys
import json
from app.models.request_models import Export_synth

from app.services.export_results import Export_Service
import asyncio
import nest_asyncio  # Add this import

# Enable nested event loop
nest_asyncio.apply()

async def run_export(request):
    try:
        
        job = Export_Service()
        result = job.export(request)
        return result
    except Exception as e:
        print(f"Error in synthesis: {e}")
        raise

if __name__ == "__main__":
    try:
         
        #print(sys.argv)
        #print(os.environ)
        file_name = os.environ.get('file_name', '')  # Get filename from arguments

        # Read JSON file
        with open(file_name, 'r') as f:
            params = json.load(f)
        
         
        print(params)
        os.remove(file_name)
        request = Export_synth.model_validate(params)
        # Get current loop or create new one
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        result = loop.run_until_complete(run_export(request))
        print(result)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)