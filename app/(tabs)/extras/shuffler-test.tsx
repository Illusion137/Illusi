import TrackComponent from "@components/TrackComponent";
import { BASE_WIDTH_FN } from "@components/TrackComponentBase";
import { Constants } from "@illusive/constants";
import { FutsalShuffle } from "@illusive/futsal_shuffle";
import { GLOBALS } from "@illusive/globals";
import type { Track } from "@illusive/types";
import { useMemo } from "react";
import BigList from "react-native-big-list";

export default function ShufflerTest() {
	const shuffled_tracks = useMemo(() => FutsalShuffle.futsal_shuffle(GLOBALS.global_var.sql_tracks), []);
	const render_track = (item: { item: Track }) => <TrackComponent track_data={item.item} track_callback={() => [item.item]} from={"My Library"} edit_mode={"NONE"} width_fn={() => BASE_WIDTH_FN(Constants.library_write_playlist)} />;

	return <BigList renderItem={render_track} itemHeight={61} data={shuffled_tracks.slice(0, 50)} keyExtractor={(item) => item.uid} renderFooter={null} renderHeader={null} />;
}
