import TrackComponentBase, { BASE_WIDTH_FN } from "@components/TrackComponentBase";
import { Constants } from "@illusive/constants";
import { FutsalShuffle } from "@illusive/futsal_shuffle";
import { GLOBALS } from "@illusive/globals";
import type { Track } from "@illusive/types";
import { useLocalSearchParams } from "expo-router/build/hooks";
import { useMemo } from "react";
import { View } from "react-native";
import BigList from "react-native-big-list";

export default function ShufflerTest() {
	type Mode = "SHUFFLE" | "ASC" | "DESC";
	const { mode } = useLocalSearchParams<{ mode: Mode }>();

	FutsalShuffle.build_cache();

	const shuffled_tracks = useMemo(
		() =>
			mode === "SHUFFLE"
				? FutsalShuffle.futsal_shuffle(GLOBALS.global_var.sql_tracks)
				: mode === "ASC"
				? FutsalShuffle.get_weighted_tracks_ascending(GLOBALS.global_var.sql_tracks)
				: FutsalShuffle.get_weighted_tracks_descending(GLOBALS.global_var.sql_tracks),
		[]
	);
	const render_track = (item: { item: Track }) => (
		<TrackComponentBase
			score={Math.log(Math.max(FutsalShuffle.icache.track_uid_to_weight.get(item.item.uid) ?? 1, 1))}
			track_data={item.item}
			width_fn={() => BASE_WIDTH_FN(Constants.library_write_playlist)}
			on_press={() => {}}
			on_long_press={() => {}}
		/>
	);

	return (
		<View style={{ flex: 1, height: "100%" }}>
			<BigList renderItem={render_track} itemHeight={61} data={shuffled_tracks.slice(0, 50)} keyExtractor={(item) => item.uid} renderFooter={() => <></>} footerHeight={100} renderHeader={null} />
		</View>
	);
}
