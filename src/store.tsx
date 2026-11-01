import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildSeed, emptyWorkspace } from './seed.ts';
import type {
  ActivityItem,
  ActivityKind,
  AppState,
  Client,
  Goal,
  Note,
  ProjectInput,
  Space,
  Task,
  TaskInput,
} from './types.ts';
import { clamp, findMentions, normalize, uid } from './utils.ts';

const KEY = 'lura.workspace.v2';

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyWorkspace();
    const parsed = normalize(JSON.parse(raw));
    return parsed ?? emptyWorkspace();
  } catch {
    return emptyWorkspace();
  }
}

function activity(text: string, kind: ActivityKind): ActivityItem {
  return { id: uid(), text, createdAt: new Date().toISOString(), kind };
}

function pushActivity(state: AppState, item: ActivityItem): AppState {
  return { ...state, activities: [item, ...state.activities].slice(0, 250) };
}

interface Store extends AppState {
  addProject: (input: ProjectInput) => string;
  updateProject: (id: string, patch: Partial<ProjectInput>) => void;
  deleteProject: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addTask: (input: TaskInput) => string;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'comments' | 'createdAt'>>) => void;
  deleteTask: (id: string) => void;
  addComment: (taskId: string, text: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;
  addCheck: (taskId: string, text: string) => void;
  toggleCheck: (taskId: string, checkId: string) => void;
  removeCheck: (taskId: string, checkId: string) => void;
  startTimer: (taskId: string) => void;
  stopTimer: () => void;
  logTime: (taskId: string, day: string, time: string, minutes: number) => void;
  deleteTimeEntry: (id: string) => void;
  addNote: (input: Omit<Note, 'id' | 'updatedAt'>) => string;
  updateNote: (id: string, patch: Partial<Omit<Note, 'id'>>) => void;
  deleteNote: (id: string) => void;
  addGoal: (input: Omit<Goal, 'id'>) => string;
  updateGoal: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void;
  deleteGoal: (id: string) => void;
  addSpace: (input: Omit<Space, 'id'>) => string;
  deleteSpace: (id: string) => boolean;
  addClient: (input: Omit<Client, 'id'>) => string;
  updateClient: (id: string, patch: Partial<Omit<Client, 'id'>>) => void;
  deleteClient: (id: string) => void;
  addMember: (name: string, role: string) => void;
  removeMember: (id: string) => void;
  updateProfile: (patch: Partial<Pick<AppState['profile'], 'name' | 'role' | 'weeklyGoalHours'>>) => void;
  markMentionsRead: (ids: string[]) => void;
  replaceState: (next: AppState) => void;
  resetDemo: () => void;
  startEmpty: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const api = useMemo<Store>(() => {
    const update = (recipe: (current: AppState) => AppState) => {
      setState((current) => recipe(current));
    };

    return {
      ...state,
      addProject: (input) => {
        const id = uid();
        const item = activity(`Created project “${input.name}”`, 'project');
        update((current) =>
          pushActivity(
            { ...current, projects: [{ ...input, id, createdAt: item.createdAt }, ...current.projects] },
            item,
          ),
        );
        return id;
      },
      updateProject: (id, patch) => {
        update((current) => {
          const project = current.projects.find((item) => item.id === id);
          if (!project) return current;
          const projects = current.projects.map((item) => (item.id === id ? { ...item, ...patch } : item));
          const item =
            patch.status && patch.status !== project.status
              ? activity(`Set “${project.name}” to ${patch.status}`, 'project')
              : patch.name && patch.name !== project.name
                ? activity(`Renamed a project to “${patch.name}”`, 'project')
                : null;
          const next = { ...current, projects };
          return item ? pushActivity(next, item) : next;
        });
      },
      deleteProject: (id) => {
        update((current) => {
          const project = current.projects.find((item) => item.id === id);
          if (!project) return current;
          const taskIds = new Set(current.tasks.filter((task) => task.projectId === id).map((task) => task.id));
          return pushActivity(
            {
              ...current,
              projects: current.projects.filter((item) => item.id !== id),
              tasks: current.tasks.filter((task) => task.projectId !== id),
              timeEntries: current.timeEntries.filter((entry) => !taskIds.has(entry.taskId)),
              notes: current.notes.map((note) => (note.projectId === id ? { ...note, projectId: null } : note)),
              goals: current.goals.map((goal) => (goal.projectId === id ? { ...goal, projectId: null } : goal)),
              timer: current.timer && taskIds.has(current.timer.taskId) ? null : current.timer,
            },
            activity(`Deleted project “${project.name}”`, 'project'),
          );
        });
      },
      toggleFavorite: (id) => {
        update((current) => ({
          ...current,
          projects: current.projects.map((project) =>
            project.id === id ? { ...project, favorite: !project.favorite } : project,
          ),
        }));
      },
      addTask: (input) => {
        const id = uid();
        const now = new Date().toISOString();
        const task: Task = {
          id,
          title: input.title,
          description: input.description,
          projectId: input.projectId,
          status: input.status,
          priority: input.priority,
          progress: clamp(input.progress, 0, 100),
          dueDate: input.dueDate,
          dueTime: input.dueTime,
          assigneeIds: input.assigneeIds,
          checklist: input.checklist.map((item) => ({ ...item, id: uid() })),
          comments: [],
          lineup: input.lineup,
          createdAt: now,
          updatedAt: now,
        };
        update((current) =>
          pushActivity(
            { ...current, tasks: [task, ...current.tasks] },
            activity(`Added “${input.title}”`, 'task'),
          ),
        );
        return id;
      },
      updateTask: (id, patch) => {
        update((current) => {
          const task = current.tasks.find((item) => item.id === id);
          if (!task) return current;
          const tasks = current.tasks.map((item) => {
            if (item.id !== id) return item;
            const next = { ...item, ...patch, updatedAt: new Date().toISOString() };
            if (patch.progress != null) next.progress = clamp(patch.progress, 0, 100);
            if (patch.status === 'done') next.progress = 100;
            if (patch.status && patch.status !== 'done' && item.status === 'done' && patch.progress == null) {
              next.progress = Math.min(item.progress, 90);
            }
            return next;
          });
          const item =
            patch.status && patch.status !== task.status
              ? activity(`Moved “${patch.title || task.title}” to ${patch.status === 'in-progress' ? 'in progress' : patch.status}`, 'task')
              : patch.lineup != null && patch.lineup !== task.lineup
                ? activity(
                    patch.lineup ? `Added “${task.title}” to LineUp` : `Removed “${task.title}” from LineUp`,
                    'task',
                  )
                : null;
          const next = { ...current, tasks };
          return item ? pushActivity(next, item) : next;
        });
      },
      deleteTask: (id) => {
        update((current) => {
          const task = current.tasks.find((item) => item.id === id);
          if (!task) return current;
          return pushActivity(
            {
              ...current,
              tasks: current.tasks.filter((item) => item.id !== id),
              timeEntries: current.timeEntries.filter((entry) => entry.taskId !== id),
              timer: current.timer?.taskId === id ? null : current.timer,
            },
            activity(`Deleted “${task.title}”`, 'task'),
          );
        });
      },
      addComment: (taskId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        update((current) => {
          const task = current.tasks.find((item) => item.id === taskId);
          if (!task) return current;
          const comment = {
            id: uid(),
            authorId: current.profile.memberId,
            text: trimmed,
            createdAt: new Date().toISOString(),
            mentionIds: findMentions(trimmed, current.members),
          };
          return pushActivity(
            {
              ...current,
              tasks: current.tasks.map((item) =>
                item.id === taskId
                  ? { ...item, comments: [...item.comments, comment], updatedAt: comment.createdAt }
                  : item,
              ),
            },
            activity(`Commented on “${task.title}”`, 'comment'),
          );
        });
      },
      deleteComment: (taskId, commentId) => {
        update((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId
              ? { ...task, comments: task.comments.filter((comment) => comment.id !== commentId) }
              : task,
          ),
        }));
      },
      addCheck: (taskId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        update((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  updatedAt: new Date().toISOString(),
                  checklist: [...task.checklist, { id: uid(), text: trimmed, done: false }],
                }
              : task,
          ),
        }));
      },
      toggleCheck: (taskId, checkId) => {
        update((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  updatedAt: new Date().toISOString(),
                  checklist: task.checklist.map((item) =>
                    item.id === checkId ? { ...item, done: !item.done } : item,
                  ),
                }
              : task,
          ),
        }));
      },
      removeCheck: (taskId, checkId) => {
        update((current) => ({
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === taskId
              ? { ...task, checklist: task.checklist.filter((item) => item.id !== checkId) }
              : task,
          ),
        }));
      },
      startTimer: (taskId) => {
        update((current) => {
          let next = current;
          if (current.timer && current.timer.taskId !== taskId) {
            next = stopTimerOn(current);
          }
          if (next.timer?.taskId === taskId) return next;
          const task = next.tasks.find((item) => item.id === taskId);
          return pushActivity(
            { ...next, timer: { taskId, startedAt: new Date().toISOString() } },
            activity(`Started a timer on “${task?.title ?? 'task'}”`, 'time'),
          );
        });
      },
      stopTimer: () => {
        update((current) => (current.timer ? stopTimerOn(current) : current));
      },
      logTime: (taskId, day, time, minutes) => {
        if (minutes <= 0) return;
        const [year, month, date] = day.split('-').map(Number);
        const [hours, mins] = time.split(':').map(Number);
        const start = new Date(year, (month || 1) - 1, date || 1, hours || 0, mins || 0, 0);
        const end = new Date(start.getTime() + minutes * 60_000);
        const entry = { id: uid(), taskId, start: start.toISOString(), end: end.toISOString(), minutes };
        update((current) => {
          const task = current.tasks.find((item) => item.id === taskId);
          return pushActivity(
            { ...current, timeEntries: [...current.timeEntries, entry] },
            activity(`Logged ${minutes}m on “${task?.title ?? 'task'}”`, 'time'),
          );
        });
      },
      deleteTimeEntry: (id) => {
        update((current) => ({
          ...current,
          timeEntries: current.timeEntries.filter((entry) => entry.id !== id),
        }));
      },
      addNote: (input) => {
        const id = uid();
        const now = new Date().toISOString();
        update((current) =>
          pushActivity(
            { ...current, notes: [{ ...input, id, updatedAt: now }, ...current.notes] },
            activity(`Created ${input.kind === 'doc' ? 'doc' : 'note'} “${input.title}”`, 'note'),
          ),
        );
        return id;
      },
      updateNote: (id, patch) => {
        update((current) => ({
          ...current,
          notes: current.notes.map((note) =>
            note.id === id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note,
          ),
        }));
      },
      deleteNote: (id) => {
        update((current) => {
          const note = current.notes.find((item) => item.id === id);
          if (!note) return current;
          return pushActivity(
            { ...current, notes: current.notes.filter((item) => item.id !== id) },
            activity(`Deleted “${note.title}”`, 'note'),
          );
        });
      },
      addGoal: (input) => {
        const id = uid();
        update((current) =>
          pushActivity(
            { ...current, goals: [{ ...input, id }, ...current.goals] },
            activity(`Added goal “${input.title}”`, 'goal'),
          ),
        );
        return id;
      },
      updateGoal: (id, patch) => {
        update((current) => ({
          ...current,
          goals: current.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
        }));
      },
      deleteGoal: (id) => {
        update((current) => {
          const goal = current.goals.find((item) => item.id === id);
          if (!goal) return current;
          return pushActivity(
            { ...current, goals: current.goals.filter((item) => item.id !== id) },
            activity(`Removed goal “${goal.title}”`, 'goal'),
          );
        });
      },
      addSpace: (input) => {
        const id = uid();
        update((current) =>
          pushActivity(
            { ...current, spaces: [...current.spaces, { ...input, id }] },
            activity(`Added space “${input.name}”`, 'project'),
          ),
        );
        return id;
      },
      deleteSpace: (id) => {
        const ids = collectSpaces(state.spaces, id);
        const remaining = state.spaces.filter((space) => !ids.includes(space.id));
        if (!remaining.length) return false;
        const fallback = remaining[0].id;
        const name = state.spaces.find((space) => space.id === id)?.name ?? 'space';
        const item = activity(`Removed space “${name}”`, 'project');
        update((current) =>
          pushActivity(
            {
              ...current,
              spaces: current.spaces.filter((space) => !ids.includes(space.id)),
              projects: current.projects.map((project) =>
                ids.includes(project.spaceId) ? { ...project, spaceId: fallback } : project,
              ),
            },
            item,
          ),
        );
        return true;
      },
      addClient: (input) => {
        const id = uid();
        update((current) =>
          pushActivity(
            { ...current, clients: [{ ...input, id }, ...current.clients] },
            activity(`Added client “${input.name}”`, 'client'),
          ),
        );
        return id;
      },
      updateClient: (id, patch) => {
        update((current) => ({
          ...current,
          clients: current.clients.map((client) => (client.id === id ? { ...client, ...patch } : client)),
        }));
      },
      deleteClient: (id) => {
        update((current) => {
          const client = current.clients.find((item) => item.id === id);
          if (!client) return current;
          return pushActivity(
            {
              ...current,
              clients: current.clients.filter((item) => item.id !== id),
              projects: current.projects.map((project) =>
                project.clientId === id ? { ...project, clientId: null } : project,
              ),
            },
            activity(`Removed client “${client.name}”`, 'client'),
          );
        });
      },
      addMember: (name, role) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        update((current) => {
          const palette = [
            { color: '#ffd7c2', ink: '#8a3d12' },
            { color: '#d7efb8', ink: '#2f5a16' },
            { color: '#d6e4ff', ink: '#1d3f86' },
            { color: '#ffe7a3', ink: '#6d5208' },
            { color: '#ffd0ea', ink: '#8a2460' },
            { color: '#d9d4ff', ink: '#3d2f86' },
            { color: '#c9f3ea', ink: '#0f5c4c' },
            { color: '#ffd0d0', ink: '#8a2424' },
          ];
          const color = palette[current.members.length % palette.length];
          return {
            ...current,
            members: [
              ...current.members,
              { id: uid(), name: trimmed, role: role.trim() || 'Teammate', color: color.color, ink: color.ink },
            ],
          };
        });
      },
      removeMember: (id) => {
        update((current) => {
          if (id === current.profile.memberId) return current;
          return {
            ...current,
            members: current.members.filter((member) => member.id !== id),
            projects: current.projects.map((project) => ({
              ...project,
              memberIds: project.memberIds.filter((memberId) => memberId !== id),
            })),
            tasks: current.tasks.map((task) => ({
              ...task,
              assigneeIds: task.assigneeIds.filter((memberId) => memberId !== id),
            })),
          };
        });
      },
      updateProfile: (patch) => {
        update((current) => {
          const profile = { ...current.profile, ...patch };
          if (patch.weeklyGoalHours != null) profile.weeklyGoalHours = clamp(patch.weeklyGoalHours, 1, 80);
          return {
            ...current,
            profile,
            members: current.members.map((member) =>
              member.id === profile.memberId ? { ...member, name: profile.name, role: profile.role } : member,
            ),
          };
        });
      },
      markMentionsRead: (ids) => {
        if (!ids.length) return;
        update((current) => ({
          ...current,
          readMentionIds: [...new Set([...current.readMentionIds, ...ids])],
        }));
      },
      replaceState: (next) => setState(next),
      resetDemo: () => setState(buildSeed()),
      startEmpty: () => setState((current) => emptyWorkspace(current)),
    };
  }, [state]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

function stopTimerOn(current: AppState): AppState {
  if (!current.timer) return current;
  const started = new Date(current.timer.startedAt).getTime();
  const seconds = Math.max(0, Math.round((Date.now() - started) / 1000));
  const minutes = Math.max(1, Math.round(seconds / 60));
  const task = current.tasks.find((item) => item.id === current.timer?.taskId);
  const entry = {
    id: uid(),
    taskId: current.timer.taskId,
    start: current.timer.startedAt,
    end: new Date().toISOString(),
    minutes,
  };
  return pushActivity(
    { ...current, timer: null, timeEntries: [...current.timeEntries, entry] },
    activity(`Logged ${minutes}m on “${task?.title ?? 'task'}”`, 'time'),
  );
}

function collectSpaces(spaces: Space[], id: string) {
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

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used within StoreProvider');
  return store;
}
