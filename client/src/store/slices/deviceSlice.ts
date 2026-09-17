import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Device, DeviceCategory } from '../../types';
import { deviceService, GetDevicesParams } from '../../services/deviceService';

export interface DeviceState {
  devices: Device[];
  filteredDevices: Device[];
  selectedCategory: DeviceCategory | 'all';
  searchQuery: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const initialState: DeviceState = {
  devices: [],
  filteredDevices: [],
  selectedCategory: 'all',
  searchQuery: '',
  isLoading: false,
  isRefreshing: false,
  error: null,
};

// Async thunk tải danh sách thiết bị
export const fetchDevices = createAsyncThunk(
  'devices/fetchDevices',
  async (params: GetDevicesParams | undefined, { rejectWithValue }) => {
    try {
      const data = await deviceService.getDevices(params);
      return data;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'Không thể tải danh sách thiết bị');
    }
  }
);

// Async thunk phục vụ Pull-to-refresh
export const refreshDevices = createAsyncThunk(
  'devices/refreshDevices',
  async (params: GetDevicesParams | undefined, { rejectWithValue }) => {
    try {
      const data = await deviceService.getDevices(params);
      return data;
    } catch (err: unknown) {
      const error = err as { message?: string };
      return rejectWithValue(error.message || 'Không thể làm mới danh sách thiết bị');
    }
  }
);

const filterList = (
  devices: Device[],
  category: DeviceCategory | 'all',
  searchQuery: string
): Device[] => {
  return devices.filter(item => {
    const matchesCategory = category === 'all' || item.category === category;
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      item.brand.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase().trim());

    return matchesCategory && matchesSearch;
  });
};

export const deviceSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    setSelectedCategory: (state, action: PayloadAction<DeviceCategory | 'all'>) => {
      state.selectedCategory = action.payload;
      state.filteredDevices = filterList(state.devices, state.selectedCategory, state.searchQuery);
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.filteredDevices = filterList(state.devices, state.selectedCategory, state.searchQuery);
    },
    clearFilters: state => {
      state.selectedCategory = 'all';
      state.searchQuery = '';
      state.filteredDevices = state.devices;
    },
  },
  extraReducers: builder => {
    // fetchDevices
    builder
      .addCase(fetchDevices.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
        if (action.meta.arg?.category !== undefined) {
          state.selectedCategory = action.meta.arg.category;
        }
        if (action.meta.arg?.search !== undefined) {
          state.searchQuery = action.meta.arg.search;
        }
      })
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.devices = action.payload;
        if (action.meta.arg?.category !== undefined) {
          state.selectedCategory = action.meta.arg.category;
        }
        if (action.meta.arg?.search !== undefined) {
          state.searchQuery = action.meta.arg.search;
        }
        state.filteredDevices = action.payload;
      })
      .addCase(fetchDevices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = (action.payload as string) || 'Lỗi khi tải dữ liệu';
      });

    // refreshDevices
    builder
      .addCase(refreshDevices.pending, state => {
        state.isRefreshing = true;
      })
      .addCase(refreshDevices.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.devices = action.payload;
        if (action.meta.arg?.category !== undefined) {
          state.selectedCategory = action.meta.arg.category;
        }
        if (action.meta.arg?.search !== undefined) {
          state.searchQuery = action.meta.arg.search;
        }
        state.filteredDevices = action.payload;
      })
      .addCase(refreshDevices.rejected, (state, action) => {
        state.isRefreshing = false;
        state.error = (action.payload as string) || 'Lỗi khi làm mới dữ liệu';
      });
  },
});

export const { setSelectedCategory, setSearchQuery, clearFilters } = deviceSlice.actions;

export default deviceSlice.reducer;
