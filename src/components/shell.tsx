import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowUpRight,
  AtSign,
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderKanban,
  Home as HomeIcon,
  LayoutDashboard,
  ListChecks,
  Menu,
  Plus,
  Search,
  Settings,
  Square,
  Star,
  StickyNote,
  Target,
} from 'lucide-react';
import type { AppState, Space } from '../types.ts';
import { useStore } from '../store.tsx';
import { useUi, type View } from '../ui.tsx';
import { useTicker } from '../useTicker.ts';
import {
  activityPercent,
  addDays,
  average,
  barColor,
  cx,
  dailyMinutes,
  formatHMS,
  formatHM,
  formatHours,
  formatShortDate,
  formatWeekday,
  isoDay,
  layoutDay,
  parseDay,
  progressLift,
  projectOf,
  projectProgress,
  startOfWeek,
  weekMinutes,
} from '../utils.ts';
import { Avatar, Radial, Sparkline } from './bits.tsx';
import { Home } from './home.tsx';
import { Overlays } from './overlays.tsx';
import { ProjectPage, ProjectsPage } from './projects.tsx';
import {
  ActivityPage,
  AgendaPage,
  ClientPage,
  ClientsPage,
  FavoritesPage,
  GoalsPage,
  MentionsPage,
  NotesPage,
  SpacePage,
  StatsPage,
} from './studio.tsx';
import { TasksPage } from './tasks.tsx';

export function Shell() {
  const { view, confirm, modal, drawer, sidebarOpen, setSidebarOpen, closeConfirm, closeModal, closeDrawer, toasts } = useUi();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirm) closeConfirm();
      else if (drawer) closeDrawer();
      else if (modal) closeModal();
      else if (sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, drawer, modal, sidebarOpen, closeConfirm, closeDrawer, closeModal, setSidebarOpen]);

  return (
    <div className="stage">
      <div className="shell">
        <Sidebar />
        <div className="workspace">
          <Topbar />
          <div className={cx('workspace-body', view.name === 'home' && 'with-rail')}>
            <main className="pane">
              <Main />
            </main>
            {view.name === 'home' && <Rail />}
          </div>
        </div>
      </div>
      {sidebarOpen && (
        <button type="button" className="scrim" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
      )}
      <Overlays />
      <div className="toasts" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className="toast">
            {item.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function Main() {
  const { view } = useUi();
  switch (view.name) {
    case 'home':
      return <Home />;
    case 'projects':
      return <ProjectsPage />;
    case 'project':
      return <ProjectPage id={view.projectId} />;
    case 'tasks':
      return <TasksPage />;
    case 'notes':
      return <NotesPage kind="note" />;
    case 'docs':
      return <NotesPage kind="doc" />;
    case 'goals':
      return <GoalsPage />;
    case 'activity':
      return <ActivityPage />;
    case 'agenda':
      return <AgendaPage />;
    case 'mentions':
      return <MentionsPage />;
    case 'stats':
      return <StatsPage />;
    case 'clients':
      return <ClientsPage />;
    case 'client':
      return <ClientPage id={view.clientId} />;
    case 'space':
      return <SpacePage id={view.spaceId} />;
    case 'favorites':
      return <FavoritesPage />;
    default:
      return <Home />;
  }
}

function Sidebar() {
  const { view, setView, openModal, sidebarOpen, expanded, toggleExpanded, setFocusDay } = useUi();
  const { spaces, addNote, tasks, profile, readMentionIds } = useStore();
  const unreadMentions = tasks.reduce(
    (count, task) =>
      count +
      task.comments.filter(
        (comment) => comment.mentionIds.includes(profile.memberId) && !readMentionIds.includes(comment.id),
      ).length,
    0,
  );
  const roots = spaces.filter((space) => !space.parentId);

  useEffect(() => {
    if (view.name !== 'space') return;
    const space = spaces.find((item) => item.id === view.spaceId);
    if (space?.parentId && expanded[space.parentId] === false) toggleExpanded(space.parentId);
  }, [view, spaces, expanded, toggleExpanded]);

  const go = (next: View) => setView(next);
  const on = (name: View['name']) => {
    if (name === 'projects') return view.name === 'projects' || view.name === 'project';
    if (name === 'clients') return view.name === 'clients' || view.name === 'client';
    return view.name === name;
  };

  return (
    <aside className={cx('sidebar', sidebarOpen && 'is-open')}>
      <button type="button" className="brand" aria-label="Ario" onClick={() => go({ name: 'home' })}>
        <img className="logo" src="/ario-logo.png" alt="" />
      </button>
      <nav className="nav" aria-label="Primary">
        <NavButton active={on('home')} icon={<HomeIcon size={16} />} label="Home" onClick={() => go({ name: 'home' })} />
        <NavButton active={on('projects')} icon={<FolderKanban size={16} />} label="Projects" onClick={() => go({ name: 'projects' })} />
        <NavButton active={on('tasks')} icon={<ListChecks size={16} />} label="Tasks" onClick={() => go({ name: 'tasks' })} />
        <NavButton active={on('notes')} icon={<StickyNote size={16} />} label="Notes" onClick={() => go({ name: 'notes' })} />
        <NavButton active={on('goals')} icon={<Target size={16} />} label="Goals" onClick={() => go({ name: 'goals' })} />
        <NavButton active={on('activity')} icon={<Activity size={16} />} label="Activity" onClick={() => go({ name: 'activity' })} />
      </nav>
      <nav className="nav nav-more" aria-label="More">
        <NavButton
          active={on('agenda')}
          icon={<CalendarDays size={16} />}
          label="Agenda"
          onClick={() => {
            setFocusDay(isoDay(new Date()));
            go({ name: 'agenda' });
          }}
        />
        <NavButton
          active={on('mentions')}
          icon={<AtSign size={16} />}
          label="Mentions"
          count={unreadMentions}
          onClick={() => go({ name: 'mentions' })}
        />
      </nav>
      <div className="side-scroll">
        <div className="spaces-head">
          <span>Spaces</span>
          <button type="button" className="icon-btn tiny" aria-label="New space" onClick={() => openModal({ kind: 'space' })}>
            <Plus size={14} />
          </button>
        </div>
        {roots.map((space) => (
          <SpaceNode key={space.id} space={space} />
        ))}
        <div className="side-links">
          <SideLink
            icon={<FileText size={16} />}
            label="Docs"
            active={on('docs')}
            onClick={() => go({ name: 'docs' })}
            plusLabel="New doc"
            onPlus={() => {
              const id = addNote({ title: 'Untitled doc', body: '', projectId: null, kind: 'doc' });
              go({ name: 'docs', noteId: id });
            }}
          />
          <SideLink icon={<Briefcase size={16} />} label="Clients" active={on('clients')} onClick={() => go({ name: 'clients' })} />
          <SideLink icon={<LayoutDashboard size={16} />} label="Dashboards" active={on('stats')} onClick={() => go({ name: 'stats' })} />
          <SideLink icon={<Star size={16} />} label="Favorites" active={on('favorites')} onClick={() => go({ name: 'favorites' })} />
        </div>
      </div>
      <button type="button" className="new-space" onClick={() => openModal({ kind: 'space' })}>
        <Plus size={16} /> New Space
      </button>
    </aside>
  );
}

function SpaceNode({ space }: { space: Space }) {
  const { spaces } = useStore();
  const { view, setView, expanded, toggleExpanded } = useUi();
  const kids = spaces.filter((item) => item.parentId === space.id);
  const open = expanded[space.id] !== false;
  const active = view.name === 'space' && view.spaceId === space.id;
  return (
    <div className="space-block">
      <div className={cx('space-parent', active && 'is-active')}>
        <button type="button" onClick={() => setView({ name: 'space', spaceId: space.id })}>
          <Folder size={15} />
          <span>{space.name}</span>
        </button>
        {kids.length > 0 && (
          <button type="button" aria-label={open ? 'Collapse' : 'Expand'} onClick={() => toggleExpanded(space.id)}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>
      {open &&
        kids.map((child) => {
          const childActive = view.name === 'space' && view.spaceId === child.id;
          return (
            <button
              key={child.id}
              type="button"
              className={cx('space-child', childActive && 'is-active')}
              onClick={() => setView({ name: 'space', spaceId: child.id })}
            >
              <i className="dot" style={{ background: child.dot ?? '#c8c4ba' }} />
              {child.name}
            </button>
          );
        })}
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className={cx('nav-item', active && 'is-active')} onClick={onClick} aria-current={active ? 'page' : undefined}>
      {icon}
      <span className="nav-label">{label}</span>
      {count ? <i className="count-pill">{count}</i> : null}
    </button>
  );
}

function SideLink({
  icon,
  label,
  active,
  onClick,
  onPlus,
  plusLabel,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  onPlus?: () => void;
  plusLabel?: string;
}) {
  return (
    <div className={cx('side-link', active && 'is-active')}>
      <button type="button" onClick={onClick}>
        {icon}
        <span>{label}</span>
      </button>
      {onPlus && (
        <button type="button" aria-label={plusLabel} onClick={onPlus}>
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

function Topbar() {
  const store = useStore();
  const { view, setView, openModal, setSidebarOpen, setFocusDay, openTask } = useUi();
  const me = store.members.find((member) => member.id === store.profile.memberId);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const hits = useMemo(() => searchHits(query, store), [query, store]);
  const today = isoDay(new Date());
  const mentions = store.tasks.flatMap((task) =>
    task.comments
      .filter((comment) => comment.mentionIds.includes(store.profile.memberId) && !store.readMentionIds.includes(comment.id))
      .map((comment) => ({ task, comment })),
  );
  const overdue = store.tasks.filter((task) => task.dueDate && task.dueDate < today && task.status !== 'done');
  const dueToday = store.tasks.filter((task) => task.dueDate === today && task.status !== 'done');
  const bellCount = mentions.length + overdue.length;

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (bellRef.current && !bellRef.current.contains(target)) setBellOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, []);

  function choose(hit: Hit) {
    setQuery('');
    setSearchOpen(false);
    if (hit.kind === 'project') setView({ name: 'project', projectId: hit.id });
    if (hit.kind === 'task') openTask(hit.id);
    if (hit.kind === 'note') setView({ name: 'notes', noteId: hit.id });
    if (hit.kind === 'doc') setView({ name: 'docs', noteId: hit.id });
    if (hit.kind === 'client') setView({ name: 'client', clientId: hit.id });
    if (hit.kind === 'goal') {
      setView({ name: 'goals' });
      openModal({ kind: 'goal', goalId: hit.id });
    }
  }

  return (
    <header className="topbar">
      <button type="button" className="icon-btn burger" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
        <Menu size={16} />
      </button>
      <div className="search-wrap" ref={searchRef}>
        <Search size={16} />
        <input
          value={query}
          placeholder="Search"
          aria-label="Search"
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && hits[0]) choose(hits[0]);
            if (event.key === 'Escape') {
              setQuery('');
              setSearchOpen(false);
            }
          }}
        />
        {searchOpen && query.trim() && (
          <div className="search-pop">
            {hits.length === 0 && <p className="quiet">No matches.</p>}
            {hits.map((hit) => (
              <button type="button" key={`${hit.kind}-${hit.id}`} onClick={() => choose(hit)}>
                <strong>{hit.title}</strong>
                <small>{hit.meta}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="top-actions">
        <RunningTimer />
        <button type="button" className="icon-btn" aria-label="Workspace settings" onClick={() => openModal({ kind: 'settings' })}>
          <Settings size={16} />
        </button>
        <div className="bell-wrap" ref={bellRef}>
          <button type="button" className="icon-btn" aria-label="Notifications" onClick={() => setBellOpen((open) => !open)}>
            <Bell size={16} />
            {bellCount > 0 && <span className="badge-count">{bellCount}</span>}
          </button>
          {bellOpen && (
            <div className="search-pop bell-pop">
              {bellCount === 0 && dueToday.length === 0 && <p className="quiet">You’re caught up.</p>}
              {overdue.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => {
                    openTask(task.id);
                    setBellOpen(false);
                  }}
                >
                  <strong>{task.title}</strong>
                  <small>Overdue · {task.dueDate ? formatShortDate(task.dueDate) : ''}</small>
                </button>
              ))}
              {mentions.map(({ task, comment }) => (
                <button
                  key={comment.id}
                  type="button"
                  onClick={() => {
                    openTask(task.id);
                    setBellOpen(false);
                  }}
                >
                  <strong>{task.title}</strong>
                  <small>{comment.text}</small>
                </button>
              ))}
              {dueToday.map((task) => (
                <button
                  key={`due-${task.id}`}
                  type="button"
                  onClick={() => {
                    openTask(task.id);
                    setBellOpen(false);
                  }}
                >
                  <strong>{task.title}</strong>
                  <small>Due today{task.dueTime ? ` · ${task.dueTime}` : ''}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="user-chip" onClick={() => openModal({ kind: 'settings' })}>
          {me && <Avatar member={me} size={28} />}
          <span>{store.profile.name}</span>
        </button>
        <button
          type="button"
          className={cx('top-link', view.name === 'agenda' && 'is-active')}
          aria-label="Agenda"
          onClick={() => {
            setFocusDay(isoDay(new Date()));
            setView({ name: 'agenda' });
          }}
        >
          <span>Agenda</span>
        </button>
        <button
          type="button"
          className={cx('top-link', view.name === 'mentions' && 'is-active')}
          aria-label={`Mentions, ${mentions.length} unread`}
          onClick={() => setView({ name: 'mentions' })}
        >
          <span>Mentions</span>
          <i className="count-pill">{mentions.length}</i>
        </button>
        <button type="button" className={cx('stats-btn', view.name === 'stats' && 'is-quiet')} onClick={() => setView({ name: 'stats' })}>
          Statistics
        </button>
      </div>
    </header>
  );
}

interface Hit {
  kind: 'project' | 'task' | 'note' | 'doc' | 'client' | 'goal';
  id: string;
  title: string;
  meta: string;
}

function searchHits(query: string, state: AppState): Hit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: Hit[] = [];
  state.projects.forEach((project) => {
    if (`${project.name} ${project.description}`.toLowerCase().includes(needle)) {
      hits.push({ kind: 'project', id: project.id, title: project.name, meta: 'Project' });
    }
  });
  state.tasks.forEach((task) => {
    if (`${task.title} ${task.description}`.toLowerCase().includes(needle)) {
      const project = projectOf(state.projects, task.projectId);
      hits.push({ kind: 'task', id: task.id, title: task.title, meta: project ? `Task · ${project.name}` : 'Task' });
    }
  });
  state.notes.forEach((note) => {
    if (`${note.title} ${note.body}`.toLowerCase().includes(needle)) {
      hits.push({
        kind: note.kind === 'doc' ? 'doc' : 'note',
        id: note.id,
        title: note.title || 'Untitled',
        meta: note.kind === 'doc' ? 'Doc' : 'Note',
      });
    }
  });
  state.clients.forEach((client) => {
    if (`${client.name} ${client.contact}`.toLowerCase().includes(needle)) {
      hits.push({ kind: 'client', id: client.id, title: client.name, meta: 'Client' });
    }
  });
  state.goals.forEach((goal) => {
    if (`${goal.title} ${goal.detail}`.toLowerCase().includes(needle)) {
      hits.push({ kind: 'goal', id: goal.id, title: goal.title, meta: 'Goal' });
    }
  });
  return hits.slice(0, 12);
}

function RunningTimer() {
  const now = useTicker(1000);
  const { timer, tasks, stopTimer } = useStore();
  const { openTask } = useUi();
  if (!timer) return null;
  const task = tasks.find((item) => item.id === timer.taskId);
  if (!task) return null;
  const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(timer.startedAt).getTime()) / 1000));
  return (
    <div className="timer-chip">
      <button type="button" onClick={() => openTask(task.id)}>
        <i className="live-dot" />
        <span>{task.title}</span>
        <b>{formatHMS(elapsed)}</b>
      </button>
      <button type="button" onClick={stopTimer}>
        <Square size={10} fill="currentColor" /> Stop
      </button>
    </div>
  );
}

function Rail() {
  const { tasks, projects, timeEntries, profile } = useStore();
  const { rangeEnd, shiftRange, setRangeEnd, openTask, setView } = useUi();
  const days = Array.from({ length: 5 }, (_, index) => addDays(parseDay(rangeEnd), index - 4));
  const today = isoDay(new Date());
  const weekStart = startOfWeek(new Date());
  const minutes = weekMinutes(timeEntries, weekStart);
  const last = weekMinutes(timeEntries, addDays(weekStart, -7));
  const percent = activityPercent(minutes, profile.weeklyGoalHours);
  const delta = percent - activityPercent(last, profile.weeklyGoalHours);
  const spark = dailyMinutes(timeEntries, weekStart, 7);
  const progressValues = projects.filter((project) => project.status !== 'paused').map((project) => projectProgress(tasks, project.id));
  const progress = Math.round(average(progressValues));
  const lift = progressLift(tasks, weekStart);
  const windowMinutes = days.reduce((sum, day) => {
    const key = isoDay(day);
    return (
      sum + timeEntries.reduce((inner, entry) => (isoDay(new Date(entry.start)) === key ? inner + entry.minutes : inner), 0)
    );
  }, 0);
  const label = `${formatShortDate(isoDay(days[0]))} – ${formatShortDate(isoDay(days[4]))}`;

  return (
    <aside className="rail">
      <article className="pulse-card lime">
        <Sparkline values={spark} />
        <div>
          <h3>Weekly activity</h3>
          <p className="big">{percent}%</p>
        </div>
        <span className="delta">
          {delta >= 0 ? '+' : ''}
          {delta}%
        </span>
      </article>
      <article className="pulse-card pink">
        <Radial value={progress} />
        <div>
          <h3>Total progress</h3>
          <p>this week</p>
        </div>
        <span className="delta">
          {lift >= 0 ? '+' : ''}
          {lift}%
        </span>
      </article>
      <div className="rail-head">
        <h3>Working activity</h3>
        <div className="range">
          <button type="button" aria-label="Previous days" onClick={() => shiftRange(-5)}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" className="range-label" onClick={() => setRangeEnd(today)}>
            {label}
          </button>
          <button type="button" aria-label="Next days" onClick={() => shiftRange(5)}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="cal-head">
        {days.map((day) => {
          const key = isoDay(day);
          return (
            <div key={key}>
              <span>{formatWeekday(day)}</span>
              <b className={key === today ? 'today' : ''}>{day.getDate()}</b>
            </div>
          );
        })}
      </div>
      <div className="cal-grid">
        {days.map((day) => {
          const key = isoDay(day);
          const entries = timeEntries.filter((entry) => isoDay(new Date(entry.start)) === key);
          const blocks = layoutDay(entries);
          return (
            <div key={key} className="day-col">
              {blocks.map((block) => {
                const task = tasks.find((item) => item.id === block.entry.taskId);
                const width = `calc((100% - 10px) / ${block.lanes} - 4px)`;
                return (
                  <button
                    key={block.entry.id}
                    type="button"
                    className="bar"
                    style={{
                      top: `${block.top * 100}%`,
                      height: `${block.height * 100}%`,
                      left: `calc(6px + ${block.lane} * (100% - 10px) / ${block.lanes})`,
                      width,
                      background: barColor(task?.projectId ?? block.entry.taskId),
                    }}
                    onClick={() => task && openTask(task.id)}
                  >
                    <span className="tip">
                      <strong>{formatHM(block.entry.start)}</strong>
                      {task?.title ?? 'Time'}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
      <p className="total-time">
        Total time: <em>{formatHours(windowMinutes)}</em>
      </p>
      <button type="button" className="text-link rail-link" onClick={() => setView({ name: 'stats' })}>
        Open statistics <ArrowUpRight size={14} />
      </button>
    </aside>
  );
}
