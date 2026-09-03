# Grim Echoes: 40K Solo RPG

**Grim Echoes** is a narrative-driven, solo role-playing experience set in the grim darkness of the far future. Powered by the Gemini AI free tier, it functions as a digital Game Master, handling narrative, rules enforcement, and atmospheric storytelling. The game engine rolls the dice; the Game Master narrates.

## 🌌 Features

- **AI Game Master**: Powered by free-tier Gemini Flash for lore-accurate, reactive storytelling. No paid plan required.
- **Honest Dice**: Every risky choice is tagged with a stat, skill, and DC by the Game Master, then rolled by the game engine with the platform's cryptographic RNG. The AI never rolls; it only narrates the outcome it is given.
- **The Chronicle**: A persistent markdown memory of every decision, NPC, open thread, and vow. It is sent to the Game Master every turn and can be exported as a `.md` file from the Session Manifest.
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
After the build process completes, your installers are located in the `release/` folder.

-   **Install .deb package**: `sudo dpkg -i release/*.deb`
-   **Run AppImage**: `./release/*.AppImage` (Ensure it is executable first with `chmod +x`).

---

## 🛠️ Development & Web Use

To run the game in a web browser for development or quick play:

1.  **Get a free API Key**:
    Create a key in [Google AI Studio](https://aistudio.google.com/). The free tier needs no card. Paste the key into the in-app **Settings** screen (it is stored on-device only and never baked into a build).
2.  **Run Dev Server**:
    ```bash
    npm run dev
    ```
3.  **Access**: Open `http://localhost:3000` in your browser.

### 📦 Universal Applet (Single HTML File)
You can build the entire game into a single, portable HTML file that runs anywhere without a server. This is the default build mode.

```bash
# Optional: Bake your API key into the file
export GEMINI_API_KEY="your_key_here"

npm run build
```
The resulting `dist/index.html` is a "universal applet". 

**Note on Connection:**
If you see "The Warp interferes with your connection" error:
1.  **Enter API Key**: Open the **Settings** menu in the app and paste your Gemini API key.
2.  **CORS/Browser Restrictions**: Ensure your browser allows network requests from local files. Some browsers (like Chrome) may require a flag or extension to allow local files to reach the Google AI API, though standard HTTPS usually works.

### 🆓 Free Tier Notes

- **Models**: Turns are served by the free-tier Flash models listed in `TURN_MODELS` in `src/lib/gemini.ts` (currently `gemini-3-flash-preview`, falling back to `gemini-2.5-flash`). Pro models are not on the free tier. If Google retires a preview ID, edit that list.
- **Fallback**: If the first model is retired, rate-limited, or refused for your key, the next one is tried automatically. Each model has its own free quota, so this also stretches your daily allowance.
- **Rate limits**: The free tier allows roughly 10–15 requests per minute and a few hundred to a thousand-plus requests per day depending on the model (check the current table in the Gemini API docs). A game turn is one request. If you see "VOX-LINK SATURATED", wait a minute and retry.
- **Data use**: Google may use free-tier prompts and responses to improve its products. Do not put anything personal in your custom actions.
- **Portraits**: Character portraits use `gemini-2.5-flash-image`. If that model is not on your free tier the portrait is simply skipped; the game continues.

### 📜 The Chronicle (memory file)

The Game Master keeps a running **Chronicle**: a timeline of every decision with its roll and consequences, the NPCs you have met and their current standing, unresolved threads, and vows or debts. The whole document is sent with every turn, so earlier choices come back to haunt you. Open the **Manifest** panel in-game to read it, and use **Export Chronicle (.md)** to save it as a markdown file (share sheet on Android, download on desktop and web).

---

## 📜 Legal Notice
This project is an unofficial fan creation. All Warhammer 40,000 imagery, lore, and related marks are trademarks or registered trademarks of Games Workshop Limited.
