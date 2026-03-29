import { is_empty } from "@common/utils/util";
import ModalHeader from "@components/ModalHeader";
import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import { GLOBALS } from "@illusive/globals";
import { ExampleObj } from "@illusive/example_objs";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { Track } from "@illusive/types";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
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

export default function AudioPlayerLyrics() {
	const { lyrics_uri } = useLocalSearchParams<{ lyrics_uri: string }>();

	const { colors } = usePTheme();
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
		if (!is_empty(track_ref.current?.media_uri) && section_times_ref.current.length > 0) {
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
		} else {
			const ratio = event.position / event.duration;
			set_progress_ratio(isNaN(ratio) ? 0 : ratio);
		}
	});

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title="Lyrics" background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background} right_icon={{ icon_name: "pencil-outline", icon_color: track_colors?.background ?? colors.primary, icon_size: 20, on_press: () => SharedRouter.goto_shared_player_lyrics_edit(lyrics_uri) }} />
			<View style={{ height: 3, backgroundColor: colors.shelf }}>
				<View style={{ height: 3, width: `${progress_ratio * 100}%`, backgroundColor: track_colors?.primary ?? colors.primary }} />
			</View>
			{track_colors ? <LinearGradient colors={[track_colors.primary, track_colors.background, "transparent"]} style={{ position: "absolute", top: 0, height: Dimensions.get("screen").height * 0.4, width: "100%", zIndex: -1 }} /> : null}
			<ScrollView ref={scrollview_ref} onLayout={(e: LayoutChangeEvent) => set_scrollview_height(e.nativeEvent.layout.height)} onContentSizeChange={(_, h) => set_content_height(h)} style={{ flex: 1 }}>
				{sections.length === 0 ? (
					<UITextView uiTextView={true} style={styles.lyrics_text}>
						Unable to find lyrics for this song
					</UITextView>
				) : (
					sections.map((section, i) => {
						const is_active = section_times.length === 0 || i === current_section_idx;
						const opacity = is_active ? 1 : 0.35;
						return (
							<View
								key={i}
								onLayout={(e) => {
									section_y_positions.current[i] = e.nativeEvent.layout.y;
								}}>
								{section.header ? <Text style={[styles.section_header, { opacity }]}>{section.header}</Text> : null}
								<UITextView uiTextView={true} selectable={true} selectionColor={colors.primary} style={{ opacity, marginHorizontal: 20 }}>
									{section.lines.map((line, j) => (
										<UITextView uiTextView={true} selectable={true} selectionColor={colors.primary} key={j} style={styles.lyrics_text}>
											{line + "\n\n"}
										</UITextView>
									))}
								</UITextView>
							</View>
						);
					})
				)}
			</ScrollView>
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
			marginTop: 16,
			marginBottom: 2,
			marginHorizontal: 15
		}
	});
