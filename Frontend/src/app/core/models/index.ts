// ─── Enums ───────────────────────────────────────────────────
export type Role = 'SUPER_ADMIN' | 'ADMINISTRATOR' | 'PROJECT_MANAGER' | 'HR_MANAGER' | 'EMPLOYEE' | 'INTERN' | 'STUDENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'REJECTED' | 'REOPENED' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type NotificationType =
  | 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_COMPLETED' | 'TASK_APPROVED'
  | 'TASK_REJECTED' | 'TASK_DEADLINE_REMINDER' | 'COMMENT_ADDED' | 'MENTION'
  | 'PROJECT_UPDATE' | 'ATTENDANCE_REMINDER' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED'
  | 'SYSTEM_ALERT' | 'MESSAGE_RECEIVED';

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMINISTRATOR: 'Administrator',
  PROJECT_MANAGER: 'Project Manager',
  HR_MANAGER: 'HR Manager',
  EMPLOYEE: 'Employee',
  INTERN: 'Intern',
  STUDENT: 'Student'
};

export const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ADMINISTRATOR: 80,
  PROJECT_MANAGER: 60,
  HR_MANAGER: 60,
  EMPLOYEE: 20,
  INTERN: 10,
  STUDENT: 5
};

// ─── User ─────────────────────────────────────────────────────
export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  employeeId: string;
  role: Role;
  jobTitle?: string;
  avatarUrl?: string;
  departmentId?: string;
  departmentName?: string;
  active: boolean;
  emailVerified: boolean;
  dateOfJoining?: string;
}

export interface UserDetail extends UserSummary {
  phone?: string;
  bio?: string;
  skills?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  address?: string;
  dateOfBirth?: string;
  createdAt?: string;
  lastLoginAt?: string;
  totalTasksAssigned?: number;
  completedTasks?: number;
  pendingTasks?: number;
}

// ─── Auth ─────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
}

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  firstName: string; lastName: string; email: string; password: string;
  role: Role; departmentId?: string; phone?: string; jobTitle?: string; dateOfJoining?: string;
}

// ─── Task ─────────────────────────────────────────────────────
export interface Task {
  id: string; title: string; description?: string;
  status: TaskStatus; priority: Priority;
  /** This viewer's own personal status on the task — independent of other
   * assignees' progress on the same multi-assignee task. Populated by
   * endpoints with a specific viewer in context (e.g. My Tasks); undefined
   * for project-wide list views. Prefer this over `status` wherever the
   * UI is showing "my" progress rather than the task's overall state. */
  myStatus?: TaskStatus;
  mySubmissionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  myReviewFeedback?: string;
  projectId?: string; projectName?: string;
  sprintId?: string; sprintName?: string; milestoneId?: string;
  assignee?: UserSummary; reporter?: UserSummary; assignees?: UserSummary[];
  parentTaskId?: string; subtasks?: Task[];
  deadline?: string; estimatedHours?: number; actualHours?: number; storyPoints?: number;
  labels?: string[]; tags?: string[]; checklist?: string; recurring?: boolean;
  boardColumn?: string; boardOrder?: number; completedAt?: string;
  createdAt?: string; updatedAt?: string; createdBy?: string;
  commentCount?: number; attachmentCount?: number; subtaskCount?: number; completedSubtaskCount?: number;
}

export interface TaskRequest {
  title: string; description?: string; status?: TaskStatus; priority?: Priority;
  projectId?: string; sprintId?: string; assigneeId?: string; assigneeIds?: string[];
  parentTaskId?: string; deadline?: string; estimatedHours?: number; storyPoints?: number;
  labels?: string[]; tags?: string[]; boardColumn?: string; boardOrder?: number;
}

// ─── Project ──────────────────────────────────────────────────
export interface Project {
  id: string; name: string; code?: string; description?: string;
  status: ProjectStatus; priority: Priority;
  manager: UserSummary; members: UserSummary[];
  startDate?: string; endDate?: string; budget?: number;
  techStack?: string; repositoryUrl?: string; avatarColor?: string;
  createdAt?: string; updatedAt?: string;
  totalTasks?: number; completedTasks?: number; pendingTasks?: number;
  totalSprints?: number; activeSprints?: number; totalMilestones?: number;
  completedMilestones?: number; completionPercentage?: number;
}

// ─── Department ───────────────────────────────────────────────
export interface Department {
  id: string; name: string; code?: string; description?: string;
  active: boolean; managerId?: string; managerName?: string;
  managerAvatar?: string; employeeCount?: number;
}

// ─── Notification ─────────────────────────────────────────────
export interface Notification {
  id: string; type: NotificationType; title: string; message: string;
  entityType?: string; entityId?: string; actionUrl?: string;
  read: boolean; sender?: UserSummary; createdAt?: string;
}

// ─── Attendance ───────────────────────────────────────────────
export interface Attendance {
  id: string; userId: string; userName: string; userAvatar?: string;
  date: string; checkIn?: string; checkOut?: string;
  totalHours?: number; status: string; notes?: string; location?: string; remote: boolean;
}

// ─── Chat ─────────────────────────────────────────────────────
export interface ChatMessage {
  id: string; sender: UserSummary; recipient?: UserSummary;
  channelId?: string; channelType?: string; message: string;
  messageType: string; fileUrl?: string; fileName?: string; reactions?: string;
  edited: boolean; read: boolean; replyToId?: string; replyToMessage?: string; createdAt?: string;
}

// ─── Analytics ────────────────────────────────────────────────
export interface DashboardAnalytics {
  totalEmployees: number; activeEmployees: number; totalProjects: number; activeProjects: number;
  totalTasks: number; pendingTasks: number; inProgressTasks: number; completedTasks: number;
  overdueTasks: number; todayCheckIns: number;
  taskStatusDistribution: ChartDataPoint[]; projectStatusDistribution: ChartDataPoint[];
  weeklyTaskActivity: WeeklyActivity[]; recentActivities: ActivityLog[];
}
export interface ChartDataPoint { name: string; value: number; color?: string; }
export interface WeeklyActivity { date: string; day: string; tasks: number; }
export interface ActivityLog { id: string; action: string; description?: string; entityType?: string; user?: UserSummary; createdAt?: string; }

// ─── Employee Metrics ─────────────────────────────────────────
export interface EmployeeMetrics {
  userId: string; userName: string; userAvatar?: string;
  totalTasks: number; completedTasks: number; pendingTasks: number; overdueTasks: number;
  completionRate: number; totalHoursWorked: number;
  attendanceRate: number; presentDays: number; absentDays: number; lateDays: number;
}

// ─── Paged Response ───────────────────────────────────────────
export interface PagedResponse<T> {
  content: T[]; page: number; size: number;
  totalElements: number; totalPages: number; last: boolean; first: boolean;
}

// ─── Session (added) ──────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
  hasActiveSession?: boolean;
  activeSessionCount?: number;
}

// ─── Task Submission ──────────────────────────────────────────
export interface TaskUserCompletion {
  userId: string;
  userFullName: string;
  userAvatar?: string;
  status: TaskStatus;
  submittedAt?: string;
  comment?: string;
  screenshotUrl?: string;
  reviewFeedback?: string;
  reviewedAt?: string;
}

// ─── Working Schedule (Attendance Settings) ───────────────────
export interface WorkingSchedule {
  workingDaysPerWeek: number;
  workingDays: string[];  // e.g. ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]
  workStartTime: string;  // HH:mm
  workEndTime: string;    // HH:mm
  workingHoursPerDay: number;
}
