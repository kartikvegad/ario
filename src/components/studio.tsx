import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { NoteKind } from '../types.ts';
import { useStore } from '../store.tsx';
import { useUi } from '../ui.tsx';
import { useTicker } from '../useTicker.ts';
import { Avatar, Empty, Meter, PageHead, MentionText } from './bits.tsx';
import { ProjectCard } from './projects.tsx';
import { WorkRow } from './work.tsx';
import {
  activityPercent,
  addDays,
  average,
  dailyMinutes,
  formatHours,
  formatLongDate,
  formatMinutes,
  formatShortDate,
  formatWeekday,
  isoDay,
  parseDay,
  progressLift,
  projectProgress,
  spaceAndChildren,
  spacePath,
  startOfWeek,
  timeAgo,
  weekMinutes,
} from '../utils.ts';

export function NotesPage({ kind }: { kind: NoteKind }) {
  const { notes, projects, addNote, updateNote, deleteNote } = useStore();
  const { view, setView, ask } = useUi();
  const list = notes.filter((note) => note.kind === kind);
  const fromView = view.name === 'notes' || view.name === 'docs' ? view.noteId : undefined;
  const [currentId, setCurrentId] = useState<string | null>(fromView ?? list[0]?.id ?? null);
  const current = list.find((note) => note.id === currentId) ?? list[0];

  useEffect(() => {
    if (fromView) setCurrentId(fromView);
  }, [fromView]);

  function select(id: string) {
    setCurrentId(id);
    setView(kind === 'doc' ? { name: 'docs', noteId: id } : { name: 'notes', noteId: id });
  }

  function create() {
    const id = addNote({
      title: kind === 'doc' ? 'Untitled doc' : 'Untitled note',
      body: '',
      projectId: null,
      kind,
    });
    select(id);
  }

  return (
    <div className="notes">
      <aside className="note-list">
        <div className="note-list-head">
          <h1>{kind === 'doc' ? 'Docs' : 'Notes'}</h1>
          <button type="button" className="icon-btn tiny" onClick={create} aria-label="New">
            <Plus size={16} />
          </button>
        </div>
        {list.length === 0 && <p className="quiet">Nothing here yet.</p>}
        {list.map((note) => (
          <button
            key={note.id}
            type="button"
            className={current?.id === note.id ? 'note-item is-on' : 'note-item'}
            onClick={() => select(note.id)}
          >
            <strong>{note.title || 'Untitled'}</strong>
            <span>{timeAgo(note.updatedAt)}</span>
          </button>
        ))}
      </aside>
      <section className="note-editor">
        {!current ? (
          <Empty
            title={kind === 'doc' ? 'No docs yet' : 'No notes yet'}
            body="Capture a kickoff, a voice guide, or an API convention."
            action={
              <button type="button" className="btn-dark" onClick={create}>
                New {kind === 'doc' ? 'doc' : 'note'}
              </button>
            }
          />
        ) : (
          <>
            <div className="editor-bar">
              <select
                value={current.projectId ?? ''}
                onChange={(event) => updateNote(current.id, { projectId: event.target.value || null })}
                aria-label="Linked project"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  const next = current.kind === 'doc' ? 'note' : 'doc';
                  updateNote(current.id, { kind: next });
                  setView(next === 'doc' ? { name: 'docs' } : { name: 'notes' });
                }}
              >
                {current.kind === 'doc' ? 'Move to notes' : 'Move to docs'}
              </button>
              <button
                type="button"
                className="icon-btn tiny"
                aria-label="Delete"
                onClick={() =>
                  ask({
                    title: 'Delete this?',
                    body: `“${current.title || 'Untitled'}” will be removed.`,
                    confirmLabel: 'Delete',
                    danger: true,
                    onConfirm: () => deleteNote(current.id),
                  })
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
            <input
              className="note-title"
              value={current.title}
              aria-label="Title"
              onChange={(event) => updateNote(current.id, { title: event.target.value })}
            />
            <textarea
              value={current.body}
              aria-label="Body"
              placeholder="Write it down."
              onChange={(event) => updateNote(current.id, { body: event.target.value })}
            />
          </>
        )}
      </section>
    </div>
  );
}

export function GoalsPage() {
  const { goals, projects, updateGoal } = useStore();
  const { openModal, ask, deleteGoal } = useGoalActions();
  return (
    <div className="page">
      <PageHead
        title="Goals"
        count={goals.length}
        lede="Targets for delivery, hours, and the work you want finished."
        action={
          <button type="button" className="btn-dark" onClick={() => openModal({ kind: 'goal' })}>
            <Plus size={16} /> New goal
          </button>
        }
      />
      {goals.length === 0 ? (
        <Empty title="No goals yet" body="Set a target and tick it forward as the work lands." />
      ) : (
        <div className="card-grid">
          {goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            const project = projects.find((item) => item.id === goal.projectId);
            return (
              <article key={goal.id} className="gcard">
                <header>
                  <h3>{goal.title}</h3>
                  <button type="button" className="text-link" onClick={() => openModal({ kind: 'goal', goalId: goal.id })}>
                    Edit
                  </button>
                </header>
                <p>{goal.detail}</p>
                {project && <p className="quiet tiny">{project.name}</p>}
                <Meter value={pct} />
                <div className="stepper">
                  <button type="button" onClick={() => updateGoal(goal.id, { current: Math.max(0, goal.current - 1) })} aria-label="Decrease">
                    −
                  </button>
                  <strong>
                    {goal.current}
                    <span>
                      {' '}
                      / {goal.target} {goal.unit}
                    </span>
                  </strong>
                  <button type="button" onClick={() => updateGoal(goal.id, { current: goal.current + 1 })} aria-label="Increase">
                    +
                  </button>
                </div>
                <footer>
                  <span>{goal.dueDate ? formatShortDate(goal.dueDate) : 'No date'}</span>
                  <button
                    type="button"
                    className="text-link danger"
                    onClick={() =>
                      ask({
                        title: 'Remove goal',
                        body: `Remove “${goal.title}”?`,
                        confirmLabel: 'Remove',
                        danger: true,
                        onConfirm: () => deleteGoal(goal.id),
                      })
                    }
                  >
                    Remove
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function useGoalActions() {
  const { deleteGoal } = useStore();
  const { openModal, ask } = useUi();
  return { deleteGoal, openModal, ask };
}

export function ActivityPage() {
  const { activities } = useStore();
  const groups = new Map<string, typeof activities>();
  activities.forEach((item) => {
    const key = isoDay(new Date(item.createdAt));
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  });
  const days = [...groups.entries()];
  return (
    <div className="page narrow">
      <PageHead title="Activity" lede="What changed in the studio." />
      {days.length === 0 && <Empty title="No activity yet" body="Creating a project or logging time will show up here." />}
      {days.map(([day, items]) => (
        <section key={day} className="feed-day">
          <h2>{formatLongDate(parseDay(day))}</h2>
          {items.map((item) => (
            <article key={item.id} className="feed-item">
              <i data-kind={item.kind} />
              <div>
                <p>{item.text}</p>
                <time>{timeAgo(item.createdAt)}</time>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

export function AgendaPage() {
  const { tasks } = useStore();
  const { focusDay, setFocusDay, openNewTask } = useUi();
  const anchor = parseDay(focusDay);
  const weekStart = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const today = isoDay(new Date());
  const due = tasks
    .filter((task) => task.dueDate === focusDay && task.status !== 'done')
    .sort((a, b) => (a.dueTime ?? '').localeCompare(b.dueTime ?? ''));
  const done = tasks.filter((task) => task.dueDate === focusDay && task.status === 'done');
  const overdue = tasks.filter((task) => task.dueDate && task.dueDate < today && task.status !== 'done');

  return (
    <div className="page">
      <PageHead
        title="Agenda"
        lede={formatLongDate(anchor)}
        action={
          <button type="button" className="btn-dark" onClick={() => openNewTask({ dueDate: focusDay })}>
            <Plus size={16} /> Task on this day
          </button>
        }
      />
      <div className="agenda-nav">
        <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setFocusDay(isoDay(addDays(weekStart, -7)))}>
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="btn-ghost" onClick={() => setFocusDay(today)}>
          Today
        </button>
        <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setFocusDay(isoDay(addDays(weekStart, 7)))}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="week-strip">
        {days.map((day) => {
          const key = isoDay(day);
          const count = tasks.filter((task) => task.dueDate === key && task.status !== 'done').length;
          return (
            <button
              key={key}
              type="button"
              className={`day-btn${key === focusDay ? ' is-on' : ''}${key === today ? ' is-today' : ''}`}
              onClick={() => setFocusDay(key)}
            >
              <span>{formatWeekday(day)}</span>
              <strong>{day.getDate()}</strong>
              <em>{count || ''}</em>
            </button>
          );
        })}
      </div>
      {focusDay === today && overdue.length > 0 && (
        <section className="block">
          <h2>Overdue</h2>
          <div className="work-list">
            {overdue.map((task) => (
              <WorkRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
      <section className="block">
        <h2>Due</h2>
        <div className="work-list">
          {due.map((task) => (
            <WorkRow key={task.id} task={task} />
          ))}
          {due.length === 0 && <p className="quiet">Nothing due this day.</p>}
        </div>
      </section>
      {done.length > 0 && (
        <section className="block">
          <h2>Finished</h2>
          <div className="work-list">
            {done.map((task) => (
              <WorkRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export function MentionsPage() {
  const now = useTicker(60_000);
  const { tasks, members, profile, markMentionsRead, readMentionIds } = useStore();
  const { openTask } = useUi();
  const me = profile.memberId;
  const items = useMemo(
    () =>
      tasks
        .flatMap((task) => task.comments.filter((comment) => comment.mentionIds.includes(me)).map((comment) => ({ task, comment })))
        .sort((a, b) => +new Date(b.comment.createdAt) - +new Date(a.comment.createdAt)),
    [tasks, me],
  );

  useEffect(() => {
    const unread = items.map((item) => item.comment.id).filter((id) => !readMentionIds.includes(id));
    if (unread.length) markMentionsRead(unread);
  }, [items, markMentionsRead, readMentionIds]);

  return (
    <div className="page narrow">
      <PageHead title="Mentions" count={items.length} lede="Comments that call you in." />
      {items.length === 0 && <Empty title="No mentions" body="When someone writes @your name on a task, it lands here." />}
      <div className="mention-list">
        {items.map(({ task, comment }) => {
          const author = members.find((member) => member.id === comment.authorId);
          return (
            <button key={comment.id} type="button" className="mention" onClick={() => openTask(task.id)}>
              {author && <Avatar member={author} />}
              <span>
                <strong>{author?.name ?? 'Someone'}</strong>
                <span className="quiet tiny"> on {task.title}</span>
                <p>
                  <MentionText text={comment.text} members={members} />
                </p>
                <time>{timeAgo(comment.createdAt, now)}</time>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StatsPage() {
  const { tasks, projects, timeEntries, profile, goals } = useStore();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const thisMinutes = weekMinutes(timeEntries, weekStart);
  const lastMinutes = weekMinutes(timeEntries, addDays(weekStart, -7));
  const thisPct = activityPercent(thisMinutes, profile.weeklyGoalHours);
  const lastPct = activityPercent(lastMinutes, profile.weeklyGoalHours);
  const days = dailyMinutes(timeEntries, weekStart, 7);
  const maxDay = Math.max(...days, 1);
  const done = tasks.filter((task) => task.status === 'done').length;
  const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const overdue = tasks.filter((task) => task.dueDate && task.dueDate < isoDay(now) && task.status !== 'done').length;
  const active = projects.filter((project) => project.status === 'active').length;
  const lift = progressLift(tasks, weekStart);
  const byStatus = ['todo', 'in-progress', 'review', 'done', 'delegated'] as const;
  const hoursByProject = projects
    .map((project) => {
      const ids = new Set(tasks.filter((task) => task.projectId === project.id).map((task) => task.id));
      const minutes = timeEntries.filter((entry) => ids.has(entry.taskId)).reduce((sum, entry) => sum + entry.minutes, 0);
      return { project, minutes };
    })
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5);
  const maxProject = Math.max(...hoursByProject.map((item) => item.minutes), 1);

  return (
    <div className="page">
      <PageHead title="Statistics" lede="Hours, progress, and where the week actually went." />
      <div className="stat-grid">
        <article className="stat-tile">
          <span>Completion</span>
          <strong>{rate}%</strong>
        </article>
        <article className="stat-tile">
          <span>This week</span>
          <strong>{formatHours(thisMinutes)}</strong>
        </article>
        <article className="stat-tile">
          <span>Active projects</span>
          <strong>{active}</strong>
        </article>
        <article className="stat-tile">
          <span>Overdue</span>
          <strong>{overdue}</strong>
        </article>
      </div>
      <div className="split">
        <section className="panel">
          <h2>Hours by day</h2>
          <p className="quiet tiny">
            Goal {profile.weeklyGoalHours}h · {thisPct}% this week · {thisPct - lastPct >= 0 ? '+' : ''}
            {thisPct - lastPct}% vs last week
          </p>
          <div className="cols">
            {days.map((minutes, index) => {
              const day = addDays(weekStart, index);
              const today = isoDay(day) === isoDay(now);
              return (
                <div key={isoDay(day)} className={today ? 'col is-today' : 'col'}>
                  <div className="col-bar" style={{ height: `${Math.max(minutes ? 8 : 3, (minutes / maxDay) * 100)}%` }} />
                  <span>{formatWeekday(day)}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="panel">
          <h2>Tasks by status</h2>
          <ul className="bars">
            {byStatus.map((status) => {
              const count = tasks.filter((task) => task.status === status).length;
              const width = tasks.length ? (count / tasks.length) * 100 : 0;
              return (
                <li key={status}>
                  <span>{status === 'in-progress' ? 'In progress' : status[0].toUpperCase() + status.slice(1)}</span>
                  <span className="meter">
                    <i style={{ width: `${width}%` }} />
                  </span>
                  <b>{count}</b>
                </li>
              );
            })}
          </ul>
          <p className="quiet tiny">Average task progress moved {lift >= 0 ? '+' : ''}{lift}% from work finished this week.</p>
        </section>
      </div>
      <div className="split">
        <section className="panel">
          <h2>Time by project</h2>
          {hoursByProject.length === 0 && <p className="quiet">Log time on a task and it will collect here.</p>}
          <ul className="bars">
            {hoursByProject.map(({ project, minutes }) => (
              <li key={project.id}>
                <span>{project.name}</span>
                <span className="meter">
                  <i style={{ width: `${(minutes / maxProject) * 100}%` }} />
                </span>
                <b>{formatMinutes(minutes)}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Goals</h2>
          {goals.length === 0 && <p className="quiet">No goals yet.</p>}
          {goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
            return (
              <div key={goal.id} className="goal-line">
                <div>
                  <strong>{goal.title}</strong>
                  <span>
                    {goal.current}/{goal.target} {goal.unit}
                  </span>
                </div>
                <Meter value={pct} />
              </div>
            );
          })}
          <p className="quiet tiny">
            Studio progress {Math.round(average(projects.map((project) => projectProgress(tasks, project.id))))}% across projects.
          </p>
        </section>
      </div>
    </div>
  );
}

export function ClientsPage() {
  const { clients, projects, tasks } = useStore();
  const { setView, openModal } = useUi();
  return (
    <div className="page">
      <PageHead
        title="Clients"
        count={clients.length}
        lede="The accounts behind the web, brand, and retainer work."
        action={
          <button type="button" className="btn-dark" onClick={() => openModal({ kind: 'client' })}>
            <Plus size={16} /> New client
          </button>
        }
      />
      {clients.length === 0 ? (
        <Empty title="No clients yet" body="Add a client, then attach projects to them." />
      ) : (
        <div className="card-grid">
          {clients.map((client) => {
            const owned = projects.filter((project) => project.clientId === client.id);
            const progress = owned.length ? Math.round(average(owned.map((project) => projectProgress(tasks, project.id)))) : 0;
            return (
              <article key={client.id} className="pcard">
                <button type="button" className="pcard-open" onClick={() => setView({ name: 'client', clientId: client.id })}>
                  <h3>{client.name}</h3>
                  <p>{client.contact || 'No contact yet'}</p>
                </button>
                <Meter value={progress} />
                <div className="pcard-foot">
                  <span>{owned.length} projects</span>
                  <span>{progress}%</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ClientPage({ id }: { id: string }) {
  const { clients, projects, updateClient, deleteClient } = useStore();
  const { setView, openModal, ask } = useUi();
  const client = clients.find((item) => item.id === id);
  if (!client) {
    return (
      <div className="page">
        <Empty title="Client not found" body="They may have been removed." />
      </div>
    );
  }
  const owned = projects.filter((project) => project.clientId === client.id);
  return (
    <div className="page">
      <button type="button" className="back" onClick={() => setView({ name: 'clients' })}>
        Clients
      </button>
      <div className="detail-head">
        <div>
          <h1>{client.name}</h1>
          <p className="lede">
            {client.contact || 'No contact'}
            {client.email ? ` · ${client.email}` : ''}
          </p>
        </div>
        <div className="detail-actions">
          <button type="button" className="btn-ghost" onClick={() => openModal({ kind: 'client', clientId: client.id })}>
            Edit
          </button>
          <button
            type="button"
            className="btn-ghost danger"
            onClick={() =>
              ask({
                title: 'Remove client',
                body: `Remove ${client.name}? Projects stay, they just become internal.`,
                confirmLabel: 'Remove',
                danger: true,
                onConfirm: () => {
                  deleteClient(client.id);
                  setView({ name: 'clients' });
                },
              })
            }
          >
            Remove
          </button>
        </div>
      </div>
      <label className="field">
        <span>Notes</span>
        <textarea rows={4} value={client.notes} onChange={(event) => updateClient(client.id, { notes: event.target.value })} />
      </label>
      <div className="card-grid">
        {owned.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
      {owned.length === 0 && <p className="quiet">No projects linked yet. Edit a project and choose this client.</p>}
    </div>
  );
}

export function SpacePage({ id }: { id: string }) {
  const { spaces, projects, tasks, deleteSpace } = useStore();
  const { setView, openModal, openNewTask, ask, toast } = useUi();
  const space = spaces.find((item) => item.id === id);
  if (!space) {
    return (
      <div className="page">
        <Empty title="Space not found" body="It may have been removed." />
      </div>
    );
  }
  const ids = spaceAndChildren(spaces, space.id);
  const kids = spaces.filter((item) => item.parentId === space.id);
  const owned = projects.filter((project) => ids.includes(project.spaceId));
  const taskList = tasks.filter((task) => owned.some((project) => project.id === task.projectId) && task.status !== 'done');
  return (
    <div className="page">
      <PageHead
        eyebrow={spacePath(spaces, space.id)}
        title={space.name}
        count={owned.length}
        action={
          <div className="detail-actions">
            <button type="button" className="btn-ghost" onClick={() => openModal({ kind: 'space', parentId: space.id })}>
              Add subspace
            </button>
            <button type="button" className="btn-dark" onClick={() => openModal({ kind: 'project', spaceId: space.id })}>
              <Plus size={16} /> Project
            </button>
          </div>
        }
      />
      {kids.length > 0 && (
        <div className="chip-row">
          {kids.map((child) => (
            <button key={child.id} type="button" className="chip" onClick={() => setView({ name: 'space', spaceId: child.id })}>
              {child.dot && <i className="dot" style={{ background: child.dot }} />}
              {child.name}
            </button>
          ))}
        </div>
      )}
      {owned.length === 0 ? (
        <Empty title="This space is empty" body="Add a project for the kind of work that belongs here." />
      ) : (
        <div className="card-grid">
          {owned.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
      <section className="block">
        <div className="block-head">
          <h2>Open tasks</h2>
          <button type="button" className="btn-ghost" onClick={() => openNewTask({ projectId: owned[0]?.id })}>
            Add task
          </button>
        </div>
        <div className="work-list">
          {taskList.map((task) => (
            <WorkRow key={task.id} task={task} />
          ))}
          {taskList.length === 0 && <p className="quiet">No open tasks in this space.</p>}
        </div>
      </section>
      <button
        type="button"
        className="btn-ghost danger"
        onClick={() => {
          if (spaces.length < 2) {
            toast('Keep at least one space.');
            return;
          }
          ask({
            title: 'Remove space',
            body: `Remove “${space.name}”? Projects inside move to another space.`,
            confirmLabel: 'Remove',
            danger: true,
            onConfirm: () => {
              const ok = deleteSpace(space.id);
              if (ok) setView({ name: 'home' });
              else toast('Keep at least one space.');
            },
          });
        }}
      >
        Remove space
      </button>
    </div>
  );
}

export function FavoritesPage() {
  const { projects } = useStore();
  const favorites = projects.filter((project) => project.favorite);
  return (
    <div className="page">
      <PageHead title="Favorites" count={favorites.length} lede="Projects you starred, kept close." />
      {favorites.length === 0 ? (
        <Empty title="No favorites yet" body="Star a project from the projects page and it will stay here." />
      ) : (
        <div className="card-grid">
          {favorites.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
