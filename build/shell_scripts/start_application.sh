#!/bin/bash
set -eox pipefail

# We're already in the project root directory thanks to PathManager

# Determine venv location (matches build_client.sh logic)
if [ -n "$CDSW_PROJECT" ]; then
    VENV_DIR="/tmp/sds-venv"
else
    VENV_DIR=".venv"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

python app/run.py