import { useIsFocused } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { upload_music_files } from "@illusive/document_picker";
import type { Prefs } from "@illusive/prefs";
import type { EditMode, HexColor } from "@illusive/types";
import { TRACK_QUERY_FLAGS } from "@illusive/query_flags";
import SearchBarV1 from "@components/SearchBarV1";
import usePTheme from "@hooks/usePTheme";
import LibraryTrackList from "@components/LibraryTrackList";
import { IoniconsTouchableOpacity } from "@components/TouchableIconOpacity";
import { ContextMenuButton } from "@components/ContextMenu";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { menuconfig_local_playlist } from "@utils/context_menu";
import { GLOBALS } from "@illusive/globals";
import { presentShortcut, type ShortcutOptions } from "react-native-siri-shortcut";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { batch_download_track_lyrics, download_track_list } from "@illusive/downloader";
import { Constants } from "@illusive/constants";
import type { ContextMenuNativeEvent } from "@components/ContextMenu/types";

export default function Library() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [edit_mode, set_edit_mode] = useState<EditMode>("NONE");

	const edit_mode_colors: Record<EditMode, HexColor> = { NONE: colors.inactive as HexColor, DOWNLOAD: colors.primary as HexColor, DELETE: colors.red as HexColor, EDIT: colors.orange as HexColor };

	const library_ref = useRef<{ refresh_data: (query?: string) => Promise<void> }>(null);
	const is_focused = useIsFocused();

	function get_shortcut(): ShortcutOptions {
		return {
			activityType: "com.illusion137.Illusi.ShuffleMusic",
			persistentIdentifier: "com.illusion137.Illusi.ShuffleMusic",
			title: "Shuffle Shortcut " + "Library",
			isEligibleForHandoff: true,
			isEligibleForPrediction: true,
			isEligibleForPublicIndexing: true,
			isEligibleForSearch: true,
			keywords: ["Shuffle", "Music", "Illusi"],
			requiredUserInfoKeys: [Constants.library_write_playlist],
			userInfo: { uuid: Constants.library_write_playlist },
			description: "Shuffles Playlist"
		};
	}

	async function run_context_menu(action_key: string) {
		switch (action_key) {
			case "playlist-actions-default-mode":
				set_edit_mode("NONE");
				break;
			case "playlist-actions-download-mode":
				set_edit_mode("DOWNLOAD");
				break;
			case "playlist-actions-delete-mode":
				set_edit_mode("DELETE");
				break;
			case "playlist-actions-batch-download-media":
				await download_track_list(GLOBALS.global_var.sql_tracks);
				break;
			case "playlist-actions-batch-download-thumbnails":
				await SQLTracks.restore_thumbnail_cache(GLOBALS.global_var.sql_tracks);
				GLOBALS.global_var.bottom_alert("Downloaded all available thumbnails", "INFO");
				break;
			case "playlist-actions-batch-download-lyrics":
				await batch_download_track_lyrics(GLOBALS.global_var.sql_tracks);
				GLOBALS.global_var.bottom_alert("Downloaded all available lyrics", "INFO");
				break;
			case "playlist-actions-shortcut":
				presentShortcut(get_shortcut(), (data) => data);
				break;
		}
	}

	return (
		<View style={styles.top_container}>
			<View style={styles.header}>
				<Text style={styles.top_text}>My Library</Text>
				<View style={styles.search_container}>
					<ContextMenuButton menuConfig={menuconfig_local_playlist(edit_mode, colors, GLOBALS.global_var.sql_tracks)} onPressMenuItem={async (e: ContextMenuNativeEvent) => run_context_menu(e.nativeEvent.actionKey)}>
						<MaterialCommunityIcons name="pencil" size={25} color={edit_mode_colors[edit_mode]} style={{ bottom: 6, left: 3 }} />
					</ContextMenuButton>
					<View style={{ width: "75%", bottom: 5, right: 10 }}>
						<SearchBarV1 placeholder="Search My Library" query_flags={TRACK_QUERY_FLAGS} onChangeText={async (query) => library_ref.current?.refresh_data(query)} />
					</View>
					<IoniconsTouchableOpacity icon_name="cloud-upload" icon_size={25} icon_color={colors.inactive} style={{ bottom: 4 }} on_press={upload_music_files} />
				</View>
			</View>
			<LibraryTrackList edit_mode={edit_mode} ref={library_ref} is_focused={is_focused} />
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		top_container: { backgroundColor: colors.background, flex: 1, justifyContent: "flex-start" },
		header: { backgroundColor: colors.shelf, width: "100%", height: "18%", top: 0, justifyContent: "flex-end", alignItems: "center", zIndex: 2 },
		top_text: { bottom: 20, color: colors.text, fontSize: 18, fontWeight: "500" },
		search_input: {
			backgroundColor: colors.searchInput,
			color: colors.text,
			width: "75%",
			bottom: 10,
			paddingLeft: 10,
			fontSize: 15,
			borderTopRightRadius: 10, // Top Right Corner
			borderBottomRightRadius: 10 // Bottom Right Corner
		},
		search_container: { justifyContent: "space-evenly", alignItems: "center", height: "24%", left: -5, width: "100%", flexDirection: "row" },
		icon: { overflow: "hidden", backgroundColor: colors.searchInput, paddingTop: 5, paddingLeft: 5, paddingRight: 5, bottom: 10, left: 10, borderRadius: 10, zIndex: 1 }
	});
