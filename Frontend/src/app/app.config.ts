import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { reducers } from './core/store/app.reducer';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

import { AuthEffects } from './core/store/auth/auth.effects';
import { TaskEffects } from './core/store/tasks/task.effects';
import { NotificationEffects } from './core/store/notifications/notification.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({
      eventCoalescing: true,
    }),

    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions()
    ),

    provideHttpClient(
      withInterceptors([
        authInterceptor,
        errorInterceptor,
      ])
    ),

    provideAnimationsAsync(),

    provideStore(reducers),

    provideEffects(
      AuthEffects,
      TaskEffects,
      NotificationEffects
    ),

    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode(),
    }),
  ],
};