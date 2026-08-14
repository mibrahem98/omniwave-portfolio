import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";

const STEP_ICONS = ["library-music", "ios-share", "dark-mode"] as const;
const STEP_TITLES = ["onboardingLibraryTitle", "onboardingExportTitle", "onboardingAppearanceTitle"] as const;
const STEP_DETAILS = ["onboardingLibraryDetail", "onboardingExportDetail", "onboardingAppearanceDetail"] as const;

export function OnboardingCoach() {
  const { completeOnboarding, isRTL, onboardingSeen, preferencesReady, skipOnboarding, t, theme } = useThemeContext();
  const [step, setStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const direction = isRTL ? "row-reverse" : "row";
  const isLast = step === STEP_TITLES.length - 1;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) { contentOpacity.setValue(1); translateX.setValue(0); return; }
    contentOpacity.setValue(0);
    translateX.setValue(isRTL ? -14 : 14);
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [contentOpacity, isRTL, reduceMotion, step, translateX]);

  if (!preferencesReady || onboardingSeen) return null;

  const advance = () => {
    if (isLast) completeOnboarding();
    else setStep((current) => current + 1);
  };

  return (
    <View accessibilityViewIsModal style={styles.layer}>
      <View style={styles.scrim} />
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}> 
        <View style={[styles.topline, { flexDirection: direction }]}>
          <Text style={[styles.progress, { color: theme.colors.primary }]}>{`${step + 1} / ${STEP_TITLES.length}`}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("onboardingSkip")} onPress={skipOnboarding} hitSlop={8} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
            <Text style={[styles.skipText, { color: theme.colors.muted }]}>{t("onboardingSkip")}</Text>
          </Pressable>
        </View>
        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateX }] }}>
          <View style={[styles.icon, { backgroundColor: `${theme.colors.primary}1C` }]}>
            <MaterialIcons name={STEP_ICONS[step]} size={28} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text, textAlign: isRTL ? "right" : "left" }]}>{t(STEP_TITLES[step])}</Text>
          <Text style={[styles.detail, { color: theme.colors.muted, textAlign: isRTL ? "right" : "left" }]}>{t(STEP_DETAILS[step])}</Text>
          <View style={[styles.dots, { flexDirection: direction }]}>{STEP_TITLES.map((_, index) => <View key={index} style={[styles.dot, { backgroundColor: index === step ? theme.colors.primary : theme.colors.border }]} />)}</View>
        </Animated.View>
        <Pressable accessibilityRole="button" accessibilityLabel={isLast ? t("onboardingDone") : t("onboardingNext")} onPress={advance} style={({ pressed }) => [styles.next, { backgroundColor: theme.colors.primary, flexDirection: direction }, pressed && styles.pressed]}>
          <Text style={[styles.nextText, { color: theme.colors.onPrimary }]}>{isLast ? t("onboardingDone") : t("onboardingNext")}</Text>
          <MaterialIcons name={isLast ? "check" : (isRTL ? "arrow-back" : "arrow-forward")} size={18} color={theme.colors.onPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 50, alignItems: "center", justifyContent: "center", padding: 24 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(1, 4, 9, 0.68)" },
  card: { width: "100%", maxWidth: 420, padding: 22, borderRadius: 28, borderWidth: 1, overflow: "hidden" },
  topline: { alignItems: "center", justifyContent: "space-between" }, progress: { fontSize: 12, lineHeight: 17, fontWeight: "900" }, skip: { minHeight: 28, justifyContent: "center", paddingHorizontal: 4 }, skipText: { fontSize: 12, lineHeight: 17, fontWeight: "800" }, icon: { width: 60, height: 60, borderRadius: 21, alignItems: "center", justifyContent: "center", marginTop: 20 }, title: { fontSize: 22, lineHeight: 29, fontWeight: "900", marginTop: 18 }, detail: { fontSize: 14, lineHeight: 21, fontWeight: "600", marginTop: 7 }, dots: { gap: 6, marginTop: 22 }, dot: { width: 22, height: 4, borderRadius: 2 }, next: { minHeight: 48, marginTop: 22, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 7 }, nextText: { fontSize: 14, lineHeight: 19, fontWeight: "900" }, pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
