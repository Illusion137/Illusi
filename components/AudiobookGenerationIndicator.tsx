import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { AudiobookGeneration } from "@illusive/audiobook_generation";
import usePTheme from "@hooks/usePTheme";

// Synthesis dominates a chapter's wall time; the trailing .aac encode is the
// short tail. Weighting the two phases keeps the bar moving through both
// instead of parking at 100% while ffmpeg encodes.
const SYNTH_WEIGHT = 0.85;

export function chapter_frac(state: AudiobookGeneration.GenState): number {
	if (state.encode_progress !== null) return SYNTH_WEIGHT + (1 - SYNTH_WEIGHT) * state.encode_progress;
	const synth = state.chapter_total > 0 ? state.chapter_done / state.chapter_total : 0;
	return SYNTH_WEIGHT * synth;
}

function gen_percent(state: AudiobookGeneration.GenState): number {
	if (state.total <= 0) return 0;
	return Math.min(1, Math.max(0, (state.current + chapter_frac(state)) / state.total));
}

// Persistent floating chip that surfaces whenever an audiobook is being
// generated. Stays mounted at the root layout so it survives across screen
// changes — generation itself runs independently of the details screen that
// started it (see audiobook_generation.ts), so without this the user would
// have no way to check progress after navigating away. Tapping it deep-links
// back into that audiobook's details screen.
export default function AudiobookGenerationIndicator() {
	const { colors } = usePTheme();
	const [states, set_states] = useState<AudiobookGeneration.GenState[]>(() => AudiobookGeneration.get_states());

	useEffect(() => {
		const sync = () => set_states(AudiobookGeneration.get_states());
		return AudiobookGeneration.subscribe(sync);
	}, []);

	if (states.length === 0) return null;

	const state = states[0];
	const percent = gen_percent(state);
	const extra = states.length - 1;

	return (
		<View pointerEvents="box-none" style={styles.wrapper}>
			<TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/audiobooks/details/${state.uuid}`)} style={[styles.chip, { backgroundColor: colors.shelf + "C0", borderColor: colors.primary + "55" }]}>
				<Ionicons name="mic" size={16} color={colors.primary} />
				<View style={styles.meta}>
					<Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
						{state.title || "Generating audiobook"}
						{extra > 0 ? ` +${extra}` : ""}
					</Text>
					<Text style={[styles.sub, { color: colors.subtext }]} numberOfLines={1}>
						Chapter {state.current + 1} of {state.total} · {state.encode_progress !== null ? `Encoding ${Math.round(state.encode_progress * 100)}%` : `${Math.round(percent * 100)}%`}
					</Text>
					<View style={[styles.track, { backgroundColor: colors.line }]}>
						<View style={[styles.fill, { width: `${percent * 100}%`, backgroundColor: colors.primary }]} />
					</View>
				</View>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: { position: "absolute", top: 104, right: 10, zIndex: 999, opacity: 0.78 },
	chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, maxWidth: 220 },
	meta: { marginLeft: 6, flexShrink: 1 },
	label: { fontSize: 11, fontWeight: "700" },
	sub: { fontSize: 9, fontWeight: "500", marginTop: 1 },
	track: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 3, width: 140 },
	fill: { height: "100%", borderRadius: 2 }
});
