import React from "react";
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
} from "react-native";

interface AiGenerateButtonProps {
    onPress: () => void;
    loading: boolean;
}
import { colors } from '../../theme/colors';
export default function AiGenerateButton({
    onPress,
    loading,
}: AiGenerateButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={loading}
            style={{

                padding: 15,
                borderRadius: 8,
                alignItems: "center",
                marginTop: 12,
                marginBottom: 10,
                backgroundColor: colors.light.primary,
            }}
        >
            {loading ? (
                <ActivityIndicator color="white" />
            ) : (
                <Text style={{ color: "white", fontWeight: "600" }}>
                    ✨ Generate with AI
                </Text>
            )}
        </TouchableOpacity>
    );
}