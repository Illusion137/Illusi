import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import type { Track } from "@illusive/types";
import { BlurView } from "expo-blur";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

interface NowPlayingBackgroundProps {
	track: Track | undefined;
	width: number;
	height: number;
	active: boolean;
}

interface BlobConfig {
	color: string;
	size: number;
	cx: number;
	cy: number;
	range_x: number;
	range_y: number;
	dur_x: number;
	dur_y: number;
	dur_scale: number;
	min_scale: number;
	max_scale: number;
	opacity: number;
}

function Blob({ config, active }: { config: BlobConfig; active: boolean }) {
	const x = useSharedValue(0);
	const y = useSharedValue(0);
	const scale = useSharedValue(0.5);

	useEffect(() => {
		if (!active) {
			cancelAnimation(x);
			cancelAnimation(y);
			cancelAnimation(scale);
			return;
		}
		// Independent per-axis periods give each blob an organic, non-linear drift.
		x.value = withRepeat(withTiming(1, { duration: config.dur_x, easing: Easing.inOut(Easing.sin) }), -1, true);
		y.value = withRepeat(withTiming(1, { duration: config.dur_y, easing: Easing.inOut(Easing.sin) }), -1, true);
		scale.value = withRepeat(withTiming(1, { duration: config.dur_scale, easing: Easing.inOut(Easing.quad) }), -1, true);
		return () => {
			cancelAnimation(x);
			cancelAnimation(y);
			cancelAnimation(scale);
		};
	}, [active, config.dur_x, config.dur_y, config.dur_scale]);

	const animated_style = useAnimatedStyle(() => ({
		transform: [
			{ translateX: config.cx + interpolate(x.value, [0, 1], [-config.range_x, config.range_x]) },
			{ translateY: config.cy + interpolate(y.value, [0, 1], [-config.range_y, config.range_y]) },
			{ scale: interpolate(scale.value, [0, 1], [config.min_scale, config.max_scale]) }
		]
	}));

	return (
		<Animated.View
			style={[{ position: "absolute", width: config.size, height: config.size, borderRadius: config.size / 2, backgroundColor: config.color, opacity: config.opacity, left: -config.size / 2, top: -config.size / 2 }, animated_style]}
		/>
	);
}

export default function NowPlayingBackground({ track, width, height, active }: NowPlayingBackgroundProps) {
	const { colors } = usePTheme();
	const { track_colors } = useTrackColors(track);

	const base_color = track_colors?.background ?? colors.background;

	const blobs = useMemo<BlobConfig[]>(() => {
		const palette = [
			track_colors?.primary ?? colors.primary,
			track_colors?.secondary ?? colors.secondary,
			track_colors?.detail ?? colors.primary_dark,
			track_colors?.primary ?? colors.primary,
			track_colors?.secondary ?? colors.secondary,
			track_colors?.detail ?? colors.primary_dark
		];
		const max_dim = Math.max(width, height);
		// Spread anchor points across the screen so colours are never bunched up.
		const anchors = [
			{ x: 0.22, y: 0.28 },
			{ x: 0.78, y: 0.22 },
			{ x: 0.5, y: 0.55 },
			{ x: 0.18, y: 0.78 },
			{ x: 0.82, y: 0.74 },
			{ x: 0.5, y: 0.12 }
		];
		return palette.map((color, i) => {
			const size = max_dim * (0.5 + (i % 3) * 0.16);
			return {
				color,
				size,
				cx: anchors[i].x * width,
				cy: anchors[i].y * height,
				range_x: width * (0.16 + (i % 2) * 0.08),
				range_y: height * (0.16 + ((i + 1) % 2) * 0.08),
				dur_x: 9000 + i * 1700,
				dur_y: 11000 + i * 1300,
				dur_scale: 8000 + i * 900,
				min_scale: 0.7,
				max_scale: 1.25,
				opacity: 0.7 - (i % 3) * 0.12
			};
		});
	}, [track_colors?.primary, track_colors?.secondary, track_colors?.detail, width, height, colors]);

	return (
		<View style={[StyleSheet.absoluteFill, { backgroundColor: base_color, overflow: "hidden" }]}>
			{blobs.map((config, i) => (
				<Blob key={i} config={config} active={active} />
			))}
			{/* Heavy blur melts the blobs into a smooth, flowing lavalamp wash */}
			<BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
			{/* Tint the melted colours back toward the artwork base + add depth */}
			<View style={[StyleSheet.absoluteFill, { backgroundColor: base_color, opacity: 0.22 }]} />
			{/* Radial vignette: bright-ish centre, darker edges so artwork + lyrics stay legible */}
			<Svg width={width} height={height} style={StyleSheet.absoluteFill}>
				<Defs>
					<RadialGradient id="np_vignette" cx="50%" cy="46%" rx="72%" ry="72%" fx="50%" fy="46%">
						<Stop offset="0" stopColor="#000000" stopOpacity="0" />
						<Stop offset="0.62" stopColor="#000000" stopOpacity="0.18" />
						<Stop offset="1" stopColor="#000000" stopOpacity="0.62" />
					</RadialGradient>
				</Defs>
				<Rect x="0" y="0" width={width} height={height} fill="url(#np_vignette)" />
			</Svg>
		</View>
	);
}
