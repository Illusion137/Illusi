// EqualizerCurve.tsx
import React, { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, { useAnimatedProps, withTiming } from "react-native-reanimated";
import usePTheme from "@hooks/usePTheme";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface EqualizerCurveProps {
	values: number[]; // e.g. [-6, -2, 0, 3, 6]
	freqs?: string[];
	width?: number;
	height?: number;
	active?: boolean;
}

export default function Equalizer({ values, freqs = ["60Hz", "150Hz", "400Hz", "1KHz", "2.4KHz", "15KHz"], width = 350, height = 200, active = true }: EqualizerCurveProps) {
	const points = useMemo(() => {
		const count = values.length;
		const stepX = width / (count - 1);
		return values.map((v, i) => {
			const clamped = Math.max(-12, Math.min(12, v));
			const y = height - ((clamped + 12) / 24) * height;
			return { x: i * stepX, y };
		});
	}, [values, width, height]);

	const path = useMemo(() => generateSmoothPath(points), [points]);

	const { colors } = usePTheme();

	return (
		<View style={{ alignItems: "center", backgroundColor: colors.shelf, margin: 10, borderRadius: 5, paddingBottom: 5 }}>
			<Svg width={width} height={height}>
				<Defs>
					<LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
						<Stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
						<Stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
					</LinearGradient>
				</Defs>

				{/* Underglow */}
				<Path d={`${path} L ${width} ${height} L 0 ${height} Z`} fill="url(#grad)" />

				{/* Main line */}
				<AnimatedPath
					d={path}
					stroke={colors.primary}
					strokeWidth={3}
					fill="none"
					animatedProps={useAnimatedProps(() => ({
						strokeOpacity: withTiming(active ? 1 : 0.3)
					}))}
				/>

				{/* Control points */}
				{points.map((p, i) => (
					<Circle key={i} cx={p.x} cy={p.y} r={4} fill="#fff" />
				))}
			</Svg>

			{/* Frequency labels */}
			<View style={styles.labelsRow}>
				{freqs.map((f, i) => (
					<View key={i} style={{ width: width / freqs.length, alignItems: "center" }}>
						<Text style={styles.label}>{f}</Text>
					</View>
				))}
			</View>
			<View style={{height: 10}}/>
		</View>
	);
}

function generateSmoothPath(points: { x: number; y: number }[]) {
	if (points.length < 2) return "";
	const d = points
		.map((p, i, arr) => {
			if (i === 0) return `M ${p.x},${p.y}`;
			const prev = arr[i - 1];
			const cx = (prev.x + p.x) / 2;
			return `C ${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
		})
		.join(" ");
	return d;
}

const styles = StyleSheet.create({
	labelsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
		marginTop: 6
	},
	label: {
		color: "#aaa",
		fontSize: 12
	}
});
