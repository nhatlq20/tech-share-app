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
import { apiClient } from '../../config/api';
import { colors } from '../../theme/colors';

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
}

type ForgotStep = 'search' | 'otp' | 'reset' | 'success';

export function ForgotPasswordScreen({ onNavigateToLogin }: ForgotPasswordScreenProps) {
  const { width } = useWindowDimensions();
  const isCompact = width < 360;

  // Flow State
  const [step, setStep] = useState('search' as ForgotStep);
  const [identifier, setIdentifier] = useState('');
  const [foundEmail, setFoundEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // OTP State (6 digits)
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null as any);
  const otpInputRefs = useRef([] as any[]);

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Countdown timer for OTP resend cooldown
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

  // Step 1: Find Account and Send OTP
  const handleSearchAccount = async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập tên tài khoản (username) hoặc email');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const res = await apiClient.post('/auth/forgot-password', {
        identifier: trimmed,
      });

      if (res.data?.success) {
        setFoundEmail(res.data.email || trimmed);
        setMaskedEmail(res.data.maskedEmail || res.data.email || trimmed);
        setStep('otp');
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        setInfoMsg(res.data.message || 'Mã OTP đã được gửi đến email của bạn');
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 400);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không tìm thấy tài khoản hoặc không thể gửi mã OTP';
      setErrorMsg(msg);
      if (err?.response?.data?.remainingSeconds) {
        setCountdown(err.response.data.remainingSeconds);
        if (err.response.data.email) {
          setFoundEmail(err.response.data.email);
          setMaskedEmail(err.response.data.maskedEmail || err.response.data.email);
          setStep('otp');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || loading) return;

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const res = await apiClient.post('/auth/forgot-password', {
        identifier: foundEmail || identifier.trim(),
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

    if (cleanValue && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const fullOtp = otp.join('').trim();
    if (fullOtp.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số mã OTP');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const res = await apiClient.post('/auth/verify-reset-otp', {
        email: foundEmail,
        otp: fullOtp,
      });

      if (res.data?.success) {
        setStep('reset');
        setErrorMsg('');
        setInfoMsg('');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (!newPassword) {
      setErrorMsg('Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }

    const fullOtp = otp.join('').trim();
    if (fullOtp.length < 6) {
      setErrorMsg('Mã OTP không hợp lệ, vui lòng quay lại bước trước');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setInfoMsg('');

      const res = await apiClient.post('/auth/reset-password', {
        email: foundEmail,
        otp: fullOtp,
        newPassword,
      });

      if (res.data?.success) {
        setStep('success');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('search');
      setErrorMsg('');
      setInfoMsg('');
    } else if (step === 'reset') {
      setStep('otp');
      setErrorMsg('');
      setInfoMsg('');
    } else {
      onNavigateToLogin();
    }
  };

  const getStepIndex = () => {
    if (step === 'search') return 1;
    if (step === 'otp') return 2;
    if (step === 'reset' || step === 'success') return 3;
    return 1;
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
          {step !== 'success' && (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={colors.light.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={[styles.headerTitles, step === 'success' && { paddingLeft: 0, alignItems: 'center' }]}>
            <Text style={styles.appTitle}>
              {step === 'search' && 'Quên mật khẩu'}
              {step === 'otp' && 'Xác thực OTP'}
              {step === 'reset' && 'Đặt lại mật khẩu'}
              {step === 'success' && 'Thành công!'}
            </Text>
            <Text style={styles.appSubtitle}>
              {step === 'search' && 'Nhập thông tin tài khoản để nhận mã khôi phục'}
              {step === 'otp' && 'Nhập mã 6 chữ số đã gửi đến email của bạn'}
              {step === 'reset' && 'Thiết lập mật khẩu mới an toàn cho tài khoản'}
              {step === 'success' && 'Tài khoản của bạn đã được cập nhật mật khẩu mới'}
            </Text>
          </View>
        </View>

        {/* STEP PROGRESS INDICATOR (HIDDEN ON SUCCESS) */}
        {step !== 'success' && (
          <View style={styles.stepProgressRow}>
            {/* Step 1 */}
            <View style={[styles.stepItem, getStepIndex() === 1 ? styles.stepActive : styles.stepDone]}>
              <View style={[styles.stepDot, getStepIndex() > 1 ? styles.stepDotDone : styles.stepDotActive]}>
                {getStepIndex() > 1 ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <Text style={styles.stepNumber}>1</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, getStepIndex() === 1 ? styles.stepLabelActive : styles.stepLabelDone]}>
                Tài khoản
              </Text>
            </View>

            <View style={[styles.stepConnector, getStepIndex() >= 2 && styles.stepConnectorActive]} />

            {/* Step 2 */}
            <View style={[styles.stepItem, getStepIndex() === 2 ? styles.stepActive : getStepIndex() > 2 ? styles.stepDone : styles.stepInactive]}>
              <View style={[styles.stepDot, getStepIndex() > 2 ? styles.stepDotDone : getStepIndex() === 2 ? styles.stepDotActive : styles.stepDotInactive]}>
                {getStepIndex() > 2 ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.stepNumber, getStepIndex() < 2 && styles.stepNumberInactive]}>2</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, getStepIndex() === 2 ? styles.stepLabelActive : getStepIndex() > 2 ? styles.stepLabelDone : styles.stepLabelInactive]}>
                Mã OTP
              </Text>
            </View>

            <View style={[styles.stepConnector, getStepIndex() >= 3 && styles.stepConnectorActive]} />

            {/* Step 3 */}
            <View style={[styles.stepItem, getStepIndex() === 3 ? styles.stepActive : styles.stepInactive]}>
              <View style={[styles.stepDot, getStepIndex() === 3 ? styles.stepDotActive : styles.stepDotInactive]}>
                <Text style={[styles.stepNumber, getStepIndex() < 3 && styles.stepNumberInactive]}>3</Text>
              </View>
              <Text style={[styles.stepLabel, getStepIndex() === 3 ? styles.stepLabelActive : styles.stepLabelInactive]}>
                Mật khẩu mới
              </Text>
            </View>
          </View>
        )}

        {/* FEEDBACK BANNERS */}
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

        {/* ================= STEP 1: SEARCH ACCOUNT ================= */}
        {step === 'search' && (
          <View style={styles.card}>
            <View style={styles.iconCircleBadge}>
              <Ionicons name="key-outline" size={32} color={colors.light.primary} />
            </View>

            <Text style={styles.cardSectionTitle}>Tìm tài khoản của bạn</Text>
            <Text style={styles.cardSectionDesc}>
              Nhập tên người dùng (username) hoặc email đã liên kết với tài khoản. Hệ thống sẽ tự động gửi mã OTP xác thực tới hộp thư của bạn.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tên tài khoản hoặc Email *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.iconBox}>
                  <Ionicons name="person-circle-outline" size={20} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="VD: nhatle hoặc nhatle@gmail.com"
                  placeholderTextColor={colors.light.textSecondary}
                  value={identifier}
                  onChangeText={(text: string) => {
                    setIdentifier(text);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSearchAccount}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.primaryBtnText}>TÌM TÀI KHOẢN & GỬI OTP</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryLinkBtn} onPress={onNavigateToLogin}>
              <Ionicons name="arrow-back" size={16} color={colors.light.primary} />
              <Text style={styles.secondaryLinkText}>Quay lại trang Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= STEP 2: ENTER OTP ================= */}
        {step === 'otp' && (
          <View style={styles.card}>
            <View style={styles.iconCircleBadge}>
              <Ionicons name="mail-unread-outline" size={32} color={colors.light.primary} />
            </View>

            <Text style={styles.cardSectionTitle}>Kiểm tra hộp thư của bạn</Text>
            <Text style={styles.cardSectionDesc}>
              Mã xác thực 6 chữ số đã được gửi tới địa chỉ:
            </Text>

            {/* Masked Email Chip */}
            <View style={styles.emailChipRow}>
              <View style={styles.emailChip}>
                <Ionicons name="mail" size={14} color={colors.light.primary} />
                <Text style={styles.emailChipText} numberOfLines={1}>
                  {maskedEmail || foundEmail}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeEmailBtn}
                onPress={() => setStep('search')}
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

            <Text style={styles.expiryNote}>
              ⏱️ Mã có hiệu lực trong 5 phút. Vui lòng kiểm tra cả hộp thư rác (Spam).
            </Text>

            {/* Resend Cooldown Section */}
            <View style={styles.resendSection}>
              {countdown > 0 ? (
                <Text style={styles.resendCountdownText}>
                  Gửi lại mã OTP sau:{' '}
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

            {/* CTA Button */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (otp.join('').length < 6 || loading) && styles.primaryBtnDisabled,
              ]}
              onPress={handleVerifyOtp}
              activeOpacity={0.85}
              disabled={otp.join('').length < 6 || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>XÁC THỰC MÃ OTP</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryLinkBtn} onPress={() => setStep('search')}>
              <Text style={styles.secondaryLinkText}>Nhập lại tài khoản khác</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= STEP 3: NEW PASSWORD ================= */}
        {step === 'reset' && (
          <View style={styles.card}>
            <View style={styles.iconCircleBadge}>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.light.primary} />
            </View>

            <Text style={styles.cardSectionTitle}>Tạo mật khẩu mới</Text>
            <Text style={styles.cardSectionDesc}>
              Đặt mật khẩu mạnh mới cho tài khoản <Text style={{ fontWeight: '700', color: colors.light.textPrimary }}>{foundEmail}</Text>
            </Text>

            {/* New Password input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu mới *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.iconBox}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor={colors.light.textSecondary}
                  value={newPassword}
                  onChangeText={(text: string) => {
                    setNewPassword(text);
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
              <Text style={styles.inputLabel}>Xác nhận mật khẩu mới *</Text>
              <View style={styles.inputWrap}>
                <View style={styles.iconBox}>
                  <Ionicons name="shield-outline" size={18} color={colors.light.textSecondary} />
                </View>
                <TextInput
                  style={styles.inputField}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={colors.light.textSecondary}
                  value={confirmPassword}
                  onChangeText={(text: string) => {
                    setConfirmPassword(text);
                    if (errorMsg) setErrorMsg('');
                  }}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.light.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleResetPassword}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>ĐỔI MẬT KHẨU</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ================= STEP 4: SUCCESS ================= */}
        {step === 'success' && (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={60} color={colors.light.success} />
            </View>

            <Text style={[styles.cardSectionTitle, { textAlign: 'center', marginTop: 16 }]}>
              Đặt lại mật khẩu thành công!
            </Text>
            <Text style={[styles.cardSectionDesc, { textAlign: 'center', marginBottom: 28 }]}>
              Mật khẩu mới của bạn đã được cập nhật thành công. Hãy sử dụng mật khẩu mới này để đăng nhập vào tài khoản TechShare.
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { width: '100%' }]}
              onPress={onNavigateToLogin}
              activeOpacity={0.85}
            >
              <View style={styles.btnContentRow}>
                <Text style={styles.primaryBtnText}>ĐĂNG NHẬP NGAY</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* FOOTER */}
        {step !== 'success' && (
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Nhớ mật khẩu rồi? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLink}>Đăng nhập ngay</Text>
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
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.light.textPrimary,
    letterSpacing: 0.3,
  },
  appSubtitle: {
    fontSize: 13,
    color: colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepActive: {
    opacity: 1,
  },
  stepDone: {
    opacity: 0.9,
  },
  stepInactive: {
    opacity: 0.45,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
    backgroundColor: colors.light.border,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepNumberInactive: {
    color: colors.light.textSecondary,
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
    backgroundColor: colors.light.border,
    marginHorizontal: 8,
  },
  stepConnectorActive: {
    backgroundColor: colors.light.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.light.error,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: colors.light.error,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93C5FD',
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    color: colors.light.primary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
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
  iconCircleBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.light.textPrimary,
    textAlign: 'center',
  },
  cardSectionDesc: {
    fontSize: 13,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
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
    height: 48,
  },
  iconBox: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    color: colors.light.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryBtn: {
    backgroundColor: colors.light.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  primaryBtnDisabled: {
    backgroundColor: '#93C5FD',
    elevation: 0,
    shadowOpacity: 0,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 6,
  },
  secondaryLinkText: {
    color: colors.light.primary,
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: colors.light.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    maxWidth: '75%',
  },
  emailChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.light.primary,
  },
  changeEmailBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeEmailText: {
    fontSize: 12,
    color: colors.light.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.light.background,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    fontSize: 22,
    fontWeight: '800',
    color: colors.light.primary,
  },
  otpBoxFilled: {
    borderColor: colors.light.primary,
    backgroundColor: '#F0F7FF',
  },
  expiryNote: {
    fontSize: 12,
    color: colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 16,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resendCountdownText: {
    fontSize: 12,
    color: colors.light.textSecondary,
  },
  countdownBold: {
    fontWeight: '700',
    color: colors.light.primary,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resendBtnText: {
    fontSize: 13,
    color: colors.light.primary,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
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
