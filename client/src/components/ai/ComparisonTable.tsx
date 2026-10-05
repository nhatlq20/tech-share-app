import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AIComparison } from '../../types/ai';
import { Device } from '../../types';
import { colors } from '../../theme/colors';

interface ComparisonTableProps {
  device1: Device;
  device2: Device;
  comparison: AIComparison;
}

interface ComparisonRowProps {
  title: string;
  device1Analysis: string;
  device2Analysis: string;
  winner: string;
}

function ComparisonRow({
  title,
  device1Analysis,
  device2Analysis,
  winner,
}: ComparisonRowProps) {
  return (
    <View style={styles.rowCard}>
      <Text style={styles.criterion}>{title}</Text>
      <View style={styles.analysisRow}>
        <Text style={styles.analysis}>{device1Analysis}</Text>
        <Text style={styles.analysis}>{device2Analysis}</Text>
      </View>
      <Text style={styles.winner}>Winner: {winner}</Text>
    </View>
  );
}

export function ComparisonTable({
  device1,
  device2,
  comparison,
}: ComparisonTableProps) {
  return (
    <View style={styles.container}>
      <View style={styles.deviceHeadings}>
        <Text style={styles.deviceHeading} numberOfLines={2}>
          {device1.title}
        </Text>
        <Text style={styles.deviceHeading} numberOfLines={2}>
          {device2.title}
        </Text>
      </View>

      <ComparisonRow
        title="Power"
        device1Analysis={comparison.power.device1}
        device2Analysis={comparison.power.device2}
        winner={comparison.power.winner}
      />
      <ComparisonRow
        title="Battery"
        device1Analysis={comparison.battery.device1}
        device2Analysis={comparison.battery.device2}
        winner={comparison.battery.winner}
      />
      <ComparisonRow
        title="Weight"
        device1Analysis={comparison.weight.device1}
        device2Analysis={comparison.weight.device2}
        winner={comparison.weight.winner}
      />
      <ComparisonRow
        title="Value for Money"
        device1Analysis={comparison.valueForMoney.device1}
        device2Analysis={comparison.valueForMoney.device2}
        winner={comparison.valueForMoney.winner}
      />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Overall Conclusion</Text>
        <Text style={styles.summaryText}>{comparison.conclusion}</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Recommendation</Text>
        <Text style={styles.summaryText}>{comparison.recommendation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 24,
  },
  deviceHeadings: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  deviceHeading: {
    flex: 1,
    color: colors.light.primary,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 6,
    textAlign: 'center',
  },
  rowCard: {
    backgroundColor: colors.light.background,
    borderColor: colors.light.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  criterion: {
    color: colors.light.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  analysisRow: {
    flexDirection: 'row',
  },
  analysis: {
    flex: 1,
    color: colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  winner: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryCard: {
    backgroundColor: colors.light.surface,
    borderColor: colors.light.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    padding: 14,
  },
  summaryTitle: {
    color: colors.light.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  summaryText: {
    color: colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
