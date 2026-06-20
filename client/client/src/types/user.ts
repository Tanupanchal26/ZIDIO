/**
 * Canonical User type — single source of truth across the entire client.
 * Replaces all duplicate User / UserData interfaces previously scattered in:
 *   - store/slices/authSlice.ts
 *   - store/auth.store.ts
 *   - context/AuthContext.tsx
 *   - context/MeetingContext.tsx (UserData)
 *   - pages/Settings.tsx (inline)
 *   - pages/Profile.tsx (inline)
 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
  status?: string;
  lastLogin?: string;
}
