import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SpecsInputForm } from "./SpecsInputForm";
import { deviceService } from "../../services/deviceService";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { Device } from "../../types";

type PostDeviceScreenProps = {
  onBack: () => void;
  onPublished?: () => void;
};

const categories = [
  "Smartphone",
  "Laptop",
  "Camera",
  "Drone",
  "Audio",
  "Gaming",
  "Accessory",
];

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && (
        <Text style={styles.sectionDescription}>{description}</Text>
      )}
    </View>
  );
}

export function PostDeviceScreen({
  onBack,
  onPublished,
}: PostDeviceScreenProps) {
  const token = useSelector((state: RootState) => state.auth.token);
  const [deviceName, setDeviceName] = useState("");
  const [category, setCategory] = useState("Smartphone");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [description, setDescription] = useState("");
  const [showCategories, setShowCategories] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [specificationsValid, setSpecificationsValid] = useState(true);
  const [validateSignal, setValidateSignal] = useState(0);
  const [draftSaved, setDraftSaved] = useState(false);
  const [photoUris, setPhotoUris] = useState([] as string[]);
  const [devices, setDevices] = useState([] as Device[]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [devicesError, setDevicesError] = useState("");

  useEffect(() => {
    if (!token) return;

    const getMyDevices = async () => {
      setIsLoadingDevices(true);
      setDevicesError("");
      try {
        const data = await deviceService.getMyDevices(token);
        setDevices(data);
      } catch (error) {
        console.error("[PostDeviceScreen] Cannot load owner's devices:", error);
        setDevicesError("Cannot load your devices. Please check the server.");
      } finally {
        setIsLoadingDevices(false);
      }
    };

    getMyDevices();
  }, [token]);
  const isDirty = Boolean(
    deviceName || brand || price || deposit || description,
  );

  const handleBack = () => {
    if (!isDirty || submitted) {
      onBack();
      return;
    }

    Alert.alert(
      "Discard this listing?",
      "Your entered information will be lost if you leave now.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: onBack },
      ],
    );
  };

  const handlePublish = () => {
    setSubmitted(true);
    setValidateSignal((value: number) => value + 1);

    const isBasicInfoValid = Boolean(
      deviceName.trim() &&
      brand.trim() &&
      price.trim() &&
      deposit.trim() &&
      description.trim(),
    );

    if (!isBasicInfoValid || !specificationsValid) return;

    Alert.alert(
      "Listing published",
      "Your device is now ready for renters to discover.",
      [{ text: "Done", onPress: () => onPublished?.() }],
    );
  };

  const handleSaveDraft = () => {
    setDraftSaved(true);
    setSubmitted(false);
  };

  const handlePhotoPress = async (index: number) => {
    if (photoUris[index]) {
      setPhotoUris(
        photoUris.filter(
          (_photoUri: string, photoIndex: number) => photoIndex !== index,
        ),
      );
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const nextPhotoUris = [...photoUris];
      nextPhotoUris[index] = result.assets[0].uri;
      setPhotoUris(nextPhotoUris);
    }
  };

  const handleDescriptionChange = (text: string) => {
    if (text.length <= 500) setDescription(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleBack}
          activeOpacity={0.8}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List Your Device</Text>
        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.8}
          accessibilityLabel="Help"
        >
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#64748B"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>List your device</Text>
          <Text style={styles.introText}>
            Share your technology with others and earn by renting it out.
          </Text>
        </View>

        <View style={styles.myDevicesSection}>
          <View style={styles.myDevicesHeader}>
            <View>
              <Text style={styles.myDevicesTitle}>Your devices</Text>
              <Text style={styles.myDevicesDescription}>
                Devices you have already listed for rent.
              </Text>
            </View>
            <View style={styles.deviceCountBadge}>
              <Text style={styles.deviceCountText}>{devices.length}</Text>
            </View>
          </View>

          {isLoadingDevices ? (
            <Text style={styles.deviceListMessage}>Loading your devices...</Text>
          ) : devicesError ? (
            <Text style={styles.deviceListError}>{devicesError}</Text>
          ) : devices.length === 0 ? (
            <Text style={styles.deviceListMessage}>You have not listed any device yet.</Text>
          ) : (
            devices.map((device: Device) => (
              <View key={device._id} style={styles.deviceListCard}>
                <Image
                  source={{
                    uri: device.images?.[0] ?? "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
                  }}
                  style={styles.deviceListImage}
                />
                <View style={styles.deviceListInfo}>
                  <Text style={styles.deviceListName} numberOfLines={1}>
                    {device.title}
                  </Text>
                  <Text style={styles.deviceListMeta}>
                    {device.category} • {device.dailyRate.toLocaleString("vi-VN")} VND/day
                  </Text>
                  <Text
                    style={[
                      styles.deviceListStatus,
                      device.status === "available"
                        ? styles.deviceListStatusAvailable
                        : styles.deviceListStatusMuted,
                    ]}
                  >
                    {device.status === "available" ? "Available" : device.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle title="Device Photos" />
          <View style={styles.photoRow}>
            <TouchableOpacity
              style={styles.primaryPhotoBox}
              onPress={() => handlePhotoPress(0)}
              activeOpacity={0.8}
            >
              {photoUris[0] ? (
                <>
                  <Image
                    source={{ uri: photoUris[0] }}
                    style={styles.primaryPhoto}
                  />
                  <View style={styles.photoOverlay}>
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.photoOverlayText}>Remove photo</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={27}
                    color="#2563EB"
                  />
                  <Text style={styles.photoTitle}>Add device photos</Text>
                  <Text style={styles.photoHint}>
                    Clear photos help renters know what they are getting.
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <View style={styles.smallPhotoColumn}>
              <TouchableOpacity
                style={styles.smallPhotoBox}
                onPress={() => handlePhotoPress(1)}
                activeOpacity={0.8}
              >
                {photoUris[1] ? (
                  <Image
                    source={{ uri: photoUris[1] }}
                    style={styles.smallPhoto}
                  />
                ) : (
                  <Ionicons name="add" size={21} color="#64748B" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallPhotoBox}
                onPress={() => handlePhotoPress(2)}
                activeOpacity={0.8}
              >
                {photoUris[2] ? (
                  <Image
                    source={{ uri: photoUris[2] }}
                    style={styles.smallPhoto}
                  />
                ) : (
                  <Ionicons name="add" size={21} color="#64748B" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Device Information" />
          <Text style={styles.fieldLabel}>
            Device Name<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="e.g. iPhone 15 Pro Max 256GB"
            placeholderTextColor="#64748B"
            style={[
              styles.input,
              submitted && !deviceName.trim() && styles.inputError,
            ]}
          />
          {submitted && !deviceName.trim() && (
            <Text style={styles.errorText}>Device name is required</Text>
          )}

          <Text style={styles.fieldLabel}>
            Category<Text style={styles.required}> *</Text>
          </Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setShowCategories(!showCategories)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectText}>
              {category || "Select a category"}
            </Text>
            <Ionicons
              name={showCategories ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748B"
            />
          </TouchableOpacity>
          {showCategories && (
            <View style={styles.categoryMenu}>
              {categories.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.categoryOption}
                  onPress={() => {
                    setCategory(item);
                    setShowCategories(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      item === category && styles.categoryOptionActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === category && (
                    <Ionicons name="checkmark" size={17} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>
            Brand<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g. Apple"
            placeholderTextColor="#64748B"
            style={[
              styles.input,
              submitted && !brand.trim() && styles.inputError,
            ]}
          />
          {submitted && !brand.trim() && (
            <Text style={styles.errorText}>Brand is required</Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle title="Rental Pricing" />
          <Text style={styles.fieldLabel}>
            Rental Price / Day<Text style={styles.required}> *</Text>
          </Text>
          <View
            style={[
              styles.currencyInput,
              submitted && !price.trim() && styles.currencyInputError,
            ]}
          >
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Enter daily rental price"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              style={[
                styles.currencyTextInput,
                submitted && !price.trim() && styles.currencyTextInputError,
              ]}
            />
            <Text style={styles.currency}>VND</Text>
          </View>
          {submitted && !price.trim() && (
            <Text style={styles.errorText}>Rental price is required</Text>
          )}
          <Text style={styles.fieldLabel}>
            Security Deposit<Text style={styles.required}> *</Text>
          </Text>
          <View
            style={[
              styles.currencyInput,
              submitted && !deposit.trim() && styles.currencyInputError,
            ]}
          >
            <TextInput
              value={deposit}
              onChangeText={setDeposit}
              placeholder="Enter security deposit"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              style={[
                styles.currencyTextInput,
                submitted && !deposit.trim() && styles.currencyTextInputError,
              ]}
            />
            <Text style={styles.currency}>VND</Text>
          </View>
          {submitted && !deposit.trim() && (
            <Text style={styles.errorText}>Security deposit is required</Text>
          )}
          <Text style={styles.helperText}>
            The deposit protects the owner against potential damage or loss.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionTitle title="Description" />
          <View
            style={[
              styles.textareaWrap,
              submitted && !description.trim() && styles.textareaError,
            ]}
          >
            <TextInput
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Describe the device condition, included accessories, and anything renters should know..."
              placeholderTextColor="#64748B"
              multiline
              textAlignVertical="top"
              style={styles.textarea}
            />
            <Text style={styles.counter}>{description.length} / 500</Text>
          </View>
          {submitted && !description.trim() && (
            <Text style={styles.errorText}>Description is required</Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle
            title="Technical Specifications"
            description="Add important technical details that help renters understand the device."
          />
          <SpecsInputForm
            category={category}
            validateSignal={validateSignal}
            onValidityChange={setSpecificationsValid}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.publishButton}
            onPress={handlePublish}
            activeOpacity={0.8}
          >
            <Text style={styles.publishText}>Publish Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={handleSaveDraft}
            activeOpacity={0.8}
          >
            <Text style={styles.draftText}>
              {draftSaved ? "Draft Saved" : "Save Draft"}
            </Text>
          </TouchableOpacity>
          {draftSaved && (
            <Text style={styles.successText}>
              Your draft has been saved on this device.
            </Text>
          )}
          {submitted && !specificationsValid && (
            <Text style={styles.errorText}>
              Please complete all technical specifications.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  content: { paddingHorizontal: 16, paddingTop: 23, paddingBottom: 30 },
  intro: { marginBottom: 27 },
  introTitle: { color: "#0F172A", fontSize: 24, fontWeight: "800" },
  introText: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 320,
  },
  myDevicesSection: {
    marginBottom: 25,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
  },
  myDevicesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  myDevicesTitle: { color: "#0F172A", fontSize: 17, fontWeight: "800" },
  myDevicesDescription: { color: "#64748B", fontSize: 12, marginTop: 3 },
  deviceCountBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },
  deviceCountText: { color: "#2563EB", fontSize: 12, fontWeight: "800" },
  deviceListCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
  },
  deviceListImage: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  deviceListInfo: { flex: 1, marginLeft: 10 },
  deviceListName: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  deviceListMeta: { color: "#64748B", fontSize: 11, marginTop: 4 },
  deviceListStatus: { fontSize: 11, fontWeight: "700", marginTop: 5 },
  deviceListStatusAvailable: { color: "#059669" },
  deviceListStatusMuted: { color: "#64748B" },
  deviceListMessage: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },
  deviceListError: {
    color: "#DC2626",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },
  section: { marginBottom: 25 },
  sectionHeading: { marginBottom: 14 },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  sectionDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  photoRow: { flexDirection: "row", gap: 10 },
  primaryPhotoBox: {
    flex: 1,
    minHeight: 153,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  primaryPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
    borderRadius: 12,
  },
  photoOverlay: {
    position: "absolute",
    right: 9,
    bottom: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
  },
  photoOverlayText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  photoTitle: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 9,
  },
  photoHint: {
    color: "#64748B",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
    marginTop: 5,
  },
  smallPhotoColumn: { width: 75, gap: 10 },
  smallPhotoBox: {
    flex: 1,
    minHeight: 71,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  smallPhoto: { width: "100%", height: "100%", borderRadius: 12 },
  fieldLabel: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 14,
  },
  required: { color: "#DC2626" },
  input: {
    height: 48,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 13,
    color: "#0F172A",
    fontSize: 13,
  },
  inputError: { borderColor: "#DC2626" },
  errorText: { color: "#DC2626", fontSize: 11, marginTop: 5 },
  selectInput: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  selectText: { color: "#0F172A", fontSize: 13 },
  categoryMenu: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginTop: 6,
    overflow: "hidden",
  },
  categoryOption: {
    minHeight: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  categoryOptionText: { color: "#64748B", fontSize: 13 },
  categoryOptionActive: { color: "#2563EB", fontWeight: "800" },
  currencyInput: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingLeft: 13,
    paddingRight: 14,
  },
  currencyInputError: { borderColor: "#DC2626" },
  currencyTextInput: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
    paddingVertical: 0,
  },
  currencyTextInputError: { color: "#DC2626" },
  currency: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  helperText: { color: "#64748B", fontSize: 11, lineHeight: 16, marginTop: 7 },
  textareaWrap: {
    minHeight: 145,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
  },
  textareaError: { borderColor: "#DC2626" },
  textarea: {
    flex: 1,
    minHeight: 112,
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 19,
    padding: 0,
  },
  counter: { color: "#64748B", fontSize: 11, textAlign: "right" },
  actions: { marginTop: -2 },
  publishButton: {
    height: 53,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  publishText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  draftButton: {
    height: 49,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
  },
  draftText: { color: "#2563EB", fontSize: 13, fontWeight: "800" },
  successText: {
    color: "#16A34A",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
});
