import { registerPlugin } from '@capacitor/core';

export type WallpaperTarget = 'SYSTEM' | 'LOCK' | 'BOTH';

export interface ScheduleSyncItem {
  id: string;
  time: string; // "HH:mm" 24h
  wallpaperPath: string; // relative to the app files dir, e.g. wallpapers/wp_<id>.jpg
  target: WallpaperTarget;
  enabled: boolean;
}

export interface NativeStatus {
  exactAlarm: boolean;
  batteryUnrestricted: boolean;
  currentIndex: number;
  baseDir: string;
}

export interface WallpaperPluginInterface {
  /** Stores an already-downscaled JPEG (+ thumbnail) in app-private storage. Base64 without data: prefix. */
  saveImage(options: { id: string; data: string; thumb: string }): Promise<{ path: string; thumbPath: string }>;
  deleteImage(options: { id: string }): Promise<void>;
  setWallpaper(options: { filePath: string; target: WallpaperTarget }): Promise<{ success: boolean }>;
  cycleNextWallpaper(): Promise<{ success: boolean; activeWallpaperPath?: string }>;
  syncState(options: {
    wallpaperPaths: string[];
    schedules: ScheduleSyncItem[];
    defaultTarget: WallpaperTarget;
  }): Promise<{ success: boolean }>;
  getStatus(): Promise<NativeStatus>;
  requestExactAlarm(): Promise<void>;
  requestBatteryUnrestricted(): Promise<void>;
}

/** Browser fallback so `npm run dev` works without a device. */
const webFallback: WallpaperPluginInterface = {
  async saveImage({ id }) {
    return { path: `wallpapers/wp_${id}.jpg`, thumbPath: `wallpapers/th_${id}.jpg` };
  },
  async deleteImage() {},
  async setWallpaper() {
    return { success: true };
  },
  async cycleNextWallpaper() {
    return { success: true };
  },
  async syncState() {
    return { success: true };
  },
  async getStatus() {
    return { exactAlarm: true, batteryUnrestricted: true, currentIndex: -1, baseDir: '' };
  },
  async requestExactAlarm() {},
  async requestBatteryUnrestricted() {},
};

export const WallpaperPlugin = registerPlugin<WallpaperPluginInterface>('WallpaperPlugin', {
  web: () => webFallback,
});
