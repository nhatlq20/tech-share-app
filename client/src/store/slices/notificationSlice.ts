import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../../types';
import notificationService from '../../services/notificationService';

export type NotificationFilter = 'all' | 'order' | 'reminder' | 'system' | 'promo';

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  total: number;
  filter: NotificationFilter;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
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
    params: { type?: string; unreadOnly?: boolean; isRefresh?: boolean } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const type = params?.type && params.type !== 'all' ? params.type : undefined;
      const res = await notificationService.getNotifications({
        type,
        unreadOnly: params?.unreadOnly,
      });
      return { ...res, isRefresh: params?.isRefresh ?? false };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Lỗi khi tải thông báo');
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const count = await notificationService.getUnreadCount();
      return count;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markNotificationRead',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationService.markAsRead(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllNotificationsRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.markAllAsRead();
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
      await notificationService.deleteNotification(id);
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
    receiveRealtimeNotification: (state, action: PayloadAction<Notification>) => {
      const exists = state.items.some((item) => item._id === action.payload._id);
      if (!exists) {
        state.items.unshift(action.payload);
        state.total += 1;
        if (!action.payload.isRead) {
          state.unreadCount += 1;
        }
      }
    },
    clearNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
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
      }
    });

    // Mark all as read
    builder.addCase(markAllNotificationsRead.fulfilled, (state) => {
      state.items.forEach((item) => {
        item.isRead = true;
      });
      state.unreadCount = 0;
    });

    // Delete notification
    builder.addCase(deleteNotificationItem.fulfilled, (state, action) => {
      const target = state.items.find((n) => n._id === action.payload);
      if (target && !target.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.items = state.items.filter((n) => n._id !== action.payload);
      state.total = Math.max(0, state.total - 1);
    });
  },
});

export const { setFilter, receiveRealtimeNotification, clearNotifications } =
  notificationSlice.actions;

export default notificationSlice.reducer;
