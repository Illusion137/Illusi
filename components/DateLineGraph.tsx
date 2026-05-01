import usePTheme from "@hooks/usePTheme";
import type { Prefs } from "@illusive/prefs";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LineGraph, type GraphPoint } from "react-native-graph";

export function DateLineGraph(props: { title: string; points: GraphPoint[]; graph_color?: string; use_point_values?: boolean }) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [selected_point, set_selected_point] = useState<GraphPoint | null>(null);

	if (props.points.length === 0) return null;

	const graph_color = props.graph_color ?? colors.primary;
	const display_point = selected_point ?? (props.points.length > 0 ? props.points[props.points.length - 1] : null);
	const max_plays = props.points.length > 0 ? Math.max(...props.points.map((p) => p.value)) : 0;
	const min_plays = props.points.length > 0 ? Math.min(...props.points.map((p) => p.value)) : 0;
	const graph_points: GraphPoint[] = (() => {
		if (props.points.length < 2) return props.points;
		const result: GraphPoint[] = [];
		const cur = new Date(props.points[0]?.date);
		cur.setHours(0, 0, 0, 0);
		const last = props.points[props.points.length - 1]?.date;
		if (props.use_point_values) {
			// Use last actual value per day (for pre-computed cumulative values like time played)
			const by_day = new Map<string, number>();
			props.points.forEach((p) => by_day.set(p.date?.toDateString(), p.value));
			let last_value = props.points[0].value;
			while (cur <= last) {
				const val = by_day.get(cur.toDateString());
				if (val !== undefined) last_value = val;
				result.push({ value: last_value, date: new Date(cur) });
				cur.setDate(cur.getDate() + 1);
			}
		} else {
			// Count occurrences per day and accumulate (for event-based data like plays)
			const by_day = new Map<string, number>();
			props.points.forEach((p) => {
				const key = p.date?.toDateString();
				by_day.set(key, (by_day.get(key) ?? 0) + 1);
			});
			let running = min_plays - 1;
			while (cur <= last) {
				running += by_day.get(cur.toDateString()) ?? 0;
				result.push({ value: running, date: new Date(cur) });
				cur.setDate(cur.getDate() + 1);
			}
		}
		return result;
	})();
	if (graph_points.length < 2) return null;
	const graph_x_min_norm = graph_points[0].date;
	const graph_x_max_norm = graph_points[graph_points.length - 1].date;
	function format_date_short(date: Date) {
		return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
	}
	return (
		<>
			{props.points.length >= 2 ? (
				<View style={[styles.section_card, { paddingHorizontal: 0, paddingBottom: 0, overflow: "hidden" }]}>
					<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, paddingBottom: 10 }}>
						<Text style={styles.section_label}>{props.title}</Text>
						{display_point ? (
							<View style={{ alignItems: "flex-end" }}>
								<Text style={{ color: graph_color, fontWeight: "800", fontSize: 22, letterSpacing: -0.5 }}>{display_point.value}</Text>
								<Text style={{ color: colors.subtext, fontSize: 11, marginTop: 1 }}>{format_date_short(display_point?.date)}</Text>
							</View>
						) : null}
					</View>
					<View style={{ height: 0.5, backgroundColor: colors.text + "30" }} />
					<LineGraph
						style={{ width: "100%", height: 180 }}
						animated={true}
						points={graph_points}
						range={{ x: { min: graph_x_min_norm, max: graph_x_max_norm } }}
						color={graph_color}
						gradientFillColors={[graph_color + "BB", graph_color + "33", "transparent"]}
						lineThickness={2.5}
						enableFadeInMask={true}
						enablePanGesture={true}
						enableIndicator={true}
						indicatorPulsating={true}
						horizontalPadding={16}
						verticalPadding={8}
						onPointSelected={(p) => set_selected_point(p)}
						onGestureEnd={() => set_selected_point(null)}
						TopAxisLabel={() => <Text style={{ color: colors.subtext, fontSize: 10, fontWeight: "600", paddingHorizontal: 16, paddingTop: 6 }}>{max_plays}</Text>}
						BottomAxisLabel={() => <Text style={{ color: colors.subtext, fontSize: 10, fontWeight: "600", paddingHorizontal: 16, paddingBottom: 6 }}>{min_plays}</Text>}
					/>
					{/* X-axis date labels */}
					<View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 }}>
						<Text style={{ color: colors.subtext, fontSize: 10, fontWeight: "500" }}>{format_date_short(props.points[0]?.date)}</Text>
						{props.points.length > 2 ? <Text style={{ color: colors.subtext, fontSize: 10, fontWeight: "500" }}>{format_date_short(props.points[Math.floor(props.points.length / 2)].date)}</Text> : null}
						<Text style={{ color: colors.subtext, fontSize: 10, fontWeight: "500" }}>{format_date_short(props.points[props.points.length - 1]?.date)}</Text>
					</View>
				</View>
			) : null}
		</>
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
