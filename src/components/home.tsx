import { ArrowUpRight, ListChecks, Plus } from 'lucide-react';
import { useStore } from '../store.tsx';
import { useUi, type WorkFilter } from '../ui.tsx';
import { useTicker } from '../useTicker.ts';
import { dueStamp, firstName, formatLongDate, greeting, openTasks } from '../utils.ts';
import { TaskCard, WorkRow } from './work.tsx';

export function Home() {
  const now = useTicker(60_000);
  const { profile, projects, tasks } = useStore();
  const { setView, openNewTask, workFilter, setWorkFilter } = useUi();
  const name = firstName(profile.name);
  const lineup = tasks
    .filter((task) => task.lineup && task.status !== 'done')
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const trending = tasks
    .filter((task) => task.status !== 'done' && task.status !== 'delegated' && !task.lineup)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 3);

  const counts = {
    todo: openTasks(tasks).length,
    comments: tasks.filter((task) => task.comments.length > 0).length,
    done: tasks.filter((task) => task.status === 'done').length,
    delegated: tasks.filter((task) => task.status === 'delegated').length,
  };
  const filtered = tasks
    .filter((task) => {
      if (workFilter === 'todo') return task.status === 'todo' || task.status === 'in-progress' || task.status === 'review';
      if (workFilter === 'comments') return task.comments.length > 0;
      if (workFilter === 'done') return task.status === 'done';
      return task.status === 'delegated';
    })
    .sort((a, b) => dueStamp(a) - dueStamp(b));
  const visible = filtered.slice(0, 6);

  return (
    <div className="home">
      <div className="hero">
        <div>
          <h1 className="hello">{name ? `${greeting(now)}, ${name}!` : `${greeting(now)}!`}</h1>
          <p className="date">{formatLongDate(now)}</p>
        </div>
        <div className="kpis">
          <button type="button" className="kpi" onClick={() => setView({ name: 'projects' })}>
            <span>
              <b>Projects</b> <span>({projects.length})</span>
            </span>
            <i>
              <ArrowUpRight size={14} />
            </i>
          </button>
          <button type="button" className="kpi" onClick={() => setView({ name: 'tasks' })}>
            <span>
              <b>Tasks</b> <span>({tasks.length})</span>
            </span>
            <i>
              <ArrowUpRight size={14} />
            </i>
          </button>
        </div>
      </div>

      <section className="block">
        <div className="block-head">
          <h2>
            LineUp <span>({lineup.length})</span>
          </h2>
        </div>
        <div className="lineup">
          {lineup.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {lineup.length === 0 && (
            <div className="tcard accent-white quiet-card">
              <div className="t-title">Nothing in LineUp</div>
              <p className="quiet">Pin the work you want in front of you today.</p>
            </div>
          )}
          <button type="button" className="add-card" onClick={() => openNewTask({ lineup: true, status: 'todo' })}>
            <span className="plus-circle">
              <Plus size={16} />
            </span>
            Add Task
          </button>
        </div>
      </section>

      <section className="block">
        <div className="block-head">
          <h2>
            Trending <span>({trending.length})</span>
          </h2>
        </div>
        {trending.length === 0 ? (
          <p className="quiet">Recent work shows up here as you update tasks.</p>
        ) : (
          <div className="trending">
            {trending.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      <section className="block">
        <div className="block-head">
          <h2>
            My Work <span>({filtered.length})</span>
          </h2>
          <button type="button" className="board-jump" onClick={() => setView({ name: 'tasks' })} aria-label="Open task board">
            <ListChecks size={16} />
          </button>
        </div>
        <div className="filters">
          <Filter id="todo" label="To do" count={counts.todo} current={workFilter} onSelect={setWorkFilter} />
          <Filter id="comments" label="Comments" count={counts.comments} current={workFilter} onSelect={setWorkFilter} />
          <Filter id="done" label="Done" count={counts.done} current={workFilter} onSelect={setWorkFilter} />
          <Filter id="delegated" label="Delegate" count={counts.delegated} current={workFilter} onSelect={setWorkFilter} />
        </div>
        <div className="work-list">
          {visible.map((task) => (
            <WorkRow key={task.id} task={task} />
          ))}
          {visible.length === 0 && <p className="quiet">Nothing in this filter.</p>}
        </div>
        {filtered.length > visible.length && (
          <button type="button" className="text-link" onClick={() => setView({ name: 'tasks' })}>
            See all {filtered.length}
          </button>
        )}
      </section>
    </div>
  );
}

function Filter({
  id,
  label,
  count,
  current,
  onSelect,
}: {
  id: WorkFilter;
  label: string;
  count: number;
  current: WorkFilter;
  onSelect: (filter: WorkFilter) => void;
}) {
  const on = current === id;
  return (
    <button type="button" className={on ? 'filter is-on' : 'filter'} onClick={() => onSelect(id)} aria-pressed={on}>
      {label} <i>{count}</i>
    </button>
  );
}
