import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';
import type { User } from '../../types/user';

// Re-export so existing imports of User from authSlice continue to work
export type { User };

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const stored = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

const initialState: AuthState = {
  user: (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null'); }
    catch { return null; }
  })(),
  accessToken: stored,
  refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
  isAuthenticated: !!stored,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      { payload }: PayloadAction<{ user: User; accessToken: string; refreshToken?: string }>
    ) {
      state.user = payload.user;
      state.accessToken = payload.accessToken;
      state.isAuthenticated = true;
      if (payload.refreshToken) {
        state.refreshToken = payload.refreshToken;
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, payload.refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, payload.accessToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(payload.user));
    },
    refreshAccessToken(state, { payload }: PayloadAction<string>) {
      state.accessToken = payload;
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, payload);
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
  },
});

export const { setCredentials, refreshAccessToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;
