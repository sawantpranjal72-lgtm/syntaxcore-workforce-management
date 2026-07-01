import { createReducer, on, createAction, props } from '@ngrx/store';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Task } from '../../models';

export interface TaskState { tasks: Task[]; loading: boolean; selectedTask: Task | null; }
const init: TaskState = { tasks: [], loading: false, selectedTask: null };

export const TaskActions = {
  loadTasks:    createAction('[Task] Load Tasks'),
  loadSuccess:  createAction('[Task] Load Success', props<{ tasks: Task[] }>()),
  selectTask:   createAction('[Task] Select Task',  props<{ task: Task | null }>()),
};

export const taskReducer = createReducer(
  init,
  on(TaskActions.loadTasks,   s => ({ ...s, loading: true })),
  on(TaskActions.loadSuccess,  (s, { tasks }) => ({ ...s, tasks, loading: false })),
  on(TaskActions.selectTask,   (s, { task })  => ({ ...s, selectedTask: task })),
);

const selectFeature = createFeatureSelector<TaskState>('tasks');
export const selectAllTasks    = createSelector(selectFeature, s => s.tasks);
export const selectTaskLoading = createSelector(selectFeature, s => s.loading);
