import React, { useState } from 'react';
import { Plus, Trash2, Power, CalendarClock } from 'lucide-react';
import { useWallpaperStore } from '../store/useWallpaperStore';
import type { WallpaperTarget } from '../plugins/wallpaperPlugin';

export const ScheduleManager: React.FC = () => {
  const {
    wallpapers,
    schedules,
    defaultTarget,
    addSchedule,
    toggleSchedule,
    removeSchedule,
  } = useWallpaperStore();

  const [time, setTime] = useState('08:00');
  const [selectedWpId, setSelectedWpId] = useState<string>('');
  const [target, setTarget] = useState<WallpaperTarget>(defaultTarget);
  const [label, setLabel] = useState('');

  const effectiveWpId = selectedWpId || wallpapers[0]?.id || '';

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveWpId || !time) return;
    await addSchedule(time, effectiveWpId, target, label);
    setLabel('');
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-zinc-100">
          Time-Based Automation
        </h2>
        <p className="text-xs text-zinc-400">
          Executed natively by Android AlarmManager even when the app is closed
        </p>
      </div>

      {/* Create Schedule Form */}
      <form
        onSubmit={handleCreateSchedule}
        className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 space-y-3.5"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Trigger Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Wallpaper
            </label>
            <select
              value={effectiveWpId}
              onChange={(e) => setSelectedWpId(e.target.value)}
              disabled={wallpapers.length === 0}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            >
              {wallpapers.length === 0 ? (
                <option value="">Upload image first</option>
              ) : (
                wallpapers.map((wp) => (
                  <option key={wp.id} value={wp.id}>
                    {wp.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Target Screen
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as WallpaperTarget)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="BOTH">Home + Lock</option>
              <option value="SYSTEM">Home Screen</option>
              <option value="LOCK">Lock Screen</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-zinc-400 mb-1">
              Label (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Morning Focus"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={wallpapers.length === 0}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.2]" />
          <span>Add Daily Schedule Trigger</span>
        </button>
      </form>

      {/* Active Schedule List */}
      {schedules.length === 0 ? (
        <div className="p-6 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 text-center">
          <CalendarClock className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
          <p className="text-xs text-zinc-400">
            No daily schedules configured yet. Add a time trigger above.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {schedules.map((item) => {
            const wp = wallpapers.find((w) => w.id === item.wallpaperId);
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition ${
                  item.enabled
                    ? 'bg-zinc-900/80 border-zinc-800'
                    : 'bg-zinc-950 border-zinc-900 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {wp ? (
                    <img
                      src={wp.dataUrl}
                      alt={wp.name}
                      className="w-10 h-14 rounded-lg object-cover border border-zinc-700/60 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-zinc-800 shrink-0" />
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-semibold text-zinc-100">
                        {item.time}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                        {item.target}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      {item.label ? `${item.label} • ` : ''}
                      {wp?.name ?? 'Unknown image'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSchedule(item.id)}
                    title={item.enabled ? 'Disable trigger' : 'Enable trigger'}
                    className={`p-2 rounded-xl border transition cursor-pointer ${
                      item.enabled
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeSchedule(item.id)}
                    aria-label="Delete schedule"
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
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
