import React, { useRef } from 'react';
import { Upload, Trash2, Check, Lock, Smartphone, Layers } from 'lucide-react';
import { useWallpaperStore } from '../store/useWallpaperStore';
import type { WallpaperTarget } from '../plugins/wallpaperPlugin';

export const WallpaperGrid: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    wallpapers,
    activeWallpaperId,
    defaultTarget,
    isSyncing,
    addWallpaper,
    removeWallpaper,
    applyWallpaperNow,
  } = useWallpaperStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      await addWallpaper(files[i]);
    }
    e.target.value = '';
  };

  const targetIcon = (target: WallpaperTarget) => {
    switch (target) {
      case 'SYSTEM':
        return <Smartphone className="w-3.5 h-3.5" />;
      case 'LOCK':
        return <Lock className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-100">
            Local Library
          </h2>
          <p className="text-xs text-zinc-400">
            Stored offline in app sandbox ({wallpapers.length} saved)
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-medium text-xs hover:bg-emerald-400 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Add Image</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {wallpapers.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-zinc-800 rounded-2xl p-10 text-center bg-zinc-900/40 hover:bg-zinc-900/70 transition cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto mb-3 text-emerald-400">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-zinc-200">
            Import your first wallpaper
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
            Images are persisted directly to the device filesystem for instant offline switching.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {wallpapers.map((wp) => {
            const isActive = wp.id === activeWallpaperId;
            return (
              <div
                key={wp.id}
                className={`group relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border transition-all ${
                  isActive
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                <img
                  src={wp.dataUrl}
                  alt={wp.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />

                {/* Subtle top gradient & delete action */}
                <div className="absolute inset-x-0 top-0 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/70 via-black/25 to-transparent">
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500 text-zinc-950">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      Active
                    </span>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={() => removeWallpaper(wp.id)}
                    aria-label={`Remove ${wp.name}`}
                    className="p-1.5 rounded-lg bg-zinc-950/75 text-zinc-300 hover:text-red-400 hover:bg-zinc-950 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom metadata & quick apply */}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2">
                  <p className="text-xs font-medium text-zinc-100 truncate">
                    {wp.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => applyWallpaperNow(wp.id)}
                    disabled={isSyncing}
                    className="w-full py-2 px-2.5 rounded-xl bg-zinc-100/95 hover:bg-white text-zinc-950 font-medium text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition cursor-pointer"
                  >
                    {targetIcon(defaultTarget)}
                    <span>Apply ({defaultTarget})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
