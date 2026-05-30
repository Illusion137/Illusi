import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { artist_string } from "@illusive/illusive_utils";
import type { Track } from "@illusive/types";
import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import IImage from "@components/IImage";

interface IdleWanderingTracksProps {
	width: number;
	height: number;
	active: boolean;
}

// How many rows of tracks wander across the screen.
const NUM_ROWS = 5;
// How many cards each row strips through before repeating.
const CARDS_PER_ROW = 7;

function TrackCard({ track, card_height, card_width }: { track: Track; card_height: number; card_width: number }) {
	const { colors } = usePTheme();
	const artwork_size = card_height - 16;
	return (
		<View style={[styles.card, { width: card_width, height: card_height, backgroundColor: colors.track + "B0", borderColor: colors.line }]}>
			<IImage source={track.playback?.artwork} style={{ width: artwork_size, height: artwork_size, borderRadius: 4, resizeMode: "cover" }} />
			<View style={{ flex: 1, marginLeft: 12, justifyContent: "center" }}>
				<Text numberOfLines={1} style={[styles.title, { color: colors.title }]}>
					{track.title}
				</Text>
				<Text numberOfLines={1} style={[styles.artist, { color: colors.subtext }]}>
					{artist_string(track)}
				</Text>
			</View>
		</View>
	);
}

function WanderRow({ tracks, row_index, card_height, card_width, gap, active }: { tracks: Track[]; row_index: number; card_height: number; card_width: number; gap: number; active: boolean }) {
	const strip_width = (card_width + gap) * tracks.length;
	const moves_left = row_index % 2 === 0;
	const offset = useSharedValue(0);

	// Lower rows drift faster; alternating rows travel in opposite directions.
	const duration = 26000 + row_index * 4200;

	useEffect(() => {
		if (!active || tracks.length === 0) {
			cancelAnimation(offset);
			return;
		}
		offset.value = 0;
		offset.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
		return () => cancelAnimation(offset);
	}, [active, duration, strip_width, tracks.length]);

	const animated_style = useAnimatedStyle(() => {
		const shift = moves_left ? -offset.value * strip_width : offset.value * strip_width - strip_width;
		return { transform: [{ translateX: shift }] };
	});

	if (tracks.length === 0) return null;

	return (
		<View style={{ height: card_height, justifyContent: "center", overflow: "hidden" }}>
			<Animated.View style={[{ flexDirection: "row", gap }, animated_style]}>
				{[...tracks, ...tracks].map((track, i) => (
					<TrackCard key={`${track.uid}-${i}`} track={track} card_height={card_height} card_width={card_width} />
				))}
			</Animated.View>
		</View>
	);
}

export default function IdleWanderingTracks({ width, height, active }: IdleWanderingTracksProps) {
	const { colors } = usePTheme();

	const card_height = useMemo(() => Math.min(96, (height / NUM_ROWS) * 0.62), [height]);
	const card_width = useMemo(() => Math.min(340, width * 0.26), [width]);
	const gap = 24;

	const rows = useMemo<Track[][]>(() => {
		const library = GLOBALS.global_var.sql_tracks;
		if (library.length === 0) return [];
		return Array.from({ length: NUM_ROWS }, (_, row) => {
			const start = (row * 7) % library.length;
			return Array.from({ length: CARDS_PER_ROW }, (_, i) => library[(start + i * 3) % library.length]);
		});
	}, [GLOBALS.global_var.sql_tracks.length]);

	return (
		<View style={{ width, height }}>
			<Svg width={width} height={height} style={StyleSheet.absoluteFill}>
				<Defs>
					<RadialGradient id="idle_bg" cx="50%" cy="50%" rx="75%" ry="75%" fx="50%" fy="42%">
						<Stop offset="0" stopColor={colors.shelf} stopOpacity="1" />
						<Stop offset="0.65" stopColor={colors.background} stopOpacity="1" />
						<Stop offset="1" stopColor={colors.background} stopOpacity="1" />
					</RadialGradient>
				</Defs>
				<Rect x="0" y="0" width={width} height={height} fill="url(#idle_bg)" />
			</Svg>
			<View style={{ flex: 1, justifyContent: "space-evenly", paddingVertical: 24 }}>
				{rows.map((tracks, row) => (
					<WanderRow key={row} tracks={tracks} row_index={row} card_height={card_height} card_width={card_width} gap={gap} active={active} />
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingHorizontal: 8 },
	title: { fontSize: 15, fontWeight: "bold" },
	artist: { fontSize: 13, marginTop: 2 }
});
