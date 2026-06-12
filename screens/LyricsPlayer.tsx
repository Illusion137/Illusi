import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import useNeighborLyricsPreload from "@hooks/useNeighborLyricsPreload";
import { useSyncedLineTracker } from "@hooks/useSyncedLineTracker";
import useTrackColors from "@hooks/useTrackColors";
import { ExampleObj } from "@illusive/example_objs";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { Track } from "@illusive/types";
import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, type TextStyle, TouchableOpacity, View, type LayoutChangeEvent } from "react-native";
import { GestureDetector, type NativeGesture } from "react-native-gesture-handler";
import TrackPlayer from "react-native-track-player";
import { UITextView } from "react-native-uitextview";
import { SharedRouter } from "@utils/shared_routes";
import { get_cached_synced_lyrics, load_synced_lyrics, with_intro_marker } from "@utils/synced_lyrics_cache";
import Animated, { Easing, Extrapolation, interpolate, interpolateColor, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from "react-native-reanimated";

interface LyricsSection {
	header: string | null;
	lines: string[];
}

function parse_sections(raw: string): LyricsSection[] {
	const sections: LyricsSection[] = [];
	let current: LyricsSection = { header: null, lines: [] };
	for (const line of raw.split("\n")) {
		if (/^\[.+?\]$/.test(line)) {
			if (current.lines.some((l) => l.trim())) sections.push(current);
			current = { header: line.slice(1, -1), lines: [] };
		} else {
			current.lines.push(line);
		}
	}
	if (current.lines.some((l) => l.trim())) sections.push(current);
	return sections;
}

const better_synced = true;
const LYRIC_ANIM_WINDOW = 3;
// Longest span the word-by-word reveal is spread across, so a long held line doesn't crawl.
const MAX_WORD_SWEEP_MS = 4000;
// Fallback per-word spacing when a line has no known duration.
const FALLBACK_WORD_MS = 90;
const screen_w = Dimensions.get("screen").width;
const LYRICS_PLAYER_HEIGHT = screen_w + 50;

// Rough syllable count — used to weight how long each word is given within its line.
function estimate_syllables(word: string): number {
	const w = word.toLowerCase().replace(/[^a-z]/g, "");
	if (w.length === 0) return 1;
	const groups = w.match(/[aeiouy]+/g);
	let count = groups ? groups.length : 1;
	if (w.length > 2 && w.endsWith("e")) count -= 1;
	return Math.max(1, count);
}

interface AnimatedWordProps {
	word: string;
	delay: number;
	active_shared: SharedValue<number>;
	color_active: string;
	color_inactive: string;
	glow_color: string;
	base_style: TextStyle;
}

const AnimatedWord = memo(function AnimatedWord({ word, delay, active_shared, color_active, color_inactive, glow_color, base_style }: AnimatedWordProps) {
	const progress = useSharedValue(0);

	useAnimatedReaction(
		() => active_shared.value,
		(active, prev) => {
			if (active === prev) return;
			if (active >= 1) {
				progress.value = withDelay(delay, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
			} else {
				progress.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
			}
		},
		[delay]
	);

	const animated_style = useAnimatedStyle(() => {
		const color = interpolateColor(progress.value, [0, 1], [color_inactive, color_active]);
		const shadow = interpolateColor(progress.value, [0, 1], ["rgba(0,0,0,0)", glow_color]);
		return { color, textShadowColor: shadow, textShadowRadius: interpolate(progress.value, [0, 1], [0, 20], Extrapolation.CLAMP) };
	});

	return <Animated.Text style={[base_style, glow_text_style, animated_style]}>{word}</Animated.Text>;
});

const glow_text_style: TextStyle = { textShadowOffset: { width: 0, height: 0 } };

const PlainLyricLine = memo(function PlainLyricLine({ text, color_inactive, base_style }: { text: string; color_inactive: string; base_style: TextStyle }) {
	return <Text style={[base_style, { color: color_inactive }]}>{text}</Text>;
});

interface AnimatedLyricLineProps {
	text: string;
	line_index: number;
	active_line_sv: SharedValue<number>;
	color_active: string;
	color_inactive: string;
	glow_color: string;
	base_style: TextStyle;
	lyric_duration_ms?: number;
}

export const AnimatedLyricLine = memo(function AnimatedLyricLine({ text, line_index, active_line_sv, color_active, color_inactive, glow_color, base_style, lyric_duration_ms }: AnimatedLyricLineProps) {
	const active_shared = useSharedValue(0);
	const scale = useSharedValue(0.96);

	useAnimatedReaction(
		() => active_line_sv.value === line_index,
		(is_active, was) => {
			if (is_active === was) return;
			active_shared.value = is_active ? 1 : 0;
			scale.value = withTiming(is_active ? 1 : 0.96, { duration: 280, easing: Easing.out(Easing.cubic) });
		},
		[line_index]
	);

	const tokens = useMemo(() => {
		const parts: { text: string; is_word: boolean; word_index: number }[] = [];
		const regex = /(\S+|\s+)/g;
		let m: RegExpExecArray | null;
		let word_idx = 0;
		while ((m = regex.exec(text)) !== null) {
			const is_word = !/^\s+$/.test(m[0]);
			parts.push({ text: m[0], is_word, word_index: is_word ? word_idx++ : -1 });
		}
		return parts;
	}, [text]);

	const word_delays = useMemo(() => {
		const words = tokens.filter((t) => t.is_word).map((t) => t.text);
		if (words.length === 0) return [] as number[];
		const has_duration = better_synced && !!lyric_duration_ms && lyric_duration_ms > 0;
		const span = has_duration ? Math.min(lyric_duration_ms, MAX_WORD_SWEEP_MS) : words.length * FALLBACK_WORD_MS;
		const weights = words.map(estimate_syllables);
		const total = weights.reduce((acc, w) => acc + w, 0) || words.length;
		const delays: number[] = [];
		let acc = 0;
		for (const weight of weights) {
			delays.push((acc / total) * span);
			acc += weight;
		}
		return delays;
	}, [tokens, lyric_duration_ms]);

	const wrapper_style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

	return (
		<Animated.View style={wrapper_style}>
			<Text style={base_style}>
				{tokens.map((tok, i) => {
					if (!tok.is_word) return <Text key={i}>{tok.text}</Text>;
					return <AnimatedWord key={i} word={tok.text} delay={word_delays[tok.word_index] ?? 0} active_shared={active_shared} color_active={color_active} color_inactive={color_inactive} glow_color={glow_color} base_style={base_style} />;
				})}
			</Text>
		</Animated.View>
	);
});

interface LyricsPlayerProps {
	visible: boolean;
	playing_track: Track;
	lyrics_uri: string | null;
	scroll_gesture: NativeGesture;
}

const LyricsPlayer = memo(function LyricsPlayer({ visible, playing_track, lyrics_uri, scroll_gesture }: LyricsPlayerProps) {
	const { colors } = usePTheme();
	const styles = useMemo(() => theme_styles(colors), [colors]);

	const [sections, set_sections] = useState<LyricsSection[]>([]);
	const [section_times, set_section_times] = useState<number[]>([]);
	const [current_section_idx, set_current_section_idx] = useState(0);
	const [content_active, set_content_active] = useState(false);
	const scrollview_ref = useRef<ScrollView>(null);
	const section_y_positions = useRef<number[]>([]);

	const [is_following, set_is_following] = useState(true);
	const is_following_ref = useRef(true);
	const line_y_positions = useRef<number[]>([]);
	const line_heights = useRef<number[]>([]);

	const section_times_ref = useRef<number[]>([]);
	const content_height_ref = useRef(0);
	const scrollview_height_ref = useRef(screen_w);
	const load_token_ref = useRef(0);

	// Keep ref in sync with prop so async loads / handlers always see the current track.
	const track_ref = useRef<Track>(playing_track);
	track_ref.current = playing_track;

	const { track_colors } = useTrackColors(playing_track);

	const color_active = colors.text;
	const color_inactive = colors.subtext;
	const glow_color = useMemo(() => {
		const base = track_colors?.primary ?? colors.primary;
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
	}, [track_colors?.primary, colors.primary]);

	function scroll_to_line_center(idx: number, animated: boolean) {
		const y = line_y_positions.current[idx];
		const h = line_heights.current[idx] ?? 0;
		if (y === undefined) return;
		let target = Math.max(0, y + h / 2 - scrollview_height_ref.current / 2);
		if (content_height_ref.current > 0) {
			target = Math.min(target, Math.max(0, content_height_ref.current - scrollview_height_ref.current));
		}
		scrollview_ref.current?.scrollTo({ y: target, animated });
	}

	const tracker = useSyncedLineTracker({
		enabled: visible,
		on_active_line: (idx, animated) => {
			if (is_following_ref.current) scroll_to_line_center(idx, animated);
		}
	});
	useNeighborLyricsPreload(playing_track);

	const overlay_opacity = useSharedValue(0);
	const slide_y = useSharedValue(LYRICS_PLAYER_HEIGHT);

	useEffect(() => {
		if (visible) {
			overlay_opacity.value = withTiming(1, { duration: 300 });
			slide_y.value = withDelay(150, withSpring(0, { damping: 32, stiffness: 140 }));
		} else {
			slide_y.value = withTiming(LYRICS_PLAYER_HEIGHT, { duration: 250, easing: Easing.in(Easing.ease) });
			overlay_opacity.value = withDelay(100, withTiming(0, { duration: 200 }));
		}
	}, [visible]);

	const overlay_opacity_style = useAnimatedStyle(() => ({ opacity: overlay_opacity.value }));
	const slide_style = useAnimatedStyle(() => ({ transform: [{ translateY: slide_y.value }] }));

	useEffect(() => {
		if (visible) {
			set_content_active(true);
			return;
		}
		const t = setTimeout(() => set_content_active(false), 320);
		return () => clearTimeout(t);
	}, [visible]);

	async function get_trackplayer_progress() {
		try {
			const info = await TrackPlayer.getProgress();
			if (!info.duration) return 0;
			return info.position / info.duration;
		} catch {
			return 0;
		}
	}

	async function load_lyrics(track_lyrics_uri: string) {
		const token = ++load_token_ref.current;
		const track = track_ref.current;

		// Try synced lyrics first (warm cache → instant; only await on a cold track).
		if (track && !is_empty(track.synced_lyrics_uri)) {
			let cached = get_cached_synced_lyrics(track);
			if (cached === undefined) cached = await load_synced_lyrics(track);
			if (token !== load_token_ref.current) return;
			if (cached !== null) {
				const synced = with_intro_marker(cached);
				let pos = 0;
				try {
					const progress = await TrackPlayer.getProgress();
					if (token !== load_token_ref.current) return;
					pos = progress.position;
				} catch {
					// TrackPlayer not yet initialized — fall back to start of track
				}
				line_y_positions.current = [];
				line_heights.current = [];
				section_times_ref.current = [];
				is_following_ref.current = true;
				scrollview_ref.current?.scrollTo({ y: 0, animated: false });
				set_sections([]);
				set_section_times([]);
				set_is_following(true);
				tracker.begin(synced, pos);
				return;
			}
		}

		const read_lyrics = await SQLTracks.read_track_lyrics({ ...ExampleObj.track_example0, lyrics_uri: track_lyrics_uri });
		if (token !== load_token_ref.current) return;

		if (read_lyrics === undefined || typeof read_lyrics === "object") {
			// Neither source worked. Clear so we don't show stale lyrics from the previous track.
			line_y_positions.current = [];
			line_heights.current = [];
			section_y_positions.current = [];
			section_times_ref.current = [];
			tracker.clear();
			set_sections([]);
			set_section_times([]);
			set_current_section_idx(0);
			scrollview_ref.current?.scrollTo({ y: 0, animated: false });
			return;
		}

		const parsed = parse_sections(read_lyrics);
		line_y_positions.current = [];
		line_heights.current = [];
		section_y_positions.current = [];
		section_times_ref.current = [];
		scrollview_ref.current?.scrollTo({ y: 0, animated: false });

		tracker.clear();
		set_sections(parsed);
		set_section_times([]);
		set_current_section_idx(0);
	}

	useEffect(() => {
		if (!content_active) return;
		if (lyrics_uri) {
			load_lyrics(lyrics_uri);
		} else {
			load_token_ref.current++;
			tracker.clear();
			set_sections([]);
			section_times_ref.current = [];
			set_section_times([]);
			line_y_positions.current = [];
			line_heights.current = [];
			scrollview_ref.current?.scrollTo({ y: 0, animated: false });
		}
	}, [lyrics_uri, content_active]);

	useEffect(() => {
		if (content_active) return;
		load_token_ref.current++;
		tracker.clear();
		set_sections([]);
		section_times_ref.current = [];
		set_section_times([]);
		line_y_positions.current = [];
		line_heights.current = [];
	}, [content_active]);

	useEffect(() => {
		if (tracker.synced_lyrics === null) return;
		const t = setTimeout(() => {
			if (tracker.pending_initial_ref.current) {
				tracker.pending_initial_ref.current = false;
				scroll_to_line_center(tracker.current_line_idx_ref.current, false);
			}
		}, 200);
		return () => clearTimeout(t);
	}, [tracker.synced_lyrics]);

	// Initial scroll for plain lyrics once layout is measured
	useEffect(() => {
		(async () => {
			if (tracker.synced_lyrics === null && is_empty(track_ref.current?.media_uri) && content_height_ref.current > 0 && scrollview_height_ref.current > 0) {
				const max_scrollable = content_height_ref.current - scrollview_height_ref.current;
				const ratio = await get_trackplayer_progress();
				scrollview_ref.current?.scrollTo({ y: max_scrollable * ratio, animated: true });
			}
		})();
	}, [sections]);

	function snap_to_current() {
		is_following_ref.current = true;
		set_is_following(true);
		scroll_to_line_center(tracker.current_line_idx_ref.current, true);
	}

	if (!content_active) return null;

	return (
		<Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height: LYRICS_PLAYER_HEIGHT, zIndex: 20, overflow: "hidden" }, overlay_opacity_style]} pointerEvents={visible ? "auto" : "none"}>
			<Animated.View style={[StyleSheet.absoluteFill, slide_style]}>
				{lyrics_uri ? (
					<TouchableOpacity style={{ position: "absolute", top: 8, right: 12, zIndex: 2 }} onPress={() => SharedRouter.goto_shared_player_lyrics_edit(lyrics_uri)}>
						<Ionicons name="pencil-outline" size={18} color={track_colors?.background ?? colors.primary} />
					</TouchableOpacity>
				) : null}
				<MaskedView style={{ flex: 1 }} maskElement={<LinearGradient colors={["transparent", "black", "black", "transparent"]} locations={[0, 0.18, 0.82, 1]} style={{ flex: 1 }} />}>
					<GestureDetector gesture={scroll_gesture}>
						<ScrollView
							ref={scrollview_ref}
							onLayout={(e: LayoutChangeEvent) => {
								const h = e.nativeEvent.layout.height;
								if (h > 0) scrollview_height_ref.current = h;
							}}
							onContentSizeChange={(_, h) => {
								content_height_ref.current = h;
							}}
							onScrollBeginDrag={() => {
								if (tracker.synced_lyrics !== null) {
									is_following_ref.current = false;
									set_is_following(false);
								}
							}}
							style={{ flex: 1 }}>
							{tracker.synced_lyrics !== null ? (
								<>
									<View style={{ height: screen_w / 2 }} />
									{tracker.synced_lyrics.map((lyric, i) => {
										const next_from = tracker.synced_lyrics![i + 1]?.interval.from;
										const lyric_duration_ms = next_from !== undefined ? (next_from - lyric.interval.from) * 1000 : 3000;
										const animated = Math.abs(i - tracker.window_center) <= LYRIC_ANIM_WINDOW;
										return (
											<Pressable
												key={`${playing_track.uid}-${i}`}
												onLayout={(e) => {
													line_y_positions.current[i] = e.nativeEvent.layout.y;
													line_heights.current[i] = e.nativeEvent.layout.height;
													if (tracker.pending_initial_ref.current && i === tracker.current_line_idx_ref.current) {
														tracker.pending_initial_ref.current = false;
														scroll_to_line_center(i, false);
													}
												}}
												onPress={() => {
													is_following_ref.current = true;
													set_is_following(true);
													// Resync only after the seek commits so getProgress() returns the new position.
													TrackPlayer.seekTo(lyric.interval.from).then(() => tracker.resync());
												}}
												style={styles.synced_line_wrapper}>
												{animated ? (
													<AnimatedLyricLine
														text={lyric.text}
														line_index={i}
														active_line_sv={tracker.active_line_sv}
														color_active={color_active}
														color_inactive={color_inactive}
														glow_color={glow_color}
														base_style={styles.lyrics_text}
														lyric_duration_ms={lyric_duration_ms}
													/>
												) : (
													<PlainLyricLine text={lyric.text} color_inactive={color_inactive} base_style={styles.lyrics_text} />
												)}
											</Pressable>
										);
									})}
									<View style={{ height: screen_w / 2 }} />
								</>
							) : sections.length === 0 ? (
								<View style={{ height: LYRICS_PLAYER_HEIGHT * 0.6, alignItems: "center", justifyContent: "center" }}>
									<Text style={{ color: colors.subtext, fontSize: 14 }}>No lyrics available</Text>
								</View>
							) : (
								sections.map((section, i) => {
									const is_active = section_times.length === 0 || i === current_section_idx;
									return (
										<View
											key={i}
											onLayout={(e) => {
												section_y_positions.current[i] = e.nativeEvent.layout.y;
											}}>
											{section.header ? <Text style={[styles.section_header, { color: is_active ? colors.primary : colors.subtext }]}>{section.header}</Text> : null}
											<UITextView uiTextView={true} selectable={true} selectionColor={colors.primary} style={{ marginHorizontal: 20 }}>
												{section.lines.map((line, j) => (
													<UITextView uiTextView={true} selectable={true} selectionColor={colors.primary} key={j} style={[styles.lyrics_text, { color: is_active ? colors.text : colors.subtext }]}>
														{line + "\n"}
														<UITextView style={{ fontSize: 7 }}>{"\n"}</UITextView>
													</UITextView>
												))}
											</UITextView>
										</View>
									);
								})
							)}
						</ScrollView>
					</GestureDetector>
				</MaskedView>
				{tracker.synced_lyrics !== null && !is_following ? (
					<Pressable style={[styles.sync_button, { backgroundColor: track_colors?.secondary ?? colors.shelf }]} onPress={snap_to_current}>
						<Ionicons name="sync-outline" size={11} color={track_colors?.background ?? colors.primary} />
						<Text style={[styles.sync_button_text, { color: track_colors?.background ?? colors.primary }]}>Sync</Text>
					</Pressable>
				) : null}
			</Animated.View>
		</Animated.View>
	);
});

export default LyricsPlayer;

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		lyrics_text: { color: colors.text, fontWeight: "bold", fontSize: 22, marginHorizontal: 15, marginVertical: 5 },
		synced_line_wrapper: { paddingVertical: 4 },
		section_header: { color: colors.primary, fontWeight: "800", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2, marginHorizontal: 15 },
		sync_button: { position: "absolute", bottom: 14, right: 12, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, zIndex: 2 },
		sync_button_text: { fontWeight: "700", fontSize: 11 }
	});
