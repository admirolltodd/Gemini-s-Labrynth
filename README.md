# Grim Echoes: 40K Solo RPG

Grim Echoes is a narrative-driven, solo role-playing game set in the grim darkness of the far future. Instead of a rulebook and dice on a table, the Gemini API acts as your Game Master — narrating scenes, enforcing a Warhammer-40,000-inspired ruleset, rolling dice, and reacting to the choices you make. You create a character, recruit a companion, and play through branching missions where every decision (and every roll) shapes the story.

The game runs as a single-page web app and can also be packaged as a native Linux desktop app (Electron) or a native Android app (Capacitor), so a campaign can travel between devices.

## Features

- **AI Game Master** — Gemini handles narration, dialogue, dice rolls, and branching choices in a consistent, lore-accurate voice.
- **Character Wizard** — build a character and choose from a set of "Sanctioned Skills," each with its own in-fiction description.
- **Companion system** — recruit companions with distinct personalities and loyalty that shifts with your choices.
- **Persistent Campaign Log** — a long-term memory digest is fed back to the AI periodically so it remembers events from many turns ago, not just the last few.
- **Tactical Vox map panel** — a side panel summarizing the active theatre, threats, difficulty, and companion status.
- **Session Manifest panel** — surfaces HP, fatigue, afflictions, weapons/gear, and active penalties at a glance.
- **Inventory, Stats & Skills panels**, a save/load menu, and an in-game difficulty selector.
- **Procedural grimdark ambient music** — generated audio, no shipped audio assets.
- **Save backup & restore** — export saves to a portable JSON file and share it (e.g. to Google Drive, email, or any app) via the OS share sheet; import it back later or on a new device. No accounts or OAuth involved, and the exported bundle never includes your API key.
- **Cross-platform packaging**:
  - Runs in any modern browser via Vite.
  - Builds to a single portable HTML file ("universal applet") that runs with no server.
  - Packages as a native Linux desktop app via Electron (`.deb` / `.AppImage`).
  - Packages as a native Android app via Capacitor, with a GitHub Actions workflow (`.github/workflows/android-build.yml`) that builds and publishes a debug APK on every push.

## Tech Stack

- TypeScript, React 19, Vite 6
- Zustand for state management
- Tailwind CSS v4
- Gemini API (`@google/genai`) as the AI Game Master
- Electron + electron-builder for Linux desktop packaging
- Capacitor (`@capacitor/core`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share`) for Android packaging

## Requirements

- Node.js 20 or 22
- A **Gemini API key** ([Google AI Studio](https://aistudio.google.com/)) — required to actually play, since the AI Game Master drives all narration and rules resolution. The app uses a bring-your-own-key model: enter your key in the in-app Settings menu (stored locally on-device) or supply `GEMINI_API_KEY` via environment variable for local dev. The key is deliberately never baked into shipped web/Electron/APK builds and is never included in save backups.

## How to Run

### Web (development)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`, or enter your key in the in-app Settings menu.

### Web (single-file build)

```bash
npm run build
```

Produces `dist/index.html` — a self-contained "universal applet" that runs anywhere without a server.

### Linux desktop (Electron)

An automated setup script is included:

```bash
chmod +x setup-ubuntu.sh
./setup-ubuntu.sh
```

This installs Node.js and the system libraries Electron needs, then builds `.deb` and `.AppImage` installers (in `release/`). See [LINUX_INSTALL.md](LINUX_INSTALL.md) for the manual step-by-step process and troubleshooting missing-library errors.

### Android (Capacitor)

```bash
npm run build:android
npx cap open android
```

This builds the web assets in Capacitor mode and syncs them into the `android/` Gradle project, which can then be built or run from Android Studio. The included GitHub Actions workflow also builds a debug APK automatically and attaches it to a GitHub release for sideloading (e.g. via Obtainium).

## Legal Notice

This project is an unofficial fan creation. All Warhammer 40,000 imagery, lore, and related marks are trademarks or registered trademarks of Games Workshop Limited.

## License

MIT — see [LICENSE](LICENSE).
