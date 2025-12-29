#!/bin/bash
# Build script for Render.com deployment
# Installs system dependencies (including Ghostscript)

set -e

echo "Installing system dependencies..."
apt-get update
apt-get install -y ghostscript

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Build complete!"
