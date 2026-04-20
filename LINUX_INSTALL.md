# Installing Grim Echoes: 40K Solo on Ubuntu 25

This application is built with React, Vite, and Electron, allowing it to run as a native desktop application on Linux.

## Quick Installation

We have provided a setup script that automates the installation of Node.js, dependencies, and builds the final installer.

1.  **Clone or Download** the source code to your Ubuntu machine.
2.  **Open a Terminal** in the project directory.
3.  **Make the script executable**:
    ```bash
    chmod +x setup-ubuntu.sh
    ```
4.  **Run the setup script**:
    ```bash
    ./setup-ubuntu.sh
    ```

---

## After the Script Completes

Once the script finished, your installers will be generated in the `dist-electron/` folder.

### Option 1: Install as a System Package (.deb)
This is the recommended way. It will add the game to your applications menu and manage dependencies.
```bash
sudo dpkg -i dist-electron/grim-echoes-*.deb
sudo apt-get install -f  # Fix any missing dependencies if necessary
```

### Option 2: Run as a Standalone App (AppImage)
If you don't want to install it system-wide:
```bash
chmod +x dist-electron/*.AppImage
./dist-electron/*.AppImage
```

---

## Manual Installation (Step-by-Step)

If the script fails or you prefer manual control:

1.  **Install Node.js**:
    Use [NodeSource](https://github.com/nodesource/nodes) to get the latest LTS version (v22).
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Build the Desktop App**:
    ```bash
    export ELECTRON=true
    npm run build:electron
    ```
4.  **Launch for Development**:
    ```bash
    export ELECTRON=true
    npm run dev
    ```

## System Requirements
- **OS**: Ubuntu 22.04+ (Works on 25)
- **Node.js**: v20 or v22
- **RAM**: 4GB Minimum
- **Graphics**: OpenGL compatible (for the grimdark UI rendering)

## Troubleshooting Missing Libraries

If you see an error like `error while loading shared libraries: libgtk-3.so.0: cannot open shared object file`, it means your Ubuntu installation is missing the necessary GUI libraries for Electron.

The `setup-ubuntu.sh` script installs these automatically, but you can manually install the most common fix with:
```bash
sudo apt-get update
sudo apt-get install -y libgtk-3-0 libgbm1 libnss3 libasound2
```

For a minimal Ubuntu Server (headless) installation, you may need a display server like `Xvfb` or a light window manager to run the app.
