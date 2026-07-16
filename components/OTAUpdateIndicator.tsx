import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import { set_ota_download_listener, type OTADownloadState } from "@utils/ota_update";

// Floating chip shown while an OTA bundle is downloading. The git clone/pull
// can freeze the JS thread, so this goes up (and paints) before the download
// starts — without it the app just hangs with no explanation. Mounted at the
// root layout; driven by set_ota_download_listener from utils/ota_update.
export default function OTAUpdateIndicator() {
	const { colors } = usePTheme();
	const [state, set_state] = useState<OTADownloadState>({ active: false, bundle_id: null, received: 0, total: 0 });

	useEffect(() => {
		set_ota_download_listener(set_state);
		return () => set_ota_download_listener(null);
	}, []);

	if (!state.active) return null;

	// onProgress rarely fires in RN (see the pull-detection NOTE in
	// utils/ota_update.ts), so percent is a bonus — the indeterminate spinner
	// is the common case.
	const pct = state.total > 0 ? Math.min(100, Math.round((state.received / state.total) * 100)) : null;
	const label = state.bundle_id !== null ? `Downloading update ${state.bundle_id}` : "Downloading update";
	const sub = pct !== null ? `${pct}%` : "The app may pause for a moment…";

	return (
		<View pointerEvents="none" style={styles.wrapper}>
			<View style={[styles.chip, { backgroundColor: colors.shelf + "E0", borderColor: colors.primary + "55" }]}>
				<ActivityIndicator size="small" color={colors.primary} />
				<Ionicons name="cloud-download-outline" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
				<View style={{ marginLeft: 6, flexShrink: 1 }}>
					<Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
						{label}
					</Text>
					<Text style={[styles.sub, { color: colors.subtext }]} numberOfLines={1}>
						{sub}
					</Text>
				</View>
			</View>
			{pct !== null ? (
				<View style={[styles.bar_track, { backgroundColor: colors.primary + "30" }]}>
					<View style={[styles.bar_fill, { backgroundColor: colors.primary, width: `${pct}%` }]} />
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: { position: "absolute", top: 52, alignSelf: "center", zIndex: 999, maxWidth: 280 },
	chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
	bar_track: { height: 3, borderRadius: 2, marginTop: 4, marginHorizontal: 12, overflow: "hidden" },
	bar_fill: { height: "100%", borderRadius: 2 },
	label: { fontSize: 11, fontWeight: "700" },
	sub: { fontSize: 9, fontWeight: "500", marginTop: 1 }
});
