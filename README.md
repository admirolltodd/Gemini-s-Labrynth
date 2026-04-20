# Grim Echoes: 40K Solo RPG

**Grim Echoes** is a narrative-driven, solo role-playing experience set in the grim darkness of the far future. Powered by the Gemini AI, it functions as a digital Game Master, handling narrative, rules enforcement, dice rolls, and atmospheric storytelling.

## 🌌 Features

- **AI Game Master**: Powered by Gemini for lore-accurate, reactive storytelling.
- **Dynamic Rules System**: Based on the Warhammer 40,000 Solo RPG v2.0 ruleset.
- **Companion System**: Recruit companions with unique personalities and loyalty levels that influence game choices.
- **Grimdark UI**: A high-contrast, atmospheric interface designed for immersion.
- **Narrative Distinction**: Specialized "Vox-Link" UI for character dialogue to distinguish it from atmospheric narration.
- **Cross-Platform**: Run in your browser via AI Studio or as a native desktop application on Linux.

---

## 🐧 Linux Installation (Ubuntu 25 / 24.04 / 22.04)

This application is built using React and Electron, allowing for a native desktop experience on Linux. Follow these steps to build and install it on your system.

### 1. Prerequisite: System Libraries
Electron requires several graphical and system libraries that are not always present on minimal or server-based Ubuntu installations. 

**Required libraries include:**
- GTK+ 3 (libgtk-3-0)
- NSS (libnss3)
- ALSA (libasound2)
- Mesa/DRM (libgbm1, libdrm2)

### 2. Automated Installation (Recommended)
We have provided a comprehensive shell script that updates your system, installs the correct Node.js version, fetches all dependencies, and builds the application.

1.  **Download/Clone** this repository to your local machine.
2.  **Open a Terminal** in the root of the project.
3.  **Make the script executable**:
    ```bash
    chmod +x setup-ubuntu.sh
    ```
4.  **Run the script**:
    ```bash
    ./setup-ubuntu.sh
    ```

The script will ask for your `sudo` password to install the necessary system libraries.

### 3. Manual Build Process
If you prefer to handle the steps manually:

1.  **Install Node.js 22**:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```
2.  **Install System Dependencies**:
    ```bash
    sudo apt-get update && sudo apt-get install -y \
      libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libmesa-glx0 libasound2 libgtk-3-0 libgbm1
    ```
3.  **Install NPM Packages**:
    ```bash
    npm install
    ```
4.  **Build the Electron App**:
    ```bash
    export ELECTRON=true
    npm run build:electron
    ```

### 4. Running the Application
After the build process completes, your installers are located in the `dist-electron/` folder.

-   **Install .deb package**: `sudo dpkg -i dist-electron/*.deb`
-   **Run AppImage**: `./dist-electron/*.AppImage` (Ensure it is executable first with `chmod +x`).

---

## 🛠️ Development & Web Use

To run the game in a web browser for development or quick play:

1.  **Set your API Key**:
    Copy `.env.example` to `.env` and add your `GEMINI_API_KEY`.
2.  **Run Dev Server**:
    ```bash
    npm run dev
    ```
3.  **Access**: Open `http://localhost:3000` in your browser.

---

## 📜 Legal Notice
This project is an unofficial fan creation. All Warhammer 40,000 imagery, lore, and related marks are trademarks or registered trademarks of Games Workshop Limited.
