import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { TaskPrefill } from './types.ts';
import { addDays, isoDay, parseDay, uid } from './utils.ts';

export type View =
  | { name: 'home' }
  | { name: 'notes'; noteId?: string }
  | { name: 'goals' }
  | { name: 'activity' }
  | { name: 'space'; spaceId: string }
  | { name: 'docs'; noteId?: string }
  | { name: 'stats' }
  | { name: 'favorites' }
  | { name: 'agenda' }
  | { name: 'mentions' }
  | { name: 'projects' }
  | { name: 'project'; projectId: string }
  | { name: 'tasks' }
  | { name: 'clients' }
  | { name: 'client'; clientId: string };

export type Modal =
  | { kind: 'project'; projectId?: string; spaceId?: string }
  | { kind: 'note' }
  | { kind: 'goal'; goalId?: string }
  | { kind: 'space'; parentId?: string }
  | { kind: 'client'; clientId?: string }
  | { kind: 'settings' };

export interface DrawerState {
  taskId: string | null;
  prefill: TaskPrefill;
}

export interface ConfirmState {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

export type WorkFilter = 'todo' | 'comments' | 'done' | 'delegated';

interface UiValue {
  view: View;
  setView: (view: View) => void;
  modal: Modal | null;
  openModal: (modal: Modal) => void;
  closeModal: () => void;
  drawer: DrawerState | null;
  openTask: (taskId: string) => void;
  openNewTask: (prefill?: TaskPrefill) => void;
  closeDrawer: () => void;
  confirm: ConfirmState | null;
  ask: (confirm: ConfirmState) => void;
  closeConfirm: () => void;
  workFilter: WorkFilter;
  setWorkFilter: (filter: WorkFilter) => void;
  rangeEnd: string;
  setRangeEnd: (day: string) => void;
  shiftRange: (days: number) => void;
  focusDay: string;
  setFocusDay: (day: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  expanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  toasts: { id: string; message: string }[];
  toast: (message: string) => void;
}

const UiContext = createContext<UiValue | null>(null);

function parseHash(hash: string): View {
  const raw = hash.replace(/^#\/?/, '');
  const [name, id] = raw.split('/');
  const value = id ? decodeURIComponent(id) : undefined;
  if (name === 'project' && value) return { name: 'project', projectId: value };
  if (name === 'space' && value) return { name: 'space', spaceId: value };
  if (name === 'client' && value) return { name: 'client', clientId: value };
  if (name === 'notes') return { name: 'notes', noteId: value };
  if (name === 'docs') return { name: 'docs', noteId: value };
  const simple = [
    'home',
    'goals',
    'activity',
    'stats',
    'favorites',
    'agenda',
    'mentions',
    'projects',
    'tasks',
    'clients',
  ] as const;
  if ((simple as readonly string[]).includes(name)) return { name: name as (typeof simple)[number] };
  return { name: 'home' };
}

export function viewToHash(view: View) {
  switch (view.name) {
    case 'project':
      return `#/project/${encodeURIComponent(view.projectId)}`;
    case 'space':
      return `#/space/${encodeURIComponent(view.spaceId)}`;
    case 'client':
      return `#/client/${encodeURIComponent(view.clientId)}`;
    case 'notes':
      return view.noteId ? `#/notes/${encodeURIComponent(view.noteId)}` : '#/notes';
    case 'docs':
      return view.noteId ? `#/docs/${encodeURIComponent(view.noteId)}` : '#/docs';
    default:
      return `#/${view.name}`;
  }
}

export function viewTitle(view: View) {
  const titles: Record<View['name'], string> = {
    home: 'Home',
    notes: 'Notes',
    goals: 'Goals',
    activity: 'Activity',
    space: 'Space',
    docs: 'Docs',
    stats: 'Statistics',
    favorites: 'Favorites',
    agenda: 'Agenda',
    mentions: 'Mentions',
    projects: 'Projects',
    project: 'Project',
    tasks: 'Tasks',
    clients: 'Clients',
    client: 'Client',
  };
  return titles[view.name];
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [view, setViewState] = useState<View>(() => parseHash(window.location.hash));
  const [modal, setModal] = useState<Modal | null>(null);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [workFilter, setWorkFilter] = useState<WorkFilter>('todo');
  const [rangeEnd, setRangeEnd] = useState(() => isoDay(new Date()));
  const [focusDay, setFocusDay] = useState(() => isoDay(new Date()));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(
    () => localStorage.getItem('ario.sidebar') === 'collapsed',
  );
  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    localStorage.setItem('ario.sidebar', collapsed ? 'collapsed' : 'open');
  }, []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  const setView = useCallback((next: View) => {
    setViewState(next);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const next = viewToHash(view);
    if (window.location.hash === next) return;
    if (!window.location.hash || window.location.hash === '#') window.history.replaceState(null, '', next);
    else window.history.pushState(null, '', next);
  }, [view]);

  useEffect(() => {
    const onPop = () => setViewState(parseHash(window.location.hash));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.title = `Ario · ${viewTitle(view)}`;
  }, [view]);

  const toast = useCallback((message: string) => {
    const id = uid();
    setToasts((current) => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 3200);
  }, []);

  const shiftRange = useCallback((days: number) => {
    setRangeEnd((current) => isoDay(addDays(parseDay(current), days)));
  }, []);

  const value: UiValue = {
    view,
    setView,
    modal,
    openModal: (next) => setModal(next),
    closeModal: () => setModal(null),
    drawer,
    openTask: (taskId) => setDrawer({ taskId, prefill: {} }),
    openNewTask: (prefill = {}) => setDrawer({ taskId: null, prefill }),
    closeDrawer: () => setDrawer(null),
    confirm,
    ask: (next) => setConfirm(next),
    closeConfirm: () => setConfirm(null),
    workFilter,
    setWorkFilter,
    rangeEnd,
    setRangeEnd,
    shiftRange,
    focusDay,
    setFocusDay,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    expanded,
    toggleExpanded: (id) => setExpanded((current) => ({ ...current, [id]: current[id] === false })),
    toasts,
    toast,
  };

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ui = useContext(UiContext);
  if (!ui) throw new Error('useUi must be used within UiProvider');
  return ui;
}
