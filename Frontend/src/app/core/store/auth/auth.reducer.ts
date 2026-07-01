import { createAction, createFeatureSelector, createReducer, createSelector, on, props } from '@ngrx/store';
import { UserSummary } from '../../models';

// ── State ─────────────────────────────────────────────────────
export interface AuthState {
  user: UserSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null
};

// ── Actions ───────────────────────────────────────────────────
export const AuthActions = {
  setUser:   createAction('[Auth] Set User',   props<{ user: UserSummary }>()),
  clearUser: createAction('[Auth] Clear User'),
  setError:  createAction('[Auth] Set Error',  props<{ error: string }>()),
};

// ── Reducer ───────────────────────────────────────────────────
export const authReducer = createReducer(
  initialState,
  on(AuthActions.setUser,   (state, { user })  => ({ ...state, user, error: null, loading: false })),
  on(AuthActions.clearUser, state              => ({ ...state, user: null })),
  on(AuthActions.setError,  (state, { error }) => ({ ...state, error, loading: false }))
);

// ── Selectors ─────────────────────────────────────────────────
const selectAuthState = createFeatureSelector<AuthState>('auth');
export const selectCurrentUser = createSelector(selectAuthState, s => s.user);
export const selectAuthError   = createSelector(selectAuthState, s => s.error);
