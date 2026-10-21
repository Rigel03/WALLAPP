import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Clock, Image as ImageIcon, SlidersHorizontal } from 'lucide-react';
import { useStore } from './store/useWallpaperStore';
import { Library } from './components/Library';
import { Schedules } from './components/Schedules';
import { Settings } from './components/Settings';
import { Logo } from './components/ui';

type Tab = 'library' | 'schedule' | 'settings';

const TABS: { id: Tab; label: string; Icon: typeof Clock }[] = [
  { id: 'library', label: 'library', Icon: ImageIcon },
  { id: 'schedule', label: 'schedule', Icon: Clock },
  { id: 'settings', label: 'settings', Icon: SlidersHorizontal },
];

function ToastBar() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  const Icon = toast.kind === 'error' ? AlertTriangle : Check;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(72px+var(--safe-area-inset-bottom,0px))] z-30 mx-auto max-w-md flex items-center gap-2 px-3.5 py-3 rounded-lg bg-fg text-ink font-mono text-xs"
    >
      <Icon size={16} className="shrink-0" />
      <span className="break-words min-w-0">{toast.text}</span>
    </div>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>('library');
  const count = useStore((s) => s.wallpapers.length);
  const init = useStore((s) => s.init);

  useEffect(() => {
    void init();
    const onVisible = () => document.visibilityState === 'visible' && void init();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [init]);

  return (
    <div className="mx-auto flex h-full max-w-xl flex-col">
      <header className="pt-safe shrink-0 border-b border-line">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <Logo size={22} />
            <h1 className="m-0 font-mono text-base font-semibold tracking-tight">wallapp</h1>
          </div>
          <span className="font-mono text-xs text-dim">{count} img</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-28">
        {tab === 'library' && <Library />}
        {tab === 'schedule' && <Schedules />}
        {tab === 'settings' && <Settings />}
      </main>

      <ToastBar />

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink">
        <div className="mx-auto grid h-14 max-w-xl grid-cols-3">
          {TABS.map(({ id, label, Icon }) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center justify-center gap-1 font-mono text-[11px] transition-colors duration-150 ${
                  on ? 'text-fg' : 'text-dim'
                }`}
              >
                <Icon size={20} strokeWidth={on ? 2.2 : 1.6} />
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
