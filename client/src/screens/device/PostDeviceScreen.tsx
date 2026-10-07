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
import { colors } from "../../theme/colors";
import { STRINGS } from "../../constants/strings";

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
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 20
  );
  const [deviceLocation, setDeviceLocation] =
    useState(null as DeviceLocation | null);
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

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationError("");

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setLocationError(STRINGS.POST_DEVICE.LOCATION_DENIED);
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationError(STRINGS.POST_DEVICE.LOCATION_ENABLE);
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
        error instanceof Error ? error.message : STRINGS.POST_DEVICE.LOCATION_ERROR,
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

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
        setDevicesError(STRINGS.POST_DEVICE.DEVICES_LOAD_ERROR);
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
      STRINGS.POST_DEVICE.DISCARD_TITLE,
      STRINGS.POST_DEVICE.DISCARD_MSG,
      [
        { text: STRINGS.POST_DEVICE.STAY, style: "cancel" },
        {
          text: STRINGS.POST_DEVICE.DISCARD,
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
      setPublishError(STRINGS.POST_DEVICE.ERR_ADDRESS_REQUIRED);
      return;
    }

    if (!deviceLocation) {
      setPublishError(STRINGS.POST_DEVICE.ERR_LOCATION_REQUIRED);
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
      setPublishError(STRINGS.POST_DEVICE.ERR_NUMERIC_PRICE_DEPOSIT);
      return;
    }

    if (!token) {
      setPublishError(STRINGS.POST_DEVICE.ERR_LOGIN_REQUIRED);
      return;
    }

    const specs: Record<string, string> = {};
    specifications.forEach((item: Specification) => {
      specs[item.name] = item.value;
    });

    setIsPublishing(true);
    try {
      if (photoUris.length === 0) {
        throw new Error(STRINGS.POST_DEVICE.ERR_ADD_PHOTO);
      }

      const selectedImages = photoUris.filter((uri: string): uri is string =>Boolean(uri),);
      if (selectedImages.length === 0) {
        throw new Error(STRINGS.POST_DEVICE.ERR_ADD_VALID_PHOTO);
      }

      let uploadedImages: string[];
      try {
        uploadedImages = await Promise.all(selectedImages.map((uri: string, index: number) => deviceService.uploadDeviceImage(token, uri, index),), );
      } catch (error: any) {
        throw new Error(
          error?.response?.data?.message ?? STRINGS.POST_DEVICE.ERR_UPLOAD_IMAGE,
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
            STRINGS.POST_DEVICE.ERR_DEVICE_CREATION,
        );
      }

      setDevices(await deviceService.getMyDevices(token));
      Alert.alert(
        STRINGS.POST_DEVICE.SUCCESS_PUBLISHED_TITLE,
        STRINGS.POST_DEVICE.SUCCESS_PUBLISHED_MSG,
        [{ text: STRINGS.POST_DEVICE.DONE, onPress: () => onPublished?.() }],
      );
    } catch (error: any) {
      const message = error?.response?.data?.message ?? error?.message ?? STRINGS.POST_DEVICE.ERR_PUBLISH_DEFAULT;
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
              accessibilityLabel={STRINGS.POST_DEVICE.ACCESSIBILITY_MENU}
            >
              <Ionicons name="menu-outline" size={24} color={colors.light.textPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleBack}
              activeOpacity={0.8}
              accessibilityLabel={STRINGS.POST_DEVICE.ACCESSIBILITY_BACK}
            >
              <Ionicons name="arrow-back" size={21} color={colors.light.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>{STRINGS.POST_DEVICE.HEADER_TITLE}</Text>
            <Text style={styles.headerSubtitle}>{STRINGS.POST_DEVICE.HEADER_SUBTITLE}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          activeOpacity={0.8}
          accessibilityLabel={STRINGS.POST_DEVICE.ACCESSIBILITY_HELP}
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.light.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={styles.introTitle}>{STRINGS.POST_DEVICE.INTRO_TITLE}</Text>
          <Text style={styles.introText}>
            {STRINGS.POST_DEVICE.INTRO_TEXT}
          </Text>
        </View>

        <View style={styles.myDevicesSection}>
          <View style={styles.myDevicesHeader}>
            <View>
              <Text style={styles.myDevicesTitle}>{STRINGS.POST_DEVICE.YOUR_DEVICES_TITLE}</Text>
              <Text style={styles.myDevicesDescription}>
                {STRINGS.POST_DEVICE.YOUR_DEVICES_DESC}
              </Text>
            </View>
            <View style={styles.deviceCountBadge}>
              <Text style={styles.deviceCountText}>{devices.length}</Text>
            </View>
          </View>

          {isLoadingDevices ? (
            <Text style={styles.deviceListMessage}>
              {STRINGS.POST_DEVICE.LOADING_DEVICES}
            </Text>
          ) : devicesError ? (
            <Text style={styles.deviceListError}>{devicesError}</Text>
          ) : devices.length === 0 ? (
            <Text style={styles.deviceListMessage}>
              {STRINGS.POST_DEVICE.NO_DEVICES_YET}
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
                    {device.dailyRate.toLocaleString("vi-VN")} {STRINGS.POST_DEVICE.PER_DAY_SUFFIX}
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
                      ? STRINGS.POST_DEVICE.STATUS_AVAILABLE
                      : device.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle title={STRINGS.POST_DEVICE.SECTION_PHOTOS} />
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
                    <Ionicons name="trash-outline" size={18} color={colors.light.white} />
                    <Text style={styles.photoOverlayText}>{STRINGS.POST_DEVICE.REMOVE_PHOTO}</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={27}
                    color={colors.light.primary}
                  />
                  <Text style={styles.photoTitle}>{STRINGS.POST_DEVICE.ADD_PHOTOS_TITLE}</Text>
                  <Text style={styles.photoHint}>
                    {STRINGS.POST_DEVICE.ADD_PHOTOS_HINT}
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
                  <Ionicons name="add" size={21} color={colors.light.textSecondary} />
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
                  <Ionicons name="add" size={21} color={colors.light.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle title={STRINGS.POST_DEVICE.SECTION_DEVICE_INFO} />
          <Text style={styles.fieldLabel}>
            {STRINGS.POST_DEVICE.LABEL_DEVICE_NAME}<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder={STRINGS.POST_DEVICE.PLACEHOLDER_DEVICE_NAME}
            placeholderTextColor={colors.light.textSecondary}
            style={[
              styles.input,
              submitted && !deviceName.trim() && styles.inputError,
            ]}
          />
          {submitted && !deviceName.trim() && (
            <Text style={styles.errorText}>{STRINGS.POST_DEVICE.ERR_NAME_REQUIRED}</Text>
          )}

          <Text style={styles.fieldLabel}>
            {STRINGS.POST_DEVICE.LABEL_CATEGORY}<Text style={styles.required}> *</Text>
          </Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setShowCategories(!showCategories)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectText}>
              {category || STRINGS.POST_DEVICE.SELECT_CATEGORY}
            </Text>
            <Ionicons
              name={showCategories ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.light.textSecondary}
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
                    <Ionicons name="checkmark" size={17} color={colors.light.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>
            {STRINGS.POST_DEVICE.LABEL_BRAND}<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder={STRINGS.POST_DEVICE.PLACEHOLDER_BRAND}
            placeholderTextColor={colors.light.textSecondary}
            style={[
              styles.input,
              submitted && !brand.trim() && styles.inputError,
            ]}
          />
          {submitted && !brand.trim() && (
            <Text style={styles.errorText}>{STRINGS.POST_DEVICE.ERR_BRAND_REQUIRED}</Text>
          )}

          <Text style={styles.fieldLabel}>
            {STRINGS.POST_DEVICE.LABEL_ADDRESS}<Text style={styles.required}> *</Text>
          </Text>
          <TextInput
            value={addressText}
            onChangeText={setAddressText}
            placeholder={STRINGS.POST_DEVICE.PLACEHOLDER_ADDRESS}
            placeholderTextColor={colors.light.textSecondary}
            style={[
              styles.input,
              submitted && !addressText.trim() && styles.inputError,
            ]}
          />
          {submitted && !addressText.trim() && (
            <Text style={styles.errorText}>{STRINGS.POST_DEVICE.ERR_ADDRESS_FIELD}</Text>
          )}

          <Text style={styles.fieldLabel}>{STRINGS.POST_DEVICE.LABEL_LOCATION}</Text>
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
              color={colors.light.primary}
            />
            <Text style={styles.locationButtonText}>
              {isGettingLocation
                ? STRINGS.POST_DEVICE.LOCATION_GETTING
                : deviceLocation
                  ? STRINGS.POST_DEVICE.LOCATION_CAPTURED_BTN
                  : STRINGS.POST_DEVICE.LOCATION_USE_CURRENT}
            </Text>
          </TouchableOpacity>
          {locationError ? (
            <Text style={styles.errorText}>{locationError}</Text>
          ) : deviceLocation ? (
            <Text style={styles.locationStatus}>
              {STRINGS.POST_DEVICE.LOCATION_SUCCESS}
            </Text>
          ) : (
            <Text style={styles.helperText}>
              {STRINGS.POST_DEVICE.LOCATION_HELPER}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle title={STRINGS.POST_DEVICE.SECTION_PRICING} />
          <Text style={styles.fieldLabel}>
            {STRINGS.POST_DEVICE.LABEL_RENTAL_PRICE}<Text style={styles.required}> *</Text>
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
              placeholder={STRINGS.POST_DEVICE.PLACEHOLDER_PRICE}
              placeholderTextColor={colors.light.textSecondary}
              keyboardType="numeric"
              style={[
                styles.currencyTextInput,
                submitted && !price.trim() && styles.currencyTextInputError,
              ]}
            />
            <Text style={styles.currency}>{STRINGS.POST_DEVICE.CURRENCY_VND}</Text>
          </View>
          {submitted && !price.trim() && (
            <Text style={styles.errorText}>{STRINGS.POST_DEVICE.ERR_PRICE_REQUIRED}</Text>
          )}
          <Text style={styles.fieldLabel}>
            {STRINGS.POST_DEVICE.LABEL_DEPOSIT}<Text style={styles.required}> *</Text>
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
              placeholder={STRINGS.POST_DEVICE.PLACEHOLDER_DEPOSIT}
              placeholderTextColor={colors.light.textSecondary}
              keyboardType="numeric"
              style={[
                styles.currencyTextInput,
                submitted &&
                  !depositAmount.trim() &&
                  styles.currencyTextInputError,
              ]}
            />
            <Text style={styles.currency}>{STRINGS.POST_DEVICE.CURRENCY_VND}</Text>
          </View>
          {submitted && !depositAmount.trim() && (
            <Text style={styles.errorText}>{STRINGS.POST_DEVICE.ERR_DEPOSIT_REQUIRED}</Text>
          )}
          <Text style={styles.helperText}>
            {STRINGS.POST_DEVICE.DEPOSIT_HELPER}
          </Text>
        </View>

        <View style={styles.section}>
          <SectionTitle title={STRINGS.POST_DEVICE.SECTION_DESCRIPTION} />
          <View
            style={[
              styles.textareaWrap,
              submitted && !description.trim() && styles.textareaError,
            ]}
          >
            <TextInput
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder={STRINGS.POST_DEVICE.PLACEHOLDER_DESCRIPTION}
              placeholderTextColor={colors.light.textSecondary}
              multiline
              textAlignVertical="top"
              style={styles.textarea}
            />
            <Text style={styles.counter}>{description.length} / 500</Text>
          </View>
          {submitted && !description.trim() && (
            <Text style={styles.errorText}>{STRINGS.POST_DEVICE.ERR_DESCRIPTION_REQUIRED}</Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionTitle
            title={STRINGS.POST_DEVICE.SECTION_SPECS}
            description={STRINGS.POST_DEVICE.SECTION_SPECS_DESC}
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
            <Text style={styles.publishText}>
              {isPublishing ? STRINGS.POST_DEVICE.BTN_PUBLISHING : STRINGS.POST_DEVICE.BTN_PUBLISH}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={handleSaveDraft}
            activeOpacity={0.8}
          >
            <Text style={styles.draftText}>
              {draftSaved ? STRINGS.POST_DEVICE.BTN_DRAFT_SAVED : STRINGS.POST_DEVICE.BTN_SAVE_DRAFT}
            </Text>
          </TouchableOpacity>
          {draftSaved && (
            <Text style={styles.successText}>
              {STRINGS.POST_DEVICE.DRAFT_SAVED_MSG}
            </Text>
          )}
          {submitted && !specificationsValid && (
            <Text style={styles.errorText}>
              {STRINGS.POST_DEVICE.ERR_COMPLETE_SPECS}
            </Text>
          )}
          {publishError && <Text style={styles.errorText}>{publishError}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.card },
  header: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.light.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderSubtle,
    shadowColor: colors.light.shadow,
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
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.light.borderSubtle,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.light.borderSubtle,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: { color: colors.light.textPrimary, fontSize: 16, fontWeight: "700" },
  headerSubtitle: { color: colors.light.textSecondary, fontSize: 11, fontWeight: "500", marginTop: 2 },
  content: { paddingHorizontal: 16, paddingTop: 23, paddingBottom: 30 },
  intro: { marginBottom: 27 },
  introTitle: { color: colors.light.textPrimary, fontSize: 24, fontWeight: "800" },
  introText: {
    color: colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 320,
  },
  myDevicesSection: {
    marginBottom: 25,
    padding: 14,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 14,
  },
  myDevicesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  myDevicesTitle: { color: colors.light.textPrimary, fontSize: 17, fontWeight: "800" },
  myDevicesDescription: { color: colors.light.textSecondary, fontSize: 12, marginTop: 3 },
  deviceCountBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.light.primaryLight,
  },
  deviceCountText: { color: colors.light.primary, fontSize: 12, fontWeight: "800" },
  deviceListCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    marginTop: 8,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 10,
  },
  deviceListImage: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: colors.light.borderDefault,
  },
  deviceListInfo: { flex: 1, marginLeft: 10 },
  deviceListName: { color: colors.light.textPrimary, fontSize: 13, fontWeight: "800" },
  deviceListMeta: { color: colors.light.textSecondary, fontSize: 11, marginTop: 4 },
  deviceListStatus: { fontSize: 11, fontWeight: "700", marginTop: 5 },
  deviceListStatusAvailable: { color: colors.light.success },
  deviceListStatusMuted: { color: colors.light.textSecondary },
  deviceListMessage: {
    color: colors.light.textSecondary,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },
  deviceListError: {
    color: colors.light.danger,
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },
  section: { marginBottom: 25 },
  sectionHeading: { marginBottom: 14 },
  sectionTitle: { color: colors.light.textPrimary, fontSize: 18, fontWeight: "800" },
  sectionDescription: {
    color: colors.light.textSecondary,
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
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
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
  photoOverlayText: { color: colors.light.white, fontSize: 10, fontWeight: "700" },
  photoTitle: {
    color: colors.light.primary,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 9,
  },
  photoHint: {
    color: colors.light.textSecondary,
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
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 12,
    borderStyle: "dashed",
  },
  smallPhoto: { width: "100%", height: "100%", borderRadius: 12 },
  fieldLabel: {
    color: colors.light.textPrimary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 14,
  },
  required: { color: colors.light.danger },
  input: {
    height: 48,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: colors.light.textPrimary,
    fontSize: 13,
  },
  inputError: { borderColor: colors.light.danger },
  errorText: { color: colors.light.danger, fontSize: 11, marginTop: 5 },
  locationButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: colors.light.primaryLight,
  },
  locationButtonDisabled: { opacity: 0.6 },
  locationButtonText: { color: colors.light.primary, fontSize: 12, fontWeight: "700" },
  locationStatus: { color: colors.light.success, fontSize: 11, marginBottom: 8 },
  selectInput: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  selectText: { color: colors.light.textPrimary, fontSize: 13 },
  categoryMenu: {
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
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
    borderBottomColor: colors.light.borderSubtle,
  },
  categoryOptionText: { color: colors.light.textSecondary, fontSize: 13 },
  categoryOptionActive: { color: colors.light.primary, fontWeight: "800" },
  currencyInput: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 12,
    paddingLeft: 13,
    paddingRight: 14,
  },
  currencyInputError: { borderColor: colors.light.danger },
  currencyTextInput: {
    flex: 1,
    color: colors.light.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
  },
  currencyTextInputError: { color: colors.light.danger },
  currency: { color: colors.light.textSecondary, fontSize: 12, fontWeight: "800" },
  helperText: { color: colors.light.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 7 },
  textareaWrap: {
    minHeight: 145,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    borderRadius: 12,
    padding: 12,
  },
  textareaError: { borderColor: colors.light.danger },
  textarea: {
    flex: 1,
    minHeight: 112,
    color: colors.light.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    padding: 0,
  },
  counter: { color: colors.light.textSecondary, fontSize: 11, textAlign: "right" },
  actions: { marginTop: -2 },
  publishButton: {
    height: 53,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.light.primary,
  },
  publishText: { color: colors.light.white, fontSize: 14, fontWeight: "800" },
  draftButton: {
    height: 49,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
    marginTop: 10,
  },
  draftText: { color: colors.light.primary, fontSize: 13, fontWeight: "800" },
  successText: {
    color: colors.light.success,
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
});
