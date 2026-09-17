import * as ImagePicker from 'expo-image-picker';

export const pickAvatar = async (): Promise<{
  uri: string;
  name: string;
  type: string;
} | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `avatar-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  };
};
