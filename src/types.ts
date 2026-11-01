export type ProjectType =
  | 'web-dev'
  | 'branding'
  | 'backend'
  | 'frontend'
  | 'graphic-design'
  | 'social-media'
  | 'client'
  | 'personal';

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'delegated';

export type Priority = 'low' | 'medium' | 'high';

export type Accent = 'white' | 'lime' | 'pink' | 'lavender' | 'peach';

export type ProjectStatus = 'active' | 'paused' | 'completed';

export type NoteKind = 'note' | 'doc';

export type ActivityKind = 'task' | 'project' | 'note' | 'goal' | 'comment' | 'time' | 'client';

export interface Member {
  id: string;
  name: string;
  role: string;
  color: string;
  ink: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  notes: string;
}

export interface Space {
  id: string;
  name: string;
  parentId: string | null;
  dot?: string;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  clientId: string | null;
  spaceId: string;
  description: string;
  status: ProjectStatus;
  accent: Accent;
  dueDate: string | null;
  memberIds: string[];
  favorite: boolean;
  createdAt: string;
}

export interface CheckItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  mentionIds: string[];
}

export interface TimeEntry {
  id: string;
  taskId: string;
  start: string;
  end: string;
  minutes: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: Priority;
  progress: number;
  dueDate: string | null;
  dueTime: string | null;
  assigneeIds: string[];
  checklist: CheckItem[];
  comments: Comment[];
  lineup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  projectId: string | null;
  kind: NoteKind;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  detail: string;
  target: number;
  current: number;
  unit: string;
  dueDate: string | null;
  projectId: string | null;
}

export interface ActivityItem {
  id: string;
  text: string;
  createdAt: string;
  kind: ActivityKind;
}

export interface Profile {
  name: string;
  role: string;
  weeklyGoalHours: number;
  memberId: string;
}

export interface TimerState {
  taskId: string;
  startedAt: string;
}

export interface AppState {
  version: 1;
  profile: Profile;
  members: Member[];
  clients: Client[];
  spaces: Space[];
  projects: Project[];
  tasks: Task[];
  notes: Note[];
  goals: Goal[];
  activities: ActivityItem[];
  timeEntries: TimeEntry[];
  timer: TimerState | null;
  readMentionIds: string[];
}

export type ProjectInput = Omit<Project, 'id' | 'createdAt'>;

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments' | 'checklist'> & {
  checklist: { text: string; done: boolean }[];
};

export interface TaskPrefill {
  title?: string;
  projectId?: string;
  status?: TaskStatus;
  dueDate?: string | null;
  lineup?: boolean;
}
