import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { CompactPlaylist } from "@illusive/types";
import type { Track } from "@illusive/types";
import { get_album_artwork, track_exists } from "@illusive/illusive_utils";
import { play, play_track_next, push_track_to_playing_queue } from "@illusive/illusi/src/play";
import { ContextMenuView } from "@components/ContextMenu";
import { useEffect, useState } from "react";
import { GLOBALS } from "@illusive/globals";
import { insert_into_write_playlist } from "@illusive/illusi/src/components/track";
import { Constants } from "@illusive/constants";
import usePTheme from "@hooks/usePTheme";
import { empty_join_dot, single_case } from "@common/utils/util";
import IImage from "./IImage";
import { remove_topic } from "@common/utils/clean_util";
import { SharedRouter } from "@utils/shared_routes";
import useDimensions from "@hooks/useDimensions";

export type SecondLineType = "YEAR" | "ARTIST";
export default function Album(props: { album_data: CompactPlaylist; second_line_type?: SecondLineType; size?: number; other_tracks?: Track[] }) {
	const { width } = useDimensions();
	const size = props.size ?? width * 0.4;
	const { colors } = usePTheme();

	const [target_view_node, set_target_view_node] = useState();

	const [song_libary_saved, set_song_libary_saved] = useState(props.album_data.song_track ? track_exists(props.album_data.song_track, GLOBALS.global_var.sql_tracks) : false);

	const [is_playing_music, set_is_playing_music] = useState(GLOBALS.global_var.is_playing);

	useEffect(() => {
		return () => {
			set_target_view_node(undefined);
		};
	}, []);

	function on_press() {
		if (props.album_data.album_type !== "SONG") {
			SharedRouter.goto_shared_playlist(props.album_data.title.uri ?? "", "URI", { compact_playlist: props.album_data, fs_cache_playlist_as_album: props.album_data.type === "ALBUM" ? "1" : "0" });
		} else if (props.album_data.song_track) {
			play(props.album_data.song_track, "Explore", () => [props.album_data.song_track!, ...(props.other_tracks?.filter((track) => track.uid !== props.album_data.song_track?.uid) ?? [])]);
		}
	}

	const year = new Date(props.album_data.date ?? 0).getFullYear();
	const artist_name = props.album_data.artist?.[0]?.name ?? props.album_data.song_track?.artists?.[0].name ?? "";
	const second_line = (props.second_line_type ?? "YEAR") === "YEAR" ? (year ?? remove_topic(artist_name)) : (remove_topic(artist_name) ?? year);

	return (
		<ContextMenuView
			shouldEnableAggressiveCleanup
			shouldCleanupOnComponentWillUnmountForMenuPreview
			shouldCleanupOnComponentWillUnmountForAuxPreview
			previewConfig={{ targetViewNode: target_view_node }}
			menuConfig={{
				menuTitle: ``,
				menuItems: [
					{
						actionKey: "album-song-enqueue",
						actionTitle: "Enqueue Track",
						icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "text.append" } },
						menuAttributes: !is_playing_music || props.album_data.album_type !== "SONG" ? ["hidden"] : undefined
					},
					{
						actionKey: "album-song-play-next",
						actionTitle: "Play Next",
						icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "text.insert" } },
						menuAttributes: !is_playing_music || props.album_data.album_type !== "SONG" ? ["hidden"] : undefined
					},
					{
						actionKey: "album-song-add-to-library",
						actionTitle: "Add To Library",
						icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "plus" } },
						menuAttributes: props.album_data.album_type !== "SONG" ? ["hidden"] : song_libary_saved ? ["disabled"] : undefined
					},
					{ actionKey: "album-view-artist", actionTitle: "View Artist", icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "music.mic" } } }
				]
			}}
			onMenuWillShow={() => {
				set_is_playing_music(GLOBALS.global_var.is_playing);
				set_song_libary_saved(props.album_data.song_track ? track_exists(props.album_data.song_track, GLOBALS.global_var.sql_tracks) : false);
			}}
			onPressMenuItem={({ nativeEvent }) => {
				switch (nativeEvent.actionKey) {
					case "album-song-enqueue":
						push_track_to_playing_queue(props.album_data.song_track!);
						break;
					case "album-song-play-next":
						play_track_next(props.album_data.song_track!);
						break;
					case "album-song-add-to-library":
						insert_into_write_playlist(props.album_data.song_track!, Constants.library_write_playlist, song_libary_saved, set_song_libary_saved, () => {});
						break;
					case "album-push-to-queue-ordered":
						break;
					case "album-push-to-queue-shuffled":
						break;
					case "album-view-artist":
						SharedRouter.goto_shared_artist(props.album_data.artist[0].uri ?? props.album_data.song_track?.artists[0].uri ?? "");
						break;
					default:
						break;
				}
			}}>
			<TouchableOpacity style={{ padding: 5 }} onPress={on_press} onLongPress={() => {}} delayLongPress={Constants.long_press_delay}>
				<IImage source={get_album_artwork(props.album_data)} style={{ width: size, height: size, borderRadius: 2, borderWidth: 1, borderColor: colors.line }} />
				<View style={{ width: size }}>
					<Text style={{ color: colors.text, fontWeight: "bold", fontSize: 14, paddingTop: 5, width: size }} numberOfLines={1}>
						{props.album_data.title.name}
					</Text>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						{props.album_data.explicit === "EXPLICIT" ? <MaterialIcons name="explicit" size={18} color={colors.secondary} style={{}} /> : null}
						<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 12, top: 0, width: size }}>
							{empty_join_dot([single_case(props.album_data.album_type ?? (props.second_line_type === "ARTIST" ? String(year) : artist_name) ?? "..."), second_line])}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		</ContextMenuView>
	);
}
