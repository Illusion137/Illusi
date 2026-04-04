import React, { useEffect } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SelectList } from "react-native-dropdown-select-list";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import { GLOBALS } from "@illusive/globals";
import type { Prefs } from "@illusive/prefs";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";
import { batch_download } from "@illusive/downloader";
import { is_empty } from "@common/utils/util";
import { Constants } from "@illusive/constants";
import { Illusive } from "@illusive/illusive";
import { ExampleObj } from "@illusive/example_objs";
import usePTheme from "@hooks/usePTheme";

export default function ExtraBatchDownloaderScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [downloading_tracks_data, set_downloading_tracks_data] = React.useState([...GLOBALS.downloading]);
	const [selected_key, set_selected_key] = React.useState("");
	const [playlist_download_data, set_playlist_download_data] = React.useState<{ key: string; value: string }[]>([]);

	async function download_playlist() {
		if (is_empty(selected_key)) {
			return;
		}
		batch_download(selected_key);
	}

	useEffect(() => {
		(async function () {
			const playlists = await SQLPlaylists.all_playlists_data();
			const playlists_entries: { key: string; value: string }[] = [];
			playlists_entries.push({ key: Constants.library_write_playlist, value: "Library" });
			for (const entry of playlists) {
				playlists_entries.push({ key: entry.uuid, value: entry.title });
			}
			set_playlist_download_data(playlists_entries);
		})();
		const interval = setInterval(() => {
			set_downloading_tracks_data([...GLOBALS.downloading]);
		}, 100);

		return () => clearInterval(interval);
	}, []);

	const render_header_item = (_: { item: any }) => (
		<>
			<Text style={{ color: "white", alignSelf: "flex-end", right: 10, width: "95%", fontWeight: "bold" }}>
				{downloading_tracks_data.length} Tracks Remaining • {Illusive.convert_track_default_opts(ExampleObj.track_example0, {}).to_music_service}
			</Text>
			<View style={{ height: 8 }} />
			<View style={styles.linelong} />
			<View style={{ height: 30 }} />
		</>
	);
	const render_item = (item: { item: { uid: string; progress: number } }) => (
		<>
			<View style={{ height: 8 }} />
			<View style={{ flexDirection: "row" }}>
				<Text numberOfLines={1} style={{ color: "#aaaaaa", width: "88%" }}>
					{item.item.uid.replace(/-.+/, "")}:
				</Text>
				<Text style={{ color: "white", alignSelf: "flex-end" }}>{item.item.progress}%</Text>
			</View>
			<View style={{ height: 8 }} />
			<View style={styles.linelong} />
		</>
	);

	return (
		<View style={{ backgroundColor: colors.background, width: "100%", flex: 1 }}>
			<SelectList
				setSelected={(key: string) => set_selected_key(key)}
				data={playlist_download_data}
				save="key"
				arrowicon={<></>}
				searchicon={<></>}
				searchPlaceholder={"Select Playlist"}
				placeholder="Select Playlist"
				inputStyles={{ backgroundColor: colors.track, color: "white" }}
				boxStyles={{ backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5 }}
				dropdownStyles={{ backgroundColor: colors.track }}
				dropdownTextStyles={{ color: "white" }}
			/>
			{is_empty(selected_key) ? null : <ExtrasSectionButton show_arrow={false} text="Download From Playlist" icon="archive-outline" onPress={async () => await if_confirm("Download Tracks in Playlist", "Are You Sure?", download_playlist)} />}
			<View style={{ height: 15 }} />
			<FlatList data={downloading_tracks_data} ListHeaderComponent={render_header_item} renderItem={render_item} />
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({ descriptiontxt: { color: colors.subtext, marginTop: 10, marginBottom: 20, marginHorizontal: 12, textAlign: "left" }, linelong: { width: "100%", height: 0.4, opacity: 0.2, backgroundColor: colors.line } });
