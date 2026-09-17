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

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess?: () => void;
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
      onRegisterSuccess?.();
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
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
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
          <TouchableOpacity style={styles.backBtn} onPress={onNavigateToLogin}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.appTitle}>Create account</Text>
            <Text style={styles.appSubtitle}>Join the tech rental community</Text>
          </View>
        </View>

        {/* FORM CARD */}
        <View style={styles.card}>
          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
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
                <Ionicons name="person-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. John Doe"
                placeholderTextColor="#64748B"
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
                <Ionicons name="mail-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. john@techshare.vn"
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

          {/* Phone input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone number *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="call-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 0912345678"
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

          {/* Password input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password (minimum 6 characters) *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="Enter password"
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

          {/* Confirm password input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm password *</Text>
            <View style={styles.inputWrap}>
              <View style={styles.iconBox}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#94A3B8" />
              </View>
              <TextInput
                style={styles.inputField}
                placeholder="Re-enter password"
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

          {/* Terms */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAgreeTerms(!agreeTerms)}
          >
            <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
              {agreeTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the <Text style={styles.termsLink}>Terms of Use</Text> and <Text style={styles.termsLink}>Privacy Policy</Text> of TechShare
            </Text>
          </TouchableOpacity>

          {/* Register button */}
          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.registerBtnDisabled]}
            onPress={handleRegister}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>CREATE ACCOUNT</Text>
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
    width: '100%',
    backgroundColor: '#0B0F19',
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
    color: '#94A3B8',
  },
  loginLink: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '700',
  },
});
