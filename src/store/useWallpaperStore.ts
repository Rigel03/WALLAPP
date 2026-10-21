import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { WallpaperPlugin, type WallpaperTarget, type ScheduleSyncItem } from '../plugins/wallpaperPlugin';

export interface WallpaperItem {
  id: string;
  name: string;
  fileName: string; // Stored inside Directory.Data -> "wallpapers/<fileName>"
  dataUrl: string;  // Preview URL or base64 data URI for fast UI rendering
  createdAt: number;
}

export interface ScheduleRule {
  id: string;
  time: string; // "HH:mm"
  wallpaperId: string;
  target: WallpaperTarget;
  enabled: boolean;
  label?: string;
}

interface WallpaperState {
  wallpapers: WallpaperItem[];
  schedules: ScheduleRule[];
  activeWallpaperId: string | null;
  defaultTarget: WallpaperTarget;
  isSyncing: boolean;
  statusMessage: string | null;

  // Actions
  addWallpaper: (file: File) => Promise<void>;
  removeWallpaper: (id: string) => Promise<void>;
  applyWallpaperNow: (id: string, target?: WallpaperTarget) => Promise<void>;
  cycleNext: () => Promise<void>;
  addSchedule: (time: string, wallpaperId: string, target: WallpaperTarget, label?: string) => Promise<void>;
  toggleSchedule: (id: string) => Promise<void>;
  removeSchedule: (id: string) => Promise<void>;
  setDefaultTarget: (target: WallpaperTarget) => Promise<void>;
  clearStatus: () => void;
  syncWithNative: () => Promise<void>;
}

const WALLPAPER_DIR = 'wallpapers';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const useWallpaperStore = create<WallpaperState>()(
  persist(
    (set, get) => ({
      wallpapers: [],
      schedules: [],
      activeWallpaperId: null,
      defaultTarget: 'BOTH',
      isSyncing: false,
      statusMessage: null,

      clearStatus: () => set({ statusMessage: null }),

      syncWithNative: async () => {
        const { wallpapers, schedules, defaultTarget } = get();
        const wallpaperPaths = wallpapers.map((w) => `${WALLPAPER_DIR}/${w.fileName}`);

        const mappedSchedules: ScheduleSyncItem[] = schedules
          .map((s) => {
            const wp = wallpapers.find((w) => w.id === s.wallpaperId);
            if (!wp) return null;
            return {
              id: s.id,
              time: s.time,
              wallpaperPath: `${WALLPAPER_DIR}/${wp.fileName}`,
              target: s.target,
              enabled: s.enabled,
            };
          })
          .filter((item): item is ScheduleSyncItem => item !== null);

        try {
          await WallpaperPlugin.syncState({
            wallpaperPaths,
            schedules: mappedSchedules,
            defaultTarget,
          });
        } catch (err) {
          console.error('Failed to sync state with native Android layer:', err);
        }
      },

      addWallpaper: async (file: File) => {
        set({ isSyncing: true, statusMessage: 'Saving image to local storage...' });
        try {
          const dataUrl = await fileToBase64(file);
          const base64Data = dataUrl.split(',')[1];
          const id = crypto.randomUUID();
          const ext = file.name.split('.').pop() || 'jpg';
          const safeFileName = `wp_${id}.${ext}`;
          const relativePath = `${WALLPAPER_DIR}/${safeFileName}`;

          // Write to Capacitor local Directory.Data (maps to context.getFilesDir() on Android)
          await Filesystem.writeFile({
            path: relativePath,
            data: base64Data,
            directory: Directory.Data,
            recursive: true,
          });

          const newItem: WallpaperItem = {
            id,
            name: file.name.replace(/\.[^/.]+$/, ''),
            fileName: safeFileName,
            dataUrl,
            createdAt: Date.now(),
          };

          set((state) => ({
            wallpapers: [newItem, ...state.wallpapers],
            activeWallpaperId: state.activeWallpaperId ?? newItem.id,
            isSyncing: false,
            statusMessage: `Saved "${newItem.name}" locally`,
          }));

          await get().syncWithNative();
        } catch (error) {
          console.error('Error saving wallpaper:', error);
          set({
            isSyncing: false,
            statusMessage: 'Failed to save wallpaper to filesystem',
          });
        }
      },

      removeWallpaper: async (id: string) => {
        const targetWp = get().wallpapers.find((w) => w.id === id);
        if (!targetWp) return;

        try {
          await Filesystem.deleteFile({
            path: `${WALLPAPER_DIR}/${targetWp.fileName}`,
            directory: Directory.Data,
          });
        } catch (e) {
          console.warn('File already removed or running in browser fallback:', e);
        }

        set((state) => ({
          wallpapers: state.wallpapers.filter((w) => w.id !== id),
          schedules: state.schedules.filter((s) => s.wallpaperId !== id),
          activeWallpaperId:
            state.activeWallpaperId === id
              ? state.wallpapers.find((w) => w.id !== id)?.id ?? null
              : state.activeWallpaperId,
          statusMessage: `Removed "${targetWp.name}"`,
        }));

        await get().syncWithNative();
      },

      applyWallpaperNow: async (id: string, customTarget?: WallpaperTarget) => {
        const { wallpapers, defaultTarget } = get();
        const wp = wallpapers.find((w) => w.id === id);
        if (!wp) return;

        const target = customTarget ?? defaultTarget;
        set({ isSyncing: true, statusMessage: `Applying "${wp.name}" (${target})...` });

        try {
          const relativePath = `${WALLPAPER_DIR}/${wp.fileName}`;
          const res = await WallpaperPlugin.setWallpaper({
            filePath: relativePath,
            target,
          });

          set({
            activeWallpaperId: id,
            isSyncing: false,
            statusMessage: res.success
              ? Capacitor.isNativePlatform()
                ? `Applied "${wp.name}" to ${target}`
                : `Previewing "${wp.name}" (Web Simulation)`
              : 'Could not apply wallpaper',
          });
        } catch (error) {
          console.error('Apply wallpaper error:', error);
          set({ isSyncing: false, statusMessage: 'Error applying wallpaper on device' });
        }
      },

      cycleNext: async () => {
        const { wallpapers, activeWallpaperId, applyWallpaperNow } = get();
        if (wallpapers.length === 0) return;

        const currentIndex = wallpapers.findIndex((w) => w.id === activeWallpaperId);
        const nextIndex = (currentIndex + 1) % wallpapers.length;
        const nextWp = wallpapers[nextIndex];
        await applyWallpaperNow(nextWp.id);
      },

      addSchedule: async (time, wallpaperId, target, label) => {
        const newSchedule: ScheduleRule = {
          id: crypto.randomUUID(),
          time,
          wallpaperId,
          target,
          enabled: true,
          label: label?.trim() || undefined,
        };

        set((state) => ({
          schedules: [...state.schedules, newSchedule].sort((a, b) =>
            a.time.localeCompare(b.time)
          ),
          statusMessage: `Scheduled trigger set for ${time}`,
        }));

        await get().syncWithNative();
      },

      toggleSchedule: async (id: string) => {
        set((state) => ({
          schedules: state.schedules.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s
          ),
        }));
        await get().syncWithNative();
      },

      removeSchedule: async (id: string) => {
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
          statusMessage: 'Schedule removed',
        }));
        await get().syncWithNative();
      },

      setDefaultTarget: async (target: WallpaperTarget) => {
        set({ defaultTarget: target, statusMessage: `Default target set to ${target}` });
        await get().syncWithNative();
      },
    }),
    {
      name: 'wallsync-local-store',
      partialize: (state) => ({
        wallpapers: state.wallpapers,
        schedules: state.schedules,
        activeWallpaperId: state.activeWallpaperId,
        defaultTarget: state.defaultTarget,
      }),
    }
  )
);
