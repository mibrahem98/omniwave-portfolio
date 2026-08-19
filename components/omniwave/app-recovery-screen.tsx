import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { APP_ROUTES } from "@/lib/omniwave/navigation";

type AppRecoveryScreenProps = {
  /** Present only when Expo Router can retry a route-level render failure. */
  onRetry?: () => void;
  title?: string;
  description?: string;
};

/**
 * Dependency-light fallback for unmatched routes and route render errors.
 * It intentionally avoids theme and player contexts because either may be the
 * source of the failed render.
 */
export function AppRecoveryScreen({
  onRetry,
  title = "تعذر فتح هذه الشاشة",
  description = "يمكنك المحاولة مجددًا أو العودة إلى مساحتك الصوتية.",
}: AppRecoveryScreenProps) {
  return (
    <View style={styles.screen} accessibilityRole="alert" testID="app-recovery-screen">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>OMNIWAVE</Text>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {onRetry ? (
          <Pressable
            accessibilityLabel="إعادة المحاولة"
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryLabel}>إعادة المحاولة</Text>
          </Pressable>
        ) : null}
        <Link href={APP_ROUTES.home} asChild>
          <Pressable
            accessibilityLabel="العودة إلى الرئيسية"
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryLabel}>العودة إلى الرئيسية</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#06080E" },
  card: { width: "100%", maxWidth: 440, gap: 14, borderRadius: 24, padding: 24, backgroundColor: "#121722", borderWidth: 1, borderColor: "#273343" },
  eyebrow: { color: "#31E9C4", fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#F5FAF8", fontSize: 24, fontWeight: "700", textAlign: "right" },
  description: { color: "#C5D0CC", fontSize: 16, lineHeight: 24, textAlign: "right" },
  primaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "#31E9C4", marginTop: 8 },
  primaryLabel: { color: "#04130F", fontWeight: "700", fontSize: 16 },
  secondaryButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: "#61736B" },
  secondaryLabel: { color: "#F5FAF8", fontWeight: "600", fontSize: 16 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
