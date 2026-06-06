import { milliseconds_of } from "@common/utils/util";
import ModalHeader from "@components/ModalHeader";
import ScaledImage from "@components/ScaledImage";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { artist_string, duration_to_string } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
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
import type { GraphPoint } from "react-native-graph";
import { SQLTrackPlays } from "@illusive/sql/sql_track_plays";
import { DateLineGraph } from "@components/DateLineGraph";
import useDimensions from "@hooks/useDimensions";
import type { Track } from "@illusive/types";

const VIBES_AXES: { key: keyof Pick<Track, "valence" | "energy" | "danceability" | "instrumentalness" | "acousticness" | "liveness" | "speechiness">; label: string }[] = [
	{ key: "valence", label: "Valence" },
	{ key: "energy", label: "Energy" },
	{ key: "danceability", label: "Dance" },
	{ key: "instrumentalness", label: "Instr." },
	{ key: "acousticness", label: "Acoustic" },
	{ key: "liveness", label: "Live" },
	{ key: "speechiness", label: "Speech" }
];

function VibesRadar(props: { track: Track | undefined; color: string; line_color: string; label_color: string; size?: number }) {
	const size = props.size ?? 280;
	const cx = size / 2;
	const cy = size / 2;
	const r_max = size * 0.34;
	const n = VIBES_AXES.length;
	const angle_at = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
	const point_at = (i: number, t: number) => {
		const a = angle_at(i);
		return { x: cx + Math.cos(a) * r_max * t, y: cy + Math.sin(a) * r_max * t };
	};
	const has_any = VIBES_AXES.some(({ key }) => typeof props.track?.[key] === "number");
	if (!has_any) return null;

	const values = VIBES_AXES.map(({ key }) => Math.max(0, Math.min(1, props.track?.[key] ?? 0)));
	const grid = [0.25, 0.5, 0.75, 1.0];
	const data_points = values.map((v, i) => point_at(i, v));
	const data_str = data_points.map((p) => `${p.x},${p.y}`).join(" ");

	return (
		<Svg width={size} height={size}>
			{grid.map((t, idx) => (
				<Polygon
					key={`g-${idx}`}
					points={VIBES_AXES.map((_, i) => point_at(i, t))
						.map((p) => `${p.x},${p.y}`)
						.join(" ")}
					fill="none"
					stroke={props.line_color}
					strokeWidth={0.6}
				/>
			))}
			{VIBES_AXES.map((_, i) => {
				const p = point_at(i, 1);
				return <Line key={`a-${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={props.line_color} strokeWidth={0.6} />;
			})}
			<Polygon points={data_str} fill={props.color + "55"} stroke={props.color} strokeWidth={1.5} />
			{data_points.map((p, i) => (
				<Circle key={`d-${i}`} cx={p.x} cy={p.y} r={2.5} fill={props.color} />
			))}
			{VIBES_AXES.map(({ label }, i) => {
				const a = angle_at(i);
				const lp = point_at(i, 1.22);
				const cos = Math.cos(a);
				const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
				return (
					<SvgText key={`l-${i}`} fill={props.label_color} fontSize={10} fontWeight="600" textAnchor={anchor} transform={[{ translateX: lp.x }, { translateY: lp.y + 3 }]}>
						{label}
					</SvgText>
				);
			})}
		</Svg>
	);
}

export default function EditTrackModal() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const { width, height } = useDimensions();
	const gradient_height = useMemo(() => height * 0.8, [height]);
	const artwork_width = useMemo(() => width * 0.85, [width]);

	const { uid } = useLocalSearchParams<{ uid: string }>();
	const track_ref = useRef(GLOBALS.global_var.sql_tracks.find((track) => track.uid === uid));

	const { track_colors } = useTrackColors(track_ref.current);
	const tint = GLOBALS.global_var.tint_table.get(track_ref.current?.uid ?? "");
	const [plays_points, set_plays_points] = useState<GraphPoint[]>([]);
	const [lyrics, set_lyrics] = useState<string | null>(null);

	useEffect(() => {
		if (track_ref.current?.lyrics_uri) {
			SQLTracks.read_track_lyrics(track_ref.current).then((content) => {
				if (typeof content === "string") set_lyrics(content);
			});
		}
		if (track_ref.current?.uid) {
			const dates = SQLTrackPlays.get_track_plays_dates_sync(uid, {});
			let count = 0;
			set_plays_points(dates.map((date) => ({ value: (track_ref.current?.meta?.plays ?? 0) - dates.length + ++count, date: new Date(date.created_at) })));
		}
	}, []);
	const unknown = "Unknown";

	function date_string(isostring?: string) {
		const date = new Date(isostring ?? 0);
		if (date.getTime() <= milliseconds_of({ years: 30 })) return unknown;
		return date.toDateString();
	}

	const is_trimmed = track_ref.current?.meta?.begdur && track_ref.current?.meta?.begdur !== 0 && track_ref.current?.meta?.enddur && track_ref.current?.meta?.enddur != (track_ref.current.duration ?? 0);

	const has_vibes = VIBES_AXES.some(({ key }) => typeof track_ref.current?.[key] === "number");

	const base_data: [string, string][] = [
		["Added", date_string(track_ref.current?.meta?.added_date)],
		["Downloaded", date_string(track_ref.current?.meta?.downloaded_date)],
		["Last Played", date_string(track_ref.current?.meta?.last_played_date)],
		["Last Sampled", date_string(track_ref.current?.meta?.last_sampled_date)],
		["Age Restricted", String(track_ref.current?.meta?.age_restricted ?? unknown)],
		["Unavailable", String(track_ref.current?.meta?.unavailable ?? unknown)],
		["Track Range", `${duration_to_string(track_ref.current?.meta?.begdur ?? 0)} – ${duration_to_string(track_ref.current?.meta?.enddur ?? track_ref.current?.duration ?? 0)}${is_trimmed ? ` (trimmed)` : ""}`],
		["Plays", String(track_ref.current?.meta?.plays ?? 0)]
	];

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title="Track Info" background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background} />
			<ScrollView scrollToOverflowEnabled={false}>
				{track_colors ? <LinearGradient colors={[track_colors.primary, track_colors.background, "transparent"]} style={{ position: "absolute", top: 0, height: gradient_height, width: "100%" }} /> : null}

				{/* Artwork */}
				<View style={{ width: "100%", alignItems: "center", maxHeight: 450, minHeight: 350, overflow: "hidden", marginTop: 30 }}>
					<ScaledImage tint={tint ? { color: tint, opacity: 0.15 } : undefined} artwork={track_ref.current?.playback?.artwork} width={artwork_width} style={{ borderRadius: 10 }} />
				</View>

				{/* Track identity */}
				<View style={{ marginHorizontal: 16, marginTop: 8 }}>
					<TextTicker style={{ color: colors.text, fontWeight: "bold", fontSize: 22 }} scroll={false} duration={18000} bounce={false} easing={Easing.linear}>
						{track_ref.current?.title ?? ""}
					</TextTicker>
					<Text style={{ color: colors.subtext, fontSize: 16, marginTop: 2 }}>{artist_string(track_ref.current!)}</Text>
					{track_ref.current?.album?.name ? <Text style={{ color: colors.subtext, fontSize: 14, marginTop: 2 }}>{track_ref.current.album.name}</Text> : null}
					<View style={{ flexDirection: "row", marginTop: 6 }}>
						<TrackIconTags track_data={track_ref.current ?? ExampleObj.track_example0} is_downloading={false} size={22} darken />
					</View>
				</View>

				{/* Stats row */}
				<View style={{ flexDirection: "row", justifyContent: "space-around", marginHorizontal: 16, marginTop: 16 }}>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>PLAYS</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>{String(track_ref.current?.meta?.plays ?? 0)}</Text>
					</View>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>DURATION</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>{duration_to_string(track_ref.current?.duration ?? 0) || "—"}</Text>
					</View>
					<View style={{ alignItems: "center" }}>
						<Text style={{ color: colors.searchPlaceholder, fontSize: 11, fontWeight: "700", letterSpacing: 0.8 }}>ADDED</Text>
						<Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginTop: 2 }}>{track_ref.current?.meta?.added_date ? new Date(track_ref.current.meta.added_date).toLocaleDateString() : "—"}</Text>
					</View>
				</View>

				{/* Vibes radar */}
				{has_vibes ? (
					<View style={styles.section_card}>
						<Text style={styles.section_label}>Vibes</Text>
						<View style={styles.field_divider} />
						<View style={{ alignItems: "center", marginTop: 8 }}>
							<VibesRadar track={track_ref.current} color={colors.primary} line_color={colors.text + "22"} label_color={colors.subtext} size={Math.min(width - 80, 320)} />
						</View>
					</View>
				) : null}

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

				{/* Songs horizontal section */}
				{(track_ref.current?.meta?.songs?.length ?? 0) > 0 ? (
					<View style={{ marginHorizontal: 16, marginTop: 16 }}>
						<HeaderWith title="Songs">
							<ScrollView horizontal style={{ height: 180, top: 10 }} contentContainerStyle={{ flexDirection: "row", marginHorizontal: 15 }}>
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

				<DateLineGraph title="Plays over time" points={plays_points} />

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
				<View style={{ height: 100 }} />
			</ScrollView>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		section_card: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#ffffff06", borderRadius: 16, borderWidth: 0.5, borderColor: "#ffffff0f", padding: 16 },
		section_label: { color: colors.text, fontWeight: "800", fontSize: 16, letterSpacing: 0.2 },
		field_divider: { height: 0.5, backgroundColor: colors.text + "30", marginTop: 8 },
		row_label: { width: "45%", color: colors.searchPlaceholder, fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
		row_value: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "500" },
		action_button_inline: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary + "18", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 0.5, borderColor: colors.primary + "30" }
	});
