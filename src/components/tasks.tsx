import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProjectType, TaskStatus } from '../types.ts';
import { useStore } from '../store.tsx';
import { useUi } from '../ui.tsx';
import { AvatarStack, Badge, PageHead } from './bits.tsx';
import { ACCENTS, STATUSES, TYPES, cx, formatShortDate, isOverdue, typeLabel } from '../utils.ts';

export function TasksPage() {
  const { tasks, projects, members, updateTask } = useStore();
  const { openTask, openNewTask } = useUi();
  const [type, setType] = useState<ProjectType | 'all'>('all');
  const [projectId, setProjectId] = useState('all');
  const [over, setOver] = useState<TaskStatus | null>(null);

  useEffect(() => {
    const end = () => setOver(null);
    window.addEventListener('dragend', end);
    return () => window.removeEventListener('dragend', end);
  }, []);

  const shown = tasks.filter((task) => {
    const project = projects.find((item) => item.id === task.projectId);
    if (!project) return false;
    if (type !== 'all' && project.type !== type) return false;
    if (projectId !== 'all' && task.projectId !== projectId) return false;
    return true;
  });

  return (
    <div className="page board-page">
      <PageHead
        title="Tasks"
        count={shown.length}
        lede="Drag a card to change its status, or open it to edit the work."
        action={
          <button type="button" className="btn-dark" onClick={() => openNewTask({ status: 'todo' })}>
            <Plus size={16} /> New task
          </button>
        }
      />
      <div className="chip-row">
        <button type="button" className={cx('chip', type === 'all' && 'is-on')} onClick={() => setType('all')}>
          All types
        </button>
        {TYPES.map((item) => (
          <button key={item.id} type="button" className={cx('chip', type === item.id && 'is-on')} onClick={() => setType(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <label className="inline-select">
        Project
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="all">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <div className="board">
        {STATUSES.map((column) => {
          const cards = shown.filter((task) => task.status === column.id);
          return (
            <section
              key={column.id}
              className={cx('column', over === column.id && 'is-over')}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(column.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData('text/plain');
                if (id) updateTask(id, { status: column.id });
                setOver(null);
              }}
            >
              <header>
                <h2>{column.label}</h2>
                <span>{cards.length}</span>
                <button
                  type="button"
                  className="icon-btn tiny"
                  aria-label={`Add ${column.label} task`}
                  onClick={() => openNewTask({ status: column.id, projectId: projectId === 'all' ? undefined : projectId })}
                >
                  <Plus size={14} />
                </button>
              </header>
              {cards.map((task) => {
                const project = projects.find((item) => item.id === task.projectId);
                if (!project) return null;
                const accent = ACCENTS.find((item) => item.id === project.accent);
                return (
                  <article
                    key={task.id}
                    className="kcard"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', task.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => openTask(task.id)}
                    style={{ borderTopColor: accent?.bar }}
                  >
                    <Badge type={project.type} label={typeLabel(project.type)} />
                    <h3>{task.title}</h3>
                    <p>{project.name}</p>
                    <footer>
                      <AvatarStack ids={task.assigneeIds} members={members} size={22} />
                      <span className={cx(isOverdue(task) && 'is-late')}>
                        {task.dueDate ? formatShortDate(task.dueDate) : `${task.progress}%`}
                      </span>
                    </footer>
                  </article>
                );
              })}
              {cards.length === 0 && <p className="quiet tiny">Drop work here</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
