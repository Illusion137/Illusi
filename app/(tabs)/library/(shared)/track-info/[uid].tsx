import { milliseconds_of } from "@common/utils/util";
import ModalHeader from "@components/ModalHeader";
import ScaledImage from "@components/ScaledImage";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { artist_string, duration_to_string } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import TrackIconTags from "@components/TrackIconTags";
import TextTicker from "react-native-text-ticker";
import HeaderWith from "@components/HeaderWith";
import IImage from "@components/IImage";
import useTrackColors from "@hooks/useTrackColors";
import { ExampleObj } from "@illusive/example_objs";
import { SharedRouter } from "@utils/shared_routes";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

export default function EditTrackModal() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const { uid } = useLocalSearchParams<{ uid: string }>();
	const track_ref = useRef(GLOBALS.global_var.sql_tracks.find((track) => track.uid === uid));

	const { track_colors } = useTrackColors(track_ref.current);
	const tint = GLOBALS.global_var.tint_table.get(track_ref.current?.uid ?? "");
	const [lyrics, set_lyrics] = useState<string | null>(null);

	useEffect(() => {
		if (track_ref.current?.lyrics_uri) {
			SQLTracks.read_track_lyrics(track_ref.current).then((content) => {
				if (typeof content === "string") set_lyrics(content);
			});
		}
	}, []);
	const unknown = "Unknown";

	function date_string(isostring?: string) {
		const date = new Date(isostring ?? 0);
		if (date.getTime() <= milliseconds_of({ years: 30 })) return unknown;
		return date.toDateString();
	}

	const is_trimmed =
		track_ref.current?.meta?.begdur &&
		track_ref.current?.meta?.begdur !== 0 &&
		track_ref.current?.meta?.enddur &&
		track_ref.current?.meta?.enddur != (track_ref.current.duration ?? 0);

	const base_data: [string, string][] = [
		["Added", date_string(track_ref.current?.meta?.added_date)],
		["Downloaded", date_string(track_ref.current?.meta?.downloaded_date)],
		["Last Played", date_string(track_ref.current?.meta?.last_played_date)],
		["Last Sampled", date_string(track_ref.current?.meta?.last_sampled_date)],
		["Age Restricted", String(track_ref.current?.meta?.age_restricted ?? unknown)],
		["Unavailable", String(track_ref.current?.meta?.unavailable ?? unknown)],
		[
			"Track Range",
			`${duration_to_string(track_ref.current?.meta?.begdur ?? 0)} – ${duration_to_string(track_ref.current?.meta?.enddur ?? (track_ref.current?.duration ?? 0))}${is_trimmed ? ` (trimmed)` : ""}`,
		],
		["Plays", String(track_ref.current?.meta?.plays ?? 0)],
	];

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader
				title="Track Info"
				background_color={track_colors?.secondary}
				text_color={track_colors?.background}
				close_color={track_colors?.background}
			/>
			<ScrollView scrollToOverflowEnabled={false}>
				{track_colors ? (
					<LinearGradient
						colors={[track_colors.primary, track_colors.background, "transparent"]}
						style={{ position: "absolute", top: 0, height: Dimensions.get("screen").height * 0.8, width: "100%" }}
					/>
				) : null}

				{/* Artwork */}
				<View style={{ width: "100%", alignItems: "center", maxHeight: 450, minHeight: 350, overflow: "hidden", marginTop: 30 }}>
					<ScaledImage
						tint={tint ? { color: tint, opacity: 0.15 } : undefined}
						artwork={track_ref.current?.playback?.artwork}
						width={Dimensions.get("screen").width * 0.85}
						style={{ borderRadius: 10 }}
					/>
				</View>

				{/* Track identity */}
				<View style={{ marginHorizontal: 16, marginTop: 8 }}>
					<TextTicker
						style={{ color: colors.text, fontWeight: "bold", fontSize: 22 }}
						scroll={false}
						duration={18000}
						bounce={false}
						easing={Easing.linear}>
						{track_ref.current?.title ?? ""}
					</TextTicker>
					<Text style={{ color: colors.subtext, fontSize: 16, marginTop: 2 }}>{artist_string(track_ref.current!)}</Text>
					{track_ref.current?.album?.name ? (
						<Text style={{ color: colors.subtext, fontSize: 14, marginTop: 2 }}>{track_ref.current.album.name}</Text>
					) : null}
					<View style={{ flexDirection: "row", marginTop: 6 }}>
						<TrackIconTags track_data={track_ref.current ?? ExampleObj.track_example0} is_downloading={false} size={22} />
					</View>
				</View>

				{/* Stats row */}
				<View style={{ flexDirection: "row", justifyContent: "space-around", marginHorizontal: 16, marginTop: 16 }}>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>PLAYS</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>
							{String(track_ref.current?.meta?.plays ?? 0)}
						</Text>
					</View>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>DURATION</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>
							{duration_to_string(track_ref.current?.duration ?? 0) || "—"}
						</Text>
					</View>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>ADDED</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>
							{track_ref.current?.meta?.added_date ? new Date(track_ref.current.meta.added_date).toLocaleDateString() : "—"}
						</Text>
					</View>
				</View>

				{/* Data table card */}
				<View style={styles.section_card}>
					<Text style={styles.section_label}>Details</Text>
					<View style={styles.field_divider} />
					{base_data.map(([label, value], i) => (
						<React.Fragment key={label}>
							<View style={{ flexDirection: "row", alignItems: "flex-start", paddingVertical: 11 }}>
								<Text style={styles.row_label}>{label}</Text>
								<Text style={styles.row_value}>{value}</Text>
							</View>
							{i < base_data.length - 1 ? <View style={{ height: 0.5, backgroundColor: colors.text + "18" }} /> : null}
						</React.Fragment>
					))}
				</View>

				{/* Lyrics card */}
				{lyrics !== null ? (
					<View style={styles.section_card}>
						<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
							<Text style={styles.section_label}>Lyrics</Text>
							<TouchableOpacity style={styles.action_button_inline} onPress={() => SharedRouter.goto_shared_player_lyrics_share()}>
								<Ionicons name="share-outline" size={14} color={colors.primary} style={{ marginRight: 5 }} />
								<Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>Share</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.field_divider} />
						<Text style={{ color: colors.text, fontSize: 16, lineHeight: 26, fontWeight: "500", marginTop: 12 }}>
							{lyrics
								.split("\n")
								.map((line) => (/^\[.+?\]$/.test(line.trim()) ? "" : line))
								.join("\n")}
						</Text>
					</View>
				) : null}

				{/* Songs horizontal section */}
				{(track_ref.current?.meta?.songs?.length ?? 0) > 0 ? (
					<View style={{ width: "100%", marginHorizontal: 16, marginTop: 16 }}>
						<HeaderWith title="Songs">
							<ScrollView horizontal style={{ flex: 1, top: 10 }} contentContainerStyle={{ flexDirection: "row", marginHorizontal: 15 }}>
								{track_ref.current?.meta?.songs?.map((song, i) => (
									<View key={i + song.title} style={{ width: 120, marginHorizontal: 5 }}>
										<IImage source={song.artwork_url} width={120} height={120} style={{ borderRadius: 5 }} />
										<Text numberOfLines={1} style={{ color: colors.text, fontWeight: "bold", fontSize: 13, marginTop: 4 }}>
											{song.title}
										</Text>
										<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 12 }}>
											{song.artist}
										</Text>
										<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 12 }}>
											{song.album}
										</Text>
									</View>
								))}
							</ScrollView>
						</HeaderWith>
					</View>
				) : null}

				<View style={{ height: 100 }} />
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
		row_label: {
			width: "45%",
			color: colors.searchPlaceholder,
			fontSize: 12,
			fontWeight: "700",
			letterSpacing: 0.4,
		},
		row_value: {
			flex: 1,
			color: colors.text,
			fontSize: 13,
			fontWeight: "500",
		},
		action_button_inline: {
			flexDirection: "row",
			alignItems: "center",
			backgroundColor: colors.primary + "18",
			borderRadius: 8,
			paddingVertical: 6,
			paddingHorizontal: 10,
			borderWidth: 0.5,
			borderColor: colors.primary + "30",
		},
	});
