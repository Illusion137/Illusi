import { View, Text, TouchableHighlight, StyleSheet } from "react-native";
import type { Track } from "@illusive/types";
import type { Prefs } from "@illusive/prefs";
import { sprinkle_into_queue } from "@illusive/illusi/src/play";
import { useState, useMemo } from "react";
import FourTrackArtwork from "./FourTrackArtwork";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import { ContextMenuView } from "@components/ContextMenu";
import { Constants } from "@illusive/constants";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { SharedRouter } from "@utils/shared_routes";
import useDimensions from "@hooks/useDimensions";
export default function DefaultPlaylistComponent(props: { four_track: Track[]; title: string; force_order?: boolean }) {
	const { colors } = usePTheme();
	const { width } = useDimensions();
	const item_size = useMemo(() => width * 0.29, [width]);
	const styles = useMemo(() => theme_styles(colors, item_size), [colors, item_size]);

	const [is_playing_music, set_is_playing_music] = useState(GLOBALS.global_var.is_playing);

	async function navigate() {
		SharedRouter.goto_shared_playlist(props.title, "DEFAULT_PLAYLIST", { force_order: props.force_order ? "1" : "0" });
	}

	return (
		<ContextMenuView
			shouldEnableAggressiveCleanup
			shouldCleanupOnComponentWillUnmountForMenuPreview
			shouldCleanupOnComponentWillUnmountForAuxPreview
			menuConfig={{
				menuTitle: `Illusi Playlist - ${props.title}`,
				menuItems: [
					{
						actionKey: "playlist-sprinkle-in-queue",
						actionTitle: "Sprinke in Queue",
						menuAttributes: is_playing_music ? undefined : ["disabled"],
						icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "square.3.layers.3d.middle.filled" } }
					}
				]
			}}
			onMenuWillShow={() => {
				set_is_playing_music(GLOBALS.global_var.is_playing);
			}}
			onPressMenuItem={async ({ nativeEvent }) => {
				switch (nativeEvent.actionKey) {
					case "playlist-sprinkle-in-queue":
						sprinkle_into_queue(await SQLPlaylists.playlist_tracks(props.title));
						break;
					default:
						break;
				}
			}}>
			<TouchableHighlight onLongPress={() => {}} delayLongPress={Constants.long_press_delay} style={styles.default_playlist_button} onPress={navigate}>
				<View style={{ justifyContent: "center", alignItems: "center" }}>
					<Text style={styles.default_playlist_text}>{props.title}</Text>
					<FourTrackArtwork four_track={props.four_track} size={item_size / 2} dim={true} />
				</View>
			</TouchableHighlight>
		</ContextMenuView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"], item_size: number) =>
	StyleSheet.create({
		default_playlist_text: { color: "white", fontSize: 18, fontWeight: "bold", textAlign: "center", position: "absolute", zIndex: 1 },
		default_playlist_button: { backgroundColor: colors.card, height: item_size, width: item_size, borderRadius: 5, margin: 5, justifyContent: "center" }
	});
