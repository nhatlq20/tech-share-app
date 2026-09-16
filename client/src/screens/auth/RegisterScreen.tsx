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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess?: () => void;
}

export type UserRole = 'both' | 'renter' | 'owner';

export function RegisterScreen({ onNavigateToLogin, onRegisterSuccess }: RegisterScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('both' as UserRole);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải từ 6 ký tự trở lên');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }
    if (!agreeTerms) {
      setErrorMsg('Bạn cần đồng ý với điều khoản sử dụng');
      return;
    }

    setErrorMsg('');
    if (onRegisterSuccess) {
      onRegisterSuccess();
    } else {
      onNavigateToLogin();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.headerBox}>
          <TouchableOpacity style={styles.backBtn} onPress={onNavigateToLogin}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.appTitle}>Tạo tài khoản</Text>
            <Text style={styles.appSubtitle}>Gia nhập cộng đồng cho thuê công nghệ</Text>
          </View>
        </View>

        {/* THẺ FORM */}
        <View style={styles.card}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Chọn vai trò (Role) */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vai trò của bạn:</Text>
            <View style={styles.roleTabsRow}>
              <TouchableOpacity
                style={[styles.roleTab, role === 'both' && styles.roleTabActive]}
                onPress={() => setRole('both')}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={14}
                  color={role === 'both' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text style={[styles.roleTabText, role === 'both' && styles.roleTabTextActive]}>
                  Cả hai (Khuyên dùng)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleTab, role === 'renter' && styles.roleTabActive]}
                onPress={() => setRole('renter')}
              >
                <Text style={[styles.roleTabText, role === 'renter' && styles.roleTabTextActive]}>
                  Người thuê
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleTab, role === 'owner' && styles.roleTabActive]}
                onPress={() => setRole('owner')}
              >
                <Text style={[styles.roleTabText, role === 'owner' && styles.roleTabTextActive]}>
                  Chủ máy
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Input Họ tên */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Họ và tên *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="person-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="VD: Nguyễn Văn An"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={(t: string) => {
                  setName(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* Input Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="mail-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="VD: an.nguyen@techshare.vn"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(t: string) => {
                  setEmail(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* Input Số điện thoại */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số điện thoại *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="call-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="VD: 0912345678"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(t: string) => {
                  setPhone(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* Input Mật khẩu */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mật khẩu (tối thiểu 6 ký tự) *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t: string) => {
                  setPassword(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Input Xác nhận mật khẩu */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Xác nhận mật khẩu *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#64748B"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={(t: string) => {
                  setConfirmPassword(t);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* Điều khoản */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
              {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              Tôi đồng ý với <Text style={styles.termsLink}>Điều khoản sử dụng</Text> & <Text style={styles.termsLink}>Chính sách bảo mật</Text> của TechShare
            </Text>
          </TouchableOpacity>

          {/* Nút Đăng ký */}
          <TouchableOpacity style={styles.registerBtn} onPress={handleRegister} activeOpacity={0.8}>
            <Text style={styles.registerBtnText}>ĐĂNG KÝ TÀI KHOẢN</Text>
          </TouchableOpacity>

          {/* Chuyển sang Đăng nhập */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={onNavigateToLogin}>
              <Text style={styles.loginLink}>Đăng nhập ngay</Text>
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
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
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
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerTitles: {
    flex: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: '#CBD5E1',
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
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#38BDF8',
  },
  roleTabText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  roleTabTextActive: {
    color: '#FFFFFF',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 46,
  },
  iconBox: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    color: '#FFFFFF',
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
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  termsLink: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  registerBtn: {
    backgroundColor: '#2563EB',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 3,
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
    color: '#94A3B8',
  },
  loginLink: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '700',
  },
});
