import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DeviceCategory } from '../../types';

export interface CategoryItem {
  id: DeviceCategory | 'all';
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'all',
    name: 'Tất cả',
    icon: 'apps-outline',
  },
  {
    id: 'smartphone',
    name: 'Smartphone',
    icon: 'phone-portrait-outline',
  },
  {
    id: 'laptop',
    name: 'Laptop',
    icon: 'laptop-outline',
  },
  {
    id: 'camera',
    name: 'Camera',
    icon: 'camera-outline',
  },
  {
    id: 'drone',
    name: 'Drone',
    icon: 'airplane-outline',
  },
  {
    id: 'audio',
    name: 'Audio',
    icon: 'headset-outline',
  },
  {
    id: 'accessory',
    name: 'Phụ kiện',
    icon: 'hardware-chip-outline',
  },
];

interface CategoryBarProps {
  selectedCategory: DeviceCategory | 'all';
  onSelectCategory: (category: DeviceCategory | 'all') => void;
}

export function CategoryBar({ selectedCategory, onSelectCategory }: CategoryBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryItem, isActive && styles.categoryItemActive]}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconCircle,
                  isActive && styles.iconCircleActive,
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={20}
                  color={isActive ? '#FFFFFF' : '#94A3B8'}
                />
              </View>
              <Text
                style={[styles.categoryName, isActive && styles.categoryNameActive]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  categoryItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 76,
  },
  categoryItemActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
