import { apiClient } from "../config/api";
import {
  BlockedDate,
  Device,
  DeviceCategory,
  ManagedDeviceStatus,
} from "../types";

// Mock seed devices matching server/src/seeds/seedData.js
export const FALLBACK_DEVICES: Device[] = [
  {
    _id: "64e0a12f9b1c2b001a000003",
    owner: "64e0a12f9b1c2b001a222222",
    title: "Sony Alpha A7 IV Mirrorless + Lens 24-70mm GM II",
    brand: "Sony",
    category: "camera",
    dailyRate: 450000,
    depositValue: 25000000,
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"],
    specs: {
      Sensor: "33MP Full-Frame Exmor R BSI CMOS",
      Video: "4K60p 10-bit 4:2:2",
    },
    description: "Commercial camera kit for events and professional photography.",
    location: {
      type: "Point",
      coordinates: [105.7826, 21.0285],
      address: "Duy Tan, Cau Giay, Hanoi",
    },
    status: "available",
    rating: 5,
    reviewCount: 32,
    viewsCount: 45,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

export const HOME_NEARBY_RADIUS_METERS = 10000;

export type DeviceSort = "price_asc" | "price_desc" | "rating_desc" | "newest";

export interface GetDevicesParams {
  category?: DeviceCategory | "all";
  search?: string;
  q?: string;
  page?: number;
  limit?: number;
  sort?: DeviceSort;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface DevicePage {
  data: Device[];
  pagination: { page: number; limit: number; totalItems: number; totalPages: number; hasNextPage: boolean };
}

export interface GetNearbyDevicesParams {
  latitude: number;
  longitude: number;
  /** Radius in meters; the backend defaults to 5000. */
  maxDistance?: number;
}

export interface CreateDevicePayload {
  name: string;
  brand: string;
  category: string;
  description: string;
  images: string[];
  specs: Record<string, string>;
  pricePerDay: number;
  depositAmount: number;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  addressText: string;
}

export const deviceService = {
  /** Real paginated Nearby data for Home. Never supplies offline/fake devices. */
  async getNearbyDevicesPage(params: GetDevicesParams): Promise<DevicePage> {
    if (!Number.isFinite(params.latitude) || !Number.isFinite(params.longitude)) {
      throw new Error("Nearby devices require your location");
    }
    const query = {
      lat: params.latitude, lng: params.longitude, radius: params.radius ?? HOME_NEARBY_RADIUS_METERS,
      category: params.category !== "all" ? params.category : undefined,
      q: (params.q || params.search || "").trim() || undefined,
      page: params.page || 1, limit: 10,
    };
    const debug = typeof __DEV__ !== 'undefined' && __DEV__;
    if (debug) console.log('[HOME NEARBY] request URL/params:', apiClient.getUri({ url: '/devices/nearby', params: query }), query);
    try {
      const response = await apiClient.get<DevicePage & { success: boolean }>("/devices/nearby", { params: query });
      const body = response.data;
      if (debug) {
        console.log('[HOME NEARBY] HTTP:', response.status);
        console.log('[HOME NEARBY] response shape:', Object.keys(body || {}));
        console.log('[HOME NEARBY] received:', body?.data?.length);
        console.log('[HOME NEARBY] pagination:', body?.pagination);
      }
      const pagination = body?.pagination;
      if (body?.success !== true || !Array.isArray(body.data) || !pagination ||
          !Number.isInteger(pagination.page) || pagination.page !== query.page ||
          pagination.limit !== 10 || !Number.isInteger(pagination.totalItems) ||
          !Number.isInteger(pagination.totalPages) || pagination.totalItems < 0 || pagination.totalPages < 0 || typeof pagination.hasNextPage !== 'boolean' ||
          body.data.length > 10 || body.data.some(d => !d || typeof d._id !== 'string' || !d._id || typeof d.name !== 'string' || !d.name.trim())) {
        throw new Error("Invalid nearby device response");
      }
      if (debug) console.log('[HOME NEARBY] invalid location count:', body.data.filter(d => {
        const c = d.location?.coordinates;
        return !c || c.length !== 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90;
      }).length);
      return body;
    } catch (error: any) {
      if (debug) console.log('[HOME NEARBY] HTTP:', error?.response?.status || error?.code || 'NETWORK_ERROR');
      throw error;
    }
  },
  /** Nearby devices from MongoDB, nearest first. API errors propagate to the caller. */
  async getNearbyDevices(params: GetNearbyDevicesParams): Promise<Device[]> {
    const response = await apiClient.get<{ success: boolean; count: number; data: Device[] }>("/devices/nearby", {
      params: {
        lat: params.latitude,
        lng: params.longitude,
        maxDistance: params.maxDistance,
      },
    });
    return response.data.data;
  },

  /**
   * Gọi API GET /api/devices, tự động chuyển đổi sang danh sách chuẩn Device[]
   * Nếu backend chưa có endpoint hoặc server chưa chạy, trả về danh sách fallback chuẩn
   */
  async getDevices(params?: GetDevicesParams): Promise<Device[]> {
    const keyword = (params?.q || params?.search || "").trim();
    const cat =
      params?.category && params.category !== "all"
        ? params.category
        : undefined;
    const queryParams = {
      category: cat,
      q: keyword || undefined,
      page: params?.page,
      limit: params?.limit,
      sort: params?.sort,
    };
    const fullRequestUrl = apiClient.getUri({
      url: "/devices",
      params: queryParams,
    });

    if (keyword) {
      console.log("[SEARCH DEBUG]");
      console.log(`q: ${keyword}`);
      console.log(`category: ${cat || "all"}`);
      console.log(`Request URL: ${fullRequestUrl}`);
    } else {
      console.log(`[deviceService] Request:\n${fullRequestUrl}`);
    }

    try {
      const response = await apiClient.get("/devices", {
        params: queryParams,
      });

      if (response.data && Array.isArray(response.data.data)) {
        if (keyword) {
          console.log(`HTTP status: ${response.status}`);
          console.log(`Results: ${response.data.data.length}`);
          console.log("Source: BACKEND");
        } else {
          console.log(`[deviceService] Response status: ${response.status}`);
          console.log("[deviceService] Source: BACKEND");
        }
        console.log(
          "✅ [deviceService] Gọi API Backend thành công! Số lượng devices:",
          response.data.data.length,
        );
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        if (keyword) {
          console.log(`HTTP status: ${response.status}`);
          console.log(`Results: ${response.data.length}`);
          console.log("Source: BACKEND");
        } else {
          console.log(`[deviceService] Response status: ${response.status}`);
          console.log("[deviceService] Source: BACKEND");
        }
        return response.data;
      }
    } catch (error: any) {
      if (keyword) {
        console.log(`HTTP status: ${error?.response?.status || "ERR_NETWORK"}`);
        console.log("Results: 0");
        console.log("Source: FALLBACK");
      }
      console.log(
        "❌ [deviceService DEBUG] Request URL:",
        error?.config?.baseURL
          ? `${error.config.baseURL}${error.config.url}`
          : error?.config?.url,
      );
      console.log("❌ [deviceService DEBUG] Error message:", error?.message);
      console.log("❌ [deviceService DEBUG] Axios code:", error?.code);
      console.log(
        "❌ [deviceService DEBUG] HTTP status:",
        error?.response?.status,
      );
      console.log(
        "❌ [deviceService DEBUG] Response data:",
        error?.response?.data,
      );
      console.log(
        "ℹ️ [deviceService] Sử dụng dữ liệu fallback do API backend chưa sẵn sàng.",
      );
    }

    // Áp dụng bộ lọc local trên dữ liệu fallback
    console.log("[deviceService] Source: FALLBACK");
    let result = [...FALLBACK_DEVICES];

    if (params?.category && params.category !== "all") {
      result = result.filter((d) => d.category === params.category);
    }

    if (keyword) {
      const query = keyword.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.brand.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query),
      );
    }

    // Mirror API ordering and pagination when using the existing offline fallback.
    result.sort((a, b) => {
      let difference = 0;
      switch (params?.sort) {
        case "price_asc":
          difference = a.dailyRate - b.dailyRate;
          break;
        case "price_desc":
          difference = b.dailyRate - a.dailyRate;
          break;
        case "rating_desc":
          difference = b.rating - a.rating;
          break;
        default:
          // Seed fallback records have no creation timestamps; use a stable ID order.
          difference =
            Date.parse(b.createdAt || "1970-01-01") -
            Date.parse(a.createdAt || "1970-01-01");
      }
      return difference || a._id.localeCompare(b._id);
    });
    const limit =
      Number.isSafeInteger(params?.limit) && params!.limit! > 0
        ? Math.min(params!.limit!, 100)
        : 10;
    const requestedPage =
      Number.isSafeInteger(params?.page) && params!.page! > 0
        ? params!.page!
        : 1;
    const page = Number.isSafeInteger((requestedPage - 1) * limit)
      ? requestedPage
      : 1;
    return result.slice((page - 1) * limit, page * limit);
  },

  /**
   * Lấy chi tiết thiết bị theo ID
   */
  async getDeviceById(
    id: string,
    options?: { throwOnError?: boolean },
  ): Promise<Device | null> {
    try {
      const response = await apiClient.get(`/devices/${id}`);
      if (response.data && response.data.data) {
        console.log(
          `[deviceDetail] GET /devices/${id} -> ${response.status}; Source: BACKEND; id: ${response.data.data._id}`,
        );
        return response.data.data;
      }
      if (response.data) {
        return response.data;
      }
    } catch (error) {
      console.error("[deviceService] Không thể lấy chi tiết thiết bị:", error);
      if (options?.throwOnError) throw error;
    }
    return null;
  },

  async getMyDevices(token: string): Promise<Device[]> {
    const response = await apiClient.get("/devices/myDevices", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data;
  },

  async createDevice(
    token: string,
    payload: CreateDevicePayload,
  ): Promise<Device> {
    const response = await apiClient.post("/devices", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.data;
  },

  async uploadDeviceImage(
    token: string,
    uri: string,
    index: number,
  ): Promise<string> {
    const formData = new FormData();
    const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    formData.append("image", {
      uri,
      name: `device-${Date.now()}-${index}.${extension}`,
      type: mimeType,
    } as unknown as Blob);

    const response = await apiClient.post("/devices/upload-image", formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data.data.url;
  },

  async updateDeviceStatus(
    token: string,
    deviceId: string,
    status: ManagedDeviceStatus,
  ) {
    const response = await apiClient.patch(
      `/devices/${deviceId}/status`,
      { status },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data.data;
  },

  async updateBlockDate(
    token: string,
    deviceId: string,
    blockedDates: BlockedDate[],
  ) {
    const response = await apiClient.patch(
      `/devices/${deviceId}/blocked-dates`,
      {
        blockedDates: blockedDates,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    response.data.data;
  },
};
