import { is_empty } from "@common/utils/util";
import ModalHeader from "@components/ModalHeader";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import useTrackColors from "@hooks/useTrackColors";
import { GLOBALS } from "@illusive/globals";
import { ExampleObj } from "@illusive/example_objs";
import { Lyrics } from "@illusive/lyrics";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { Track } from "@illusive/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import { UITextView } from "react-native-uitextview";
import { SharedRouter } from "@utils/shared_routes";

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

export default function AudioPlayerLyrics() {
	const { lyrics_uri } = useLocalSearchParams<{ lyrics_uri: string }>();

	const { colors } = usePTheme();
	const { height } = useDimensions();
	const gradient_height = useMemo(() => height * 0.4, [height]);
	const styles = theme_styles(colors);

	const [track, set_track] = useState<Track | null>(null);
	const [sections, set_sections] = useState<LyricsSection[]>([]);
	const [section_times, set_section_times] = useState<number[]>([]);
	const [current_section_idx, set_current_section_idx] = useState(0);
	const [progress_ratio, set_progress_ratio] = useState(0);
	const [content_height, set_content_height] = useState(0);
	const [scrollview_height, set_scrollview_height] = useState(0);
	const scrollview_ref = useRef<ScrollView>(null);
	const section_y_positions = useRef<number[]>([]);

	const [synced_lyrics, set_synced_lyrics] = useState<Lyrics.SyncedLyric[] | null>(null);
	const [current_line_idx, set_current_line_idx] = useState(0);
	const [is_following, set_is_following] = useState(true);
	const synced_lyrics_ref = useRef<Lyrics.SyncedLyric[] | null>(null);
	const current_line_idx_ref = useRef(0);
	const is_following_ref = useRef(true);
	const line_y_positions = useRef<number[]>([]);

	// Refs so event handlers always see current values (avoid stale closure)
	const track_ref = useRef<Track | null>(null);
	const section_times_ref = useRef<number[]>([]);
	const current_section_idx_ref = useRef(0);

	const { track_colors } = useTrackColors(track ?? undefined);

	async function get_trackplayer_progress() {
		const progress_info = await TrackPlayer.getProgress();
		return progress_info.position / progress_info.duration;
	}

	useEffect(() => {
		(async () => {
			if (is_empty(track_ref.current?.media_uri) && content_height > 0 && scrollview_height > 0) {
				const max_scrollable = content_height - scrollview_height;
				const ratio = await get_trackplayer_progress();
				set_progress_ratio(isNaN(ratio) ? 0 : ratio);
				scrollview_ref.current?.scrollTo({ y: max_scrollable * ratio, animated: true });
			}
		})();
	}, [content_height, scrollview_height]);

	async function load_track_and_lyrics(track_lyrics_uri: string) {
		const index = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
		const resolved = GLOBALS.global_var.playing_tracks[index] ?? null;
		track_ref.current = resolved;
		set_track(resolved);

		// Try synced lyrics first
		if (resolved && !is_empty(resolved.synced_lyrics_uri)) {
			const synced_text = await SQLTracks.read_track_synced_lyrics(resolved);
			if (typeof synced_text === "string") {
				const parsed = Lyrics.lrclib_synced_lyrics_to_json(synced_text);
				if (!("error" in parsed) && parsed.lyrics.length > 0) {
					synced_lyrics_ref.current = parsed.lyrics;
					set_synced_lyrics(parsed.lyrics);
					set_sections([]);
					section_times_ref.current = [];
					set_section_times([]);
					line_y_positions.current = [];
					is_following_ref.current = true;
					set_is_following(true);

					const progress = await TrackPlayer.getProgress();
					const pos = progress.position;
					const initial_idx = find_current_line_idx(parsed.lyrics, pos);
					current_line_idx_ref.current = initial_idx;
					set_current_line_idx(initial_idx);
					set_progress_ratio(isNaN(pos / progress.duration) ? 0 : pos / progress.duration);
					return;
				}
			}
		}

		// Fall back to plain lyrics
		synced_lyrics_ref.current = null;
		set_synced_lyrics(null);
		line_y_positions.current = [];

		const read_lyrics = await SQLTracks.read_track_lyrics({ ...ExampleObj.track_example0, lyrics_uri: track_lyrics_uri });
		if (read_lyrics === undefined || typeof read_lyrics === "object") {
			close();
			return;
		}

		const parsed = parse_sections(read_lyrics);
		set_sections(parsed);
		section_y_positions.current = [];
		section_times_ref.current = [];
		set_section_times([]);
		current_section_idx_ref.current = 0;
		set_current_section_idx(0);

		const ratio = await get_trackplayer_progress();
		set_progress_ratio(isNaN(ratio) ? 0 : ratio);
	}

	useEffect(() => {
		(async () => {
			await load_track_and_lyrics(lyrics_uri);
		})();
	}, [lyrics_uri]);

	function close() {
		if (!router.canDismiss()) return;
		router.dismiss();
	}

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async () => {
		const current_track_index = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
		const new_track = GLOBALS.global_var.playing_tracks[current_track_index];
		track_ref.current = new_track;
		set_track(new_track);
		if (is_empty(new_track.lyrics_uri)) {
			close();
		} else {
			await load_track_and_lyrics(new_track.lyrics_uri!);
		}
	});

	useTrackPlayerEvents([Event.PlaybackProgressUpdated], (event) => {
		const ratio = event.position / event.duration;
		set_progress_ratio(isNaN(ratio) ? 0 : ratio);

		if (synced_lyrics_ref.current !== null) {
			const idx = find_current_line_idx(synced_lyrics_ref.current, event.position);
			if (idx !== current_line_idx_ref.current) {
				current_line_idx_ref.current = idx;
				set_current_line_idx(idx);
				if (is_following_ref.current) {
					const y = line_y_positions.current[idx];
					if (y !== undefined) scrollview_ref.current?.scrollTo({ y, animated: true });
				}
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
		if (y !== undefined) scrollview_ref.current?.scrollTo({ y, animated: true });
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader
				title="Lyrics"
				background_color={track_colors?.secondary}
				text_color={track_colors?.background}
				close_color={track_colors?.background}
				right_icon={{ icon_name: "pencil-outline", icon_color: track_colors?.background ?? colors.primary, icon_size: 20, on_press: () => SharedRouter.goto_shared_player_lyrics_edit(lyrics_uri) }}
			/>
			<View style={{ height: 3, backgroundColor: colors.shelf }}>
				<View style={{ height: 3, width: `${progress_ratio * 100}%`, backgroundColor: track_colors?.detail ?? colors.primary }} />
			</View>
			<View style={{ height: 30 }} />
			{track_colors ? <LinearGradient colors={[track_colors.primary, track_colors.background, "transparent"]} style={{ position: "absolute", top: 0, height: gradient_height, width: "100%", zIndex: -1 }} /> : null}
			<ScrollView
				ref={scrollview_ref}
				onLayout={(e: LayoutChangeEvent) => set_scrollview_height(e.nativeEvent.layout.height)}
				onContentSizeChange={(_, h) => set_content_height(h)}
				onScrollBeginDrag={() => {
					if (synced_lyrics_ref.current !== null) {
						is_following_ref.current = false;
						set_is_following(false);
					}
				}}
				style={{ flex: 1 }}>
				{synced_lyrics !== null ? (
					synced_lyrics.map((lyric, i) => (
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
					))
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
					<Ionicons name="sync-outline" size={14} color={track_colors?.background ?? colors.primary} />
					<Text style={[styles.sync_button_text, { color: track_colors?.background ?? colors.primary }]}>Sync</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		lyrics_text: {
			color: colors.text,
			fontWeight: "bold",
			width: "85%",
			fontSize: 24,
			margin: 15,
			marginVertical: 5
		},
		section_header: {
			color: colors.primary,
			fontWeight: "800",
			fontSize: 11,
			letterSpacing: 1.2,
			textTransform: "uppercase",
			marginBottom: 2,
			marginHorizontal: 15
		},
		sync_button: {
			position: "absolute",
			bottom: 30,
			alignSelf: "center",
			flexDirection: "row",
			alignItems: "center",
			gap: 6,
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 20
		},
		sync_button_text: {
			fontWeight: "700",
			fontSize: 14
		}
	});
