import { memo, useState, type FormEvent } from 'react';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';
import { thumbSrc, useStore, type ScheduleRule, type WallpaperItem } from '../store/useWallpaperStore';
import type { WallpaperTarget } from '../plugins/wallpaperPlugin';
import { Button, SectionTitle, Switch, TargetPicker } from './ui';

const field =
  'w-full h-12 px-3 rounded-lg bg-ink border border-line font-mono text-[14px] text-fg placeholder:text-dim focus:border-fg outline-none';
const labelCls = 'block mb-1.5 font-mono text-xs text-dim';

const Row = memo(function Row({
  rule,
  wp,
  src,
  onToggle,
  onRemove,
}: {
  rule: ScheduleRule;
  wp?: WallpaperItem;
  src: string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className={`flex items-center gap-3 p-3 rounded-lg border border-line bg-panel ${rule.enabled ? '' : 'opacity-50'}`}>
      <div className="w-9 h-16 rounded bg-raised overflow-hidden shrink-0">
        {src && <img src={src} alt="" decoding="async" className="size-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-2xl font-semibold leading-none tabular-nums">{rule.time}</p>
        <p className="mt-1.5 font-mono text-xs text-dim truncate">
          {rule.target.toLowerCase()} · {rule.label ? `${rule.label} · ` : ''}
          {wp?.name ?? 'missing image'}
        </p>
      </div>
      <Switch checked={rule.enabled} onChange={() => onToggle(rule.id)} label={`Toggle ${rule.time}`} />
      <Button variant="ghost" className="w-12 px-0" label="Delete schedule" onClick={() => onRemove(rule.id)}>
        <Trash2 size={18} />
      </Button>
    </li>
  );
});

export function Schedules() {
  const wallpapers = useStore((s) => s.wallpapers);
  const schedules = useStore((s) => s.schedules);
  const defaultTarget = useStore((s) => s.defaultTarget);
  const baseDir = useStore((s) => s.baseDir);
  const previews = useStore((s) => s.previews);
  const addSchedule = useStore((s) => s.addSchedule);
  const toggleSchedule = useStore((s) => s.toggleSchedule);
  const removeSchedule = useStore((s) => s.removeSchedule);

  const [time, setTime] = useState('08:00');
  const [wpId, setWpId] = useState('');
  const [target, setTarget] = useState<WallpaperTarget>(defaultTarget);
  const [label, setLabel] = useState('');

  const effectiveId = wallpapers.some((w) => w.id === wpId) ? wpId : (wallpapers[0]?.id ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveId || !time) return;
    void addSchedule(time, effectiveId, target, label);
    setLabel('');
  };

  return (
    <section>
      <SectionTitle title="schedule" hint="Runs daily, even when the app is closed" />

      <form onSubmit={submit} className="p-4 rounded-lg border border-line bg-panel grid gap-4 mb-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="t">time</label>
            <input id="t" type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          </div>
          <div>
            <label className={labelCls} htmlFor="w">image</label>
            <select
              id="w"
              value={effectiveId}
              disabled={wallpapers.length === 0}
              onChange={(e) => setWpId(e.target.value)}
              className={`${field} disabled:opacity-40`}
            >
              {wallpapers.length === 0 && <option value="">add an image first</option>}
              {wallpapers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <span className={labelCls}>screen</span>
          <TargetPicker value={target} onChange={setTarget} />
        </div>

        <div>
          <label className={labelCls} htmlFor="l">label (optional)</label>
          <input id="l" type="text" maxLength={24} placeholder="morning" value={label} onChange={(e) => setLabel(e.target.value)} className={field} />
        </div>

        <Button type="submit" variant="solid" full disabled={wallpapers.length === 0}>
          <Plus size={18} /> add schedule
        </Button>
      </form>

      {schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line py-10 grid place-items-center gap-3 text-dim">
          <CalendarClock size={26} strokeWidth={1.5} />
          <span className="font-mono text-[13px]">no schedules yet</span>
        </div>
      ) : (
        <ul className="grid gap-2 list-none p-0 m-0">
          {schedules.map((r) => {
            const wp = wallpapers.find((w) => w.id === r.wallpaperId);
            return (
              <Row
                key={r.id}
                rule={r}
                wp={wp}
                src={wp ? thumbSrc(wp, baseDir, previews) : ''}
                onToggle={toggleSchedule}
                onRemove={removeSchedule}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
