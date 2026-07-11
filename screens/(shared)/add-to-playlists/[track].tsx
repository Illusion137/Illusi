import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { GLOBALS } from "@illusive/globals";
import type { Playlist } from "@illusive/types";
import type { Track } from "@illusive/types";
import { artist_string, track_exists } from "@illusive/illusive_utils";
import { selection_store } from "@illusive/stores/selection_store";
import { reinterpret_cast } from "@common/cast";
import type { ResponseError } from "@common/types";
import PlaylistComponent from "@components/PlaylistComponent";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import type { Prefs } from "@illusive/prefs";
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
	const styles = theme_styles(colors);

	const [playlists_data, set_playlists_data] = useState<Playlist[]>([]);
	const [already_in_uuids, set_already_in_uuids] = useState<Set<string>>(new Set<string>());
	const [saving, set_saving] = useState(false);

	useEffect(() => {
		(async () => {
			const [playlists, containing] = await Promise.all([SQLPlaylists.all_playlists_data(), SQLPlaylists.playlists_containing_track(_track!.uid)]);
			const ordered_playlists: Playlist[] = sort_playlists(playlists);
			set_already_in_uuids(containing);
			set_playlists_data(ordered_playlists);
		})();
	}, []);

	const render_playlist_item = useCallback((item: { item: Playlist }) => <PlaylistComponent playlist_data={item.item} select={{ mode: true, track: _track!, already_in: already_in_uuids.has(item.item.uuid) }} />, [_track, already_in_uuids]);
	const key_extractor = useCallback((item: Playlist) => item.uuid, []);

	function close() {
		if (!router.canDismiss()) return;
		selection_store.getState().clear_selected_playlists();
		router.dismiss();
	}

	async function save_selection() {
		if (saving) return;
		set_saving(true);
		try {
			if (!track_exists(_track!, GLOBALS.global_var.sql_tracks)) {
				await SQLTracks.insert_track(_track!);
			}
			const selected_uuids = [...selection_store.getState().selected_playlists_uuids];
			await SQLPlaylists.insert_all_tracks_playlist(selected_uuids.map((playlist_uuid) => ({ uuid: playlist_uuid, track_uid: _track!.uid })));
			close();
		} catch (error) {
			GLOBALS.global_var.bottom_alert("Failed to add to playlists", "ERROR", reinterpret_cast<ResponseError>({ error }));
			set_saving(false);
		}
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title={"Add To Playlists"} />
			<View style={styles.header_wrap}>
				<IImage source={_track?.playback?.artwork} resizeMode="cover" style={styles.header_image} blur={{ intensity: 18, tint: "dark" }} fade={{ percent: "100%", middle_opacity: 0.35, end_opacity: 1 }} />
				<View style={styles.header_content}>
					<IImage source={_track?.playback?.artwork} resizeMode="cover" style={styles.header_artwork} />
					<View style={styles.header_text_wrap}>
						<Text style={styles.caption}>ADD TO PLAYLIST</Text>
						<Text numberOfLines={1} style={styles.header_title}>
							{_track?.title || ""}
						</Text>
						<Text numberOfLines={1} style={styles.header_artist}>
							{artist_string(_track!)}
						</Text>
					</View>
				</View>
			</View>
			<Text style={styles.section_label}>YOUR PLAYLISTS</Text>
			<View style={styles.section_divider} />
			<FlatList
				style={{ flex: 1 }}
				contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
				data={playlists_data}
				renderItem={render_playlist_item}
				keyExtractor={key_extractor}
				initialNumToRender={12}
				maxToRenderPerBatch={12}
				windowSize={7}
				removeClippedSubviews
			/>
			<TouchableOpacity activeOpacity={0.85} disabled={saving} style={{ ...styles.save_btn, opacity: saving ? 0.6 : 1 }} onPress={async () => save_selection()}>
				<Text style={styles.save_btn_text}>Save</Text>
				<Ionicons name="chevron-forward" size={22} color={colors.text} style={{ marginLeft: 8 }} />
			</TouchableOpacity>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		header_wrap: { width: "100%", height: 150, overflow: "hidden" },
		header_image: { width: "100%", height: "100%", position: "absolute" },
		header_content: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 8 },
		header_artwork: { width: 90, height: 90, borderRadius: 2, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.shelf },
		header_text_wrap: { flex: 1, marginLeft: 14, justifyContent: "center" },
		caption: { color: colors.primary, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginBottom: 4 },
		header_title: { color: colors.text, fontWeight: "bold", fontSize: 22 },
		header_artist: { color: colors.subtext, fontSize: 14, marginTop: 2 },
		section_label: { color: colors.subtext, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 14, marginLeft: 18, marginBottom: 6 },
		section_divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginHorizontal: 18, marginBottom: 4 },
		save_btn: {
			position: "absolute",
			bottom: 30,
			width: "90%",
			alignSelf: "center",
			height: 58,
			backgroundColor: colors.primary,
			borderRadius: 32,
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			shadowColor: "#000",
			shadowOpacity: 0.35,
			shadowRadius: 14,
			shadowOffset: { width: 0, height: 6 },
			elevation: 8
		},
		save_btn_text: { color: colors.text, fontSize: 20, fontWeight: "600", letterSpacing: 0.3 }
	});
