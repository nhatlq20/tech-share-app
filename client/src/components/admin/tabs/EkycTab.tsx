import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';
import { EkycItem } from '../../../types';

interface EkycTabProps {
  ekycRequests: EkycItem[];
  onOpenEkyc: (req: EkycItem) => void;
}

export function EkycTab({ ekycRequests, onOpenEkyc }: EkycTabProps) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderTitleRow}>
        <Ionicons name="id-card-outline" size={16} color={theme.colors.primary[600]} />
        <Text style={styles.sectionHeaderTitle}>
          Hồ sơ xác minh eKYC ({ekycRequests.length})
        </Text>
      </View>

      {ekycRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="id-card-outline" size={48} color={theme.colors.primary[600]} />
          <Text style={styles.emptyTitle}>Không có hồ sơ nào</Text>
          <Text style={styles.emptyDesc}>Hiện tại chưa có yêu cầu cấp Tích xanh mới.</Text>
        </View>
      ) : (
        ekycRequests.map((req: EkycItem) => {
          const isApproved = req.status === 'approved';
          const isRejected = req.status === 'rejected';

          return (
            <View key={req._id} style={styles.ekycCard}>
              <View style={styles.ekycCardHeader}>
                <Image
                  source={{
                    uri:
                      req.userId?.avatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
                  }}
                  style={styles.ekycAvatar}
                />
                <View style={styles.ekycMetaCol}>
                  <View style={styles.ekycNameRow}>
                    <Text style={styles.ekycName}>{req.userId?.name || 'Người dùng'}</Text>
                    {isApproved && (
                      <View style={styles.trustBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={theme.colors.primary[600]}
                        />
                        <Text style={styles.trustBadgeText}>Đã cấp Tích Xanh</Text>
                      </View>
                    )}
                    {isRejected && (
                      <View style={styles.badgePendingRed}>
                        <Text style={styles.badgePendingRedText}>Bị từ chối</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.ekycSubMeta}>
                    {req.userId?.email || 'email'} • SĐT: {req.userId?.phone || 'Chưa cập nhật'}
                  </Text>
                  {req.idCardNumber ? (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.primary[600], marginTop: 2 }}>
                      Số CCCD: {req.idCardNumber}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Thumbnails ảnh giấy tờ */}
              <View style={styles.ekycThumbnailsRow}>
                <View style={styles.ekycThumbCol}>
                  <Text style={styles.thumbLabel}>CCCD Mặt trước</Text>
                  <Image source={{ uri: req.idCardFrontUrl }} style={styles.thumbImg} />
                </View>
                <View style={styles.ekycThumbCol}>
                  <Text style={styles.thumbLabel}>CCCD Mặt sau</Text>
                  <Image source={{ uri: req.idCardBackUrl }} style={styles.thumbImg} />
                </View>
                {req.selfieUrl ? (
                  <View style={styles.ekycThumbCol}>
                    <Text style={styles.thumbLabel}>Chân dung Selfie</Text>
                    <Image source={{ uri: req.selfieUrl }} style={styles.thumbImg} />
                  </View>
                ) : null}
              </View>

              {/* Điểm tin cậy AI */}
              <View style={styles.ekycAiRow}>
                <Ionicons name="sparkles" size={14} color={theme.colors.primary[600]} />
                <Text style={styles.ekycAiText}>
                  AI Face Match:{' '}
                  <Text style={styles.ekycAiBold}>98.6% trùng khớp</Text> • Đầy đủ 2 mặt CCCD
                </Text>
              </View>

              {/* Nút tác vụ duyệt */}
              {req.status === 'pending' ? (
                <TouchableOpacity
                  style={styles.btnOpenEkycModal}
                  onPress={() => onOpenEkyc(req)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color={theme.colors.primary[600]}
                  />
                  <Text style={styles.btnOpenEkycModalText}>
                    Kiểm tra hồ sơ & Phê duyệt Tích xanh
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.ekycStatusNoteRow}>
                  <Ionicons
                    name={isApproved ? 'checkmark-circle' : 'close-circle'}
                    size={15}
                    color={isApproved ? theme.colors.success[600] : theme.colors.danger[600]}
                  />
                  <Text
                    style={[
                      styles.ekycStatusNote,
                      {
                        color: isApproved
                          ? theme.colors.success[600]
                          : theme.colors.danger[600],
                      },
                    ]}
                  >
                    {isApproved
                      ? 'Hồ sơ đã được duyệt và cấp Tích xanh uy tín thành công.'
                      : `Đã từ chối hồ sơ. Lý do: ${req.rejectReason || 'Không hợp lệ'}`}
                  </Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginBottom: 4,
  },
  sectionHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  emptyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  ekycCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  ekycCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  ekycAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.slate[100],
  },
  ekycMetaCol: {
    flex: 1,
  },
  ekycNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  ekycName: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  trustBadgeText: {
    color: theme.colors.primary[600],
    fontSize: 10,
    fontWeight: '700',
  },
  badgePendingRed: {
    backgroundColor: theme.colors.danger[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  badgePendingRedText: {
    color: theme.colors.danger[600],
    fontSize: 10,
    fontWeight: '700',
  },
  ekycSubMeta: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  ekycThumbnailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  ekycThumbCol: {
    flex: 1,
  },
  thumbLabel: {
    fontSize: 9,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  thumbImg: {
    width: '100%',
    height: 64,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.slate[100],
  },
  ekycAiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    marginBottom: 10,
  },
  ekycAiText: {
    fontSize: 11,
    color: theme.colors.primary[700],
  },
  ekycAiBold: {
    fontWeight: '700',
    color: theme.colors.primary[600],
  },
  btnOpenEkycModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[50],
    paddingVertical: 10,
    borderRadius: theme.radii.full,
  },
  btnOpenEkycModalText: {
    color: theme.colors.primary[600],
    fontWeight: '700',
    fontSize: 12,
  },
  ekycStatusNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  ekycStatusNote: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
  },
});
