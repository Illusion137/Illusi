import IImage from "@components/IImage";
import { AntDesignTouchableOpacity } from "@components/TouchableIconOpacity";
import useDimensions from "@hooks/useDimensions";
import usePTheme from "@hooks/usePTheme";
import { Constants } from "@illusive/constants";
import { GLOBALS } from "@illusive/globals";
import { artist_string } from "@illusive/illusive_utils";
import { SQLTrackPlays } from "@illusive/sql/sql_track_plays";
import type { Artwork, Track } from "@illusive/types";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle, Defs, G, Line, Path, Rect, Stop, LinearGradient as SvgLinearGradient } from "react-native-svg";
import Swiper from "react-native-swiper";

const HEADER_HEIGHT = 80;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface PlayEvent {
	track_uid: string;
	created_at: number | string | Date;
}

interface RankedTrack {
	track: Track;
	plays: number;
	minutes: number;
}

interface RankedName {
	name: string;
	plays: number;
	minutes: number;
	artwork?: Artwork;
}

interface RewindStats {
	year: number;
	total_plays: number;
	total_minutes: number;
	top_tracks: RankedTrack[];
	top_artists: RankedName[];
	top_albums: RankedName[];
	first_play?: { track: Track; date: Date };
	latest_play?: { track: Track; date: Date };
	busiest_month: { label: string; plays: number };
	busiest_day: { label: string; plays: number };
	artworks: Artwork[];
	month_counts: number[];
}

interface FallingArtworkConfig {
	id: string;
	artwork: Artwork;
	x_ratio: number;
	size: number;
	delay: number;
	duration: number;
	rotation: number;
}

const month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function date_key(date: Date) {
	return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function format_count(value: number) {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function format_minutes(value: number) {
	if (value < 60) return `${format_count(Math.max(1, Math.round(value)))} min`;
	return `${format_count(Math.round(value / 60))} hr`;
}

function add_ranked_name(map: Map<string, RankedName>, name: string, track: Track, plays: number, minutes: number) {
	const safe_name = name.trim() || "Unknown";
	const previous = map.get(safe_name);
	if (previous) {
		previous.plays += plays;
		previous.minutes += minutes;
		if (!previous.artwork) previous.artwork = track.playback?.artwork;
		return;
	}
	map.set(safe_name, { name: safe_name, plays, minutes, artwork: track.playback?.artwork });
}

function get_rewind_stats(year: number): RewindStats {
	const date_start = new Date(year, 0, 1);
	const date_end = new Date(year + 1, 0, 1);
	const tracks_by_uid = new Map(GLOBALS.global_var.sql_tracks.map((track) => [track.uid, track]));
	const plays = SQLTrackPlays.all_track_plays_sync({ date_start, date_end }) as PlayEvent[];
	const track_counts = new Map<string, number>();
	const month_counts = new Array<number>(12).fill(0);
	const day_counts = new Map<string, { date: Date; plays: number }>();
	let first_play: { track: Track; date: Date } | undefined;
	let latest_play: { track: Track; date: Date } | undefined;

	for (const play of plays) {
		const track = tracks_by_uid.get(play.track_uid);
		if (!track) continue;

		const date = new Date(play.created_at);
		if (Number.isNaN(date.getTime())) continue;

		track_counts.set(track.uid, (track_counts.get(track.uid) ?? 0) + 1);
		month_counts[date.getMonth()] += 1;

		const key = date_key(date);
		const day = day_counts.get(key);
		if (day) day.plays += 1;
		else day_counts.set(key, { date, plays: 1 });

		if (!first_play || date.getTime() < first_play.date.getTime()) first_play = { track, date };
		if (!latest_play || date.getTime() > latest_play.date.getTime()) latest_play = { track, date };
	}

	const all_ranked_tracks = Array.from(track_counts.entries())
		.map(([uid, plays_count]) => {
			const track = tracks_by_uid.get(uid)!;
			return { track, plays: plays_count, minutes: (track.duration * plays_count) / 60 };
		})
		.sort((a, b) => b.plays - a.plays || b.minutes - a.minutes);
	const ranked_tracks = all_ranked_tracks.slice(0, 20);

	const artist_map = new Map<string, RankedName>();
	const album_map = new Map<string, RankedName>();
	let total_minutes = 0;
	for (const ranked of all_ranked_tracks) {
		total_minutes += ranked.minutes;
		add_ranked_name(artist_map, artist_string(ranked.track), ranked.track, ranked.plays, ranked.minutes);
		add_ranked_name(album_map, ranked.track.album?.name ?? "Singles", ranked.track, ranked.plays, ranked.minutes);
	}

	const top_artists = Array.from(artist_map.values())
		.sort((a, b) => b.plays - a.plays || b.minutes - a.minutes)
		.slice(0, 8);
	const top_albums = Array.from(album_map.values())
		.sort((a, b) => b.plays - a.plays || b.minutes - a.minutes)
		.slice(0, 8);

	const busiest_month_index = month_counts.reduce((best, value, index) => (value > month_counts[best] ? index : best), 0);
	const busiest_day = Array.from(day_counts.values()).sort((a, b) => b.plays - a.plays || a.date.getTime() - b.date.getTime())[0];
	const fallback_artworks = GLOBALS.global_var.sql_tracks
		.map((track) => track.playback?.artwork)
		.filter((artwork): artwork is Artwork => artwork !== undefined && artwork !== null)
		.slice(0, 16);
	const artworks = ranked_tracks
		.map((ranked) => ranked.track.playback?.artwork)
		.filter((artwork): artwork is Artwork => artwork !== undefined && artwork !== null)
		.slice(0, 18);

	return {
		year,
		total_plays: Array.from(track_counts.values()).reduce((sum, plays_count) => sum + plays_count, 0),
		total_minutes,
		top_tracks: ranked_tracks,
		top_artists,
		top_albums,
		first_play,
		latest_play,
		busiest_month: { label: month_labels[busiest_month_index], plays: month_counts[busiest_month_index] },
		busiest_day: busiest_day ? { label: busiest_day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), plays: busiest_day.plays } : { label: "None", plays: 0 },
		artworks: artworks.length > 0 ? artworks : fallback_artworks,
		month_counts
	};
}

function RewindPage(props: { children: React.ReactNode; colors: ReturnType<typeof usePTheme>["colors"]; accent?: string }) {
	const accent = props.accent ?? props.colors.primary;
	return (
		<View style={[styles.page, { backgroundColor: props.colors.background }]}>
			<LinearGradient colors={[accent + "66", props.colors.background, props.colors.background]} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
			{props.children}
		</View>
	);
}

function AnimatedRewindMark(props: { size: number; color: string; muted: string }) {
	const progress = useSharedValue(0);
	useEffect(() => {
		progress.value = withRepeat(withSequence(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }), withTiming(0.18, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1, true);
	}, [progress]);

	const ring_props = useAnimatedProps(() => ({ strokeDashoffset: 302 - progress.value * 302 }));
	const path_props = useAnimatedProps(() => ({ strokeDashoffset: 260 - progress.value * 260 }));

	return (
		<Svg width={props.size} height={props.size} viewBox="0 0 120 120">
			<Defs>
				<SvgLinearGradient id="rewind_mark_gradient" x1="0" y1="0" x2="1" y2="1">
					<Stop offset="0" stopColor={props.color} stopOpacity="1" />
					<Stop offset="1" stopColor={props.muted} stopOpacity="0.55" />
				</SvgLinearGradient>
			</Defs>
			<Circle cx={60} cy={60} r={48} stroke={props.muted} strokeWidth={5} fill="none" opacity={0.24} />
			<AnimatedCircle cx={60} cy={60} r={48} stroke="url(#rewind_mark_gradient)" strokeWidth={5} fill="none" strokeDasharray={302} animatedProps={ring_props} strokeLinecap="round" />
			<AnimatedPath d="M74 34 C52 34 34 48 34 66 C34 83 49 94 67 88 C81 84 88 70 82 58" stroke={props.color} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={260} animatedProps={path_props} />
			<Path d="M45 59 L27 74 L47 84 Z" fill={props.color} opacity={0.9} />
			<Path d="M66 56 L47 71 L67 81 Z" fill={props.color} opacity={0.72} />
		</Svg>
	);
}

function FallingArtwork(props: { item: FallingArtworkConfig; screen_height: number; screen_width: number }) {
	const y = useSharedValue(-180);
	const opacity = useSharedValue(0);
	const rotate = useSharedValue(props.item.rotation);

	useEffect(() => {
		y.value = withDelay(props.item.delay, withRepeat(withTiming(props.screen_height + 180, { duration: props.item.duration, easing: Easing.linear }), -1, false));
		opacity.value = withDelay(props.item.delay, withTiming(0.62, { duration: 800 }));
		rotate.value = withDelay(props.item.delay, withRepeat(withTiming(props.item.rotation * -1, { duration: props.item.duration * 0.9, easing: Easing.inOut(Easing.quad) }), -1, true));
	}, [opacity, props.item.delay, props.item.duration, props.item.rotation, props.screen_height, rotate, y]);

	const animated_style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: y.value }, { rotate: `${rotate.value}deg` }] }));

	return (
		<Animated.View style={[styles.falling_artwork, animated_style, { left: props.item.x_ratio * props.screen_width, width: props.item.size, height: props.item.size, borderRadius: props.item.size * 0.14 }]}>
			<IImage source={props.item.artwork} style={{ width: props.item.size, height: props.item.size, borderRadius: props.item.size * 0.14 }} resizeMode="cover" />
		</Animated.View>
	);
}

function FallingArtworkLayer(props: { artworks: Artwork[]; width: number; height: number }) {
	const configs = useMemo<FallingArtworkConfig[]>(() => {
		const source = props.artworks.length > 0 ? props.artworks : [Constants.icon_transparent_index];
		return source
			.slice(0, 14)
			.map((artwork, index) => ({
				id: `${index}-${String(typeof artwork === "string" ? artwork : index)}`,
				artwork,
				x_ratio: ((index * 29) % 100) / 100,
				size: 58 + (index % 4) * 12,
				delay: (index % 7) * 520,
				duration: 7200 + (index % 5) * 900,
				rotation: -24 + (index % 7) * 8
			}));
	}, [props.artworks]);

	return (
		<View pointerEvents="none" style={StyleSheet.absoluteFill}>
			{configs.map((item) => (
				<FallingArtwork key={item.id} item={item} screen_height={props.height} screen_width={props.width} />
			))}
		</View>
	);
}

function MonthWave(props: { counts: number[]; color: string; muted: string; width: number }) {
	const progress = useSharedValue(0);
	const max = Math.max(...props.counts, 1);
	const chart_width = Math.max(props.width - 70, 260);
	const chart_height = 150;
	const points = props.counts.map((count, index) => {
		const x = 18 + (index / 11) * (chart_width - 36);
		const y = chart_height - 18 - (count / max) * (chart_height - 46);
		return { x, y };
	});
	const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
	const path_props = useAnimatedProps(() => ({ strokeDashoffset: 600 - progress.value * 600 }));

	useEffect(() => {
		progress.value = withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) });
	}, [progress]);

	return (
		<Svg width={chart_width} height={chart_height} viewBox={`0 0 ${chart_width} ${chart_height}`}>
			{[0, 1, 2].map((line) => (
				<Line key={line} x1={18} y1={36 + line * 38} x2={chart_width - 18} y2={36 + line * 38} stroke={props.muted} strokeWidth={1} opacity={0.35} />
			))}
			<AnimatedPath d={path} fill="none" stroke={props.color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={600} animatedProps={path_props} />
			{points.map((point, index) => (
				<Circle key={month_labels[index]} cx={point.x} cy={point.y} r={4} fill={props.color} opacity={0.85} />
			))}
		</Svg>
	);
}

function Bars(props: { items: RankedName[]; color: string; text: string; subtext: string }) {
	const progress = useSharedValue(0);
	useEffect(() => {
		progress.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
	}, [progress]);

	const max = Math.max(...props.items.map((item) => item.plays), 1);
	return (
		<View style={{ width: "100%", gap: 12 }}>
			{props.items.slice(0, 5).map((item, index) => (
				<BarRow key={`${item.name}-${index}`} item={item} max={max} progress={progress} color={props.color} text={props.text} subtext={props.subtext} />
			))}
		</View>
	);
}

function BarRow(props: { item: RankedName; max: number; progress: SharedValue<number>; color: string; text: string; subtext: string }) {
	const width_props = useAnimatedProps(() => ({ width: `${Math.max(0.08, (props.item.plays / props.max) * props.progress.value) * 100}%` }));

	return (
		<View>
			<View style={styles.bar_label_row}>
				<Text numberOfLines={1} style={[styles.bar_name, { color: props.text }]}>
					{props.item.name}
				</Text>
				<Text style={[styles.bar_count, { color: props.subtext }]}>{format_count(props.item.plays)}</Text>
			</View>
			<Svg height={12} width="100%">
				<Rect width="100%" height={12} rx={6} fill={props.subtext} opacity={0.16} />
				<AnimatedRect height={12} rx={6} fill={props.color} animatedProps={width_props} />
			</Svg>
		</View>
	);
}

function StatPill(props: { label: string; value: string; colors: ReturnType<typeof usePTheme>["colors"] }) {
	return (
		<View style={[styles.stat_pill, { borderColor: props.colors.text + "24", backgroundColor: props.colors.background + "AA" }]}>
			<Text style={[styles.stat_label, { color: props.colors.subtext }]}>{props.label}</Text>
			<Text style={[styles.stat_value, { color: props.colors.text }]} numberOfLines={1}>
				{props.value}
			</Text>
		</View>
	);
}

function RankedTrackRow(props: { ranked: RankedTrack; index: number; colors: ReturnType<typeof usePTheme>["colors"] }) {
	return (
		<View style={[styles.track_row, { backgroundColor: props.colors.background + "AA", borderColor: props.colors.text + "18" }]}>
			<Text style={[styles.rank, { color: props.colors.primary }]}>{props.index + 1}</Text>
			<IImage source={props.ranked.track.playback?.artwork} style={styles.row_artwork} resizeMode="cover" />
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text numberOfLines={1} style={[styles.track_title, { color: props.colors.text }]}>
					{props.ranked.track.title}
				</Text>
				<Text numberOfLines={1} style={[styles.track_artist, { color: props.colors.subtext }]}>
					{artist_string(props.ranked.track)}
				</Text>
			</View>
			<Text style={[styles.track_count, { color: props.colors.subtext }]}>{format_count(props.ranked.plays)}</Text>
		</View>
	);
}

function TrackSpotlight(props: { ranked?: RankedTrack; colors: ReturnType<typeof usePTheme>["colors"] }) {
	if (!props.ranked) return null;
	return (
		<View style={styles.spotlight}>
			<IImage source={props.ranked.track.playback?.artwork} style={[styles.spotlight_artwork, { borderColor: props.colors.text + "24" }]} resizeMode="cover" />
			<Text numberOfLines={2} style={[styles.spotlight_title, { color: props.colors.text }]}>
				{props.ranked.track.title}
			</Text>
			<Text numberOfLines={1} style={[styles.spotlight_artist, { color: props.colors.subtext }]}>
				{artist_string(props.ranked.track)}
			</Text>
			<Text style={[styles.spotlight_meta, { color: props.colors.primary }]}>{format_count(props.ranked.plays)} plays</Text>
		</View>
	);
}

function PlayCard(props: { label: string; entry?: { track: Track; date: Date }; colors: ReturnType<typeof usePTheme>["colors"] }) {
	if (!props.entry) return null;
	return (
		<View style={[styles.play_card, { backgroundColor: props.colors.background + "B8", borderColor: props.colors.text + "20" }]}>
			<Text style={[styles.stat_label, { color: props.colors.subtext }]}>{props.label}</Text>
			<View style={styles.play_card_body}>
				<IImage source={props.entry.track.playback?.artwork} style={styles.play_artwork} resizeMode="cover" />
				<View style={{ flex: 1, minWidth: 0 }}>
					<Text numberOfLines={1} style={[styles.track_title, { color: props.colors.text }]}>
						{props.entry.track.title}
					</Text>
					<Text numberOfLines={1} style={[styles.track_artist, { color: props.colors.subtext }]}>
						{artist_string(props.entry.track)}
					</Text>
					<Text style={[styles.play_date, { color: props.colors.primary }]}>{props.entry.date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Text>
				</View>
			</View>
		</View>
	);
}

function EmptyRewind(props: { colors: ReturnType<typeof usePTheme>["colors"]; year: number; width: number; height: number }) {
	return (
		<RewindPage colors={props.colors}>
			<FallingArtworkLayer artworks={[Constants.icon_transparent_index]} width={props.width} height={props.height} />
			<View style={styles.center_content}>
				<AnimatedRewindMark size={160} color={props.colors.primary} muted={props.colors.text} />
				<Text style={[styles.hero_title, { color: props.colors.text }]}>Illusi Rewind {props.year}</Text>
				<Text style={[styles.hero_subtitle, { color: props.colors.subtext }]}>There is not enough listening history for this year yet.</Text>
				<Text style={[styles.body_copy, { color: props.colors.subtext }]}>Play some tracks and come back when your year has a shape.</Text>
			</View>
		</RewindPage>
	);
}

export default function RewindScreen() {
	const { colors } = usePTheme();
	const { width, height } = useDimensions();
	const year = new Date().getFullYear();
	const stats = useMemo(() => get_rewind_stats(year), [year]);

	function close() {
		if (!router.canGoBack()) return;
		router.back();
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<View style={[styles.header, { backgroundColor: colors.background }]}>
				<AntDesignTouchableOpacity on_press={close} style={styles.header_button} icon_name="left" icon_size={25} icon_color={colors.primary} icon_style={{}} hitslop={12} />
				<IImage source={Constants.icon_transparent_index} style={styles.header_logo} resizeMode="contain" />
				<Text style={[styles.header_title, { color: colors.text }]}>Illusi Rewind {year}</Text>
			</View>
			{stats.total_plays === 0 ? (
				<EmptyRewind colors={colors} year={year} width={width} height={height} />
			) : (
				<Swiper
					horizontal={false}
					showsButtons={false}
					showsPagination={true}
					loop={false}
					dotStyle={{ backgroundColor: colors.text + "55" }}
					activeDotStyle={{ backgroundColor: colors.primary }}
					paginationStyle={{ right: 12, left: undefined, bottom: 24 }}>
					<RewindPage colors={colors}>
						<FallingArtworkLayer artworks={stats.artworks} width={width} height={height} />
						<View style={styles.center_content}>
							<AnimatedRewindMark size={170} color={colors.primary} muted={colors.text} />
							<Text style={[styles.hero_title, { color: colors.text }]}>Your {stats.year} Rewind</Text>
							<Text style={[styles.hero_subtitle, { color: colors.subtext }]}>A year of plays, timestamps, repeats, and favorite moments.</Text>
						</View>
					</RewindPage>

					<RewindPage colors={colors} accent={colors.primary}>
						<View style={styles.page_content}>
							<Text style={[styles.kicker, { color: colors.primary }]}>The big number</Text>
							<Text style={[styles.number_title, { color: colors.text }]}>{format_count(Math.round(stats.total_minutes))}</Text>
							<Text style={[styles.hero_subtitle, { color: colors.subtext }]}>minutes of music this year</Text>
							<View style={styles.stats_grid}>
								<StatPill label="Plays" value={format_count(stats.total_plays)} colors={colors} />
								<StatPill label="Top month" value={`${stats.busiest_month.label} (${stats.busiest_month.plays})`} colors={colors} />
								<StatPill label="Top day" value={`${stats.busiest_day.label} (${stats.busiest_day.plays})`} colors={colors} />
								<StatPill label="Tracks" value={format_count(stats.top_tracks.length)} colors={colors} />
							</View>
							<MonthWave counts={stats.month_counts} color={colors.primary} muted={colors.text} width={width} />
						</View>
					</RewindPage>

					<RewindPage colors={colors} accent={colors.primary}>
						<FallingArtworkLayer
							artworks={stats.top_tracks
								.slice(0, 6)
								.map((ranked) => ranked.track.playback?.artwork)
								.filter((artwork): artwork is Artwork => artwork !== undefined && artwork !== null)}
							width={width}
							height={height}
						/>
						<View style={styles.page_content}>
							<Text style={[styles.kicker, { color: colors.primary }]}>Top track</Text>
							<TrackSpotlight ranked={stats.top_tracks[0]} colors={colors} />
						</View>
					</RewindPage>

					<RewindPage colors={colors}>
						<ScrollView contentContainerStyle={styles.scroll_content} bounces={false}>
							<Text style={[styles.kicker, { color: colors.primary }]}>Most replayed</Text>
							<Text style={[styles.section_title, { color: colors.text }]}>Top tracks</Text>
							<View style={{ gap: 10, width: "100%" }}>
								{stats.top_tracks.slice(0, 8).map((ranked, index) => (
									<RankedTrackRow key={ranked.track.uid} ranked={ranked} index={index} colors={colors} />
								))}
							</View>
						</ScrollView>
					</RewindPage>

					<RewindPage colors={colors} accent={colors.primary}>
						<View style={styles.page_content}>
							<Text style={[styles.kicker, { color: colors.primary }]}>Your sound</Text>
							<Text style={[styles.section_title, { color: colors.text }]}>Top artists</Text>
							<Bars items={stats.top_artists} color={colors.primary} text={colors.text} subtext={colors.subtext} />
							<Text style={[styles.section_title, { color: colors.text, marginTop: 24 }]}>Top albums</Text>
							<Bars items={stats.top_albums} color={colors.primary} text={colors.text} subtext={colors.subtext} />
						</View>
					</RewindPage>

					<RewindPage colors={colors}>
						<View style={styles.page_content}>
							<Text style={[styles.kicker, { color: colors.primary }]}>Timestamped</Text>
							<Text style={[styles.section_title, { color: colors.text }]}>First and latest</Text>
							<View style={{ gap: 14, width: "100%" }}>
								<PlayCard label="First play this year" entry={stats.first_play} colors={colors} />
								<PlayCard label="Latest play this year" entry={stats.latest_play} colors={colors} />
							</View>
						</View>
					</RewindPage>

					<RewindPage colors={colors} accent={colors.primary}>
						<View style={styles.page_content}>
							<Text style={[styles.kicker, { color: colors.primary }]}>Recap</Text>
							<Text style={[styles.hero_title, { color: colors.text }]}>That was {stats.year}</Text>
							<View style={styles.stats_grid}>
								<StatPill label="Minutes" value={format_minutes(stats.total_minutes)} colors={colors} />
								<StatPill label="Plays" value={format_count(stats.total_plays)} colors={colors} />
								<StatPill label="Top track" value={stats.top_tracks[0]?.track.title ?? "Unknown"} colors={colors} />
								<StatPill label="Top artist" value={stats.top_artists[0]?.name ?? "Unknown"} colors={colors} />
								<StatPill label="Top album" value={stats.top_albums[0]?.name ?? "Unknown"} colors={colors} />
								<StatPill label="Peak day" value={stats.busiest_day.label} colors={colors} />
							</View>
							<GentlePulse color={colors.primary} muted={colors.text} />
						</View>
					</RewindPage>
				</Swiper>
			)}
		</View>
	);
}

function GentlePulse(props: { color: string; muted: string }) {
	const progress = useSharedValue(0.2);
	useEffect(() => {
		progress.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
	}, [progress]);
	const animated_style = useAnimatedStyle(() => ({ opacity: 0.2 + progress.value * 0.4, transform: [{ scale: 0.92 + progress.value * 0.08 }] }));

	return (
		<Animated.View style={[styles.pulse_wrap, animated_style]}>
			<Svg width={170} height={170} viewBox="0 0 170 170">
				<G fill="none" strokeLinecap="round">
					<Circle cx={85} cy={85} r={54} stroke={props.muted} strokeWidth={1} opacity={0.25} />
					<Circle cx={85} cy={85} r={36} stroke={props.color} strokeWidth={8} opacity={0.85} />
					<Path d="M58 88 C70 66 102 66 113 88" stroke={props.color} strokeWidth={8} />
					<Path d="M62 103 C78 119 100 119 113 103" stroke={props.color} strokeWidth={8} opacity={0.68} />
				</G>
			</Svg>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	header: { position: "absolute", top: HEADER_HEIGHT, left: 0, right: 0, height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, zIndex: 10 },
	header_button: { width: 42, height: 42, justifyContent: "center" },
	header_logo: { width: 30, height: 30 },
	header_title: { fontWeight: "800", fontSize: 14, width: 150, textAlign: "right" },
	page: { flex: 1, paddingTop: HEADER_HEIGHT + 54, overflow: "hidden" },
	center_content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 26, paddingBottom: 60 },
	page_content: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, paddingBottom: 64, gap: 14 },
	scroll_content: { paddingTop: 46, paddingHorizontal: 18, paddingBottom: 90, alignItems: "center", gap: 12 },
	hero_title: { fontSize: 38, fontWeight: "900", textAlign: "center", marginTop: 14 },
	number_title: { fontSize: 66, fontWeight: "900", textAlign: "center" },
	hero_subtitle: { fontSize: 17, lineHeight: 24, textAlign: "center", maxWidth: 340 },
	body_copy: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10, maxWidth: 310 },
	kicker: { fontSize: 13, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0 },
	section_title: { fontSize: 31, fontWeight: "900", textAlign: "center", marginBottom: 8 },
	stats_grid: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 12 },
	stat_pill: { width: "46%", minHeight: 76, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center" },
	stat_label: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0 },
	stat_value: { fontSize: 19, fontWeight: "900", marginTop: 5 },
	falling_artwork: { position: "absolute", top: -160, overflow: "hidden" },
	spotlight: { width: "100%", alignItems: "center", paddingHorizontal: 12 },
	spotlight_artwork: { width: 250, height: 250, borderRadius: 8, borderWidth: 1 },
	spotlight_title: { fontSize: 28, fontWeight: "900", textAlign: "center", marginTop: 18 },
	spotlight_artist: { fontSize: 17, fontWeight: "700", textAlign: "center", marginTop: 6 },
	spotlight_meta: { fontSize: 18, fontWeight: "900", marginTop: 12 },
	track_row: { width: "100%", borderWidth: 1, borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 },
	rank: { width: 24, fontSize: 17, fontWeight: "900", textAlign: "center" },
	row_artwork: { width: 52, height: 52, borderRadius: 6 },
	track_title: { fontSize: 15, fontWeight: "900" },
	track_artist: { fontSize: 12, fontWeight: "700", marginTop: 2 },
	track_count: { fontSize: 13, fontWeight: "900", minWidth: 34, textAlign: "right" },
	bar_label_row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 5 },
	bar_name: { flex: 1, fontSize: 15, fontWeight: "900" },
	bar_count: { fontSize: 12, fontWeight: "900" },
	play_card: { width: "100%", borderWidth: 1, borderRadius: 8, padding: 14 },
	play_card_body: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
	play_artwork: { width: 70, height: 70, borderRadius: 8 },
	play_date: { fontSize: 12, fontWeight: "900", marginTop: 7 },
	pulse_wrap: { marginTop: 12 }
});
