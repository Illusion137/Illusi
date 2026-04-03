import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { GLOBALS } from "@illusive/globals";
import type { Playlist } from "@illusive/types";
import type { Track } from "@illusive/types";
import { artist_string, track_exists } from "@illusive/illusive_utils";
import PlaylistComponent from "@components/PlaylistComponent";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import { router } from "expo-router";
import useParsedLocalSearchParams from "@hooks/useParsedLocalSearchParams";
import ModalHeader from "@components/ModalHeader";
import { sort_playlists } from "@illusive/playlist_utils";

export interface AddToPlaylistsModalParams {
	_track: Track;
}

export default function AddToPlaylistsModal() {
	const { _track } = useParsedLocalSearchParams<AddToPlaylistsModalParams>();

	const { colors } = usePTheme();

	const [playlists_data, set_playlists_data] = useState<Playlist[]>([]);

	useEffect(() => {
		(async () => {
			const playlists = await SQLPlaylists.all_playlists_data();
			const ordered_playlists: Playlist[] = sort_playlists(playlists);
			set_playlists_data(ordered_playlists);
		})();
	}, []);

	const render_playlist_item = (item: { item: Playlist }) => <PlaylistComponent playlist_data={item.item} select={{ mode: true, track: _track! }} />;

	function close() {
		if (!router.canDismiss()) return;
		GLOBALS.global_var.selected_playlists_uuids?.clear();
		router.dismiss();
	}

	async function save_selection() {
		if (!track_exists(_track!, GLOBALS.global_var.sql_tracks)) {
			await SQLTracks.insert_track(_track!);
		}
		for (const playlist_uuid of [...GLOBALS.global_var.selected_playlists_uuids.values()]) {
			await SQLPlaylists.insert_track_playlist({ uuid: playlist_uuid, track_uid: _track!.uid });
		}
		close();
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title={"Add To Playlists"} />
			<IImage
				source={_track?.playback?.artwork}
				resizeMode="cover"
				style={{
					width: "100%",
					height: "21%",
					opacity: 0.7
				}}
			/>
			<Text numberOfLines={1} style={{ marginHorizontal: 20, bottom: 60, color: colors.text, fontWeight: "bold", fontSize: 24 }}>
				{_track?.title || ""}
			</Text>
			<Text style={{ marginHorizontal: 20, bottom: 62, color: colors.text, fontSize: 14 }}>{artist_string(_track!)}</Text>
			<View style={{ height: 10 }} />
			<FlatList style={{ bottom: 45 }} data={playlists_data} renderItem={render_playlist_item} />
			<TouchableOpacity style={{ width: "90%", alignSelf: "center", height: 60, backgroundColor: colors.primary, borderRadius: 50, bottom: 30, alignItems: "center", justifyContent: "center" }} onPress={async () => save_selection()}>
				<Text style={{ color: colors.text, fontSize: 24, fontWeight: "600" }}>Save</Text>
			</TouchableOpacity>
		</View>
	);
}
