import { useState, type FormEvent, type ReactNode } from 'react';
import { Play, Square, Trash2, X } from 'lucide-react';
import type { Accent, Priority, ProjectStatus, ProjectType, Task, TaskPrefill, TaskStatus } from '../types.ts';
import { useStore } from '../store.tsx';
import { useUi } from '../ui.tsx';
import { useTicker } from '../useTicker.ts';
import { Avatar, MentionText } from './bits.tsx';
import {
  ACCENTS,
  PRIORITIES,
  PROJECT_STATUSES,
  STATUSES,
  TYPES,
  cx,
  formatHM,
  formatHMS,
  formatMinutes,
  formatShortDate,
  isoDay,
  normalize,
  timeAgo,
} from '../utils.ts';

export function Overlays() {
  const { modal, confirm, closeConfirm } = useUi();
  return (
    <>
      <TaskDrawer />
      {modal?.kind === 'project' && <ProjectModal projectId={modal.projectId} spaceId={modal.spaceId} />}
      {modal?.kind === 'goal' && <GoalModal goalId={modal.goalId} />}
      {modal?.kind === 'space' && <SpaceModal parentId={modal.parentId} />}
      {modal?.kind === 'client' && <ClientModal clientId={modal.clientId} />}
      {modal?.kind === 'settings' && <SettingsModal />}
      {confirm && (
        <Modal title={confirm.title} onClose={closeConfirm}>
          <p className="lede">{confirm.body}</p>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={closeConfirm}>
              Cancel
            </button>
            <button
              type="button"
              className={confirm.danger ? 'btn-dark danger-fill' : 'btn-dark'}
              onClick={() => {
                confirm.onConfirm();
                closeConfirm();
              }}
            >
              {confirm.confirmLabel}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function DrawerHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className="modal-head">
      <h2>{title}</h2>
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </header>
  );
}

function TaskDrawer() {
  const { drawer, closeDrawer } = useUi();
  const { tasks } = useStore();
  if (!drawer) return null;
  const existing = drawer.taskId ? tasks.find((task) => task.id === drawer.taskId) : undefined;
  if (drawer.taskId && !existing) return null;
  return (
    <div className="backdrop drawer-back" onMouseDown={closeDrawer}>
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={existing ? existing.title : 'New task'}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {existing ? <EditTask task={existing} /> : <CreateTask prefill={drawer.prefill} />}
      </div>
    </div>
  );
}

function CreateTask({ prefill }: { prefill: TaskPrefill }) {
  const { projects, profile, addTask } = useStore();
  const { closeDrawer, openTask, openModal } = useUi();
  const [title, setTitle] = useState(prefill.title ?? '');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(prefill.projectId ?? projects[0]?.id ?? '');
  const [status, setStatus] = useState<TaskStatus>(prefill.status ?? 'todo');
  const [priority, setPriority] = useState<Priority>('medium');
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState(prefill.dueDate ?? '');
  const [dueTime, setDueTime] = useState('');
  const [lineup, setLineup] = useState(Boolean(prefill.lineup));
  const [assignees, setAssignees] = useState<string[]>([profile.memberId]);
  const [checks, setChecks] = useState<{ text: string; done: boolean }[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  if (!projects.length) {
    return (
      <>
        <DrawerHead title="New task" onClose={closeDrawer} />
        <p className="lede">Tasks live inside a project. Create one, then add the work.</p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-dark"
            onClick={() => {
              closeDrawer();
              openModal({ kind: 'project' });
            }}
          >
            New project
          </button>
        </div>
      </>
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Name the task.');
      return;
    }
    const id = addTask({
      title: title.trim(),
      description: description.trim(),
      projectId,
      status,
      priority,
      progress,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      assigneeIds: assignees,
      checklist: checks,
      lineup,
    });
    openTask(id);
  }

  return (
    <form onSubmit={submit}>
      <DrawerHead title="New task" onClose={closeDrawer} />
      <label className="field">
        <span>Title</span>
        <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs doing?" />
      </label>
      {error && <p className="form-error">{error}</p>}
      <label className="field">
        <span>Project</span>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <div className="split-fields">
        <label className="field">
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            {STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
            {PRIORITIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Progress {progress}%</span>
        <input type="range" min={0} max={100} value={progress} onChange={(event) => setProgress(Number(event.target.value))} />
      </label>
      <div className="split-fields">
        <label className="field">
          <span>Due date</span>
          <input type="date" value={dueDate ?? ''} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label className="field">
          <span>Due time</span>
          <input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={lineup} onChange={(event) => setLineup(event.target.checked)} />
        Show in LineUp
      </label>
      <div className="field">
        <span>People</span>
        <PeoplePicker ids={assignees} onChange={setAssignees} />
      </div>
      <div className="field">
        <span>Checklist</span>
        <ul className="checks-edit">
          {checks.map((item, index) => (
            <li key={`${item.text}-${index}`}>
              <span>{item.text}</span>
              <button type="button" onClick={() => setChecks(checks.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
        <div className="inline-add">
          <input
            value={draft}
            placeholder="Add a step"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!draft.trim()) return;
                setChecks([...checks, { text: draft.trim(), done: false }]);
                setDraft('');
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              if (!draft.trim()) return;
              setChecks([...checks, { text: draft.trim(), done: false }]);
              setDraft('');
            }}
          >
            Add
          </button>
        </div>
      </div>
      <label className="field">
        <span>Notes</span>
        <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="modal-actions">
        <button type="button" className="btn-ghost" onClick={closeDrawer}>
          Cancel
        </button>
        <button type="submit" className="btn-dark">
          Create task
        </button>
      </div>
    </form>
  );
}

function EditTask({ task }: { task: Task }) {
  const { projects, updateTask, deleteTask, members } = useStore();
  const { closeDrawer, ask } = useUi();
  return (
    <div>
      <DrawerHead title="Task" onClose={closeDrawer} />
      <label className="field">
        <span>Title</span>
        <input value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} />
      </label>
      <label className="field">
        <span>Project</span>
        <select value={task.projectId} onChange={(event) => updateTask(task.id, { projectId: event.target.value })}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <div className="split-fields">
        <label className="field">
          <span>Status</span>
          <select value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus })}>
            {STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Priority</span>
          <select value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority })}>
            {PRIORITIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Progress {task.progress}%</span>
        <input
          type="range"
          min={0}
          max={100}
          value={task.progress}
          onChange={(event) => updateTask(task.id, { progress: Number(event.target.value) })}
        />
      </label>
      <div className="split-fields">
        <label className="field">
          <span>Due date</span>
          <input
            type="date"
            value={task.dueDate ?? ''}
            onChange={(event) => updateTask(task.id, { dueDate: event.target.value || null })}
          />
        </label>
        <label className="field">
          <span>Due time</span>
          <input
            type="time"
            value={task.dueTime ?? ''}
            onChange={(event) => updateTask(task.id, { dueTime: event.target.value || null })}
          />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={task.lineup} onChange={(event) => updateTask(task.id, { lineup: event.target.checked })} />
        Show in LineUp
      </label>
      <div className="field">
        <span>People</span>
        <PeoplePicker ids={task.assigneeIds} onChange={(assigneeIds) => updateTask(task.id, { assigneeIds })} />
      </div>
      <Checklist taskId={task.id} items={task.checklist} />
      <label className="field">
        <span>Notes</span>
        <textarea rows={3} value={task.description} onChange={(event) => updateTask(task.id, { description: event.target.value })} />
      </label>
      <TimerControls taskId={task.id} />
      <CommentBox task={task} />
      <div className="mention-list compact">
        {task.comments.map((comment) => {
          const author = members.find((member) => member.id === comment.authorId);
          return (
            <article key={comment.id} className="mention static">
              {author && <Avatar member={author} size={28} />}
              <span>
                <strong>{author?.name ?? 'Someone'}</strong>
                <time> {timeAgo(comment.createdAt)}</time>
                <p>
                  <MentionText text={comment.text} members={members} />
                </p>
              </span>
              <DeleteComment taskId={task.id} commentId={comment.id} />
            </article>
          );
        })}
      </div>
      <div className="modal-actions">
        <button
          type="button"
          className="btn-ghost danger"
          onClick={() =>
            ask({
              title: 'Delete task',
              body: `Delete “${task.title}”?`,
              confirmLabel: 'Delete',
              danger: true,
              onConfirm: () => {
                deleteTask(task.id);
                closeDrawer();
              },
            })
          }
        >
          <Trash2 size={14} /> Delete task
        </button>
      </div>
    </div>
  );
}

function DeleteComment({ taskId, commentId }: { taskId: string; commentId: string }) {
  const { deleteComment } = useStore();
  return (
    <button type="button" className="icon-btn tiny" aria-label="Delete comment" onClick={() => deleteComment(taskId, commentId)}>
      <X size={12} />
    </button>
  );
}

function Checklist({ taskId, items }: { taskId: string; items: Task['checklist'] }) {
  const { addCheck, toggleCheck, removeCheck } = useStore();
  const [draft, setDraft] = useState('');
  return (
    <div className="field">
      <span>
        Checklist {items.filter((item) => item.done).length}/{items.length}
      </span>
      <ul className="checks-edit">
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input type="checkbox" checked={item.done} onChange={() => toggleCheck(taskId, item.id)} />
              <span className={item.done ? 'struck' : ''}>{item.text}</span>
            </label>
            <button type="button" onClick={() => removeCheck(taskId, item.id)} aria-label="Remove step">
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
      <div className="inline-add">
        <input
          value={draft}
          placeholder="Add a step"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addCheck(taskId, draft);
              setDraft('');
            }
          }}
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            addCheck(taskId, draft);
            setDraft('');
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TimerControls({ taskId }: { taskId: string }) {
  const now = useTicker(1000);
  const { timer, startTimer, stopTimer, timeEntries, logTime, deleteTimeEntry, tasks } = useStore();
  const [day, setDay] = useState(() => isoDay(new Date()));
  const [time, setTime] = useState('09:00');
  const [minutes, setMinutes] = useState(60);
  const running = timer?.taskId === taskId;
  const elapsed = running ? Math.max(0, Math.floor((now.getTime() - new Date(timer.startedAt).getTime()) / 1000)) : 0;
  const entries = timeEntries
    .filter((entry) => entry.taskId === taskId)
    .sort((a, b) => +new Date(b.start) - +new Date(a.start))
    .slice(0, 6);
  const task = tasks.find((item) => item.id === taskId);

  return (
    <div className="field">
      <span>Time</span>
      <div className="timer-row">
        {running ? (
          <button type="button" className="btn-dark" onClick={stopTimer}>
            <Square size={12} fill="currentColor" /> Stop {formatHMS(elapsed)}
          </button>
        ) : (
          <button type="button" className="btn-dark" onClick={() => startTimer(taskId)}>
            <Play size={13} fill="currentColor" /> Start timer
          </button>
        )}
        {timer && timer.taskId !== taskId && <span className="quiet tiny">Another timer is running and will stop.</span>}
      </div>
      <div className="inline-add log-add">
        <input type="date" value={day} onChange={(event) => setDay(event.target.value)} aria-label="Log date" />
        <input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Start time" />
        <input
          type="number"
          min={1}
          max={720}
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
          aria-label="Minutes"
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            if (minutes > 0 && task) logTime(taskId, day, time, minutes);
          }}
        >
          Log
        </button>
      </div>
      <ul className="checks-edit">
        {entries.map((entry) => (
          <li key={entry.id}>
            <span>
              {formatShortDate(isoDay(new Date(entry.start)))} · {formatHM(entry.start)} · {formatMinutes(entry.minutes)}
            </span>
            <button type="button" onClick={() => deleteTimeEntry(entry.id)} aria-label="Delete time entry">
              <X size={12} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommentBox({ task }: { task: Task }) {
  const { members, addComment } = useStore();
  const [text, setText] = useState('');
  const match = text.match(/@([A-Za-z]*)$/);
  const query = match?.[1]?.toLowerCase() ?? '';
  const suggestions = match ? members.filter((member) => member.name.toLowerCase().includes(query)).slice(0, 5) : [];

  function insert(name: string) {
    setText(text.replace(/@([A-Za-z]*)$/, `@${name} `));
  }

  return (
    <div className="field">
      <span>Comment</span>
      {suggestions.length > 0 && (
        <div className="suggest">
          {suggestions.map((member) => (
            <button type="button" key={member.id} onClick={() => insert(member.name)}>
              <Avatar member={member} size={20} /> {member.name}
            </button>
          ))}
        </div>
      )}
      <div className="inline-add">
        <input
          value={text}
          placeholder="Write a note, use @Name to mention"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              addComment(task.id, text);
              setText('');
            }
          }}
        />
        <button
          type="button"
          className="btn-dark"
          onClick={() => {
            addComment(task.id, text);
            setText('');
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function PeoplePicker({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const { members } = useStore();
  return (
    <div className="people">
      {members.map((member) => {
        const on = ids.includes(member.id);
        return (
          <button
            type="button"
            key={member.id}
            className={on ? 'person is-on' : 'person'}
            aria-pressed={on}
            onClick={() => onChange(on ? ids.filter((id) => id !== member.id) : [...ids, member.id])}
          >
            <Avatar member={member} size={22} />
            {member.name.split(' ')[0]}
          </button>
        );
      })}
    </div>
  );
}

function ProjectModal({ projectId, spaceId }: { projectId?: string; spaceId?: string }) {
  const { projects, clients, spaces, addProject, updateProject, addClient } = useStore();
  const { closeModal, setView } = useUi();
  const existing = projects.find((project) => project.id === projectId);
  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<ProjectType>(existing?.type ?? 'web-dev');
  const [clientId, setClientId] = useState(existing?.clientId ?? '');
  const [newClient, setNewClient] = useState('');
  const [space, setSpace] = useState(existing?.spaceId ?? spaceId ?? spaces.find((item) => item.parentId)?.id ?? spaces[0]?.id ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(existing?.status ?? 'active');
  const [accent, setAccent] = useState<Accent>(existing?.accent ?? 'white');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [people, setPeople] = useState<string[]>(existing?.memberIds ?? []);
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Name the project.');
      return;
    }
    if (!space) {
      setError('Choose a space.');
      return;
    }
    let nextClient = clientId || null;
    if (newClient.trim()) nextClient = addClient({ name: newClient.trim(), contact: '', email: '', notes: '' });
    const input = {
      name: name.trim(),
      type,
      clientId: nextClient,
      spaceId: space,
      description: description.trim(),
      status,
      accent,
      dueDate: dueDate || null,
      memberIds: people,
      favorite,
    };
    if (existing) {
      updateProject(existing.id, input);
      closeModal();
      return;
    }
    const id = addProject(input);
    closeModal();
    setView({ name: 'project', projectId: id });
  }

  return (
    <Modal title={existing ? 'Edit project' : 'New project'} onClose={closeModal}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Northwind checkout" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="field">
          <span>Type</span>
          <div className="chip-row">
            {TYPES.map((item) => (
              <button key={item.id} type="button" className={cx('chip', type === item.id && 'is-on')} onClick={() => setType(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="split-fields">
          <label className="field">
            <span>Client</span>
            <select value={clientId ?? ''} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Internal</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Or a new client</span>
            <input value={newClient} onChange={(event) => setNewClient(event.target.value)} placeholder="Company name" />
          </label>
        </div>
        <div className="split-fields">
          <label className="field">
            <span>Space</span>
            <select value={space} onChange={(event) => setSpace(event.target.value)}>
              {spaces.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.parentId ? `– ${item.name}` : item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Due date</span>
          <input type="date" value={dueDate ?? ''} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <div className="field">
          <span>Card color</span>
          <div className="swatches">
            {ACCENTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx('swatch', accent === item.id && 'is-on')}
                style={{ background: item.bg }}
                aria-label={item.label}
                onClick={() => setAccent(item.id)}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <span>People</span>
          <PeoplePicker ids={people} onChange={setPeople} />
        </div>
        <label className="field">
          <span>Description</span>
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />
          Favorite
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn-dark">
            {existing ? 'Save' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function GoalModal({ goalId }: { goalId?: string }) {
  const { goals, projects, addGoal, updateGoal } = useStore();
  const { closeModal } = useUi();
  const existing = goals.find((goal) => goal.id === goalId);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [detail, setDetail] = useState(existing?.detail ?? '');
  const [target, setTarget] = useState(existing?.target ?? 10);
  const [current, setCurrent] = useState(existing?.current ?? 0);
  const [unit, setUnit] = useState(existing?.unit ?? 'items');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [projectId, setProjectId] = useState(existing?.projectId ?? '');
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Name the goal.');
      return;
    }
    const input = {
      title: title.trim(),
      detail: detail.trim(),
      target: Math.max(1, target),
      current: Math.max(0, current),
      unit: unit.trim() || 'items',
      dueDate: dueDate || null,
      projectId: projectId || null,
    };
    if (existing) updateGoal(existing.id, input);
    else addGoal(input);
    closeModal();
  }

  return (
    <Modal title={existing ? 'Edit goal' : 'New goal'} onClose={closeModal}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Title</span>
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <label className="field">
          <span>Detail</span>
          <textarea rows={2} value={detail} onChange={(event) => setDetail(event.target.value)} />
        </label>
        <div className="split-fields">
          <label className="field">
            <span>Current</span>
            <input type="number" min={0} value={current} onChange={(event) => setCurrent(Number(event.target.value))} />
          </label>
          <label className="field">
            <span>Target</span>
            <input type="number" min={1} value={target} onChange={(event) => setTarget(Number(event.target.value))} />
          </label>
        </div>
        <div className="split-fields">
          <label className="field">
            <span>Unit</span>
            <input value={unit} onChange={(event) => setUnit(event.target.value)} />
          </label>
          <label className="field">
            <span>Due</span>
            <input type="date" value={dueDate ?? ''} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Project</span>
          <select value={projectId ?? ''} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">None</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn-dark">
            {existing ? 'Save' : 'Create goal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SpaceModal({ parentId }: { parentId?: string }) {
  const { spaces, addSpace } = useStore();
  const { closeModal, setView } = useUi();
  const [name, setName] = useState('');
  const [parent, setParent] = useState(parentId ?? '');
  const [dot, setDot] = useState('#8dce67');
  const [error, setError] = useState('');
  const colors = ['#8dce67', '#e989c8', '#7eb6ff', '#f0b429', '#f08a3a', '#6d8cff', '#b98af0', '#8d9a84'];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Name the space.');
      return;
    }
    const id = addSpace({ name: name.trim(), parentId: parent || null, dot });
    closeModal();
    setView({ name: 'space', spaceId: id });
  }

  return (
    <Modal title="New space" onClose={closeModal}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Retainers, research, launch…" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <label className="field">
          <span>Inside</span>
          <select value={parent} onChange={(event) => setParent(event.target.value)}>
            <option value="">Top level</option>
            {spaces
              .filter((space) => !space.parentId)
              .map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
          </select>
        </label>
        <div className="field">
          <span>Dot</span>
          <div className="swatches">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                className={cx('swatch', dot === color && 'is-on')}
                style={{ background: color }}
                aria-label={color}
                onClick={() => setDot(color)}
              />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn-dark">
            Create space
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ClientModal({ clientId }: { clientId?: string }) {
  const { clients, addClient, updateClient } = useStore();
  const { closeModal, setView } = useUi();
  const existing = clients.find((client) => client.id === clientId);
  const [name, setName] = useState(existing?.name ?? '');
  const [contact, setContact] = useState(existing?.contact ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Name the client.');
      return;
    }
    const input = { name: name.trim(), contact: contact.trim(), email: email.trim(), notes: notes.trim() };
    if (existing) {
      updateClient(existing.id, input);
      closeModal();
      return;
    }
    const id = addClient(input);
    closeModal();
    setView({ name: 'client', clientId: id });
  }

  return (
    <Modal title={existing ? 'Edit client' : 'New client'} onClose={closeModal}>
      <form onSubmit={submit}>
        <label className="field">
          <span>Company</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="split-fields">
          <label className="field">
            <span>Contact</span>
            <input value={contact} onChange={(event) => setContact(event.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={closeModal}>
            Cancel
          </button>
          <button type="submit" className="btn-dark">
            {existing ? 'Save' : 'Create client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SettingsModal() {
  const store = useStore();
  const { closeModal, ask, toast } = useUi();
  const [name, setName] = useState(store.profile.name);
  const [role, setRole] = useState(store.profile.role);
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');

  function download() {
    const data = {
      version: store.version,
      profile: store.profile,
      members: store.members,
      clients: store.clients,
      spaces: store.spaces,
      projects: store.projects,
      tasks: store.tasks,
      notes: store.notes,
      goals: store.goals,
      activities: store.activities,
      timeEntries: store.timeEntries,
      timer: store.timer,
      readMentionIds: store.readMentionIds,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ario-workspace.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal title="Workspace" onClose={closeModal}>
      <p className="quiet">This workspace lives in this browser. Export it if you want a copy.</p>
      <div className="split-fields">
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => {
              const next = name.trim();
              if (next) store.updateProfile({ name: next });
              else setName(store.profile.name);
            }}
          />
        </label>
        <label className="field">
          <span>Role</span>
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            onBlur={() => store.updateProfile({ role: role.trim() || 'Studio lead' })}
          />
        </label>
      </div>
      <label className="field">
        <span>Weekly hour goal</span>
        <input
          type="number"
          min={1}
          max={80}
          value={store.profile.weeklyGoalHours}
          onChange={(event) => store.updateProfile({ weeklyGoalHours: Number(event.target.value) })}
        />
      </label>
      <div className="field">
        <span>Team</span>
        <ul className="team">
          {store.members.map((member) => (
            <li key={member.id}>
              <Avatar member={member} />
              <span>
                <strong>{member.name}</strong>
                <small>{member.role}</small>
              </span>
              {member.id !== store.profile.memberId && (
                <button type="button" className="text-link danger" onClick={() => store.removeMember(member.id)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="inline-add">
          <input value={memberName} placeholder="Name" onChange={(event) => setMemberName(event.target.value)} />
          <input value={memberRole} placeholder="Role" onChange={(event) => setMemberRole(event.target.value)} />
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              if (!memberName.trim()) return;
              store.addMember(memberName, memberRole);
              setMemberName('');
              setMemberRole('');
            }}
          >
            Add
          </button>
        </div>
      </div>
      <div className="modal-actions wrap">
        <button type="button" className="btn-ghost" onClick={download}>
          Export
        </button>
        <label className="btn-ghost file">
          Import
          <input
            type="file"
            accept="application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const next = normalize(JSON.parse(String(reader.result)));
                  if (!next) {
                    toast('That file is not an Ario workspace.');
                    return;
                  }
                  store.replaceState(next);
                  toast('Workspace imported.');
                  closeModal();
                } catch {
                  toast('Could not read that file.');
                }
              };
              reader.readAsText(file);
            }}
          />
        </label>
        <button
          type="button"
          className="btn-ghost"
          onClick={() =>
            ask({
              title: 'Load the demo again?',
              body: 'This replaces the current workspace with the sample studio.',
              confirmLabel: 'Load demo',
              onConfirm: () => store.resetDemo(),
            })
          }
        >
          Load demo
        </button>
        <button
          type="button"
          className="btn-ghost danger"
          onClick={() =>
            ask({
              title: 'Start empty?',
              body: 'Projects, tasks, and notes are cleared. Your name and team stay.',
              confirmLabel: 'Start empty',
              danger: true,
              onConfirm: () => store.startEmpty(),
            })
          }
        >
          Start empty
        </button>
      </div>
    </Modal>
  );
}
