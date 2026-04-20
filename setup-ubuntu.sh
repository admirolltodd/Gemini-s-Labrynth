#!/bin/bash

# Grim Echoes: 40K Solo - Ubuntu/Linux Setup Script
# Works on Ubuntu 24.04, 24.10, and 25 (future)

set -e

echo "--- Initializing Grim Echoes Setup for Linux ---"

# Step 1: Update and install base dependencies
echo "Updating system and installing base dependencies (including GTK3 for Electron)..."
sudo apt-get update
sudo apt-get install -y \
    curl \
    build-essential \
    git \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libmesa-glx0 \
    libasound2 \
    libgtk-3-0 \
    libgbm1 \
    libxshmfence1 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxss1 \
    libxtst6 \
    libxrandr2 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6

# Step 2: Install Node.js (v20 or v22)
if ! command -v node &> /dev/null
then
    echo "Node.js not found. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed ($(node -v))."
fi

# Step 3: Install project dependencies
echo "Installing project dependencies..."
npm install

# Step 4: Build the application
echo "Building the application for Production..."
# Set ELECTRON=true for the build process
export ELECTRON=true
npm run build:electron

echo "--- Build Complete! ---"
echo ""
echo "Installation Artifacts found in: dist-electron/"
echo "You can install the .deb package using:"
echo "sudo dpkg -i dist-electron/*.deb"
echo ""
echo "Or run the AppImage directly:"
echo "./dist-electron/*.AppImage"
