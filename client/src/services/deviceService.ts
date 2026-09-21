import { apiClient } from "../config/api";
import { Device, DeviceCategory, ManagedDeviceStatus } from "../types";

// Mock seed devices matching server/src/seeds/seedData.js

export interface GetDevicesParams {
  category?: DeviceCategory | "all";
  search?: string;
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
  /**
   * Gọi API GET /api/devices, tự động chuyển đổi sang danh sách chuẩn Device[]
   * Nếu backend chưa có endpoint hoặc server chưa chạy, trả về danh sách fallback chuẩn
   */
  async getDevices(params?: GetDevicesParams): Promise<Device[]> {
    try {
      const response = await apiClient.get("/devices", {
        params: {
          category:
            params?.category && params.category !== "all"
              ? params.category
              : undefined,
          q: params?.search || undefined,
        },
      });

      if (response.data && Array.isArray(response.data.data)) {
        console.log(
          "✅ [deviceService] Gọi API Backend thành công! Số lượng devices:",
          response.data.data.length,
        );
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
    } catch (error: any) {
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
    let result = [...FALLBACK_DEVICES];

    if (params?.category && params.category !== "all") {
      result = result.filter((d) => d.category === params.category);
    }

    if (params?.search && params.search.trim()) {
      const query = params.search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.brand.toLowerCase().includes(query) ||
          d.description.toLowerCase().includes(query),
      );
    }

    return result;
  },

  /**
   * Lấy chi tiết thiết bị theo ID
   */
  async getDeviceById(id: string): Promise<Device | null> {
    try {
      const response = await apiClient.get(`/devices/${id}`);
      if (response.data && response.data.data) {
        return response.data.data;
      }
      if (response.data) {
        return response.data;
      }
    } catch (error) {
      console.error("[deviceService] Không thể lấy chi tiết thiết bị:", error);
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
};
