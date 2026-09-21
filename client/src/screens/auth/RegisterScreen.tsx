import React, { useState, useEffect, useRef } from 'react';
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

type RegisterStep = 'form' | 'otp';

export function RegisterScreen({ onNavigateToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  // Form State
  const [step, setStep] = useState('form' as RegisterStep);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // OTP State (6 digits)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null as any);
  const otpInputRefs = useRef([] as any[]);

  // UI State
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Cooldown countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev: number) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  // Step 1: Send OTP to user's email
  const handleRequestOtp = async () => {
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (!trimmedUsername || !trimmedName || !trimmedEmail || !trimmedPhone || !password) {
      setErrorMsg('Vui lòng điền đầy đủ tất cả các trường thông tin');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Địa chỉ email không đúng định dạng');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có độ dài tối thiểu 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!agreeTerms) {
      setErrorMsg('Bạn cần đồng ý với Điều khoản dịch vụ của TechShare');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const res = await apiClient.post('/auth/send-otp', {
        email: trimmedEmail,
        username: trimmedUsername,
        name: trimmedName,
      });

      if (res.data?.success) {
        setStep('otp');
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        setInfoMsg(res.data.message || 'Mã xác thực OTP đã được gửi đến email của bạn');
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 400);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.';
      setErrorMsg(msg);
      if (err?.response?.data?.remainingSeconds) {
        setCountdown(err.response.data.remainingSeconds);
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const res = await apiClient.post('/auth/send-otp', {
        email: email.trim().toLowerCase(),
        username: username.trim(),
        name: name.trim(),
      });

      if (res.data?.success) {
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        setInfoMsg('Mã OTP mới đã được gửi đến email của bạn');
        otpInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP digit change
  const handleOtpChange = (value: string, index: number) => {
    // If user pastes entire 6-digit code
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length > 1) {
      const pastedDigits = cleanValue.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedDigits.forEach((digit: string, i: number) => {
        newOtp[i] = digit;
      });
      setOtp(newOtp);
      setErrorMsg('');
      const nextFocus = Math.min(pastedDigits.length, 5);
      otpInputRefs.current[nextFocus]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);
    if (errorMsg) setErrorMsg('');

    // Auto-focus next input if digit entered
    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace navigation across OTP boxes
  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP and Register Account
  const handleVerifyAndRegister = async () => {
    const fullOtp = otp.join('').trim();
    if (fullOtp.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const response = await apiClient.post('/auth/register', {
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        otp: fullOtp,
      });

      const { token, user } = response.data;
      if (!token || !user) {
        throw new Error('Dữ liệu phản hồi đăng ký không hợp lệ');
      }

      dispatch(setAuth({ token, user }));
      onRegisterSuccess?.(user?.role);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Xác thực OTP hoặc đăng ký thất bại.');
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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={step === 'otp' ? () => setStep('form') : onNavigateToLogin}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.light.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.appTitle}>
              {step === 'form' ? 'Tạo tài khoản' : 'Xác thực OTP'}
            </Text>
            <Text style={styles.appSubtitle}>
              {step === 'form'
                ? 'Gia nhập cộng đồng cho thuê công nghệ TechShare'
                : 'Bảo mật tài khoản với xác thực email'}
            </Text>
          </View>
        </View>

        {/* STEP PROGRESS INDICATOR */}
        <View style={styles.stepProgressRow}>
          <View style={[styles.stepItem, step === 'form' ? styles.stepActive : styles.stepDone]}>
            <View style={[styles.stepDot, step === 'form' ? styles.stepDotActive : styles.stepDotDone]}>
              {step === 'otp' ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : (
                <Text style={styles.stepNumber}>1</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, step === 'form' ? styles.stepLabelActive : styles.stepLabelDone]}>
              Thông tin
            </Text>
          </View>
          <View style={[styles.stepConnector, step === 'otp' && styles.stepConnectorActive]} />
          <View style={[styles.stepItem, step === 'otp' ? styles.stepActive : styles.stepInactive]}>
            <View style={[styles.stepDot, step === 'otp' ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={[styles.stepNumber, step !== 'otp' && styles.stepNumberInactive]}>2</Text>
            </View>
            <Text style={[styles.stepLabel, step === 'otp' ? styles.stepLabelActive : styles.stepLabelInactive]}>
              Xác thực OTP
            </Text>
          </View>
        </View>

        {/* ERROR / INFO BANNERS */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.light.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {infoMsg && !errorMsg ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={18} color={colors.light.primary} />
            <Text style={styles.infoText}>{infoMsg}</Text>
          </View>
        ) : null}

        {/* STEP 1: REGISTRATION FORM */}
        {step === 'form' ? (
          <View style={styles.card}>
            {/* Username input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên tài khoản (Username) *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.iconBox}>
                  <Ionicons name="at-outline" size={18} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="VD: nhatle20"
                  placeholderTextColor={colors.light.textSecondary}
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
              <Text style={styles.inputLabel}>Họ và tên *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.iconBox}>
                  <Ionicons name="person-outline" size={18} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="VD: Nguyễn Văn An"
                  placeholderTextColor={colors.light.textSecondary}
                  value={name}
                  onChangeText={(text: string) => {
                    setName(text);
                    if (errorMsg) setErrorMsg('');
                  }}
                />
              </View>
            </View>

            {/* Email input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email (Nhận mã xác thực OTP) *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.iconBox}>
                  <Ionicons name="mail-outline" size={18} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="VD: an.nguyen@email.com"
                  placeholderTextColor={colors.light.textSecondary}
                  value={email}
                  onChangeText={(text: string) => {
                    setEmail(text);
                    if (errorMsg) setErrorMsg('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Phone input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Số điện thoại liên hệ *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.iconBox}>
                  <Ionicons name="call-outline" size={18} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="VD: 0912 345 678"
                  placeholderTextColor={colors.light.textSecondary}
                  value={phone}
                  onChangeText={(text: string) => {
                    setPhone(text);
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
                  onChangeText={(text: string) => {
                    setPassword(text);
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

            {/* Confirm Password input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.iconBox}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={colors.light.textSecondary}
                  value={confirmPassword}
                  onChangeText={(text: string) => {
                    setConfirmPassword(text);
                    if (errorMsg) setErrorMsg('');
                  }}
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {/* Terms checkbox */}
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

            {/* CTA: Next to OTP Step */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleRequestOtp}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.primaryBtnText}>TIẾP TỤC (NHẬN MÃ OTP)</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Switch to Login */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={onNavigateToLogin}>
                <Text style={styles.loginLink}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* STEP 2: OTP VERIFICATION */
          <View style={styles.card}>
            {/* Visual Icon */}
            <View style={styles.otpHeaderBadgeWrap}>
              <View style={styles.otpHeaderBadge}>
                <Ionicons name="mail-unread-outline" size={36} color={colors.light.primary} />
              </View>
            </View>

            <Text style={styles.otpCardTitle}>Kiểm tra hộp thư của bạn</Text>
            <Text style={styles.otpCardSubtitle}>
              Mã xác thực 6 chữ số đã được gửi tới địa chỉ:
            </Text>

            {/* Email display chip with change email action */}
            <View style={styles.emailChipRow}>
              <View style={styles.emailChip}>
                <Ionicons name="mail" size={14} color={colors.light.primary} />
                <Text style={styles.emailChipText} numberOfLines={1}>
                  {email}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeEmailBtn}
                onPress={() => setStep('form')}
              >
                <Text style={styles.changeEmailText}>Thay đổi</Text>
              </TouchableOpacity>
            </View>

            {/* 6 OTP Input Boxes */}
            <View style={styles.otpBoxesRow}>
              {otp.map((digit: string, idx: number) => (
                <TextInput
                  key={idx}
                  ref={(ref: any) => {
                    otpInputRefs.current[idx] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    digit ? styles.otpBoxFilled : null,
                  ]}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={digit}
                  onChangeText={(val: string) => handleOtpChange(val, idx)}
                  onKeyPress={(e: any) => handleOtpKeyPress(e, idx)}
                  selectTextOnFocus
                  textAlign="center"
                  placeholder="-"
                  placeholderTextColor="#CBD5E1"
                />
              ))}
            </View>

            {/* Expiry note */}
            <Text style={styles.expiryNote}>
              ⏱️ Mã có hiệu lực trong 5 phút. Vui lòng kiểm tra cả thư rác (Spam).
            </Text>

            {/* Resend Cooldown Section */}
            <View style={styles.resendSection}>
              {countdown > 0 ? (
                <Text style={styles.resendCountdownText}>
                  Gửi lại mã xác thực sau:{' '}
                  <Text style={styles.countdownBold}>
                    00:{countdown < 10 ? `0${countdown}` : countdown}
                  </Text>
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={loading}
                  style={styles.resendBtn}
                >
                  <Ionicons name="refresh-outline" size={15} color={colors.light.primary} />
                  <Text style={styles.resendBtnText}>Gửi lại mã OTP mới</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* CTA: Verify and Finish Registration */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (otp.join('').length < 6 || loading) && styles.primaryBtnDisabled,
              ]}
              onPress={handleVerifyAndRegister}
              activeOpacity={0.85}
              disabled={otp.join('').length < 6 || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>XÁC THỰC & ĐĂNG KÝ</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Back to Step 1 Button */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setStep('form')}
            >
              <Text style={styles.secondaryBtnText}>Quay lại chỉnh sửa thông tin</Text>
            </TouchableOpacity>
          </View>
        )}
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
    marginBottom: 16,
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

  // Steps Progress
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepActive: {
    opacity: 1,
  },
  stepDone: {
    opacity: 1,
  },
  stepInactive: {
    opacity: 0.6,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: colors.light.primary,
  },
  stepDotDone: {
    backgroundColor: colors.light.success,
  },
  stepDotInactive: {
    backgroundColor: '#E2E8F0',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepNumberInactive: {
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: colors.light.primary,
  },
  stepLabelDone: {
    color: colors.light.success,
  },
  stepLabelInactive: {
    color: colors.light.textSecondary,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  stepConnectorActive: {
    backgroundColor: colors.light.primary,
  },

  // Card
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
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: colors.light.error,
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.primaryLight,
    marginBottom: 14,
  },
  infoText: {
    flex: 1,
    color: colors.light.primary,
    fontSize: 12.5,
    fontWeight: '500',
    lineHeight: 17,
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

  // Buttons
  primaryBtn: {
    backgroundColor: colors.light.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.light.textSecondary,
    fontSize: 13,
    fontWeight: '500',
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

  // OTP Step UI
  otpHeaderBadgeWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  otpHeaderBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.light.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  otpCardSubtitle: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emailChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: '75%',
  },
  emailChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.light.textPrimary,
  },
  changeEmailBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeEmailText: {
    color: colors.light.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginVertical: 10,
    paddingHorizontal: 4,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: colors.light.background,
    fontSize: 22,
    fontWeight: '800',
    color: colors.light.primaryDark,
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.light.primary,
    backgroundColor: '#F0F7FF',
  },
  expiryNote: {
    fontSize: 11.5,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
  },
  resendSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  resendCountdownText: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  countdownBold: {
    color: colors.light.primary,
    fontWeight: '700',
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  resendBtnText: {
    fontSize: 13,
    color: colors.light.primary,
    fontWeight: '700',
  },
});
