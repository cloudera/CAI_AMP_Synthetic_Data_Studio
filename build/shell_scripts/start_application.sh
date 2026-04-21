#!/bin/bash
set -eox pipefail

# We're already in the project root directory thanks to PathManager

# Determine venv location (matches build_client.sh logic)
if [ -n "$CDSW_PROJECT" ]; then
    VENV_DIR="/tmp/sds-venv"
    export UV_PROJECT_ENVIRONMENT="$VENV_DIR"
    export UV_LINK_MODE=copy
else
    VENV_DIR=".venv"
fi

# If venv doesn't exist (e.g., new session in CML where /tmp is ephemeral), recreate it
if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not found at $VENV_DIR, recreating..."

    # Ensure uv is available
    if ! command -v uv &> /dev/null; then
        python -m pip install uv
    fi

    uv venv "$VENV_DIR"
    uv sync --all-extras
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"

python app/run.py