import { useState } from 'react';
import { Plus, Star } from 'lucide-react';
import type { Project, ProjectStatus, ProjectType } from '../types.ts';
import { useStore } from '../store.tsx';
import { useUi } from '../ui.tsx';
import { AvatarStack, Badge, Empty, Meter, PageHead, accentStyle } from './bits.tsx';
import { WorkRow } from './work.tsx';
import { ACCENTS, PROJECT_STATUSES, TYPES, cx, formatShortDate, projectProgress, typeLabel } from '../utils.ts';

export function ProjectCard({ project }: { project: Project }) {
  const { tasks, members, clients, spaces, toggleFavorite } = useStore();
  const { setView } = useUi();
  const progress = projectProgress(tasks, project.id);
  const client = clients.find((item) => item.id === project.clientId);
  const space = spaces.find((item) => item.id === project.spaceId);
  const accent = ACCENTS.find((item) => item.id === project.accent);
  const open = tasks.filter((task) => task.projectId === project.id && task.status !== 'done').length;
  return (
    <article className="pcard" style={accentStyle(accent?.bar ?? '#ef7a32')}>
      <div className="pcard-top">
        <Badge type={project.type} label={typeLabel(project.type)} />
        <button
          type="button"
          className={cx('star', project.favorite && 'is-on')}
          aria-label={project.favorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={() => toggleFavorite(project.id)}
        >
          <Star size={15} fill={project.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <button type="button" className="pcard-open" onClick={() => setView({ name: 'project', projectId: project.id })}>
        <h3>{project.name}</h3>
        <p>
          {client?.name ?? 'Internal'}
          {space ? ` · ${space.name}` : ''}
        </p>
      </button>
      <Meter value={progress} />
      <div className="pcard-foot">
        <AvatarStack ids={project.memberIds} members={members} size={24} />
        <span>{progress}%</span>
        <span className="muted">{open} open</span>
        {project.dueDate && <span className="muted">{formatShortDate(project.dueDate)}</span>}
      </div>
    </article>
  );
}

export function ProjectsPage() {
  const { projects } = useStore();
  const { openModal } = useUi();
  const [type, setType] = useState<ProjectType | 'all'>('all');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const shown = projects.filter((project) => (type === 'all' || project.type === type) && (status === 'all' || project.status === status));

  return (
    <div className="page">
      <PageHead
        title="Projects"
        count={shown.length}
        lede="Web, brand, product, social, client, and personal work, in one studio."
        action={
          <button type="button" className="btn-dark" onClick={() => openModal({ kind: 'project' })}>
            <Plus size={16} /> New project
          </button>
        }
      />
      <div className="chip-row">
        <button type="button" className={cx('chip', type === 'all' && 'is-on')} onClick={() => setType('all')}>
          All
        </button>
        {TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cx('chip', type === item.id && 'is-on')}
            onClick={() => setType(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="chip-row slim">
        <button type="button" className={cx('chip', status === 'all' && 'is-on')} onClick={() => setStatus('all')}>
          Any status
        </button>
        {PROJECT_STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cx('chip', status === item.id && 'is-on')}
            onClick={() => setStatus(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Empty
          title="No projects in this view"
          body="Start a web build, a brand, a campaign, or a personal list."
          action={
            <button type="button" className="btn-dark" onClick={() => openModal({ kind: 'project' })}>
              New project
            </button>
          }
        />
      ) : (
        <div className="card-grid">
          {shown.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectPage({ id }: { id: string }) {
  const { projects, tasks, clients, members, spaces, updateProject, updateTask, deleteProject, toggleFavorite } = useStore();
  const { setView, openModal, openNewTask, ask } = useUi();
  const project = projects.find((item) => item.id === id);
  if (!project) {
    return (
      <div className="page">
        <Empty title="This project is gone" body="It may have been deleted." action={<button type="button" className="btn-dark" onClick={() => setView({ name: 'projects' })}>Back to projects</button>} />
      </div>
    );
  }
  const progress = projectProgress(tasks, project.id);
  const client = clients.find((item) => item.id === project.clientId);
  const list = tasks.filter((task) => task.projectId === project.id).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const accent = ACCENTS.find((item) => item.id === project.accent);

  return (
    <div className="page">
      <button type="button" className="back" onClick={() => setView({ name: 'projects' })}>
        Projects
      </button>
      <div className="detail-head">
        <div>
          <div className="detail-kicker">
            <Badge type={project.type} label={typeLabel(project.type)} />
            <span>{spaces.find((space) => space.id === project.spaceId)?.name}</span>
          </div>
          <h1>{project.name}</h1>
          <p className="lede">{project.description}</p>
        </div>
        <div className="detail-actions">
          <button type="button" className={cx('star lg', project.favorite && 'is-on')} onClick={() => toggleFavorite(project.id)} aria-label="Favorite">
            <Star size={16} fill={project.favorite ? 'currentColor' : 'none'} />
          </button>
          <button type="button" className="btn-ghost" onClick={() => openModal({ kind: 'project', projectId: project.id })}>
            Edit
          </button>
          <button type="button" className="btn-dark" onClick={() => openNewTask({ projectId: project.id })}>
            <Plus size={16} /> Task
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-row">
            <span>Progress</span>
            <strong>{progress}%</strong>
          </div>
          <Meter value={progress} tone={accent?.bar} />
          <label className="field">
            <span>Status</span>
            <select
              value={project.status}
              onChange={(event) => updateProject(project.id, { status: event.target.value as Project['status'] })}
            >
              {PROJECT_STATUSES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <dl className="facts">
            <div>
              <dt>Client</dt>
              <dd>
                {client ? (
                  <button type="button" className="text-link" onClick={() => setView({ name: 'client', clientId: client.id })}>
                    {client.name}
                  </button>
                ) : (
                  'Internal'
                )}
              </dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{project.dueDate ? formatShortDate(project.dueDate) : 'No date'}</dd>
            </div>
            <div>
              <dt>People</dt>
              <dd>
                <AvatarStack ids={project.memberIds} members={members} />
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              updateProject(project.id, { status: 'completed' });
              list.filter((task) => task.status !== 'done').forEach((task) => updateTask(task.id, { status: 'done' }));
            }}
          >
            Complete remaining tasks
          </button>
          <button
            type="button"
            className="btn-ghost danger"
            onClick={() =>
              ask({
                title: 'Delete project',
                body: `Delete “${project.name}” and its ${list.length} tasks?`,
                confirmLabel: 'Delete',
                danger: true,
                onConfirm: () => {
                  deleteProject(project.id);
                  setView({ name: 'projects' });
                },
              })
            }
          >
            Delete project
          </button>
        </section>
        <section>
          <div className="block-head">
            <h2>
              Tasks <span>({list.length})</span>
            </h2>
          </div>
          <div className="work-list">
            {list.map((task) => (
              <WorkRow key={task.id} task={task} />
            ))}
            {list.length === 0 && <p className="quiet">No tasks yet. Add the first piece of work.</p>}
          </div>
          {list.length > 0 && (
            <p className="quiet tiny">
              {list.filter((task) => task.status === 'done').length} done · {list.filter((task) => task.status !== 'done').length} still open
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
