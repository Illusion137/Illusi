import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import useNeighborLyricsPreload from "@hooks/useNeighborLyricsPreload";
import { useSyncedLineTracker } from "@hooks/useSyncedLineTracker";
import useTrackColors from "@hooks/useTrackColors";
import type { Track } from "@illusive/types";
import { AnimatedLyricLine } from "@screens/LyricsPlayer";
import { get_cached_synced_lyrics, load_synced_lyrics, with_intro_marker } from "@utils/synced_lyrics_cache";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent, type TextStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import TrackPlayer from "react-native-track-player";

interface ExternalSyncedLyricsProps {
	track: Track | undefined;
	width: number;
	height: number;
}

// Only the lines near the active one run the per-word glow animation; the rest are
// plain Text so the external surface isn't bogged down by dozens of animated worklets.
const ANIMATED_WINDOW = 5;

function glow_from_color(base: string): string {
	if (base.startsWith("#")) {
		const hex = base.replace("#", "");
		const full =
			hex.length === 3
				? hex
						.split("")
						.map((c) => c + c)
						.join("")
				: hex;
		const r = parseInt(full.slice(0, 2), 16);
		const g = parseInt(full.slice(2, 4), 16);
		const b = parseInt(full.slice(4, 6), 16);
		return `rgba(${r},${g},${b},0.75)`;
	}
	return "rgba(255,255,255,0.75)";
}

export default function ExternalSyncedLyrics({ track, width, height }: ExternalSyncedLyricsProps) {
	const { colors } = usePTheme();
	const { track_colors } = useTrackColors(track);

	const line_y_positions = useRef<number[]>([]);
	const line_heights = useRef<number[]>([]);
	const load_token_ref = useRef(0);

	// Drive the lyric column on the UI thread instead of an imperative ScrollView.scrollTo,
	// which is unreliable on the reparented external-window surface.
	const translate_y = useSharedValue(0);
	const teleprompter_style = useAnimatedStyle(() => ({ transform: [{ translateY: translate_y.value }] }));

	function center_line(idx: number, animated: boolean) {
		const y = line_y_positions.current[idx];
		const h = line_heights.current[idx] ?? 0;
		if (y === undefined) return;
		const target = height / 2 - (y + h / 2);
		if (animated) translate_y.value = withTiming(target, { duration: 320, easing: Easing.out(Easing.cubic) });
		else translate_y.value = target;
	}

	const tracker = useSyncedLineTracker({ enabled: true, on_active_line: (idx, animated) => center_line(idx, animated) });
	useNeighborLyricsPreload(track);

	const glow_color = useMemo(() => glow_from_color(track_colors?.primary ?? colors.primary), [track_colors?.primary, colors.primary]);
	const lyrics_text_style = useMemo<TextStyle>(() => ({ color: colors.text, fontWeight: "bold", fontSize: Math.max(22, height * 0.038), marginHorizontal: 24, marginVertical: 8 }), [colors.text, height]);

	async function load(load_track: Track) {
		const token = ++load_token_ref.current;
		// Use the warm cache for an instant switch; only await when it's a cold track.
		let lyrics = get_cached_synced_lyrics(load_track);
		if (lyrics === undefined) lyrics = await load_synced_lyrics(load_track);
		if (token !== load_token_ref.current) return;
		if (lyrics === null) {
			tracker.clear();
			return;
		}
		const synced = with_intro_marker(lyrics);
		let position = 0;
		try {
			position = (await TrackPlayer.getProgress()).position;
		} catch {
			// TrackPlayer not ready — start from the top.
		}
		if (token !== load_token_ref.current) return;
		line_y_positions.current = [];
		line_heights.current = [];
		tracker.begin(synced, position);
	}

	useEffect(() => {
		if (track && !is_empty(track.synced_lyrics_uri)) {
			load(track);
		} else {
			load_token_ref.current++;
			tracker.clear();
		}
	}, [track?.uid, track?.synced_lyrics_uri]);

	// Fallback in case onLayout doesn't fire (matching line dimensions across tracks).
	useEffect(() => {
		if (tracker.synced_lyrics === null) return;
		const t = setTimeout(() => {
			if (tracker.pending_initial_ref.current) {
				tracker.pending_initial_ref.current = false;
				center_line(tracker.current_line_idx_ref.current, false);
			}
		}, 200);
		return () => clearTimeout(t);
	}, [tracker.synced_lyrics]);

	if (tracker.synced_lyrics === null) return null;

	return (
		<MaskedView style={{ width, height }} maskElement={<LinearGradient colors={["transparent", "black", "black", "transparent"]} locations={[0, 0.18, 0.82, 1]} style={{ flex: 1 }} />}>
			<View style={{ width, height, overflow: "hidden" }}>
				<Animated.View style={[{ position: "absolute", top: 0, left: 0, width }, teleprompter_style]}>
					<View style={{ height: height / 2 }} />
					{tracker.synced_lyrics.map((lyric, i) => {
						const near = Math.abs(i - tracker.current_line_idx) <= ANIMATED_WINDOW;
						const next_from = tracker.synced_lyrics![i + 1]?.interval.from;
						const lyric_duration_ms = next_from !== undefined ? (next_from - lyric.interval.from) * 1000 : 3000;
						return (
							<View
								key={i}
								style={styles.line_wrapper}
								onLayout={(e: LayoutChangeEvent) => {
									line_y_positions.current[i] = e.nativeEvent.layout.y;
									line_heights.current[i] = e.nativeEvent.layout.height;
									if (tracker.pending_initial_ref.current && i === tracker.current_line_idx_ref.current) {
										tracker.pending_initial_ref.current = false;
										center_line(i, false);
									}
								}}>
								{near ? (
									<AnimatedLyricLine
										text={lyric.text}
										is_active={i === tracker.current_line_idx}
										color_active={colors.text}
										color_inactive={colors.subtext}
										glow_color={glow_color}
										base_style={lyrics_text_style}
										lyric_duration_ms={lyric_duration_ms}
									/>
								) : (
									<Text style={[lyrics_text_style, { color: colors.subtext }]}>{lyric.text}</Text>
								)}
							</View>
						);
					})}
					<View style={{ height: height / 2 }} />
				</Animated.View>
			</View>
		</MaskedView>
	);
}

const styles = StyleSheet.create({
	line_wrapper: { paddingVertical: 6 }
});
