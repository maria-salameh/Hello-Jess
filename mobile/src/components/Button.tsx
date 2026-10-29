// Le bouton principal : dégradé violet comme sur le web, et un petit effet d'enfoncement quand on appuie dessus.
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import { ActivityIndicator, Animated, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { styles } from "../screens/styles";

type Props = { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle> };

export default function Button({ label, onPress, disabled, loading, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) => Animated.spring(scale, { toValue: to, friction: 6, tension: 220, useNativeDriver: true }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => press(0.97)}
      onPressOut={() => press(1)}
      disabled={disabled || loading}
      accessibilityRole="button"
    >
      <Animated.View style={[styles.gradientButton, (disabled || loading) && styles.buttonDisabled, { transform: [{ scale }] }, style]}>
        <LinearGradient
          colors={["#6c5ce7", "#a855f7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFill}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
