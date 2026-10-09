import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {
  AIConsultRecommendation,
  consultRentalAssistant,
} from '../../services/aiService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendations?: AIConsultRecommendation[];
}

interface AiChatConsultantProps {
  onBack: () => void;
  onNavigateToDeviceDetail: (deviceId: string) => void;
}

const SUGGESTED_QUESTIONS = [
  'I need a laptop for programming.',
  'Find a camera under 200k/day.',
  'Recommend a phone for gaming.',
];

export function AiChatConsultant({
  onBack,
  onNavigateToDeviceDetail,
}: AiChatConsultantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hi! Tell me what device you need, your budget, and how you plan to use it.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const nextMessageId = useRef(0);

  const addMessage = (
    sender: ChatMessage['sender'],
    text: string,
    recommendations?: AIConsultRecommendation[]
  ) => {
    nextMessageId.current += 1;
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `message-${nextMessageId.current}`,
        sender,
        text,
        recommendations,
      },
    ]);
  };

  const sendMessage = async (messageText: string) => {
    const message = messageText.trim();
    if (!message || isLoading) return;

    addMessage('user', message);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await consultRentalAssistant(message);
      addMessage(
        'assistant',
        response.reply || response.message || 'No matching devices are available right now.',
        response.recommendations || []
      );
    } catch {
      addMessage(
        'assistant',
        'Sorry, I could not get recommendations right now. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderRecommendation = (item: AIConsultRecommendation) => {
    const imageUrl = item.device.images?.[0] || item.device.image;

    return (
      <View key={item.device._id} style={styles.recommendationCard}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.deviceImage} />
        ) : (
          <View style={[styles.deviceImage, styles.imagePlaceholder]}>
            <Ionicons
              name="hardware-chip-outline"
              size={28}
              color={colors.light.textMuted}
            />
          </View>
        )}
        <View style={styles.recommendationDetails}>
          <Text style={styles.deviceName}>{item.device.name}</Text>
          <Text style={styles.devicePrice}>
            {item.device.pricePerDay.toLocaleString('vi-VN')} ₫/day
          </Text>
          <Text style={styles.recommendationReason}>{item.reason}</Text>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => onNavigateToDeviceDetail(item.device._id)}
            activeOpacity={0.8}
          >
            <Text style={styles.detailsButtonText}>View Details</Text>
            <Ionicons
              name="arrow-forward"
              size={15}
              color={colors.light.white}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.light.background} />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.light.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={19} color={colors.light.ai} />
          </View>
          <Text style={styles.headerTitle}>AI Rental Consultant</Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.sender === 'user' && styles.userMessageRow,
              ]}
            >
              {message.sender === 'assistant' && (
                <View style={styles.messageAvatar}>
                  <Ionicons name="sparkles" size={15} color={colors.light.ai} />
                </View>
              )}
              <View
                style={[
                  styles.messageGroup,
                  message.sender === 'user' && styles.userMessageGroup,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.sender === 'user'
                      ? styles.userBubble
                      : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.sender === 'user' && styles.userMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
                {message.recommendations?.map(renderRecommendation)}
              </View>
            </View>
          ))}

          {messages.length === 1 && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsTitle}>Try asking</Text>
              {SUGGESTED_QUESTIONS.map((question) => (
                <TouchableOpacity
                  key={question}
                  style={styles.suggestionButton}
                  onPress={() => sendMessage(question)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.suggestionText}>{question}</Text>
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={19}
                    color={colors.light.primaryDark}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isLoading && (
            <View style={styles.loadingRow}>
              <View style={styles.messageAvatar}>
                <Ionicons name="sparkles" size={15} color={colors.light.ai} />
              </View>
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.light.ai} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe what you need to rent..."
            placeholderTextColor={colors.light.textMuted}
            multiline
            maxLength={500}
            editable={!isLoading}
            onSubmitEditing={() => sendMessage(inputText)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons name="send" size={18} color={colors.light.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.borderDefault,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.light.aiLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.light.aiLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageGroup: {
    maxWidth: '84%',
  },
  userMessageGroup: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  assistantBubble: {
    backgroundColor: colors.light.surface,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
  },
  userBubble: {
    backgroundColor: colors.light.primary,
    borderBottomRightRadius: 5,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.light.textPrimary,
  },
  userMessageText: {
    color: colors.light.white,
  },
  suggestions: {
    marginTop: 2,
    marginLeft: 38,
    gap: 9,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.light.textSecondary,
  },
  suggestionButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.light.primaryBg,
    borderWidth: 1,
    borderColor: colors.light.primaryLight,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: colors.light.textPrimary,
    marginRight: 10,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 2,
    marginBottom: 14,
  },
  loadingBubble: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    borderRadius: 17,
    borderBottomLeftRadius: 5,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
  },
  loadingText: {
    fontSize: 13,
    color: colors.light.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: colors.light.borderDefault,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: 22,
    backgroundColor: colors.light.background,
    color: colors.light.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.primaryDark,
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  recommendationCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.borderDefault,
  },
  deviceImage: {
    width: '100%',
    height: 140,
    borderRadius: 11,
    backgroundColor: colors.light.background,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendationDetails: {
    paddingTop: 10,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.light.textPrimary,
  },
  devicePrice: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.light.primaryDark,
  },
  recommendationReason: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: colors.light.textSecondary,
  },
  detailsButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: colors.light.primaryDark,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.light.white,
  },
});
