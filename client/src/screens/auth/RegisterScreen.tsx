import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { apiClient } from '../../config/api';
import { setAuth } from '../../store/slices/authSlice';
import { colors } from '../../theme/colors';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  /** Gọi sau khi đăng ký thành công, truyền role để App routing */
  onRegisterSuccess?: (role?: string) => void;
}

export function RegisterScreen({ onNavigateToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  const handleRegister = async () => {
    if (!username.trim() || !name.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMsg('Please fill in all required information');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('You must agree to the terms of use');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const response = await apiClient.post('/auth/register', {
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      const { token, user } = response.data;
      if (!token || !user) {
        throw new Error('Registration response is invalid');
      }

      dispatch(setAuth({ token, user }));
      onRegisterSuccess?.(user?.role);
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: isCompact ? 14 : 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.headerBox}>
          <TouchableOpacity style={styles.backBtn} onPress={onNavigateToLogin} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.light.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.appTitle}>Tạo tài khoản</Text>
            <Text style={styles.appSubtitle}>Gia nhập cộng đồng cho thuê công nghệ TechShare</Text>
          </View>
        </View>

        {/* FORM CARD */}
        <View style={styles.card}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.light.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="at-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. johntech"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
                value={username}
                onChangeText={(text: string) => {
                  setUsername(text);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* Full name input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full name *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={18} color={colors.light.textSecondary} />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="VD: Nguyễn Văn An"
                placeholderTextColor={colors.light.textSecondary}
                value={name}
                onChangeText={(t: string) => {
                  setName(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* Email input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="mail-outline" size={18} color={colors.light.textSecondary} />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="VD: an.nguyen@email.com"
                placeholderTextColor={colors.light.textSecondary}
                value={email}
                onChangeText={(t: string) => {
                  setEmail(t);
                  if (errorMsg) setErrorMsg('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone number *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="call-outline" size={18} color={colors.light.textSecondary} />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="VD: 0912 345 678"
                placeholderTextColor={colors.light.textSecondary}
                value={phone}
                onChangeText={(t: string) => {
                  setPhone(t);
                  if (errorMsg) setErrorMsg('');
                }}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Password input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu * (Tối thiểu 6 ký tự)</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.light.textSecondary} />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="Nhập mật khẩu an toàn"
                placeholderTextColor={colors.light.textSecondary}
                value={password}
                onChangeText={(t: string) => {
                  setPassword(t);
                  if (errorMsg) setErrorMsg('');
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.light.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Xác nhận Mật khẩu */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm password *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.light.textSecondary} />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={colors.light.textSecondary}
                value={confirmPassword}
                onChangeText={(t: string) => {
                  setConfirmPassword(t);
                  if (errorMsg) setErrorMsg('');
                }}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          {/* Điều khoản sử dụng */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
              {agreeTerms && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              Tôi đồng ý với <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{' '}
              <Text style={styles.termsLink}>Chính sách bảo mật ký quỹ</Text> của TechShare.
            </Text>
          </TouchableOpacity>

          {/* Nút Đăng ký (CTA bo góc 12px theo theme-skill.md) */}
          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>ĐĂNG KÝ TÀI KHOẢN</Text>
            )}
          </TouchableOpacity>

          {/* Switch to Login */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLink}>Log in now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    paddingTop: 10,
    paddingBottom: 30,
    paddingHorizontal: 18,
  },
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  headerTitles: {
    flex: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.light.textPrimary,
  },
  appSubtitle: {
    fontSize: 12,
    color: colors.light.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.light.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.light.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.error,
    marginBottom: 14,
  },
  errorText: {
    color: colors.light.error,
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: colors.light.textPrimary,
    fontWeight: '600',
    marginBottom: 6,
  },
  roleTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  roleTabActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primaryDark,
  },
  roleTabText: {
    fontSize: 11,
    color: colors.light.textSecondary,
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 12,
    height: 46,
  },
  iconBox: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    color: colors.light.textPrimary,
    fontSize: 13,
  },
  eyeBtn: {
    padding: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.light.background,
  },
  checkboxActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: colors.light.textSecondary,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.light.primary,
    fontWeight: '600',
  },
  registerBtn: {
    backgroundColor: colors.light.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 2,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  loginLink: {
    fontSize: 13,
    color: colors.light.primary,
    fontWeight: '700',
  },
});
