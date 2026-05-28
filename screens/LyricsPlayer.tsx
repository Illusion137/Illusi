import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import { ExampleObj } from "@illusive/example_objs";
import { Lyrics } from "@illusive/lyrics";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { Track } from "@illusive/types";
import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, type TextStyle, TouchableOpacity, View, type LayoutChangeEvent } from "react-native";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import { UITextView } from "react-native-uitextview";
import { SharedRouter } from "@utils/shared_routes";
import { alert_error } from "@illusive/illusi/src/alert";
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

function find_current_line_idx(synced_lyrics: Lyrics.SyncedLyric[], position: number): number {
	for (let i = synced_lyrics.length - 1; i >= 0; i--) {
		if (position >= synced_lyrics[i].interval.from) return i;
	}
	return 0;
}

const better_synced = true;
const screen_w = Dimensions.get("screen").width;
const LYRICS_PLAYER_HEIGHT = screen_w + 50;

interface AnimatedWordProps {
	word: string;
	delay: number;
	active_shared: SharedValue<number>;
	color_active: string;
	color_inactive: string;
	glow_color: string;
	base_style: TextStyle;
}

function AnimatedWord({ word, delay, active_shared, color_active, color_inactive, glow_color, base_style }: AnimatedWordProps) {
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
}

const glow_text_style: TextStyle = { textShadowOffset: { width: 0, height: 0 } };

interface AnimatedLyricLineProps {
	text: string;
	is_active: boolean;
	color_active: string;
	color_inactive: string;
	glow_color: string;
	base_style: TextStyle;
	lyric_duration_ms?: number;
}

function AnimatedLyricLine({ text, is_active, color_active, color_inactive, glow_color, base_style, lyric_duration_ms }: AnimatedLyricLineProps) {
	const active_shared = useSharedValue(is_active ? 1 : 0);
	useEffect(() => {
		active_shared.value = is_active ? 1 : 0;
	}, [is_active]);

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

	const word_count = tokens.reduce((acc, t) => acc + (t.is_word ? 1 : 0), 0);
	const per_word_ms = better_synced && lyric_duration_ms && lyric_duration_ms > 0 && word_count > 0 ? Math.min(150, lyric_duration_ms / word_count) : word_count > 0 ? Math.min(75, Math.max(35, 600 / word_count)) : 0;

	const scale = useSharedValue(is_active ? 1 : 0.96);
	useEffect(() => {
		scale.value = withTiming(is_active ? 1 : 0.96, { duration: 280, easing: Easing.out(Easing.cubic) });
	}, [is_active]);
	const wrapper_style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

	return (
		<Animated.View style={wrapper_style}>
			<Text style={base_style}>
				{tokens.map((tok, i) => {
					if (!tok.is_word) return <Text key={i}>{tok.text}</Text>;
					return <AnimatedWord key={i} word={tok.text} delay={tok.word_index * per_word_ms} active_shared={active_shared} color_active={color_active} color_inactive={color_inactive} glow_color={glow_color} base_style={base_style} />;
				})}
			</Text>
		</Animated.View>
	);
}

interface LyricsPlayerProps {
	visible: boolean;
	playing_track: Track;
	lyrics_uri: string | null;
}

export default function LyricsPlayer({ visible, playing_track, lyrics_uri }: LyricsPlayerProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [sections, set_sections] = useState<LyricsSection[]>([]);
	const [section_times, set_section_times] = useState<number[]>([]);
	const [current_section_idx, set_current_section_idx] = useState(0);
	const scrollview_ref = useRef<ScrollView>(null);
	const section_y_positions = useRef<number[]>([]);

	const [synced_lyrics, set_synced_lyrics] = useState<Lyrics.SyncedLyric[] | null>(null);
	const [current_line_idx, set_current_line_idx] = useState(0);
	const [is_following, set_is_following] = useState(true);
	const synced_lyrics_ref = useRef<Lyrics.SyncedLyric[] | null>(null);
	const current_line_idx_ref = useRef(0);
	const is_following_ref = useRef(true);
	const line_y_positions = useRef<number[]>([]);
	const line_heights = useRef<number[]>([]);

	const section_times_ref = useRef<number[]>([]);
	const current_section_idx_ref = useRef(0);
	const content_height_ref = useRef(0);
	const scrollview_height_ref = useRef(screen_w);
	const last_position_ref = useRef(0);

	// Keep ref in sync with prop so event handlers always see current track
	const track_ref = useRef<Track>(playing_track);
	track_ref.current = playing_track;

	const { track_colors } = useTrackColors(playing_track);

	const color_active = colors.text;
	const color_inactive = colors.subtext;
	const glow_color = (() => {
		const base = track_colors?.primary ?? colors.primary;
		// build rgba with mid alpha for a soft glow
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
	})();

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

	async function get_trackplayer_progress() {
		const info = await TrackPlayer.getProgress();
		return info.position / info.duration;
	}

	function scroll_to_line_center(idx: number, animated: boolean) {
		const y = line_y_positions.current[idx];
		const h = line_heights.current[idx] ?? 0;
		if (y === undefined) return;
		const target = Math.max(0, y + h / 2 - scrollview_height_ref.current / 2);
		scrollview_ref.current?.scrollTo({ y: target, animated });
	}

	async function load_lyrics(track_lyrics_uri: string) {
		const track = track_ref.current;

		// Try synced lyrics first
		if (track && !is_empty(track.synced_lyrics_uri)) {
			const synced_text = await SQLTracks.read_track_synced_lyrics(track);
			if (typeof synced_text === "string") {
				const parsed = Lyrics.lrclib_synced_lyrics_to_json(synced_text);
				if ("error" in parsed) alert_error(parsed);
				if (!("error" in parsed) && parsed.lyrics.length > 0) {
					synced_lyrics_ref.current = parsed.lyrics;
					set_synced_lyrics(parsed.lyrics);
					set_sections([]);
					section_times_ref.current = [];
					set_section_times([]);
					line_y_positions.current = [];
					line_heights.current = [];
					last_position_ref.current = 0;
					is_following_ref.current = true;
					set_is_following(true);

					const progress = await TrackPlayer.getProgress();
					const pos = progress.position;
					const initial_idx = find_current_line_idx(parsed.lyrics, pos);
					current_line_idx_ref.current = initial_idx;
					set_current_line_idx(initial_idx);
					return;
				}
			}
		}

		// Fall back to plain lyrics
		synced_lyrics_ref.current = null;
		set_synced_lyrics(null);
		line_y_positions.current = [];
		line_heights.current = [];

		const read_lyrics = await SQLTracks.read_track_lyrics({ ...ExampleObj.track_example0, lyrics_uri: track_lyrics_uri });
		if (read_lyrics === undefined || typeof read_lyrics === "object") return;

		const parsed = parse_sections(read_lyrics);
		set_sections(parsed);
		section_y_positions.current = [];
		section_times_ref.current = [];
		set_section_times([]);
		current_section_idx_ref.current = 0;
		set_current_section_idx(0);
	}

	useEffect(() => {
		if (lyrics_uri) {
			load_lyrics(lyrics_uri);
		}
	}, [lyrics_uri]);

	// Initial scroll for plain lyrics once layout is measured
	useEffect(() => {
		(async () => {
			if (synced_lyrics_ref.current === null && is_empty(track_ref.current?.media_uri) && content_height_ref.current > 0 && scrollview_height_ref.current > 0) {
				const max_scrollable = content_height_ref.current - scrollview_height_ref.current;
				const ratio = await get_trackplayer_progress();
				scrollview_ref.current?.scrollTo({ y: max_scrollable * ratio, animated: true });
			}
		})();
	}, [sections]);

	useTrackPlayerEvents([Event.PlaybackProgressUpdated], (event) => {
		if (synced_lyrics_ref.current !== null) {
			const seeked = Math.abs(event.position - last_position_ref.current) > 1;
			last_position_ref.current = event.position;

			const idx = find_current_line_idx(synced_lyrics_ref.current, event.position);
			const line_changed = idx !== current_line_idx_ref.current;
			if (line_changed) {
				current_line_idx_ref.current = idx;
				set_current_line_idx(idx);
			}
			if (seeked) {
				is_following_ref.current = true;
				set_is_following(true);
			}
			if (is_following_ref.current && (line_changed || seeked)) {
				scroll_to_line_center(idx, line_changed && !seeked);
			}
		} else if (!is_empty(track_ref.current?.media_uri) && section_times_ref.current.length > 0) {
			const pos = event.position;
			let idx = 0;
			for (let i = section_times_ref.current.length - 1; i >= 0; i--) {
				if (pos >= section_times_ref.current[i]) {
					idx = i;
					break;
				}
			}
			if (idx !== current_section_idx_ref.current) {
				current_section_idx_ref.current = idx;
				set_current_section_idx(idx);
				const y = section_y_positions.current[idx];
				if (y !== undefined) scrollview_ref.current?.scrollTo({ y, animated: true });
			}
		}
	});

	function snap_to_current() {
		is_following_ref.current = true;
		set_is_following(true);
		scroll_to_line_center(current_line_idx_ref.current, true);
	}

	return (
		<Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height: LYRICS_PLAYER_HEIGHT, zIndex: 20, overflow: "hidden" }, overlay_opacity_style]} pointerEvents={visible ? "auto" : "none"}>
			<Animated.View style={[StyleSheet.absoluteFill, slide_style]}>
				{lyrics_uri ? (
					<TouchableOpacity style={{ position: "absolute", top: 8, right: 12, zIndex: 2 }} onPress={() => SharedRouter.goto_shared_player_lyrics_edit(lyrics_uri)}>
						<Ionicons name="pencil-outline" size={18} color={track_colors?.background ?? colors.primary} />
					</TouchableOpacity>
				) : null}
				<MaskedView style={{ flex: 1 }} maskElement={<LinearGradient colors={["transparent", "black", "black", "transparent"]} locations={[0, 0.18, 0.82, 1]} style={{ flex: 1 }} />}>
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
							if (synced_lyrics_ref.current !== null) {
								is_following_ref.current = false;
								set_is_following(false);
							}
						}}
						style={{ flex: 1 }}>
						{synced_lyrics !== null ? (
							<>
								<View style={{ height: screen_w / 2 }} />
								{synced_lyrics.map((lyric, i) => {
									const next_from = synced_lyrics[i + 1]?.interval.from;
									const lyric_duration_ms = next_from !== undefined ? (next_from - lyric.interval.from) * 1000 : 3000;
									return (
										<Pressable
											key={i}
											onLayout={(e) => {
												line_y_positions.current[i] = e.nativeEvent.layout.y;
												line_heights.current[i] = e.nativeEvent.layout.height;
											}}
											onPress={() => {
												TrackPlayer.seekTo(lyric.interval.from);
												is_following_ref.current = true;
												set_is_following(true);
											}}
											style={styles.synced_line_wrapper}>
											<AnimatedLyricLine
												text={lyric.text}
												is_active={i === current_line_idx}
												color_active={color_active}
												color_inactive={color_inactive}
												glow_color={glow_color}
												base_style={styles.lyrics_text}
												lyric_duration_ms={lyric_duration_ms}
											/>
										</Pressable>
									);
								})}
								<View style={{ height: screen_w / 2 }} />
							</>
						) : sections.length === 0 ? (
							<View></View>
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
				</MaskedView>
				{synced_lyrics !== null && !is_following ? (
					<Pressable style={[styles.sync_button, { backgroundColor: track_colors?.secondary ?? colors.shelf }]} onPress={snap_to_current}>
						<Ionicons name="sync-outline" size={11} color={track_colors?.background ?? colors.primary} />
						<Text style={[styles.sync_button_text, { color: track_colors?.background ?? colors.primary }]}>Sync</Text>
					</Pressable>
				) : null}
			</Animated.View>
		</Animated.View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		lyrics_text: { color: colors.text, fontWeight: "bold", fontSize: 22, marginHorizontal: 15, marginVertical: 5 },
		synced_line_wrapper: { paddingVertical: 4 },
		section_header: { color: colors.primary, fontWeight: "800", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2, marginHorizontal: 15 },
		sync_button: { position: "absolute", bottom: 14, right: 12, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, zIndex: 2 },
		sync_button_text: { fontWeight: "700", fontSize: 11 }
	});
