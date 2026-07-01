import { createReducer, on, createAction, props } from '@ngrx/store';
import { Notification } from '../../models';

export interface NotificationState { notifications: Notification[]; unreadCount: number; }
const init: NotificationState = { notifications: [], unreadCount: 0 };

export const NotificationActions = {
  addNotification:  createAction('[Notification] Add',      props<{ notification: Notification }>()),
  setUnreadCount:   createAction('[Notification] Set Count', props<{ count: number }>()),
  markAllRead:      createAction('[Notification] Mark All Read'),
};

export const notificationReducer = createReducer(
  init,
  on(NotificationActions.addNotification, (s, { notification }) => ({
    ...s, notifications: [notification, ...s.notifications], unreadCount: s.unreadCount + 1
  })),
  on(NotificationActions.setUnreadCount, (s, { count }) => ({ ...s, unreadCount: count })),
  on(NotificationActions.markAllRead,    s => ({
    ...s, unreadCount: 0,
    notifications: s.notifications.map(n => ({ ...n, read: true }))
  })),
);
