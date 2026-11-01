import { useEffect, useState } from 'react';
import { Clock, MoreHorizontal } from 'lucide-react';
import type { Task } from '../types.ts';
import { useTicker } from '../useTicker.ts';
import { useStore } from '../store.tsx';
import { useUi } from '../ui.tsx';
import { AvatarStack } from './bits.tsx';
import {
  countdownLabel,
  cx,
  formatHMS,
  formatShortDate,
  isOverdue,
  spacePath,
  typeLabel,
} from '../utils.ts';

export function TimePill({ task }: { task: Task }) {
  const now = useTicker(1000);
  const { timer } = useStore();
  if (timer?.taskId === task.id) {
    const seconds = Math.max(0, Math.floor((now.getTime() - new Date(timer.startedAt).getTime()) / 1000));
    return (
      <span className="timepill is-live">
        <i className="live-dot" />
        {formatHMS(seconds)}
      </span>
    );
  }
  const label = countdownLabel(task, now);
  if (label === 'Overdue') return <span className="timepill is-late">Overdue</span>;
  if (label) {
    return (
      <span className="timepill">
        <Clock size={12} strokeWidth={2} />
        {label}
      </span>
    );
  }
  if (task.dueDate) return <span className="timepill">{formatShortDate(task.dueDate)}</span>;
  return <span className="timepill">Open</span>;
}

export function TaskCard({ task }: { task: Task }) {
  const { projects, clients, members } = useStore();
  const { openTask } = useUi();
  const project = projects.find((item) => item.id === task.projectId);
  if (!project) return null;
  const client = clients.find((item) => item.id === project.clientId);
  return (
    <button type="button" className={cx('tcard', `accent-${project.accent}`)} onClick={() => openTask(task.id)}>
      <div className="tcard-top">
        <div>
          <div className="kicker">{client?.name ?? typeLabel(project.type)}</div>
          <div className="t-title">{task.title}</div>
        </div>
        <div className="pct">{task.progress}%</div>
      </div>
      <div className="tcard-foot">
        <AvatarStack ids={task.assigneeIds} members={members} size={24} />
        <TimePill task={task} />
      </div>
    </button>
  );
}

export function WorkRow({ task }: { task: Task }) {
  const { projects, spaces, members } = useStore();
  const { openTask } = useUi();
  const project = projects.find((item) => item.id === task.projectId);
  if (!project) return null;
  const done = task.checklist.filter((item) => item.done).length;
  const overdue = isOverdue(task);
  return (
    <div className={cx('work-row', overdue && 'is-late')}>
      <button type="button" className="work-open" onClick={() => openTask(task.id)}>
        <span className="work-copy">
          <span className="work-path">
            {spacePath(spaces, project.spaceId)} / {project.name}
          </span>
          <span className="work-title">
            {task.priority === 'high' && <i className="pri" title="High priority" />}
            {task.title}
          </span>
        </span>
        {task.checklist.length > 0 && (
          <span className="check-count">
            <span className="checks" aria-hidden="true" />
            {done}/{task.checklist.length}
          </span>
        )}
        <AvatarStack ids={task.assigneeIds} members={members} size={26} />
        <span className={cx('due', overdue && 'is-late')}>{task.dueDate ? formatShortDate(task.dueDate) : 'No date'}</span>
      </button>
      <RowMenu task={task} />
    </div>
  );
}

function RowMenu({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const { updateTask, deleteTask } = useStore();
  const { openTask, ask } = useUi();

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest?.('.menu-pop') && !target.closest?.('.menu')) close();
    };
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <div className="menu">
      <button
        type="button"
        className="icon-btn tiny"
        aria-label="Task actions"
        aria-expanded={open}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const menuWidth = 196;
          const menuHeight = 176;
          const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
          const top = rect.bottom + 6 + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight) : rect.bottom + 6;
          setPos({ top, left });
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="menu-pop" style={{ top: pos.top, left: pos.left }} role="menu">
          <button
            type="button"
            onClick={() => {
              openTask(task.id);
              setOpen(false);
            }}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => {
              updateTask(task.id, { lineup: !task.lineup });
              setOpen(false);
            }}
          >
            {task.lineup ? 'Remove from LineUp' : 'Add to LineUp'}
          </button>
          <button
            type="button"
            onClick={() => {
              updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
              setOpen(false);
            }}
          >
            {task.status === 'done' ? 'Reopen' : 'Mark done'}
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              setOpen(false);
              ask({
                title: 'Delete task',
                body: `Delete “${task.title}”? Time logged on it goes with it.`,
                confirmLabel: 'Delete',
                danger: true,
                onConfirm: () => deleteTask(task.id),
              });
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
