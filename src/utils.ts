import type {
  Accent,
  AppState,
  Member,
  Priority,
  Profile,
  Project,
  ProjectStatus,
  ProjectType,
  Space,
  Task,
  TaskStatus,
  TimeEntry,
} from './types.ts';

export const TYPES: { id: ProjectType; label: string; blurb: string }[] = [
  { id: 'web-dev', label: 'Web Dev', blurb: 'Sites, apps, and full builds' },
  { id: 'frontend', label: 'Frontend', blurb: 'UI, components, and client logic' },
  { id: 'backend', label: 'Backend', blurb: 'APIs, data, and services' },
  { id: 'branding', label: 'Branding', blurb: 'Identity, voice, and guidelines' },
  { id: 'graphic-design', label: 'Graphic Design', blurb: 'Posters, layouts, and assets' },
  { id: 'social-media', label: 'Social Media', blurb: 'Content, campaigns, and channels' },
  { id: 'client', label: 'Client', blurb: 'Retainers and account work' },
  { id: 'personal', label: 'Personal', blurb: 'Your own tasks and practice' },
];

export const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
  { id: 'delegated', label: 'Delegated' },
];

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

export const PROJECT_STATUSES: { id: ProjectStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'completed', label: 'Completed' },
];

export const ACCENTS: { id: Accent; label: string; bg: string; bar: string }[] = [
  { id: 'white', label: 'Ivory', bg: '#ffffff', bar: '#ef7a32' },
  { id: 'lime', label: 'Lime', bg: '#d7e68c', bar: '#6ea326' },
  { id: 'pink', label: 'Pink', bg: '#f6c9ec', bar: '#e46ab8' },
  { id: 'lavender', label: 'Lavender', bg: '#ead8f8', bar: '#b07be0' },
  { id: 'peach', label: 'Peach', bg: '#ffd8c2', bar: '#f08a3a' },
];

export const MEMBER_COLORS = [
  { color: '#ffd7c2', ink: '#8a3d12' },
  { color: '#d7efb8', ink: '#2f5a16' },
  { color: '#d6e4ff', ink: '#1d3f86' },
  { color: '#ffe7a3', ink: '#6d5208' },
  { color: '#ffd0ea', ink: '#8a2460' },
  { color: '#d9d4ff', ink: '#3d2f86' },
  { color: '#c9f3ea', ink: '#0f5c4c' },
  { color: '#ffd0d0', ink: '#8a2424' },
];

const BAR_COLORS = ['#ef7a32', '#8dce67', '#e989c8', '#b98af0', '#f0b429', '#6d8cff', '#ef6d5a', '#3dbea5'];

export function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function escapeReg(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function memberColor(index: number) {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

export function barColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return BAR_COLORS[hash % BAR_COLORS.length];
}

export function typeLabel(id: ProjectType) {
  return TYPES.find((type) => type.id === id)?.label ?? id;
}

export function statusLabel(id: TaskStatus) {
  return STATUSES.find((status) => status.id === id)?.label ?? id;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? '';
}

export function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfWeek(date: Date) {
  const start = startOfDay(date);
  const weekday = start.getDay();
  const delta = weekday === 0 ? -6 : 1 - weekday;
  return addDays(start, delta);
}

export function isoDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatLongDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(value: string) {
  return parseDay(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatWeekday(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatHM(iso: string) {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatHMS(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `${hours}h ${rest}m`;
}

export function timeAgo(iso: string, now = new Date()) {
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return formatShortDate(isoDay(new Date(iso)));
}

export function dueStamp(task: Pick<Task, 'dueDate' | 'dueTime'>) {
  if (!task.dueDate) return Number.POSITIVE_INFINITY;
  const [year, month, day] = task.dueDate.split('-').map(Number);
  const [hours, minutes] = (task.dueTime ?? '17:00').split(':').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0).getTime();
}

export function isOverdue(task: Task, now = new Date()) {
  if (!task.dueDate || task.status === 'done') return false;
  return dueStamp(task) < now.getTime();
}

export function countdownLabel(task: Task, now: Date) {
  if (!task.dueDate || task.status === 'done') return null;
  const diff = dueStamp(task) - now.getTime();
  if (diff <= 0) return 'Overdue';
  if (diff > 48 * 60 * 60 * 1000) return null;
  return formatHMS(Math.floor(diff / 1000));
}

export function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function projectProgress(tasks: Task[], projectId: string) {
  const list = tasks.filter((task) => task.projectId === projectId);
  if (!list.length) return 0;
  return Math.round(average(list.map((task) => task.progress)));
}

export function spaceAndChildren(spaces: Space[], id: string) {
  const ids = [id];
  const walk = (parentId: string) => {
    spaces
      .filter((space) => space.parentId === parentId)
      .forEach((space) => {
        ids.push(space.id);
        walk(space.id);
      });
  };
  walk(id);
  return ids;
}

export function spacePath(spaces: Space[], spaceId: string) {
  const parts: string[] = [];
  let current = spaces.find((space) => space.id === spaceId);
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? spaces.find((space) => space.id === current?.parentId) : undefined;
  }
  return parts.join(' / ');
}

export function findMentions(text: string, members: Member[]) {
  const ids: string[] = [];
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  for (const member of sorted) {
    const full = new RegExp(`@${escapeReg(member.name)}\\b`, 'i');
    const first = member.name.split(' ')[0];
    const short = first ? new RegExp(`@${escapeReg(first)}\\b`, 'i') : null;
    if (full.test(text) || (short && short.test(text))) ids.push(member.id);
  }
  return ids;
}

export function weekMinutes(entries: TimeEntry[], weekStart: Date) {
  const start = startOfDay(weekStart).getTime();
  const end = addDays(startOfDay(weekStart), 7).getTime();
  return entries.reduce((sum, entry) => {
    const time = new Date(entry.start).getTime();
    if (time >= start && time < end) return sum + entry.minutes;
    return sum;
  }, 0);
}

export function dailyMinutes(entries: TimeEntry[], start: Date, days: number) {
  return Array.from({ length: days }, (_, index) => {
    const key = isoDay(addDays(start, index));
    return entries.reduce((sum, entry) => (isoDay(new Date(entry.start)) === key ? sum + entry.minutes : sum), 0);
  });
}

export function activityPercent(minutes: number, goalHours: number) {
  if (goalHours <= 0) return 0;
  return Math.round((minutes / (goalHours * 60)) * 100);
}

export function progressLift(tasks: Task[], weekStart: Date) {
  if (!tasks.length) return 0;
  const current = average(tasks.map((task) => task.progress));
  const baseline = average(
    tasks.map((task) => {
      const updated = new Date(task.updatedAt).getTime();
      if (task.status === 'done' && updated >= weekStart.getTime()) return 0;
      return task.progress;
    }),
  );
  return Math.round(current - baseline);
}

export function openTasks(tasks: Task[]) {
  return tasks.filter((task) => task.status === 'todo' || task.status === 'in-progress' || task.status === 'review');
}

export interface LaidBlock {
  entry: TimeEntry;
  top: number;
  height: number;
  lane: number;
  lanes: number;
}

export function layoutDay(entries: TimeEntry[]): LaidBlock[] {
  const startMin = 8 * 60;
  const span = 12 * 60;
  const sorted = [...entries].sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const laneEnds: number[] = [];
  const draft = sorted.map((entry) => {
    const start = new Date(entry.start);
    const begin = start.getHours() * 60 + start.getMinutes();
    const height = clamp(entry.minutes / span, 0.08, 0.46);
    const top = clamp((begin - startMin) / span, 0, 0.96 - height);
    const end = begin + entry.minutes;
    let lane = laneEnds.findIndex((value) => value <= begin + 8);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    return { entry, top, height, lane };
  });
  const lanes = Math.max(1, ...draft.map((item) => item.lane + 1));
  return draft.map((item) => ({ ...item, lanes }));
}

export function normalize(input: unknown): AppState | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Partial<AppState>;
  if (!Array.isArray(raw.projects) || !Array.isArray(raw.tasks) || !Array.isArray(raw.spaces)) return null;
  if (!raw.profile || typeof raw.profile !== 'object') return null;
  const profile = raw.profile as Profile;
  if (typeof profile.name !== 'string' || typeof profile.memberId !== 'string') return null;

  let members = Array.isArray(raw.members) ? raw.members : [];
  if (!members.some((member) => member.id === profile.memberId)) {
    members = [
      {
        id: profile.memberId,
        name: profile.name,
        role: profile.role || 'Studio lead',
        color: '#ffd7c2',
        ink: '#8a3d12',
      },
      ...members,
    ];
  }

  const tasks: Task[] = raw.tasks.map((task) => ({
    ...task,
    description: task.description ?? '',
    status: task.status ?? 'todo',
    priority: task.priority ?? 'medium',
    progress: clamp(Number(task.progress) || 0, 0, 100),
    dueDate: task.dueDate ?? null,
    dueTime: task.dueTime ?? null,
    assigneeIds: task.assigneeIds ?? [],
    checklist: task.checklist ?? [],
    comments: task.comments ?? [],
    lineup: Boolean(task.lineup),
    createdAt: task.createdAt ?? new Date().toISOString(),
    updatedAt: task.updatedAt ?? new Date().toISOString(),
  }));

  const timer = raw.timer && tasks.some((task) => task.id === raw.timer?.taskId) ? raw.timer : null;

  return {
    version: 1,
    profile: {
      name: profile.name,
      role: profile.role || 'Studio lead',
      weeklyGoalHours: profile.weeklyGoalHours > 0 ? profile.weeklyGoalHours : 40,
      memberId: profile.memberId,
    },
    members,
    clients: raw.clients ?? [],
    spaces: raw.spaces,
    projects: raw.projects,
    tasks,
    notes: raw.notes ?? [],
    goals: raw.goals ?? [],
    activities: raw.activities ?? [],
    timeEntries: raw.timeEntries ?? [],
    timer,
    readMentionIds: raw.readMentionIds ?? [],
  };
}

export function projectOf(projects: Project[], id: string) {
  return projects.find((project) => project.id === id);
}
