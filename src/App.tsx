import { useEffect, useState } from 'react';
import {
  Shuffle,
  Image as ImageIcon,
  Clock,
  Sliders,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useWallpaperStore } from './store/useWallpaperStore';
import { WallpaperGrid } from './components/WallpaperGrid';
import { ScheduleManager } from './components/ScheduleManager';
import type { WallpaperTarget } from './plugins/wallpaperPlugin';

type ActiveTab = 'library' | 'schedules' | 'settings';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const {
    wallpapers,
    schedules,
    defaultTarget,
    statusMessage,
    isSyncing,
    cycleNext,
    setDefaultTarget,
    clearStatus,
    syncWithNative,
  } = useWallpaperStore();

  useEffect(() => {
    syncWithNative();
  }, [syncWithNative]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => clearStatus(), 3200);
    return () => clearTimeout(timer);
  }, [statusMessage, clearStatus]);

  const activeSchedulesCount = schedules.filter((s) => s.enabled).length;

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex flex-col max-w-xl mx-auto border-x border-zinc-900/80">
      {/* Top Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-zinc-950/85 border-b border-zinc-900 px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-100 leading-none">
              WallSync
            </h1>
            <p className="text-[11px] font-mono text-zinc-400 mt-1">
              {wallpapers.length} imgs • {activeSchedulesCount} active rules
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={cycleNext}
          disabled={wallpapers.length === 0 || isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 active:scale-[0.98] transition disabled:opacity-40 cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cycle Next</span>
        </button>
      </header>

      {/* Status Toast Banner */}
      {statusMessage && (
        <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-5 pb-28">
        {activeTab === 'library' && <WallpaperGrid />}
        {activeTab === 'schedules' && <ScheduleManager />}
        {activeTab === 'settings' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-zinc-100">
                Engine & Tile Settings
              </h2>
              <p className="text-xs text-zinc-400">
                Configure default behavior for Quick Settings Tile and instant actions
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 space-y-3">
              <label className="block text-xs font-medium text-zinc-200">
                Default Wallpaper Target
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['BOTH', 'SYSTEM', 'LOCK'] as WallpaperTarget[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDefaultTarget(t)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-mono font-medium border transition cursor-pointer ${
                      defaultTarget === t
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-semibold'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/70 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Quick Settings Tile Setup
              </h3>
              <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
                <li>Swipe down twice from the top of your Android screen.</li>
                <li>Tap the Pencil (Edit) icon in Quick Settings.</li>
                <li>Locate the <span className="text-zinc-200 font-medium">Next Wallpaper</span> tile and drag it into your active tiles.</li>
                <li>Tap the tile anytime to cycle through your saved local wallpapers.</li>
              </ol>
            </div>
          </section>
        )}
      </main>

      {/* Thumb-Zone Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-20 max-w-xl mx-auto bg-zinc-950/90 backdrop-blur-md border-t border-zinc-900 px-6 py-2 flex items-center justify-around">
        <button
          type="button"
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition cursor-pointer ${
            activeTab === 'library' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-[11px] font-medium">Library</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('schedules')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition cursor-pointer ${
            activeTab === 'schedules' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[11px] font-medium">Schedules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition cursor-pointer ${
            activeTab === 'settings' ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Sliders className="w-5 h-5" />
          <span className="text-[11px] font-medium">Settings</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
