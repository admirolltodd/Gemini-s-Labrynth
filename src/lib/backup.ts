/**
 * Save backup / restore via a portable JSON file.
 *
 * Export writes the player's saves to a file and opens the Android share
 * sheet, so they can pick "Save to Drive" (or any cloud / email). Import reads
 * a previously exported file back in. No accounts, no OAuth, no API keys — and
 * it doubles as a way to move an operative to a new phone.
 *
 * The API key is deliberately NOT included in the backup.
 */

import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const SAVES_KEY = "grim-echoes-saves-v2";
const GAME_KEY = "grim-echoes-game";
const BACKUP_FORMAT = "grim-echoes-backup";

interface BackupBundle {
  format: string;
  version: number;
  exportedAt: string;
  saves: Record<string, unknown>;
  currentGame: unknown | null;
}

function readJson(key: string, fallback: unknown) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function buildBackupJson(): string {
  const bundle: BackupBundle = {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    saves: readJson(SAVES_KEY, {}) as Record<string, unknown>,
    currentGame: readJson(GAME_KEY, null),
  };
  return JSON.stringify(bundle, null, 2);
}

export function countSaves(): number {
  return Object.keys(readJson(SAVES_KEY, {}) as Record<string, unknown>).length;
}

/**
 * Export the backup. On Android, writes a file and opens the share sheet so
 * the user can save it to Drive. On the web, falls back to a file download.
 */
export async function exportBackup(): Promise<void> {
  const json = buildBackupJson();
  const filename = `grim-echoes-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "Grim Echoes Save Backup",
      text: "Grim Echoes operative backup — save this to Google Drive.",
      url: res.uri,
      dialogTitle: "Back up your save",
    });
  } else {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export interface ImportResult {
  saveCount: number;
  restoredCurrent: boolean;
}

/**
 * Import a backup file. Merges its named saves into local storage (imported
 * slots overwrite same-named ones) and restores the in-progress game if present.
 * Throws if the file isn't a valid Grim Echoes backup.
 */
export async function importBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  let bundle: BackupBundle;
  try {
    bundle = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!bundle || bundle.format !== BACKUP_FORMAT) {
    throw new Error("That isn't a Grim Echoes backup file.");
  }

  // Merge named saves (imported wins on name collision).
  const existing = readJson(SAVES_KEY, {}) as Record<string, unknown>;
  const merged = { ...existing, ...(bundle.saves || {}) };
  localStorage.setItem(SAVES_KEY, JSON.stringify(merged));

  // Restore the in-progress game, if the backup carried one.
  let restoredCurrent = false;
  if (bundle.currentGame) {
    localStorage.setItem(GAME_KEY, JSON.stringify(bundle.currentGame));
    restoredCurrent = true;
  }

  return { saveCount: Object.keys(bundle.saves || {}).length, restoredCurrent };
}
