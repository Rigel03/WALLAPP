import { type ReactNode } from 'react';
import type { WallpaperTarget } from '../plugins/wallpaperPlugin';

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="60 28 136 200" fill="none" aria-hidden="true">
      <path
        d="M96 40H160A24 24 0 0 1 184 64V192A24 24 0 0 1 160 216H96A24 24 0 0 1 72 192V64A24 24 0 0 1 96 40Z"
        stroke="currentColor"
        strokeWidth="14"
      />
      <path d="M94 88L162 192H94Z" fill="currentColor" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" />
      <circle cx="128" cy="62" r="6" fill="currentColor" />
    </svg>
  );
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'outline' | 'ghost';
  disabled?: boolean;
  full?: boolean;
  label?: string;
  type?: 'button' | 'submit';
  className?: string;
};

const base =
  'inline-flex items-center justify-center gap-2 h-12 min-w-12 px-4 rounded-lg font-mono text-[13px] font-medium ' +
  'select-none transition-colors duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none';
const variants = {
  solid: 'bg-fg text-ink active:bg-dim',
  outline: 'border border-line text-fg active:bg-raised',
  ghost: 'text-dim active:bg-raised',
};

export function Button({ children, onClick, variant = 'outline', disabled, full, label, type = 'button', className = '' }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`${base} ${variants[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

const TARGETS: { value: WallpaperTarget; label: string }[] = [
  { value: 'BOTH', label: 'both' },
  { value: 'SYSTEM', label: 'home' },
  { value: 'LOCK', label: 'lock' },
];

export function TargetPicker({ value, onChange }: { value: WallpaperTarget; onChange: (v: WallpaperTarget) => void }) {
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-line bg-ink">
      {TARGETS.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={value === t.value}
          onClick={() => onChange(t.value)}
          className={`h-10 rounded-md font-mono text-[13px] transition-colors duration-150 ${
            value === t.value ? 'bg-fg text-ink font-semibold' : 'text-dim active:bg-raised'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="relative w-12 h-12 grid place-items-center shrink-0"
    >
      <span className={`relative block w-11 h-6 rounded-full border transition-colors duration-150 ${checked ? 'bg-fg border-fg' : 'bg-ink border-line'}`}>
        <span
          className={`absolute top-0.5 size-4.5 rounded-full transition-transform duration-150 ${
            checked ? 'translate-x-5.5 bg-ink' : 'translate-x-0.5 bg-dim'
          }`}
        />
      </span>
    </button>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-mono text-base font-semibold tracking-tight">{title}</h2>
      {hint && <p className="text-xs text-dim mt-0.5">{hint}</p>}
    </div>
  );
}
