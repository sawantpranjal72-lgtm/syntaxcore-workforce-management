import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

@Injectable()
export class TaskEffects {

  private readonly actions$ = inject(Actions);

  readonly noop$ = createEffect(
    () => this.actions$.pipe(ofType('__NOOP__')),
    { dispatch: false }
  );
}