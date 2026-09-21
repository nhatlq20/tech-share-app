import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { setApiAuthToken } from '../../config/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
  trustScore?: number;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{ token: string; user: AuthUser }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      setApiAuthToken(action.payload.token);
    },
    clearAuth: state => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      setApiAuthToken(null);
    },
    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (!state.user) {
        return;
      }
      state.user = {
        ...state.user,
        ...action.payload,
      };
    },
  },
});

export const { setAuth, clearAuth, updateUser } = authSlice.actions;
export default authSlice.reducer;
