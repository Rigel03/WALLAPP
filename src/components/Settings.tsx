import type { ReactNode } from 'react';
import { BatteryCharging, BellRing, Check } from 'lucide-react';
import { useStore } from '../store/useWallpaperStore';
import { Button, SectionTitle, TargetPicker } from './ui';

function PermissionRow({
  icon,
  title,
  desc,
  granted,
  onGrant,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  granted: boolean;
  onGrant: () => void;
}) {
  return (
    <li className="flex items-center gap-3 p-3 rounded-lg border border-line bg-panel">
      <span className="text-dim shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[13px] font-medium">{title}</p>
        <p className="text-xs text-dim mt-0.5">{desc}</p>
      </div>
      {granted ? (
        <span className="inline-flex items-center gap-1 font-mono text-xs text-dim shrink-0">
          <Check size={14} /> on
        </span>
      ) : (
        <Button variant="solid" className="h-10 text-xs shrink-0" onClick={onGrant}>
          allow
        </Button>
      )}
    </li>
  );
}

export function Settings() {
  const defaultTarget = useStore((s) => s.defaultTarget);
  const setDefaultTarget = useStore((s) => s.setDefaultTarget);
  const status = useStore((s) => s.status);
  const requestExactAlarm = useStore((s) => s.requestExactAlarm);
  const requestBattery = useStore((s) => s.requestBattery);

  return (
    <section className="grid gap-6">
      <div>
        <SectionTitle title="default screen" hint="Used by “set”, next, and the Quick Settings tile" />
        <TargetPicker value={defaultTarget} onChange={(v) => void setDefaultTarget(v)} />
      </div>

      <div>
        <SectionTitle title="permissions" hint="Needed so schedules fire on time with the app closed" />
        <ul className="grid gap-2 list-none p-0 m-0">
          <PermissionRow
            icon={<BellRing size={20} />}
            title="exact alarms"
            desc="Change the wallpaper at the exact minute"
            granted={status?.exactAlarm ?? true}
            onGrant={() => void requestExactAlarm()}
          />
          <PermissionRow
            icon={<BatteryCharging size={20} />}
            title="unrestricted battery"
            desc="Stops Android from delaying or killing schedules"
            granted={status?.batteryUnrestricted ?? true}
            onGrant={() => void requestBattery()}
          />
        </ul>
        <p className="text-xs text-dim mt-3">
          Setting the wallpaper itself is a normal permission, granted at install — that is why Android’s permission
          list shows none.
        </p>
      </div>

      <div>
        <SectionTitle title="quick settings tile" />
        <ol className="m-0 pl-5 grid gap-1.5 text-[13px] text-dim list-decimal">
          <li>Swipe down twice from the top of the screen.</li>
          <li>Tap the pencil / edit icon.</li>
          <li>
            Drag <span className="font-mono text-fg">Next Wallpaper</span> into the active tiles.
          </li>
          <li>Tap it any time to jump to the next image.</li>
        </ol>
      </div>

      <p className="font-mono text-xs text-dim">wallapp · v1.1 · all data stays on this device</p>
    </section>
  );
}

