import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import type { Device } from "../../types";
import type { UpdateDevicePayload } from "../../services/deviceService";

const categories = [
  "smartphone",
  "laptop",
  "camera",
  "drone",
  "audio",
  "tablet",
  "gaming",
  "accessory",
];

type EditDeviceModalProps = {
  device: Device | null;
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (values: UpdateDevicePayload) => void;
};

export function EditDeviceModal({
  device,
  visible,
  saving,
  onClose,
  onSave,
}: EditDeviceModalProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("smartphone");
  const [description, setDescription] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [addressText, setAddressText] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!visible || !device) {
      return;
    }

    setName(device.title || device.name || "");
    setBrand(device.brand || "");
    setCategory(device.category || "smartphone");
    setDescription(device.description || "");
    setPricePerDay(String(device.dailyRate ?? ""));
    setDepositAmount(String(device.depositValue ?? ""));
    setAddressText(device.addressText || "");
    setFormError("");
  }, [device, visible]);

  const handleSave = () => {
    const price = Number(pricePerDay);
    const deposit = Number(depositAmount);

    if (
      !name.trim() ||
      !brand.trim() ||
      !category ||
      !description.trim() ||
      !addressText.trim()
    ) {
      setFormError("Please complete all required fields.");
      return;
    }

    if (!Number.isFinite(price) || price < 10000) {
      setFormError("Daily price must be at least 10,000 VND.");
      return;
    }

    if (!Number.isFinite(deposit) || deposit < 0) {
      setFormError("Please enter a valid deposit amount.");
      return;
    }

    onSave({
      name: name.trim(),
      brand: brand.trim(),
      category,
      description: description.trim(),
      pricePerDay: price,
      depositAmount: deposit,
      addressText: addressText.trim(),
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Edit device</Text>
              <Text style={styles.subtitle}>Update your listing details.</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close edit device form"
              onPress={onClose}
              disabled={saving}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={22}
                color={colors.light.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.form}
          >
            <Text style={styles.label}>Device name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Device name"
              placeholderTextColor={colors.light.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Brand *</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="Brand"
              placeholderTextColor={colors.light.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Category *</Text>
            <View style={styles.categories}>
              {categories.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setCategory(item)}
                  style={[
                    styles.categoryButton,
                    category === item && styles.categoryButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === item && styles.categoryTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Daily price (VND) *</Text>
            <TextInput
              value={pricePerDay}
              onChangeText={setPricePerDay}
              keyboardType="numeric"
              placeholder="At least 10000"
              placeholderTextColor={colors.light.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Deposit (VND) *</Text>
            <TextInput
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
              placeholder="Deposit amount"
              placeholderTextColor={colors.light.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Address *</Text>
            <TextInput
              value={addressText}
              onChangeText={setAddressText}
              placeholder="Device pickup address"
              placeholderTextColor={colors.light.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your device"
              placeholderTextColor={colors.light.textMuted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.descriptionInput]}
            />

            {formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={colors.light.white} />
                ) : (
                  <Text style={styles.saveText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modal: {
    maxHeight: "92%",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.light.surface,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    color: colors.light.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.light.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 19,
    backgroundColor: colors.light.background,
  },
  form: {
    paddingBottom: 12,
  },
  label: {
    color: colors.light.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 10,
    color: colors.light.textPrimary,
    backgroundColor: colors.light.background,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  categoryButton: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    backgroundColor: colors.light.surface,
  },
  categoryButtonSelected: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primaryLight,
  },
  categoryText: {
    color: colors.light.textSecondary,
    fontSize: 12,
    textTransform: "capitalize",
  },
  categoryTextSelected: {
    color: colors.light.primaryDark,
    fontWeight: "700",
  },
  descriptionInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  errorText: {
    marginTop: 10,
    color: colors.light.danger,
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
    backgroundColor: colors.light.background,
  },
  cancelText: {
    color: colors.light.textSecondary,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 11,
    backgroundColor: colors.light.primary,
  },
  saveText: {
    color: colors.light.white,
    fontWeight: "800",
  },
});
