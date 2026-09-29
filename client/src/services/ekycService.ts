import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '../config/api';
import { EkycItem } from '../types';

export const pickIdCardImage = async (): Promise<{
  uri: string;
  name: string;
  type: string;
} | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Quyền truy cập thư viện ảnh là bắt buộc để tải lên CCCD.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `cccd-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  };
};

export const ekycService = {
  getMyEkyc: async (): Promise<EkycItem | null> => {
    try {
      const response = await apiClient.get('/profile/ekyc');
      return response.data?.ekyc || null;
    } catch (error) {
      console.warn('⚠️ [ekycService.getMyEkyc] Không thể lấy hồ sơ:', error);
      return null;
    }
  },

  uploadImage: async (file: { uri: string; name: string; type: string }): Promise<string> => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const response = await apiClient.post('/profile/ekyc/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data?.url) {
      throw new Error('Không nhận được đường dẫn ảnh sau khi tải lên.');
    }

    return response.data.url;
  },

  submitEkyc: async (data: {
    idCardNumber: string;
    idCardFrontUrl: string;
    idCardBackUrl: string;
    selfieUrl?: string;
  }): Promise<{ success: boolean; message: string; ekyc: EkycItem }> => {
    const response = await apiClient.post('/profile/ekyc', data);
    return response.data;
  },
};
