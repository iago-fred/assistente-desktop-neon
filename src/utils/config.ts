/* ============================================
   Config — Position persistence utility
   Handles reading/writing the window position
   to a JSON config file via Tauri fs plugin.
   ============================================ */

export interface PositionState {
  x: number;
  y: number;
}

const CONFIG_FILENAME = "neon-position.json";

/** Quick check if we're running inside Tauri */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Load saved position from the Tauri app data config file,
 * falling back to localStorage for browser dev.
 */
export async function loadPosition(): Promise<PositionState | null> {
  if (isTauri()) {
    try {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const dir = await appDataDir();
      const filePath = await join(dir, CONFIG_FILENAME);
      const raw = await readTextFile(filePath);
      return JSON.parse(raw) as PositionState;
    } catch {
      // File doesn't exist yet — first run
      return null;
    }
  }

  // Browser dev fallback
  try {
    const raw = localStorage.getItem(CONFIG_FILENAME);
    return raw ? (JSON.parse(raw) as PositionState) : null;
  } catch {
    return null;
  }
}

/**
 * Save position to the config file.
 */
export async function savePosition(x: number, y: number): Promise<void> {
  const data: PositionState = { x, y };

  if (isTauri()) {
    try {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const { appDataDir, join } = await import("@tauri-apps/api/path");
      const dir = await appDataDir();
      const filePath = await join(dir, CONFIG_FILENAME);
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
      return;
    } catch (err) {
      console.warn("Failed to save position via Tauri fs:", err);
    }
  }

  // Browser dev fallback
  try {
    localStorage.setItem(CONFIG_FILENAME, JSON.stringify(data));
  } catch (err) {
    console.warn("Failed to save position to localStorage:", err);
  }
}
