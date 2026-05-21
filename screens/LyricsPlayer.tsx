import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import { ExampleObj } from "@illusive/example_objs";
import { Lyrics } from "@illusive/lyrics";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { Track } from "@illusive/types";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, type LayoutChangeEvent } from "react-native";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import { UITextView } from "react-native-uitextview";
import { SharedRouter } from "@utils/shared_routes";
import { alert_error } from "@illusive/illusi/src/alert";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";

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

const screen_w = Dimensions.get("screen").width;

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

	const section_times_ref = useRef<number[]>([]);
	const current_section_idx_ref = useRef(0);
	const content_height_ref = useRef(0);
	const scrollview_height_ref = useRef(screen_w);
	const last_position_ref = useRef(0);

	// Keep ref in sync with prop so event handlers always see current track
	const track_ref = useRef<Track>(playing_track);
	track_ref.current = playing_track;

	const { track_colors } = useTrackColors(playing_track);

	const overlay_opacity = useSharedValue(0);
	const slide_y = useSharedValue(screen_w);

	useEffect(() => {
		if (visible) {
			overlay_opacity.value = withTiming(1, { duration: 300 });
			slide_y.value = withDelay(150, withSpring(0, { damping: 20, stiffness: 150 }));
		} else {
			slide_y.value = withTiming(screen_w, { duration: 250, easing: Easing.in(Easing.ease) });
			overlay_opacity.value = withDelay(100, withTiming(0, { duration: 200 }));
		}
	}, [visible]);

	const overlay_opacity_style = useAnimatedStyle(() => ({ opacity: overlay_opacity.value }));
	const slide_style = useAnimatedStyle(() => ({ transform: [{ translateY: slide_y.value }] }));

	async function get_trackplayer_progress() {
		const info = await TrackPlayer.getProgress();
		return info.position / info.duration;
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
		if (visible && lyrics_uri) {
			load_lyrics(lyrics_uri);
		}
	}, [lyrics_uri, visible]);

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
			if (is_following_ref.current) {
				const y = line_y_positions.current[idx];
				if (y !== undefined) scrollview_ref.current?.scrollTo({ y: Math.max(0, y - scrollview_height_ref.current / 2), animated: line_changed && !seeked });
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
		const y = line_y_positions.current[current_line_idx_ref.current];
		if (y !== undefined) scrollview_ref.current?.scrollTo({ y: Math.max(0, y - scrollview_height_ref.current / 2), animated: true });
	}

	return (
		<Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height: screen_w, zIndex: 20, overflow: "hidden" }, overlay_opacity_style]} pointerEvents={visible ? "auto" : "none"}>
			<Animated.View style={[StyleSheet.absoluteFill, slide_style]}>
				{lyrics_uri ? (
					<TouchableOpacity style={{ position: "absolute", top: 8, right: 12, zIndex: 1 }} onPress={() => SharedRouter.goto_shared_player_lyrics_edit(lyrics_uri)}>
						<Ionicons name="pencil-outline" size={18} color={track_colors?.background ?? colors.primary} />
					</TouchableOpacity>
				) : null}
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
							{synced_lyrics.map((lyric, i) => (
								<Pressable
									key={i}
									onLayout={(e) => {
										line_y_positions.current[i] = e.nativeEvent.layout.y;
									}}
									onPress={() => {
										TrackPlayer.seekTo(lyric.interval.from);
										is_following_ref.current = true;
										set_is_following(true);
									}}>
									<UITextView uiTextView={true} selectable={true} selectionColor={colors.primary} style={[styles.lyrics_text, { color: i === current_line_idx ? colors.text : colors.subtext }]}>
										{lyric.text + "\n"}
										<UITextView style={{ fontSize: 7 }}>{"\n"}</UITextView>
									</UITextView>
								</Pressable>
							))}
							<View style={{ height: screen_w / 2 }} />
						</>
					) : sections.length === 0 ? (
						<UITextView uiTextView={true} style={styles.lyrics_text}>
							Unable to find lyrics for this song
						</UITextView>
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
		section_header: { color: colors.primary, fontWeight: "800", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2, marginHorizontal: 15 },
		sync_button: { position: "absolute", bottom: 14, right: 12, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
		sync_button_text: { fontWeight: "700", fontSize: 11 }
	});
