import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';

interface QuickMessageBarProps {
  onSelectTemplate: (template: string) => void;
  templates?: readonly string[];
}

export function QuickMessageBar({
  onSelectTemplate,
  templates = STRINGS.CHAT.QUICK_MESSAGES,
}: QuickMessageBarProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {templates.map((tpl, index) => (
          <TouchableOpacity
            key={`tpl-${index}`}
            style={styles.pill}
            onPress={() => onSelectTemplate(tpl)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="flash"
              size={12}
              color={theme.colors.primary[600]}
              style={styles.icon}
            />
            <Text style={styles.pillText} numberOfLines={1}>
              {tpl}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: theme.colors.slate[100],
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs + 2,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
    paddingHorizontal: theme.spacing.md - 2,
    paddingVertical: theme.spacing.xs + 1,
    borderRadius: theme.radii.full,
  },
  icon: {
    marginRight: 4,
  },
  pillText: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary[800],
  },
});
