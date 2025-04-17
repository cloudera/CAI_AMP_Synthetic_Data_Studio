#!/bin/bash
set -eox pipefail

# We're already in the project root directory thanks to PathManager
CLIENT_DIR="app/client"

# Setup Node.js
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 16 ]; then
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
fi

# Activate virtual environment - using relative path
source .venv/bin/activate

export NODE_OPTIONS=--max-old-space-size=16384
# Build frontend
cd "$CLIENT_DIR"
rm -rf node_modules/
npm install
npm run build