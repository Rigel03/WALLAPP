import { registerPlugin } from '@capacitor/core';

export type WallpaperTarget = 'SYSTEM' | 'LOCK' | 'BOTH';

export interface ScheduleSyncItem {
  id: string;
  time: string; // "HH:mm" in 24-hour format
  wallpaperPath: string; // filename in FilesDir/wallpapers/
  target: WallpaperTarget;
  enabled: boolean;
}

export interface WallpaperPluginInterface {
  /**
   * Immediately applies a wallpaper from the local filesystem.
   */
  setWallpaper(options: {
    filePath: string;
    target: WallpaperTarget;
  }): Promise<{ success: boolean; message?: string }>;

  /**
   * Cycles to the next saved wallpaper in the queue.
   */
  cycleNextWallpaper(): Promise<{
    success: boolean;
    activeWallpaperPath?: string;
  }>;

  /**
   * Synchronizes the wallpaper queue and time schedules with native Android SharedPreferences
   * and registers exact/periodic alarms via AlarmManager so background tasks and Quick Settings Tile work offline.
   */
  syncState(options: {
    wallpaperPaths: string[];
    schedules: ScheduleSyncItem[];
    defaultTarget: WallpaperTarget;
  }): Promise<{ success: boolean }>;
}

export const WallpaperPlugin = registerPlugin<WallpaperPluginInterface>('WallpaperPlugin', {
  web: () => ({
    async setWallpaper({ filePath, target }: { filePath: string; target: WallpaperTarget }) {
      console.log(`[Web Fallback] Setting ${target} wallpaper to:`, filePath);
      return { success: true, message: 'Simulated in browser mode' };
    },
    async cycleNextWallpaper() {
      console.log('[Web Fallback] Cycling to next wallpaper');
      return { success: true };
    },
    async syncState(options: {
      wallpaperPaths: string[];
      schedules: ScheduleSyncItem[];
      defaultTarget: WallpaperTarget;
    }) {
      console.log('[Web Fallback] Synced state to native storage:', options);
      return { success: true };
    },
  }),
});
