import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Specification = {
  id: number;
  name: string;
  value: string;
};

type SpecsInputFormProps = {
  category?: string;
  onChange?: (specifications: Specification[]) => void;
  validateSignal?: number;
  onValidityChange?: (isValid: boolean) => void;
};

const examples: Record<string, Array<{ name: string; value: string }>> = {
  Smartphone: [
    { name: 'Storage', value: '256GB' },
    { name: 'RAM', value: '8GB' },
    { name: 'Color', value: 'Black' },
    { name: 'Battery Health', value: '92%' },
  ],
  Laptop: [
    { name: 'Processor', value: 'Apple M3 Pro' },
    { name: 'RAM', value: '18GB' },
    { name: 'Storage', value: '512GB' },
    { name: 'Screen Size', value: '14 inch' },
  ],
  Camera: [
    { name: 'Sensor', value: 'Full Frame' },
    { name: 'Resolution', value: '33MP' },
    { name: 'Lens Mount', value: 'E-mount' },
  ],
};

export function SpecsInputForm({ category = 'Smartphone', onChange, validateSignal = 0, onValidityChange }: SpecsInputFormProps) {
  const [specifications, setSpecifications] = useState([] as Specification[]);
  const [nextId, setNextId] = useState(1);
  const [touched, setTouched] = useState([] as number[]);

  useEffect(() => {
    const categoryExamples = examples[category] || [];
    const seeded = categoryExamples.map((item, index) => ({ ...item, id: index + 1 }));
    setSpecifications(seeded);
    setNextId(seeded.length + 1);
    setTouched([]);
    onValidityChange?.(true);
  }, [category]);

  useEffect(() => {
    if (validateSignal === 0) return;
    const invalidIds = specifications
      .filter((item: Specification) => !item.name.trim() || !item.value.trim())
      .map((item: Specification) => item.id);
    setTouched(specifications.map((item: Specification) => item.id));
    onValidityChange?.(invalidIds.length === 0);
  }, [validateSignal]);

  const updateSpecifications = (next: Specification[]) => {
    setSpecifications(next);
    onChange?.(next);
    onValidityChange?.(next.every((item) => item.name.trim() && item.value.trim()));
  };

  const updateSpecification = (id: number, field: 'name' | 'value', text: string) => {
    updateSpecifications(specifications.map((item: Specification) => item.id === id ? { ...item, [field]: text } : item));
  };

  const addSpecification = () => {
    updateSpecifications([...specifications, { id: nextId, name: '', value: '' }]);
    setNextId(nextId + 1);
  };

  const removeSpecification = (id: number) => {
    updateSpecifications(specifications.filter((item: Specification) => item.id !== id));
    setTouched(touched.filter((item: number) => item !== id));
  };

  const markTouched = (id: number) => {
    if (!touched.includes(id)) setTouched([...touched, id]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Technical Specifications</Text>
      <Text style={styles.description}>Add specifications that describe this device.</Text>

      {specifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><Ionicons name="list-outline" size={22} color="#2563EB" /></View>
          <Text style={styles.emptyTitle}>No specifications added yet.</Text>
          <Text style={styles.emptyText}>Add technical details to help renters understand your device.</Text>
        </View>
      ) : (
        specifications.map((specification: Specification) => {
          const invalid = touched.includes(specification.id) && (!specification.name.trim() || !specification.value.trim());
          return (
            <View key={specification.id} style={styles.specCard}>
              <View style={styles.specHeader}>
                <Text style={styles.specNumber}>SPECIFICATION {specification.id}</Text>
                <TouchableOpacity onPress={() => removeSpecification(specification.id)} activeOpacity={0.8} accessibilityLabel="Delete specification">
                  <Ionicons name="trash-outline" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputRow}>
                <View style={styles.inputColumn}>
                  <Text style={styles.fieldLabel}>Specification</Text>
                  <TextInput
                    value={specification.name}
                    onChangeText={(text: string) => updateSpecification(specification.id, 'name', text)}
                    onBlur={() => markTouched(specification.id)}
                    placeholder="e.g. Storage"
                    placeholderTextColor="#64748B"
                    style={[styles.input, invalid && styles.inputError]}
                  />
                </View>
                <View style={styles.inputColumn}>
                  <Text style={styles.fieldLabel}>Value</Text>
                  <TextInput
                    value={specification.value}
                    onChangeText={(text: string) => updateSpecification(specification.id, 'value', text)}
                    onBlur={() => markTouched(specification.id)}
                    placeholder="e.g. 256GB"
                    placeholderTextColor="#64748B"
                    style={[styles.input, invalid && styles.inputError]}
                  />
                </View>
              </View>
              {invalid && <Text style={styles.errorText}>Please enter both a specification and value.</Text>}
            </View>
          );
        })
      )}

      <TouchableOpacity style={styles.addButton} onPress={addSpecification} activeOpacity={0.8}>
        <Ionicons name="add" size={18} color="#2563EB" />
        <Text style={styles.addButtonText}>Add Specification</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF' },
  title: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  description: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 14 },
  specCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, marginBottom: 10 },
  specHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  specNumber: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputColumn: { flex: 1 },
  fieldLabel: { color: '#475569', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: { height: 44, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 11, color: '#0F172A', fontSize: 13 },
  inputError: { borderColor: '#DC2626' },
  errorText: { color: '#DC2626', fontSize: 11, marginTop: 8 },
  addButton: { height: 45, borderRadius: 12, backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#DBEAFE', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
  addButtonText: { color: '#2563EB', fontSize: 13, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 18, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginBottom: 12 },
  emptyIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#0F172A', fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyText: { color: '#64748B', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 4 },
});
