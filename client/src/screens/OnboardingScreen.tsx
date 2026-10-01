import React, { useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    eyebrow: 'TÌM THIẾT BỊ',
    title: 'Công nghệ bạn cần, ngay gần bạn',
    description: 'Khám phá laptop, máy ảnh và thiết bị hữu ích từ cộng đồng quanh mình.',
    icon: 'search' as const,
    accent: '#2563EB',
    tint: '#DBEAFE',
    secondaryIcon: 'location' as const,
  },
  {
    eyebrow: 'CHO THUÊ DỄ DÀNG',
    title: 'Chia sẻ thiết bị, thêm thu nhập',
    description: 'Đăng thiết bị của bạn và kết nối với người đang cần sử dụng.',
    icon: 'hardware-chip' as const,
    accent: '#059669',
    tint: '#D1FAE5',
    secondaryIcon: 'trending-up' as const,
  },
  {
    eyebrow: 'ĐẶT THUÊ AN TÂM',
    title: 'Theo dõi mọi lịch thuê dễ dàng',
    description: 'Quản lý yêu cầu, lịch hẹn và thông báo trong cùng một nơi.',
    icon: 'calendar' as const,
    accent: '#EA580C',
    tint: '#FFEDD5',
    secondaryIcon: 'notifications' as const,
  },
];

const termsSections = [
  {
    title: '1. Giới thiệu',
    body: 'TechShare là nền tảng kết nối người có thiết bị công nghệ với người có nhu cầu thuê. Trừ khi có thông báo rõ ràng, TechShare cung cấp công cụ kết nối và không mặc nhiên là bên sở hữu, cho thuê hoặc nhận thuê thiết bị.',
  },
  {
    title: '2. Tài khoản và thông tin',
    body: 'Bạn cần cung cấp thông tin chính xác, cập nhật và bảo mật thông tin đăng nhập của mình. Bạn chịu trách nhiệm đối với hoạt động phát sinh từ tài khoản, trừ trường hợp do lỗi của nền tảng hoặc pháp luật có quy định khác. Hãy thông báo cho TechShare nếu nghi ngờ tài khoản bị truy cập trái phép.',
  },
  {
    title: '3. Đăng thiết bị',
    body: 'Người đăng thiết bị phải có quyền cho thuê thiết bị đó, mô tả trung thực tình trạng, phụ kiện, giá thuê, thời gian sẵn có và các điều kiện liên quan. Không đăng thiết bị bất hợp pháp, hàng giả, hàng không được phép cho thuê hoặc nội dung xâm phạm quyền của người khác.',
  },
  {
    title: '4. Đặt thuê và bàn giao',
    body: 'Người thuê và người cho thuê cần xem kỹ thông tin, xác nhận yêu cầu trên ứng dụng và thống nhất việc nhận, trả thiết bị. Hai bên nên kiểm tra tình trạng thiết bị, phụ kiện và lưu lại xác nhận bàn giao. Các thỏa thuận thuê cụ thể được thực hiện giữa hai bên theo thông tin hiển thị tại thời điểm đặt.',
  },
  {
    title: '5. Giá thuê, thanh toán và hủy',
    body: 'Giá, phí và phương thức thanh toán (nếu có) được hiển thị trong quy trình đặt thuê. Vui lòng kiểm tra tổng chi phí và điều kiện hủy trước khi xác nhận. Việc hoàn tiền, xử lý giao dịch hoặc tranh chấp được thực hiện theo chính sách đang hiển thị trên TechShare và quy định pháp luật áp dụng.',
  },
  {
    title: '6. Ứng xử và an toàn',
    body: 'Bạn đồng ý giao tiếp lịch sự, không gian lận, quấy rối, lừa đảo hoặc sử dụng nền tảng cho mục đích trái pháp luật. Không chia sẻ dữ liệu cá nhân, mật khẩu hay mã xác thực của mình hoặc người khác. Hãy chỉ giao nhận thiết bị tại địa điểm và theo cách mà các bên cảm thấy an toàn.',
  },
  {
    title: '7. Trợ lý Gemini AI',
    body: 'Trợ lý Gemini AI có thể hỗ trợ tìm kiếm và cung cấp gợi ý, nhưng câu trả lời có thể chưa đầy đủ, không chính xác hoặc đã lỗi thời. Nội dung AI chỉ nhằm mục đích tham khảo, không thay thế tư vấn chuyên môn hay thông tin xác nhận từ người cho thuê. Vui lòng kiểm tra thông tin quan trọng trước khi quyết định và không nhập dữ liệu nhạy cảm vào cuộc trò chuyện.',
  },
  {
    title: '8. Nội dung, sự cố và giới hạn trách nhiệm',
    body: 'Bạn chịu trách nhiệm về nội dung mình đăng và cần giải quyết thiện chí các vấn đề phát sinh từ giao dịch. TechShare có thể tiếp nhận phản ánh, hỗ trợ kết nối các bên và áp dụng biện pháp phù hợp với tài khoản hoặc nội dung vi phạm. Nền tảng không đảm bảo mọi thiết bị, người dùng hoặc giao dịch luôn sẵn có hay không có rủi ro; quyền của bạn theo pháp luật vẫn được bảo lưu.',
  },
  {
    title: '9. Dữ liệu và cập nhật điều khoản',
    body: 'TechShare xử lý dữ liệu cần thiết để vận hành tài khoản, kết nối giao dịch và cải thiện dịch vụ theo thông báo quyền riêng tư của ứng dụng và pháp luật áp dụng. Điều khoản có thể được cập nhật khi dịch vụ thay đổi. Bản đang hiển thị trong ứng dụng là bản áp dụng; nếu thay đổi quan trọng, TechShare sẽ thông báo theo cách phù hợp.',
  },
  {
    title: '10. Liên hệ và hiệu lực',
    body: 'Nếu có câu hỏi hoặc cần hỗ trợ, vui lòng sử dụng kênh hỗ trợ được cung cấp trong ứng dụng TechShare. Đây là bản dự thảo ban đầu cho dự án; các chính sách cụ thể về quyền riêng tư, thanh toán, hủy và giải quyết khiếu nại cần được hoàn thiện trước khi phát hành chính thức.',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { width } = useWindowDimensions();
  const listRef = useRef(null as {
    scrollToIndex: (options: { index: number; animated: boolean }) => void;
  } | null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const goToNextSlide = () => {
    if (activeIndex === slides.length - 1) {
      if (hasAcceptedTerms) onComplete();
      return;
    }
    listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  };

  const skipToFinalSlide = () => {
    listRef.current?.scrollToIndex({ index: slides.length - 1, animated: true });
  };

  if (showTerms) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
        <View style={styles.termsTopBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowTerms(false)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Quay lại onboarding"
          >
            <Ionicons name="arrow-back" size={23} color={colors.light.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.termsNavTitle}>Điều khoản sử dụng</Text>
          <View style={styles.backButtonSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.termsContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.termsTitle}>ĐIỀU KHOẢN SỬ DỤNG TECHSHARE</Text>
          <Text style={styles.termsSubtitle}>
            Dự án TechShare - Nền tảng thuê thiết bị công nghệ & trợ lý Gemini AI
          </Text>
          <Text style={styles.termsDraftNote}>
            Bản dự thảo tạm thời. Vui lòng đọc kỹ trước khi sử dụng dịch vụ.
          </Text>
          {termsSections.map((section) => (
            <View key={section.title} style={styles.termsSection}>
              <Text style={styles.termsSectionTitle}>{section.title}</Text>
              <Text style={styles.termsBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
      <View style={styles.topBar}>
        <View style={styles.brandMark}>
          <Ionicons name="hardware-chip" size={17} color="#FFFFFF" />
        </View>
        <Text style={styles.brandName}>TechShare</Text>
        {activeIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={skipToFinalSlide} hitSlop={12} accessibilityRole="button">
            <Text style={styles.skipText}>Bỏ qua</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.topBarSpacer} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item: (typeof slides)[number]) => item.eyebrow}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }: { item: (typeof slides)[number] }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.artwork, activeIndex === slides.length - 1 && styles.finalArtwork, { backgroundColor: item.tint }]}>
              <View style={[styles.iconTile, { backgroundColor: item.accent }]}>
                <Ionicons name={item.icon} size={54} color="#FFFFFF" />
              </View>
              <View style={[styles.secondaryTile, styles.secondaryTop]}>
                <Ionicons name={item.secondaryIcon} size={23} color={item.accent} />
              </View>
              <View style={[styles.secondaryTile, styles.secondaryBottom]}>
                <Ionicons name="checkmark" size={22} color="#FFFFFF" />
              </View>
              <View style={[styles.artworkLine, { backgroundColor: item.accent }]} />
            </View>
            <Text style={[styles.eyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            {activeIndex === slides.length - 1 ? (
              <View style={styles.acceptTermsRow}>
                <TouchableOpacity
                  style={[styles.checkbox, hasAcceptedTerms && styles.checkboxChecked]}
                  onPress={() => setHasAcceptedTerms(!hasAcceptedTerms)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: hasAcceptedTerms }}
                  accessibilityLabel="Đồng ý điều khoản sử dụng"
                >
                  {hasAcceptedTerms ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                </TouchableOpacity>
                <Text style={styles.acceptTermsText}>
                  Tôi đã đọc và đồng ý với{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => setShowTerms(true)}
                    accessibilityRole="link"
                  >
                    Điều khoản sử dụng
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.pagination} accessibilityLabel={`Trang ${activeIndex + 1} trên ${slides.length}`}>
          {slides.map((slide, index) => (
            <View
              key={slide.eyebrow}
              style={[
                styles.paginationDot,
                index === activeIndex && [styles.paginationDotActive, { backgroundColor: slide.accent }],
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={[styles.nextButton, activeIndex === slides.length - 1 && !hasAcceptedTerms && styles.nextButtonDisabled]}
          onPress={goToNextSlide}
          activeOpacity={0.85}
          disabled={activeIndex === slides.length - 1 && !hasAcceptedTerms}
          accessibilityRole="button"
        >
          <Text style={styles.nextButtonText}>
            {activeIndex === slides.length - 1 ? 'Bắt đầu' : 'Tiếp tục'}
          </Text>
          <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  topBar: {
    height: 56,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.primary,
  },
  brandName: {
    flex: 1,
    marginLeft: 9,
    color: colors.light.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  skipText: {
    color: colors.light.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  topBarSpacer: {
    width: 42,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    paddingBottom: 12,
  },
  artwork: {
    height: 280,
    width: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    overflow: 'hidden',
  },
  finalArtwork: {
    height: 210,
    marginBottom: 24,
  },
  iconTile: {
    width: 128,
    height: 128,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  secondaryTile: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  secondaryTop: {
    top: 48,
    right: '18%',
  },
  secondaryBottom: {
    bottom: 44,
    left: '18%',
    backgroundColor: '#0F172A',
  },
  artworkLine: {
    position: 'absolute',
    width: 44,
    height: 4,
    borderRadius: 2,
    bottom: 66,
    right: '22%',
    opacity: 0.45,
  },
  eyebrow: {
    marginBottom: 12,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    maxWidth: 340,
    color: colors.light.textPrimary,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
  },
  description: {
    maxWidth: 340,
    marginTop: 14,
    color: colors.light.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  acceptTermsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: colors.light.textSecondary,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primary,
  },
  acceptTermsText: {
    flex: 1,
    color: colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.light.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  nextButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  termsTopBar: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  termsNavTitle: {
    flex: 1,
    color: colors.light.textPrimary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  backButtonSpacer: {
    width: 40,
  },
  termsContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  termsTitle: {
    color: colors.light.textPrimary,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
  },
  termsSubtitle: {
    marginTop: 10,
    color: colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  termsDraftNote: {
    marginTop: 14,
    marginBottom: 20,
    color: '#9A3412',
    backgroundColor: '#FFF7ED',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: 19,
  },
  termsSection: {
    marginTop: 18,
  },
  termsSectionTitle: {
    color: colors.light.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  termsBody: {
    marginTop: 6,
    color: colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.light.border,
  },
  paginationDotActive: {
    width: 24,
  },
  nextButton: {
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 22,
    backgroundColor: colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});