import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../../types';
import firebaseNotificationService from '../../services/firebaseNotificationService';

export type NotificationFilter = 'all' | 'order' | 'reminder' | 'system' | 'promo';

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  unreadMessagesCount: number;
  total: number;
  filter: NotificationFilter;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  unreadMessagesCount: 0,
  total: 0,
  filter: 'all',
  isLoading: false,
  isRefreshing: false,
  error: null,
};

// ── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (
    params: { type?: string; unreadOnly?: boolean; isRefresh?: boolean; userId?: string } | undefined,
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as any;
      const currentUserId = params?.userId || state.auth?.user?.id || state.auth?.user?._id;

      if (!currentUserId) {
        return {
          data: [],
          unreadCount: 0,
          unreadMessagesCount: 0,
          total: 0,
          isRefresh: params?.isRefresh ?? false,
        };
      }

      const fbNotifs = await firebaseNotificationService.getNotifications(String(currentUserId));
      let filtered = fbNotifs || [];
      if (params?.type && params.type !== 'all') {
        filtered = filtered.filter((n) => n.type === params.type);
      }
      if (params?.unreadOnly) {
        filtered = filtered.filter((n) => !n.isRead);
      }
      const unreadCount = (fbNotifs || []).filter((n) => !n.isRead).length;
      const unreadMessagesCount = (fbNotifs || []).filter((n) => !n.isRead && n.type === 'message').length;

      return {
        data: filtered,
        unreadCount,
        unreadMessagesCount,
        total: filtered.length,
        isRefresh: params?.isRefresh ?? false,
      };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error loading notifications');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentUserId = state.auth?.user?.id || state.auth?.user?._id;
      if (!currentUserId) return 0;
      const fbNotifs = await firebaseNotificationService.getNotifications(String(currentUserId));
      return (fbNotifs || []).filter((n) => !n.isRead).length;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Error loading unread count');
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markNotificationRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await firebaseNotificationService.markAsRead(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const currentUserId = state.auth?.user?.id || state.auth?.user?._id;
      if (currentUserId) {
        await firebaseNotificationService.markAllAsRead(String(currentUserId));
      }
      return true;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteNotificationItem = createAsyncThunk(
  'notifications/deleteNotificationItem',
  async (id: string, { rejectWithValue }) => {
    try {
      await firebaseNotificationService.deleteNotification(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

// ── Slice ───────────────────────────────────────────────────────────────────

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<NotificationFilter>) => {
      state.filter = action.payload;
    },
    syncNotificationsFromFirebase: (state, action: PayloadAction<Notification[]>) => {
      state.items = action.payload;
      state.total = action.payload.length;
      state.unreadCount = action.payload.filter((n) => !n.isRead).length;
      state.unreadMessagesCount = action.payload.filter((n) => !n.isRead && n.type === 'message').length;
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = null;
    },
    receiveRealtimeNotification: (state, action: PayloadAction<Notification>) => {
      const targetId = String(action.payload?._id || '');
      const exists = targetId ? state.items.some((item) => String(item._id) === targetId) : false;
      if (!exists) {
        state.items.unshift(action.payload);
        state.total += 1;
        if (!action.payload.isRead) {
          state.unreadCount = (state.unreadCount || 0) + 1;
          if (action.payload.type === 'message') {
            state.unreadMessagesCount = (state.unreadMessagesCount || 0) + 1;
          }
        }
      }
    },
    incrementUnreadCount: (state) => {
      state.unreadCount = (state.unreadCount || 0) + 1;
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = Math.max(0, action.payload);
    },
    incrementUnreadMessages: (state) => {
      state.unreadMessagesCount = (state.unreadMessagesCount || 0) + 1;
    },
    resetUnreadMessages: (state) => {
      state.unreadMessagesCount = 0;
    },
    setUnreadMessagesCount: (state, action: PayloadAction<number>) => {
      state.unreadMessagesCount = Math.max(0, action.payload);
    },
    clearNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.unreadMessagesCount = 0;
      state.total = 0;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch notifications
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        if (action.meta.arg?.isRefresh) {
          state.isRefreshing = true;
        } else {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.items = action.payload.data;
        state.unreadCount = action.payload.unreadCount;
        state.unreadMessagesCount = action.payload.unreadMessagesCount;
        state.total = action.payload.total;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.error = action.payload as string;
      });

    // Unread count
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });

    // Mark as read
    builder.addCase(markNotificationRead.fulfilled, (state, action) => {
      const item = state.items.find((n) => n._id === action.payload);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        if (item.type === 'message') {
          state.unreadMessagesCount = Math.max(0, (state.unreadMessagesCount || 0) - 1);
        }
      }
    });

    // Mark all as read
    builder.addCase(markAllNotificationsRead.fulfilled, (state) => {
      state.items.forEach((item) => {
        item.isRead = true;
      });
      state.unreadCount = 0;
      state.unreadMessagesCount = 0;
    });

    // Delete notification
    builder.addCase(deleteNotificationItem.fulfilled, (state, action) => {
      const target = state.items.find((n) => n._id === action.payload);
      if (target && !target.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
        if (target.type === 'message') {
          state.unreadMessagesCount = Math.max(0, (state.unreadMessagesCount || 0) - 1);
        }
      }
      state.items = state.items.filter((n) => n._id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    });
  },
});

export const {
  setFilter,
  syncNotificationsFromFirebase,
  receiveRealtimeNotification,
  incrementUnreadCount,
  setUnreadCount,
  incrementUnreadMessages,
  resetUnreadMessages,
  setUnreadMessagesCount,
  clearNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;
