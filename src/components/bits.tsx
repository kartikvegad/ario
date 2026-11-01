import type { CSSProperties, ReactNode } from 'react';
import type { Member } from '../types.ts';
import { cx, initials } from '../utils.ts';

export function Avatar({ member, size = 26 }: { member: Member; size?: number }) {
  return (
    <span
      className="avatar"
      title={member.name}
      style={{ width: size, height: size, background: member.color, color: member.ink, fontSize: size * 0.36 }}
    >
      {initials(member.name)}
    </span>
  );
}

export function AvatarStack({ ids, members, size = 26 }: { ids: string[]; members: Member[]; size?: number }) {
  const people = ids
    .map((id) => members.find((member) => member.id === id))
    .filter((member): member is Member => Boolean(member));
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  if (!shown.length) return null;
  return (
    <span className="stack">
      {shown.map((member) => (
        <Avatar key={member.id} member={member} size={size} />
      ))}
      {extra > 0 && (
        <span className="avatar more" style={{ width: size, height: size, fontSize: size * 0.34 }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const width = 86;
  const height = 48;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const d = values
    .map((value, index) => {
      const x = index * step;
      const y = height - 4 - (value / max) * (height - 12);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={d} fill="none" stroke="#1d1d1d" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Radial({ value }: { value: number }) {
  const shown = Math.max(0, Math.min(100, value));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - shown / 100);
  return (
    <svg className="radial" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="#1c1c1c"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle">
        {Math.round(value)}%
      </text>
    </svg>
  );
}

export function Meter({ value, tone }: { value: number; tone?: string }) {
  return (
    <span className="meter" aria-hidden="true">
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: tone }} />
    </span>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  count,
  lede,
  action,
}: {
  eyebrow?: string;
  title: string;
  count?: number;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>
          {title}
          {count != null && <span> {count}</span>}
        </h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      {action}
    </header>
  );
}

export function MentionText({ text, members }: { text: string; members: Member[] }) {
  const names = [...members].map((member) => member.name).sort((a, b) => b.length - a.length);
  if (!names.length) return <>{text}</>;
  const pattern = new RegExp(`@(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, index) =>
        names.some((name) => name.toLowerCase() === part.toLowerCase()) ? (
          <mark key={index}>@{part}</mark>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export function accentStyle(bar: string): CSSProperties {
  return { '--accent': bar } as CSSProperties;
}

export function Badge({ type, label }: { type: string; label: string }) {
  return (
    <span className="badge" data-type={type}>
      {label}
    </span>
  );
}

export function cxClass(className: string, on: boolean) {
  return cx(className, on && 'is-on');
}
