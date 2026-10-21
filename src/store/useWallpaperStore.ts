import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';
import {
  WallpaperPlugin,
  type NativeStatus,
  type ScheduleSyncItem,
  type WallpaperTarget,
} from '../plugins/wallpaperPlugin';
import { processImage } from '../lib/image';

/** Only small metadata lives in localStorage; image bytes live in app-private files. */
export interface WallpaperItem {
  id: string;
  name: string;
  path: string; // wallpapers/wp_<id>.jpg (relative to the app files dir)
  thumbPath: string; // wallpapers/th_<id>.jpg
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

export interface Toast {
  text: string;
  kind: 'ok' | 'error';
}

interface State {
  wallpapers: WallpaperItem[];
  schedules: ScheduleRule[];
  activeWallpaperId: string | null;
  defaultTarget: WallpaperTarget;

  // runtime only
  baseDir: string;
  previews: Record<string, string>;
  busy: boolean;
  toast: Toast | null;
  status: NativeStatus | null;

  init: () => Promise<void>;
  refreshNative: () => Promise<void>;
  addFiles: (files: File[]) => Promise<void>;
  removeWallpaper: (id: string) => Promise<void>;
  applyNow: (id: string) => Promise<void>;
  cycleNext: () => Promise<void>;
  addSchedule: (time: string, wallpaperId: string, target: WallpaperTarget, label?: string) => Promise<void>;
  toggleSchedule: (id: string) => Promise<void>;
  removeSchedule: (id: string) => Promise<void>;
  setDefaultTarget: (target: WallpaperTarget) => Promise<void>;
  requestExactAlarm: () => Promise<void>;
  requestBattery: () => Promise<void>;
}

const isNative = Capacitor.isNativePlatform();
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const errText = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : ((e as { message?: string })?.message ?? 'Unknown error');

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const notify = (text: string, kind: Toast['kind'] = 'ok') => {
        clearTimeout(toastTimer);
        set({ toast: { text, kind } });
        toastTimer = setTimeout(() => set({ toast: null }), kind === 'error' ? 5000 : 2200);
      };

      const syncNative = async () => {
        const { wallpapers, schedules, defaultTarget } = get();
        const items: ScheduleSyncItem[] = [];
        for (const s of schedules) {
          const wp = wallpapers.find((w) => w.id === s.wallpaperId);
          if (wp) items.push({ id: s.id, time: s.time, wallpaperPath: wp.path, target: s.target, enabled: s.enabled });
        }
        try {
          await WallpaperPlugin.syncState({ wallpaperPaths: wallpapers.map((w) => w.path), schedules: items, defaultTarget });
        } catch (e) {
          notify(`Sync failed: ${errText(e)}`, 'error');
        }
      };

      return {
        wallpapers: [],
        schedules: [],
        activeWallpaperId: null,
        defaultTarget: 'BOTH',
        baseDir: '',
        previews: {},
        busy: false,
        toast: null,
        status: null,

        init: async () => {
          await get().refreshNative();
          await syncNative();
        },

        refreshNative: async () => {
          try {
            const status = await WallpaperPlugin.getStatus();
            const { wallpapers, activeWallpaperId } = get();
            const nativeActive = wallpapers[status.currentIndex]?.id ?? activeWallpaperId;
            set({ status, baseDir: status.baseDir, activeWallpaperId: nativeActive });
          } catch (e) {
            console.warn('getStatus failed', e);
          }
        },

        addFiles: async (files) => {
          if (files.length === 0) return;
          set({ busy: true });
          let ok = 0;
          let lastError = '';
          for (const file of files) {
            try {
              const id = crypto.randomUUID();
              const img = await processImage(file);
              const saved = await WallpaperPlugin.saveImage({ id, data: img.data, thumb: img.thumb });
              const item: WallpaperItem = {
                id,
                name: file.name.replace(/\.[^/.]+$/, '') || 'image',
                path: saved.path,
                thumbPath: saved.thumbPath,
                createdAt: Date.now(),
              };
              set((s) => ({
                wallpapers: [item, ...s.wallpapers],
                activeWallpaperId: s.activeWallpaperId ?? id,
                previews: isNative ? s.previews : { ...s.previews, [id]: URL.createObjectURL(img.thumbBlob) },
              }));
              ok++;
            } catch (e) {
              lastError = errText(e);
              console.error('addFiles failed', e);
            }
          }
          set({ busy: false });
          if (ok > 0) await syncNative();
          if (lastError) notify(`${files.length - ok} failed: ${lastError}`, 'error');
          else notify(ok === 1 ? 'Image added' : `${ok} images added`);
        },

        removeWallpaper: async (id) => {
          try {
            await WallpaperPlugin.deleteImage({ id });
          } catch (e) {
            console.warn('deleteImage failed', e);
          }
          set((s) => {
            const rest = s.wallpapers.filter((w) => w.id !== id);
            const previews = { ...s.previews };
            delete previews[id];
            return {
              wallpapers: rest,
              schedules: s.schedules.filter((x) => x.wallpaperId !== id),
              activeWallpaperId: s.activeWallpaperId === id ? (rest[0]?.id ?? null) : s.activeWallpaperId,
              previews,
            };
          });
          await syncNative();
          notify('Removed');
        },

        applyNow: async (id) => {
          const { wallpapers, defaultTarget } = get();
          const wp = wallpapers.find((w) => w.id === id);
          if (!wp || get().busy) return;
          set({ busy: true });
          try {
            await WallpaperPlugin.setWallpaper({ filePath: wp.path, target: defaultTarget });
            set({ activeWallpaperId: id });
            notify(isNative ? `Applied to ${defaultTarget.toLowerCase()}` : 'Applied (browser preview)');
          } catch (e) {
            notify(errText(e), 'error');
          } finally {
            set({ busy: false });
          }
        },

        cycleNext: async () => {
          const { wallpapers, activeWallpaperId, busy } = get();
          if (wallpapers.length === 0 || busy) return;
          set({ busy: true });
          try {
            if (isNative) {
              await syncNative(); // make sure native list/order matches the UI
              const res = await WallpaperPlugin.cycleNextWallpaper();
              if (!res.success) throw new Error('Could not apply any image');
              const hit = wallpapers.find((w) => w.path === res.activeWallpaperPath);
              if (hit) set({ activeWallpaperId: hit.id });
            } else {
              const i = wallpapers.findIndex((w) => w.id === activeWallpaperId);
              set({ activeWallpaperId: wallpapers[(i + 1) % wallpapers.length].id });
            }
            notify('Next wallpaper');
          } catch (e) {
            notify(errText(e), 'error');
          } finally {
            set({ busy: false });
          }
        },

        addSchedule: async (time, wallpaperId, target, label) => {
          const rule: ScheduleRule = {
            id: crypto.randomUUID(),
            time,
            wallpaperId,
            target,
            enabled: true,
            label: label?.trim() || undefined,
          };
          set((s) => ({ schedules: [...s.schedules, rule].sort((a, b) => a.time.localeCompare(b.time)) }));
          await syncNative();
          notify(`Scheduled ${time}`);
        },

        toggleSchedule: async (id) => {
          set((s) => ({ schedules: s.schedules.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) }));
          await syncNative();
        },

        removeSchedule: async (id) => {
          set((s) => ({ schedules: s.schedules.filter((x) => x.id !== id) }));
          await syncNative();
        },

        setDefaultTarget: async (target) => {
          set({ defaultTarget: target });
          await syncNative();
        },

        requestExactAlarm: async () => {
          try {
            await WallpaperPlugin.requestExactAlarm();
          } catch (e) {
            notify(errText(e), 'error');
          }
        },

        requestBattery: async () => {
          try {
            await WallpaperPlugin.requestBatteryUnrestricted();
          } catch (e) {
            notify(errText(e), 'error');
          }
        },
      };
    },
    {
      name: 'wallapp-store-v2',
      partialize: (s) => ({
        wallpapers: s.wallpapers,
        schedules: s.schedules,
        activeWallpaperId: s.activeWallpaperId,
        defaultTarget: s.defaultTarget,
      }),
    },
  ),
);

/** Resolves a thumbnail to a URL the WebView can load without any base64 in memory. */
export function thumbSrc(w: WallpaperItem, baseDir: string, previews: Record<string, string>): string {
  if (previews[w.id]) return previews[w.id];
  if (!baseDir) return '';
  return Capacitor.convertFileSrc(`file://${baseDir}/${w.thumbPath}`);
}
