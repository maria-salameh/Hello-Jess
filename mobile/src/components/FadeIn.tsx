// Animations d'apparition : le contenu glisse doucement vers le haut en devenant visible, comme sur le web.
import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

function useFadeIn(delay: number) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, delay]);
  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };
}

// Un bloc qui apparaît en glissant ; "delay" décale l'apparition (en millisecondes).
export default function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  return <Animated.View style={[style, useFadeIn(delay)]}>{children}</Animated.View>;
}

// Pour une FlatList (CellRendererComponent) : chaque ligne apparaît un peu après la précédente.
export function FadeInCell({ index, style, children, onLayout }: ViewProps & { index: number; cellKey?: string; item?: unknown }) {
  return (
    <Animated.View onLayout={onLayout} style={[style, useFadeIn(Math.min(index, 8) * 45)]}>
      {children}
    </Animated.View>
  );
}
