import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProsConsCardProps {
  title: string;
  items: string[];
  type: 'pros' | 'cons';
}

export function ProsConsCard({ title, items, type }: ProsConsCardProps) {
  const isPros = type === 'pros';

  return (
    <View style={[styles.card, isPros ? styles.prosCard : styles.consCard]}>
      <Text style={[styles.title, isPros ? styles.prosTitle : styles.consTitle]}>
        {title}
      </Text>
      {items.map((item, index) => (
        <Text key={`${index}-${item}`} style={styles.item}>
          {'\u2022'} {item}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  prosCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  consCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  prosTitle: {
    color: '#15803D',
  },
  consTitle: {
    color: '#B91C1C',
  },
  item: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
});
