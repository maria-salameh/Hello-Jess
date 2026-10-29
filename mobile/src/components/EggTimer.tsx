// Le minuteur d'œuf flottant en bas à droite : on choisit la cuisson, il décompte, l'œuf se remplit de jaune
// au fil du temps, puis il remue et le téléphone vibre quand l'œuf est prêt.
import { useEffect, useId, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg";

export const PRESETS = [
  { id: "soft", label: "Soft", detail: "Runny yolk", minutes: 6 },
  { id: "medium", label: "Medium", detail: "Jammy yolk", minutes: 8 },
  { id: "hard", label: "Hard", detail: "Firm yolk", minutes: 10 },
] as const;

type Preset = (typeof PRESETS)[number];

// "endAt" est l'instant où l'œuf est prêt pendant le décompte, et null en pause (alors "left" garde le temps restant).
type Run = { preset: Preset; endAt: number | null; left: number };

const EGG_PATH = "M50 4 C75 4 94 52 94 82 C94 108 74 126 50 126 C26 126 6 108 6 82 C6 52 25 4 50 4 Z";

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export default function EggTimer() {
  const insets = useSafeAreaInsets();
  const clipId = useId();
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const left = run ? (run.endAt !== null ? Math.max(0, run.endAt - now) : run.left) : 0;
  const done = run !== null && left === 0;
  const ticking = run !== null && run.endAt !== null && !done;
  const progress = run ? 1 - left / (run.preset.minutes * 60_000) : 0;

  // Redessine quatre fois par seconde pendant le décompte ; l'heure de fin est absolue, donc le minuteur reste juste
  // même si l'application passe un moment en arrière-plan.
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [ticking]);

  useEffect(() => {
    if (done) Vibration.vibrate([0, 400, 200, 400, 200, 400]);
  }, [done]);

  // L'œuf flotte doucement, remue pendant la cuisson et sonne quand il est prêt.
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    motion.setValue(0);
    const duration = done ? 350 : ticking ? 500 : 1600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(motion, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ticking, done, motion]);

  const angle = done ? 14 : ticking ? 4 : 0;
  const eggStyle = {
    transform: [
      { translateY: motion.interpolate({ inputRange: [0, 1], outputRange: [0, done || ticking ? 0 : -4] }) },
      { rotate: motion.interpolate({ inputRange: [0, 1], outputRange: [`${-angle}deg`, `${angle}deg`] }) },
    ],
  };

  // Le panneau apparaît en grandissant depuis l'œuf.
  const panel = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) Animated.spring(panel, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
    else panel.setValue(0);
  }, [open, panel]);

  function start(preset: Preset) {
    const t = Date.now();
    setNow(t);
    setRun({ preset, endAt: t + preset.minutes * 60_000, left: preset.minutes * 60_000 });
  }

  function togglePause() {
    if (!run) return;
    const t = Date.now();
    setNow(t);
    setRun(run.endAt !== null ? { ...run, endAt: null, left } : { ...run, endAt: t + run.left });
  }

  return (
    <View pointerEvents="box-none" style={[s.wrap, { right: 16 + insets.right, bottom: 16 + Math.max(insets.bottom, 8) }]}>
      {open && (
        <Animated.View
          style={[
            s.panel,
            { opacity: panel, transform: [{ scale: panel.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
          ]}
        >
          <Text style={s.heading}>Egg timer</Text>
          {run && (
            <View style={[s.status, done && s.statusDone]} accessibilityLiveRegion="polite">
              <Text style={[s.statusKind, done && s.statusKindDone]}>{done ? "Your egg is ready!" : `${run.preset.label} egg`}</Text>
              <Text style={s.statusTime}>{formatClock(left)}</Text>
              <View style={s.statusActions}>
                {!done && (
                  <Pressable style={s.smallBtn} onPress={togglePause}>
                    <Text style={s.smallBtnText}>{run.endAt !== null ? "Pause" : "Resume"}</Text>
                  </Pressable>
                )}
                <Pressable style={s.smallBtn} onPress={() => setRun(null)}>
                  <Text style={s.smallBtnText}>{done ? "Dismiss" : "Reset"}</Text>
                </Pressable>
              </View>
            </View>
          )}
          {PRESETS.map((preset) => (
            <Pressable key={preset.id} style={[s.preset, run?.preset.id === preset.id && s.presetActive]} onPress={() => start(preset)}>
              <View style={{ flex: 1 }}>
                <Text style={s.presetName}>{preset.label}</Text>
                <Text style={s.presetDetail}>{preset.detail}</Text>
              </View>
              <Text style={s.presetTime}>{preset.minutes} min</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}

      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={run ? `Egg timer, ${formatClock(left)} left` : "Egg timer"}
        hitSlop={8}
      >
        <Animated.View style={[s.egg, eggStyle]}>
          <Svg width={74} height={96} viewBox="0 0 100 130">
            <Defs>
              <ClipPath id={clipId}>
                <Path d={EGG_PATH} />
              </ClipPath>
            </Defs>
            <Path d={EGG_PATH} fill="#fff7e8" />
            <G clipPath={`url(#${clipId})`}>
              <Rect x={0} y={130 * (1 - progress)} width={100} height={130} fill="#ffb627" />
            </G>
            <Path d={EGG_PATH} fill="none" stroke="#e3c79a" strokeWidth={3} />
            <Path d="M28 40 C32 28 40 20 48 16" fill="none" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
          </Svg>
          <Text style={[s.eggLabel, ticking && s.eggLabelBig]}>{run ? formatClock(left) : "Egg\ntimer"}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: "absolute", alignItems: "flex-end", gap: 12 },
  egg: {
    width: 74,
    height: 96,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  eggLabel: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 36,
    bottom: 0,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "800",
    color: "#5b3a12",
  },
  eggLabelBig: { fontSize: 15 },
  panel: {
    width: 250,
    maxWidth: "100%",
    padding: 16,
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2e2b3d",
    backgroundColor: "#1c1a27",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  heading: { color: "#f2f0ff", fontSize: 16, fontWeight: "700", marginBottom: 4 },
  status: { padding: 12, gap: 6, borderRadius: 14, backgroundColor: "rgba(255,182,39,0.16)", marginBottom: 4 },
  statusDone: { backgroundColor: "rgba(76,175,130,0.2)" },
  statusKind: { color: "#a09db8", fontSize: 13 },
  statusKindDone: { color: "#4caf82", fontWeight: "700" },
  statusTime: { color: "#f2f0ff", fontSize: 28, fontWeight: "700", fontVariant: ["tabular-nums"] },
  statusActions: { flexDirection: "row", gap: 8 },
  smallBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#2e2b3d" },
  smallBtnText: { color: "#f2f0ff", fontSize: 13, fontWeight: "600" },
  preset: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2e2b3d",
    backgroundColor: "#12111a",
  },
  presetActive: { borderColor: "#ffb627", backgroundColor: "rgba(255,182,39,0.16)" },
  presetName: { color: "#f2f0ff", fontSize: 15, fontWeight: "700" },
  presetDetail: { color: "#a09db8", fontSize: 12 },
  presetTime: { color: "#ffb627", fontSize: 15, fontWeight: "800" },
});
