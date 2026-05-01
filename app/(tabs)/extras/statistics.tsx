import { ScrollView, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { GLOBALS } from "@illusive/globals";
import { days_of, round_decimal_place } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import type { GraphPoint } from "react-native-graph";
import { useEffect, useMemo, useState } from "react";
import { DateLineGraph } from "@components/DateLineGraph";
import { SQLTrackPlays } from "@illusive/sql/sql_track_plays";
import { sum } from "@illusive/illusive_utils";
import type { Track } from "@illusive/types";

export default function ExtraStatisticsScreen() {
	const { colors } = usePTheme();
	const { width } = useDimensions();

	function map_frequency(numbers: number[]) {
		const frequency: Record<string, number> = {};
		for (const num of numbers) {
			frequency[num] = (frequency[num] || 0) + 1;
		}
		return frequency;
	}

	const [plays_points, set_plays_points] = useState<GraphPoint[]>([]);
	const [time_played_points, set_time_played_points] = useState<GraphPoint[]>([]);
	const [selected_histogram_index, set_selected_histogram_index] = useState<number | null>(null);

	const plays_histogram_dataset = map_frequency(GLOBALS.global_var.sql_tracks.map((track) => track.meta?.plays ?? 0));
	const histogram_labels = Object.keys(plays_histogram_dataset);
	const histogram_values = Object.values(plays_histogram_dataset);

	useEffect(() => {
		let total_plays = sum(GLOBALS.global_var.sql_tracks.map((track) => track.meta?.plays ?? 0));
		let total_time_played = sum(GLOBALS.global_var.sql_tracks.map((track) => (track.meta?.plays ?? 0) * (isNaN(track.duration) ? 1 : track.duration)));
		const timestamps = SQLTrackPlays.all_track_plays_sync({});
		total_plays -= timestamps.length;
		const lookup_map: Record<string, number> = {};
		timestamps.forEach((stamp) => {
			if (lookup_map[stamp.track_uid]) total_time_played -= lookup_map[stamp.track_uid];
			else {
				const found = GLOBALS.global_var.sql_tracks.find((t) => t.uid === stamp.track_uid);
				if (!found) return;
				lookup_map[stamp.track_uid] = isNaN(found.duration) ? 0 : found.duration;
				total_time_played -= found.duration;
			}
		});
		set_plays_points(timestamps.map((stamp) => ({ date: new Date(stamp.created_at), value: ++total_plays })));
		set_time_played_points(
			timestamps.map((stamp) => {
				if (lookup_map[stamp.track_uid]) total_time_played += lookup_map[stamp.track_uid];
				return { date: new Date(stamp.created_at), value: round_decimal_place(days_of({ seconds: total_time_played }), 2) };
			})
		);
	}, []);

	function get_valid_date(track: Track) {
		const start_date = new Date(1696143600000);
		if (track.meta?.added_date && new Date(track.meta?.added_date ?? 0).getTime() !== 0 && new Date(track.meta?.added_date ?? 0) >= start_date) return new Date(track.meta.added_date);
		if (track.meta?.downloaded_date && new Date(track.meta?.downloaded_date ?? 0).getTime() !== 0 && new Date(track.meta?.downloaded_date ?? 0) >= start_date) return new Date(track.meta.downloaded_date);
		return start_date;
	}

	const track_commit_points: GraphPoint[] = useMemo(() => {
		const sorted_dates = GLOBALS.global_var.sql_tracks
			.filter((t) => t.meta?.added_date)
			.map((t) => get_valid_date(t))
			.sort((a, b) => a.getTime() - b.getTime());
		return sorted_dates.map((date, i) => ({ date, value: i + 1 }));
	}, []);

	const label_step = Math.ceil(histogram_labels.length / 6);
	const display_labels = histogram_labels.map((l, i) => (i % label_step === 0 ? l : ""));
	const selected_label = selected_histogram_index !== null ? histogram_labels[selected_histogram_index] : null;
	const selected_value = selected_histogram_index !== null ? histogram_values[selected_histogram_index] : null;

	return (
		<ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
			<DateLineGraph title="Plays over time" points={plays_points} />
			<DateLineGraph title="Days listened to over time" points={time_played_points} use_point_values={true} />

			<View style={{ marginHorizontal: 16, marginTop: 16, backgroundColor: "#ffffff06", borderRadius: 16, borderWidth: 0.5, borderColor: "#ffffff0f", overflow: "hidden" }}>
				<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 }}>
					<Text style={{ color: colors.text, fontWeight: "800", fontSize: 16, letterSpacing: 0.2 }}>Plays (x) vs Tracks (y)</Text>
					{selected_value !== null ? (
						<View style={{ alignItems: "flex-end" }}>
							<Text style={{ color: colors.primary, fontWeight: "800", fontSize: 22, letterSpacing: -0.5 }}>{selected_value}</Text>
							<Text style={{ color: colors.subtext, fontSize: 11, marginTop: 1 }}>{selected_label} plays</Text>
						</View>
					) : null}
				</View>
				<View style={{ height: 0.5, backgroundColor: colors.text + "30" }} />
				<LineChart
					data={{ labels: display_labels, datasets: [{ data: histogram_values }] }}
					width={width - 32 + 16}
					height={180}
					withDots={true}
					withShadow={false}
					withInnerLines={false}
					withOuterLines={false}
					bezier
					chartConfig={{
						backgroundGradientFrom: colors.background,
						backgroundGradientFromOpacity: 0,
						backgroundGradientTo: colors.background,
						backgroundGradientToOpacity: 0,
						decimalPlaces: 0,
						color: (opacity = 1) =>
							colors.primary +
							Math.round(opacity * 255)
								.toString(16)
								.padStart(2, "0"),
						labelColor: () => colors.subtext,
						propsForDots: {
							r: "4",
							strokeWidth: "2",
							stroke: colors.primary,
							fill: colors.background
						}
					}}
					onDataPointClick={({ index }) => set_selected_histogram_index(index === selected_histogram_index ? null : index)}
					style={{ marginLeft: -16, marginTop: 4, marginBottom: -8 }}
				/>
			</View>

			<DateLineGraph title="Tracks added over time" points={track_commit_points} />
		</ScrollView>
	);
}
