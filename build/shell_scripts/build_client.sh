#!/bin/bash
set -eox pipefail

# Set UV timeout for slow networks
export UV_HTTP_TIMEOUT=3600

# Use copy mode for uv to avoid hardlink warnings across filesystems
export UV_LINK_MODE=copy

# Ensure uv is installed
set +e
uv --version >/dev/null 2>&1
return_code=$?
set -e
if [ $return_code -ne 0 ]; then
    echo "Installing uv package manager via pip..."
    python -m pip install uv
fi

# =============================================================================
# Phase 1: Setup virtual environment
# In CML environments, use /tmp to avoid CephFS issues with rapid file operations
# =============================================================================
if [ -n "$CDSW_PROJECT" ]; then
    echo "CML environment detected - using local storage for venv"
    export UV_PROJECT_ENVIRONMENT="/tmp/sds-venv"
    VENV_DIR="/tmp/sds-venv"
else
    VENV_DIR=".venv"
fi

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment at $VENV_DIR..."
    uv venv "$VENV_DIR"
fi

# Install dependencies
echo "Installing Python dependencies..."
uv sync --all-extras

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# =============================================================================
# Phase 2: Setup Node.js
# In CML environments, install directly to /tmp to avoid nvm issues on CephFS
# =============================================================================
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 16 ]; then
    echo "Setting up Node.js..."

    if [ -n "$CDSW_PROJECT" ]; then
        # CML environment - install Node directly to /tmp (avoid nvm on CephFS)
        NODE_VERSION="20.18.0"
        NODE_DIR="/tmp/node-v${NODE_VERSION}-linux-x64"

        if [ ! -d "$NODE_DIR" ]; then
            echo "Installing Node.js ${NODE_VERSION} to local storage..."
            curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
                | tar -xJ -C /tmp
        fi

        export PATH="${NODE_DIR}/bin:$PATH"
        echo "Node.js $(node -v) ready at ${NODE_DIR}"
    else
        # Local development - use nvm
        wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install 20
        nvm use 20
    fi
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