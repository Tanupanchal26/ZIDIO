import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../constants';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const stored = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

const initialState: AuthState = {
  user: (() => { try { return JSON.parse(localStorage.getItem('im_user') || 'null'); } catch { return null; } })(),
  accessToken: stored,
  refreshToken: localStorage.getItem('im_refresh_token'),
  isAuthenticated: !!stored,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, { payload }: PayloadAction<{ user: User; accessToken: string; refreshToken?: string }>) {
      state.user = payload.user;
      state.accessToken = payload.accessToken;
      state.isAuthenticated = true;
      if (payload.refreshToken) {
        state.refreshToken = payload.refreshToken;
        localStorage.setItem('im_refresh_token', payload.refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, payload.accessToken);
      localStorage.setItem('im_user', JSON.stringify(payload.user));
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
      localStorage.removeItem('im_refresh_token');
      localStorage.removeItem('im_user');
    },
  },
});

export const { setCredentials, refreshAccessToken, clearAuth } = authSlice.actions;
export default authSlice.reducer;
