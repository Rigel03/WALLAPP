import { memo, useRef } from 'react';
import { ImagePlus, Plus, SkipForward, Smartphone, Trash2 } from 'lucide-react';
import { thumbSrc, useStore, type WallpaperItem } from '../store/useWallpaperStore';
import { Button, SectionTitle } from './ui';

const Card = memo(function Card({
  wp,
  active,
  src,
  disabled,
  onApply,
  onRemove,
}: {
  wp: WallpaperItem;
  active: boolean;
  src: string;
  disabled: boolean;
  onApply: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="cv-auto">
      <div className={`relative aspect-9/16 rounded-lg overflow-hidden bg-panel border ${active ? 'border-fg' : 'border-line'}`}>
        {src && <img src={src} alt={wp.name} decoding="async" loading="lazy" draggable={false} className="size-full object-cover" />}
        {active && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-fg text-ink font-mono text-[11px] font-semibold">
            ACTIVE
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-xs text-dim truncate">{wp.name}</p>
      <div className="mt-1.5 flex gap-1.5">
        <Button className="flex-1 h-11 text-xs" disabled={disabled} onClick={() => onApply(wp.id)}>
          <Smartphone size={16} /> set
        </Button>
        <Button className="h-11 w-11 px-0" variant="ghost" label={`Remove ${wp.name}`} onClick={() => onRemove(wp.id)}>
          <Trash2 size={16} />
        </Button>
      </div>
    </li>
  );
});

export function Library() {
  const input = useRef<HTMLInputElement>(null);
  const wallpapers = useStore((s) => s.wallpapers);
  const activeId = useStore((s) => s.activeWallpaperId);
  const baseDir = useStore((s) => s.baseDir);
  const previews = useStore((s) => s.previews);
  const busy = useStore((s) => s.busy);
  const addFiles = useStore((s) => s.addFiles);
  const applyNow = useStore((s) => s.applyNow);
  const removeWallpaper = useStore((s) => s.removeWallpaper);
  const cycleNext = useStore((s) => s.cycleNext);

  const pick = () => input.current?.click();

  return (
    <section>
      <SectionTitle title="library" hint={`${wallpapers.length} stored on this device`} />

      <div className="flex gap-2 mb-5">
        <Button variant="solid" className="flex-1" disabled={busy} onClick={pick}>
          <Plus size={18} /> add images
        </Button>
        <Button label="Next wallpaper" disabled={busy || wallpapers.length === 0} onClick={cycleNext}>
          <SkipForward size={18} />
        </Button>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          void addFiles(files);
        }}
      />

      {wallpapers.length === 0 ? (
        <button
          type="button"
          onClick={pick}
          className="w-full rounded-lg border border-dashed border-line py-14 grid place-items-center gap-3 text-dim active:bg-panel"
        >
          <ImagePlus size={28} strokeWidth={1.5} />
          <span className="font-mono text-[13px]">no images yet — tap to add</span>
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3 list-none p-0 m-0">
          {wallpapers.map((wp) => (
            <Card
              key={wp.id}
              wp={wp}
              active={wp.id === activeId}
              src={thumbSrc(wp, baseDir, previews)}
              disabled={busy}
              onApply={applyNow}
              onRemove={removeWallpaper}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
