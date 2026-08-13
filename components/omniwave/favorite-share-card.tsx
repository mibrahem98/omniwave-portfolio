import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CoverArt } from "@/components/omniwave/cover-art";
import type { AppThemeColors } from "@/lib/theme-provider";
import type { FavoriteCardColor, FavoriteCardStyle, Track } from "@/lib/omniwave/types";

export type { FavoriteCardColor, FavoriteCardStyle } from "@/lib/omniwave/types";

const ACCENTS: Record<FavoriteCardColor, { primary: string; glow: string }> = {
  teal: { primary: "#16C7A1", glow: "#5EF2D0" },
  violet: { primary: "#8B5CF6", glow: "#C4B5FD" },
  rose: { primary: "#F05A87", glow: "#FDA4C0" },
};

export const FavoriteShareCard = forwardRef<View, { tracks: Track[]; colors: AppThemeColors; variant?: FavoriteCardStyle; accent?: FavoriteCardColor }>(({ tracks, colors, variant = "glass", accent = "teal" }, ref) => {
  const featured = tracks[0];
  const accentColor = ACCENTS[accent];
  const editorial = variant === "editorial";
  const minimal = variant === "minimal";
  const backgroundColor = editorial ? accentColor.primary : minimal ? colors.surfaceMuted : colors.surface;
  const primary = editorial ? colors.onPrimary : accentColor.primary;
  const text = editorial ? colors.onPrimary : colors.text;
  const muted = editorial ? "#FFFFFFB8" : colors.muted;
  const border = editorial ? "#FFFFFF42" : `${accentColor.primary}66`;
  const secondary = editorial ? "#FFFFFFD9" : colors.secondary;
  return <View ref={ref} collapsable={false} style={[styles.card, minimal && styles.minimalCard, { backgroundColor, borderColor: border }]}>{!minimal ? <View style={[styles.glow, { backgroundColor: editorial ? "#FFFFFF2B" : accentColor.glow }]} /> : null}<View style={styles.top}><View style={[styles.brandMark, { backgroundColor: primary }]}><Text style={[styles.brandGlyph, { color: editorial ? accentColor.primary : colors.onPrimary }]}>O</Text></View><Text style={[styles.brand, { color: muted }]}>OMNIWAVE FAVORITES</Text></View>{featured ? <View style={styles.featured}><CoverArt track={featured} size={84} /><View style={styles.featuredCopy}><Text numberOfLines={2} style={[styles.featuredTitle, { color: text }]}>{featured.title}</Text><Text numberOfLines={1} style={[styles.featuredMeta, { color: muted }]}>{featured.artist}</Text><Text numberOfLines={1} style={[styles.featuredMeta, { color: secondary }]}>{featured.album}</Text></View></View> : <Text style={[styles.empty, { color: muted }]}>No favorites yet</Text>}<View style={[styles.divider, { backgroundColor: editorial ? "#FFFFFF40" : colors.border }]} />{tracks.slice(1, 4).map((track, index) => <View key={track.id} style={styles.row}><Text style={[styles.rowIndex, { color: primary }]}>{String(index + 2).padStart(2, "0")}</Text><Text numberOfLines={1} style={[styles.rowText, { color: text }]}>{track.title} <Text style={{ color: muted }}>· {track.artist}</Text></Text></View>)}<Text style={[styles.footer, { color: muted }]}>Shared locally from OmniWave</Text></View>;
});

FavoriteShareCard.displayName = "FavoriteShareCard";

const styles = StyleSheet.create({ card: { width: 330, minHeight: 238, borderRadius: 28, borderWidth: 1, overflow: "hidden", padding: 18 }, minimalCard: { borderRadius: 18 }, glow: { position: "absolute", width: 220, height: 220, borderRadius: 110, top: -120, right: -55, opacity: 0.8 }, top: { flexDirection: "row", alignItems: "center", gap: 8 }, brandMark: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" }, brandGlyph: { fontSize: 15, lineHeight: 18, fontWeight: "900" }, brand: { fontSize: 9, lineHeight: 14, fontWeight: "900", letterSpacing: 1.5 }, featured: { flexDirection: "row", gap: 13, marginTop: 17, alignItems: "center" }, featuredCopy: { flex: 1, minWidth: 0 }, featuredTitle: { fontSize: 18, lineHeight: 24, fontWeight: "900" }, featuredMeta: { fontSize: 11, lineHeight: 16, marginTop: 2, fontWeight: "700" }, divider: { height: StyleSheet.hairlineWidth, marginVertical: 15 }, row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 22 }, rowIndex: { width: 23, fontSize: 10, lineHeight: 15, fontWeight: "900" }, rowText: { flex: 1, minWidth: 0, fontSize: 11, lineHeight: 16, fontWeight: "800" }, footer: { marginTop: 12, fontSize: 9, lineHeight: 13, fontWeight: "800", letterSpacing: 0.25 }, empty: { fontSize: 13, lineHeight: 19, marginTop: 24, minHeight: 84 } });
