import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SpecsInputForm } from "./SpecsInputForm";
import { deviceService } from "../../services/deviceService";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { Device } from "../../types";
import { generateDescription } from "../../services/aiService";
import AiGenerateButton from "../../components/ai/AiGenerateButton";
import { colors } from '../../theme/colors';
type PostDeviceScreenProps = {
  onBack?: () => void;
  onPublished?: () => void;
  onOpenDrawer?: () => void;
  navigation?: any;
};

type Specification = {
  id: number;
  name: string;
  value: string;
};

type DeviceLocation = {
  latitude: number;
  longitude: number;
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
  onOpenDrawer,
  navigation,
}: PostDeviceScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionSectionY = useRef(0);
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const [deviceLocation, setDeviceLocation] =
    useState<DeviceLocation | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const token = useSelector((state: RootState) => state.auth.token);
  const [deviceName, setDeviceName] = useState("");
  const [category, setCategory] = useState("Smartphone");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [addressText, setAddressText] = useState("");
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
  const [specifications, setSpecifications] = useState(
    () => [] as Specification[],
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationError("");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError("Location permission denied.");
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationError("Please enable location services and try again.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      setDeviceLocation({
        latitude,
        longitude,
      });
    } catch (error: unknown) {
      console.error("[PostDeviceScreen] Cannot get current location:", error);
      setLocationError(
        error instanceof Error ? error.message : "Could not get your location.",
      );
    } finally {
      setIsGettingLocation(false);
    }
  };
  const handleGenerateDescription = async () => {
    const pricePerDay = Number(price);
    const deposit = Number(depositAmount);

    if (!deviceName.trim() || !brand.trim() || !category.trim()) {
      Alert.alert("Missing information", "Enter the device name, brand, and category first.");
      return;
    }

    if (
      !price.trim() ||
      !depositAmount.trim() ||
      !Number.isFinite(pricePerDay) ||
      !Number.isFinite(deposit) ||
      pricePerDay <= 0 ||
      deposit <= 0
    ) {
      Alert.alert(
        "Invalid price",
        "Enter a rental price and deposit greater than zero.",
      );
      return;
    }

    const specs: Record<string, string> = {};
    specifications.forEach((item: Specification) => {
      const name = item.name.trim();
      const value = item.value.trim();
      if (name && value) {
        specs[name] = value;
      }
    });

    try {
      Keyboard.dismiss();
      setIsGenerating(true);
      const response = await generateDescription({
        name: deviceName.trim(),
        brand: brand.trim(),
        category: category.trim(),
        pricePerDay,
        depositAmount: deposit,
        specs,
      });

      setDescription(response.description);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: descriptionSectionY.current,
          animated: true,
        });
      });
    } catch (error: unknown) {
      let message = "Could not generate the description. Please try again.";

      if (axios.isAxiosError(error)) {
        const serverMessage: unknown = error.response?.data?.message;
        if (typeof serverMessage === "string") {
          message = serverMessage;
        } else if (!error.response) {
          message = "Cannot connect to the server. Check your connection and try again.";
        }
      } else if (error instanceof Error) {
        message = error.message;
      }

      Alert.alert("Description generation failed", message);
    } finally {
      setIsGenerating(false);
    }
  }
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
    deviceName || brand || price || depositAmount || addressText || description,
  );

  const handleBack = () => {
    if (!isDirty || submitted) {
      if (onBack) onBack();
      else if (navigation?.goBack) navigation.goBack();
      return;
    }

    Alert.alert(
      "Hủy đăng thiết bị?",
      "Các thông tin bạn đã nhập sẽ bị mất nếu rời đi lúc này.",
      [
        { text: "Ở lại", style: "cancel" },
        {
          text: "Hủy bỏ",
          style: "destructive",
          onPress: () => {
            if (onBack) onBack();
            else if (navigation?.goBack) navigation.goBack();
          },
        },
      ],
    );
  };

  const handlePublish = async () => {
    setSubmitted(true);
    setValidateSignal((value: number) => value + 1);
    setPublishError("");

    if (!addressText.trim()) {
      setPublishError("Please enter the device address.");
      return;
    }

    if (!deviceLocation) {
      setPublishError("Please use current location before publishing.");
      return;
    }

    const hasRequiredFields = Boolean(
      deviceName.trim() &&
      brand.trim() &&
      price.trim() &&
      depositAmount.trim() &&
      addressText.trim() &&
      description.trim(),
    );

    if (
      !hasRequiredFields ||
      !specificationsValid ||
      !Number.isFinite(Number(price)) ||
      !Number.isFinite(Number(depositAmount))
    ) {
      setPublishError("Price and deposit must be valid numbers.");
      return;
    }

    if (!token) {
      setPublishError("Please log in before publishing a device.");
      return;
    }

    const specs: Record<string, string> = {};
    specifications.forEach((item: Specification) => {
      specs[item.name] = item.value;
    });

    setIsPublishing(true);
    try {
      if (photoUris.length === 0) {
        throw new Error("Please add at least one device image.");
      }

      const selectedImages = photoUris.filter((uri: string): uri is string => Boolean(uri),);
      if (selectedImages.length === 0) {
        throw new Error("Please add at least one valid device image.");
      }

      let uploadedImages: string[];
      try {
        uploadedImages = await Promise.all(selectedImages.map((uri: string, index: number) => deviceService.uploadDeviceImage(token, uri, index),),);
      } catch (error: any) {
        throw new Error(
          error?.response?.data?.message ?? "Could not upload device image.",
        );
      }

      try {
        await deviceService.createDevice(token, {
          name: deviceName.trim(),
          brand: brand.trim(),
          category: category.toLowerCase(),
          description: description.trim(),
          images: uploadedImages,
          specs,
          pricePerDay: Number(price),
          depositAmount: Number(depositAmount),
          location: {
            type: "Point",
            coordinates: [deviceLocation.longitude, deviceLocation.latitude],
          },
          addressText: addressText.trim(),
        });
      } catch (error: any) {
        throw new Error(
          error?.response?.data?.message ??
          "Images uploaded, but device creation failed.",
        );
      }

      setDevices(await deviceService.getMyDevices(token));
      Alert.alert(
        "Listing published",
        "Your device is now ready for renters to discover.",
        [{ text: "Done", onPress: () => onPublished?.() }],
      );
    } catch (error: any) {
      const message = error?.response?.data?.message ?? error?.message ?? "Could not publish this device. Please try again.";
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => {
    setDraftSaved(true);
    setSubmitted(false);
  };

  const handlePhotoPress = async (index: number) => {
    if (photoUris[index]) {
      setPhotoUris(
        photoUris.filter(
          (_photoUri: string, photoIndex: number) => photoIndex !== index,),
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
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerLeft}>
          {onOpenDrawer || (navigation as any)?.openDrawer ? (
            <TouchableOpacity
              style={styles.hamburgerButton}
              onPress={() => {
                if (onOpenDrawer) {
                  onOpenDrawer();
                } else if ((navigation as any)?.openDrawer) {
                  (navigation as any).openDrawer();
                }
              }}
              activeOpacity={0.7}
              accessibilityLabel="Mở menu quản lý chủ máy"
            >
              <Ionicons name="menu-outline" size={24} color="#0F172A" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleBack}
              activeOpacity={0.8}
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="arrow-back" size={21} color="#0F172A" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>Đăng Thiết Bị Mới</Text>
            <Text style={styles.headerSubtitle}>Tạo tin cho thuê thiết bị công nghệ</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.8}
          accessibilityLabel="Trợ giúp"
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#64748B"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
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
            <Text style={styles.deviceListMessage}>
              Loading your devices...
            </Text>
          ) : devicesError ? (
            <Text style={styles.deviceListError}>{devicesError}</Text>
          ) : devices.length === 0 ? (
            <Text style={styles.deviceListMessage}>
              You have not listed any device yet.
            </Text>
          ) : (
            devices.map((device: Device) => (
              <View key={device._id} style={styles.deviceListCard}>
                <Image
                  source={{
                    uri:
                      device.images?.[0] ??
                      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400",
                  }}
                  style={styles.deviceListImage}
                />
                <View style={styles.deviceListInfo}>
                  <Text style={styles.deviceListName} numberOfLines={1}>
                    {device.title}
                  </Text>
                  <Text style={styles.deviceListMeta}>
                    {device.category} •{" "}
                    {device.dailyRate.toLocaleString("vi-VN")} VND/day
                  </Text>
                  <Text
                    style={[
                      styles.deviceListStatus,
                      device.status === "available"
                        ? styles.deviceListStatusAvailable
                        : styles.deviceListStatusMuted,
                    ]}
                  >
                    {device.status === "available"
                      ? "Available"
                      : device.status}
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
                    resizeMode="cover"
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

          <Text style={styles.fieldLabel}>
            Display Address<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            value={addressText}
            onChangeText={setAddressText}
            placeholder="e.g. 123 Nguyen Trai, Thanh Xuan, Hanoi"
            placeholderTextColor="#64748B"
            style={[
              styles.input,
              submitted && !addressText.trim() && styles.inputError,
            ]}
          />
          {submitted && !addressText.trim() && (
            <Text style={styles.errorText}>Display address is required</Text>
          )}

          <Text style={styles.fieldLabel}>Location</Text>
          <TouchableOpacity
            onPress={getCurrentLocation}
            disabled={isGettingLocation}
            style={[
              styles.locationButton,
              isGettingLocation && styles.locationButtonDisabled,
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={deviceLocation ? "checkmark-circle-outline" : "locate-outline"}
              size={18}
              color="#2563EB"
            />
            <Text style={styles.locationButtonText}>
              {isGettingLocation
                ? "Getting location..."
                : deviceLocation
                  ? "Location captured — update"
                  : "Use Current Location"}
            </Text>
          </TouchableOpacity>
          {locationError ? (
            <Text style={styles.errorText}>{locationError}</Text>
          ) : deviceLocation ? (
            <Text style={styles.locationStatus}>
              Location captured successfully.
            </Text>
          ) : (
            <Text style={styles.helperText}>
              Capture your location to set the device’s map position.
            </Text>
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
              submitted && !depositAmount.trim() && styles.currencyInputError,
            ]}
          >
            <TextInput
              value={depositAmount}
              onChangeText={setDepositAmount}
              placeholder="Enter security deposit"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              style={[
                styles.currencyTextInput,
                submitted &&
                !depositAmount.trim() &&
                styles.currencyTextInputError,
              ]}
            />
            <Text style={styles.currency}>VND</Text>
          </View>
          {submitted && !depositAmount.trim() && (
            <Text style={styles.errorText}>Security deposit is required</Text>
          )}
          <Text style={styles.helperText}>
            The deposit protects the owner against potential damage or loss.
          </Text>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => {
            descriptionSectionY.current = event.nativeEvent.layout.y;
          }}
        >
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
            onChange={setSpecifications}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.publishButton,
              isPublishing && styles.publishButtonDisabled,
            ]}
            onPress={handlePublish}
            disabled={isPublishing}
            activeOpacity={0.8}
          >


            <Text style={[styles.publishText]} >
              {isPublishing ? "Publishing..." : "Publish Listing"}
            </Text>
          </TouchableOpacity>
          <AiGenerateButton

            onPress={handleGenerateDescription}
            loading={isGenerating}
          />

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
          {publishError && <Text style={styles.errorText}>{publishError}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hamburgerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: { color: "#0F172A", fontSize: 16, fontWeight: "700" },
  headerSubtitle: { color: "#64748B", fontSize: 11, fontWeight: "500", marginTop: 2 },
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

    borderRadius: 12,
    width: 200,
    height: 200,
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
  locationButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
  },
  locationButtonDisabled: { opacity: 0.6 },
  locationButtonText: { color: "#2563EB", fontSize: 12, fontWeight: "700" },
  locationStatus: { color: "#16A34A", fontSize: 11, marginBottom: 8 },
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
    backgroundColor: colors.light.primary,
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
