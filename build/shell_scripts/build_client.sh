#!/bin/bash
set -eox pipefail

# Set UV timeout for slow networks
export UV_HTTP_TIMEOUT=3600

# Ensure uv is installed
set +e
uv --version >/dev/null 2>&1
return_code=$?
set -e
if [ $return_code -ne 0 ]; then
    echo "Installing uv package manager via pip..."
    python -m pip install uv
fi

# Setup virtual environment and dependencies
VENV_DIR=".venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    uv venv "$VENV_DIR"
fi

# Install dependencies with uv pip
echo "Installing Python dependencies..."
uv sync --all-extras

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Setup Node.js
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 16 ]; then
    echo "Setting up Node.js..."
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
fi

# Build frontend
echo "Building frontend..."
CLIENT_DIR="app/client"
export NODE_OPTIONS=--max-old-space-size=16384
cd "$CLIENT_DIR"
rm -rf node_modules/
npm install
npm run build

echo "Build completed successfully!"