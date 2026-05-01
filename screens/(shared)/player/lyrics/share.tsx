import ModalHeader from "@components/ModalHeader";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import useTrackColors from "@hooks/useTrackColors";
import { GLOBALS } from "@illusive/globals";
import { artist_string } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLfs } from "@illusive/sql/sql_fs";
import type { LoadingState, Track } from "@illusive/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import Clipboard from "@react-native-clipboard/clipboard";
import { router } from "expo-router";

export default function PlayerShareLyrics() {
	const { colors } = usePTheme();
	const { height } = useDimensions();
	const gradient_height = useMemo(() => height * 0.4, [height]);
	const [track, set_track] = useState<Track | null>(null);
	const [lyrics, set_lyrics] = useState<string | null>(null);
	const [copy_state, set_copy_state] = useState<LoadingState>("NONE");

	const { track_colors } = useTrackColors(track ?? undefined);
	const styles = theme_styles(colors);

	async function load_track() {
		const index = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
		const resolved = GLOBALS.global_var.playing_tracks[index] ?? null;
		set_track(resolved);
		if (resolved) {
			const content = await SQLTracks.read_track_lyrics(resolved);
			set_lyrics(typeof content === "string" ? content : null);
		}
	}

	useEffect(() => {
		load_track();
	}, []);

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], () => {
		load_track();
	});

	const preview_lines = useMemo(
		() =>
			(lyrics ?? "")
				.split("\n")
				.map((l) => (/^\[.+?\]$/.test(l.trim()) ? "" : l))
				.filter((l) => l.trim().length > 0)
				.slice(0, 5),
		[lyrics]
	);

	const total_non_empty_lines = useMemo(
		() =>
			(lyrics ?? "")
				.split("\n")
				.map((l) => (/^\[.+?\]$/.test(l.trim()) ? "" : l))
				.filter((l) => l.trim().length > 0).length,
		[lyrics]
	);

	const share_text = track ? `${track.title}\n${artist_string(track)}\n\n${lyrics ?? ""}` : "";

	function handle_copy() {
		Clipboard.setString(share_text);
		set_copy_state("COMPLETE");
		setTimeout(() => set_copy_state("NONE"), 2000);
	}

	async function handle_share() {
		if (!track) return;
		await Share.share({ message: share_text, title: track.title ?? "" });
	}

	async function handle_share_file() {
		if (!track?.lyrics_uri) return;
		const path = SQLfs.lyrics_directory(track.lyrics_uri);
		if (await Sharing.isAvailableAsync()) {
			await Sharing.shareAsync(path);
		}
	}

	const has_lyrics = preview_lines.length > 0;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader
				title="Share Lyrics"
				background_color={track_colors?.secondary}
				text_color={track_colors?.background}
				close_color={track_colors?.background}
			/>
			{track_colors ? (
				<LinearGradient
					colors={[track_colors.primary, track_colors.background, "transparent"]}
					style={{ position: "absolute", top: 0, height: gradient_height, width: "100%", zIndex: -1 }}
				/>
			) : null}
			<ScrollView scrollToOverflowEnabled={false} contentContainerStyle={{ paddingBottom: 20 }}>
				{/* Track identity */}
				<View style={{ marginHorizontal: 16, marginTop: 16 }}>
					<Text style={{ color: colors.text, fontWeight: "bold", fontSize: 20 }} numberOfLines={1}>
						{track?.title ?? "No track playing"}
					</Text>
					{track ? (
						<Text style={{ color: colors.searchPlaceholder, fontSize: 14, marginTop: 2 }}>{artist_string(track)}</Text>
					) : null}
				</View>

				{has_lyrics ? (
					<>
						{/* Preview card */}
						<View style={styles.section_card}>
							<Text style={styles.section_label}>Preview</Text>
							<View style={styles.field_divider} />
							<View style={{ marginTop: 12 }}>
								<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>
									{(track?.title ?? "").toUpperCase()}
								</Text>
								<Text style={{ color: colors.searchPlaceholder, fontSize: 11, marginTop: 2 }}>
									{track ? artist_string(track) : ""}
								</Text>
								<View style={{ marginTop: 10 }}>
									{preview_lines.map((line, i) => (
										<Text
											key={i + line}
											style={{
												color: i === preview_lines.length - 1 ? colors.text + "55" : colors.text + "cc",
												fontSize: 15,
												lineHeight: 22,
												fontStyle: "italic",
											}}>
											{line}
										</Text>
									))}
									{total_non_empty_lines > 5 ? (
										<Text style={{ color: colors.searchPlaceholder, fontSize: 12, marginTop: 4 }}>
											+{total_non_empty_lines - 5} more lines
										</Text>
									) : null}
								</View>
							</View>
						</View>

						{/* Actions card */}
						<View style={[styles.section_card, { gap: 10 }]}>
							<TouchableOpacity style={styles.action_button} onPress={handle_copy}>
								<Ionicons
									name={copy_state === "COMPLETE" ? "checkmark" : "copy-outline"}
									size={16}
									color={colors.primary}
									style={{ marginRight: 8 }}
								/>
								<Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>
									{copy_state === "COMPLETE" ? "Copied!" : "Copy Text"}
								</Text>
							</TouchableOpacity>

							<TouchableOpacity style={styles.action_button} onPress={handle_share}>
								<Ionicons name="share-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
								<Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>Share</Text>
							</TouchableOpacity>

							{track?.lyrics_uri ? (
								<TouchableOpacity style={styles.action_button} onPress={handle_share_file}>
									<Ionicons name="document-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
									<Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>Share as File</Text>
								</TouchableOpacity>
							) : null}
						</View>
					</>
				) : (
					/* Empty state */
					<View style={[styles.section_card, { alignItems: "center", paddingVertical: 32, marginTop: 24 }]}>
						<Ionicons name="document-text-outline" size={48} color={colors.searchPlaceholder} />
						<Text style={{ color: colors.text, fontWeight: "bold", fontSize: 16, marginTop: 14 }}>No lyrics available</Text>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 }}>
							This track doesn't have lyrics saved.{"\n"}Download or edit them first.
						</Text>
						<TouchableOpacity style={[styles.action_button, { marginTop: 20, paddingHorizontal: 24 }]} onPress={() => router.dismiss()}>
							<Text style={{ color: colors.primary, fontWeight: "600", fontSize: 15 }}>Close</Text>
						</TouchableOpacity>
					</View>
				)}

				<View style={{ height: 80 }} />
			</ScrollView>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		section_card: {
			marginHorizontal: 16,
			marginTop: 16,
			backgroundColor: "#ffffff06",
			borderRadius: 16,
			borderWidth: 0.5,
			borderColor: "#ffffff0f",
			padding: 16,
		},
		section_label: {
			color: colors.text,
			fontWeight: "800",
			fontSize: 16,
			letterSpacing: 0.2,
		},
		field_divider: {
			height: 0.5,
			backgroundColor: colors.text + "30",
			marginTop: 8,
		},
		action_button: {
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			backgroundColor: colors.primary + "18",
			borderRadius: 10,
			paddingVertical: 12,
			borderWidth: 0.5,
			borderColor: colors.primary + "30",
		},
	});
