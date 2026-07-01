import { ActionReducerMap } from '@ngrx/store';
import { authReducer, AuthState } from './auth/auth.reducer';
import { taskReducer, TaskState } from './tasks/task.reducer';
import { notificationReducer, NotificationState } from './notifications/notification.reducer';

export interface AppState {
  auth: AuthState;
  tasks: TaskState;
  notifications: NotificationState;
}

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  tasks: taskReducer,
  notifications: notificationReducer,
};
