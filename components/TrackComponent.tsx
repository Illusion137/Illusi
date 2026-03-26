import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, type DimensionValue } from "react-native";
import type { Prefs } from "@illusive/prefs";
import type { EditMode, Track } from "@illusive/types";
import { play } from "@illusive/illusi/src/play";
import { delete_track, insert_into_write_playlist, download_track } from "@illusive/illusi/src/components/track";
import { Constants } from "@illusive/constants";
import { IoniconsTouchableOpacity } from "./TouchableIconOpacity";
import { ContextMenuView, type MenuConfig } from "react-native-ios-context-menu";
import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { ContextResolver } from "@utils/context_resolver";
import { reinterpret_cast } from "../lib-origin/common/cast";
import TrackComponentBase from "./TrackComponentBase";
import { TrackContextMenu } from "@utils/context_menu";
import { track_downloader } from "@illusive/downloader";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";

// TODO crown top tracks
function TrackComponent(props: { track_data: Track; write_playlist_uuid?: typeof Constants.library_write_playlist | (string & {}); from?: string; playlist_uuid?: string; edit_mode?: EditMode; display_plays?: boolean; track_callback?: () => Track[]; width_fn?: () => DimensionValue | undefined; replace_album_with?: keyof Track; base_background?: boolean }) {
	const [track_data, set_track_data] = useState(props.track_data);

	const [is_downloading, set_is_downloading] = useState(GLOBALS.downloading.findIndex((item) => item.uid == props.track_data.uid) !== -1);
	const [is_downloaded, set_is_downloaded] = useState(!is_empty(props.track_data.media_uri));
	const [playlist_saved, set_playlist_saved] = useState(((props.track_data.downloading_data?.playlist_saved ?? false) && props.write_playlist_uuid !== Constants.library_write_playlist) || ((props.track_data.downloading_data?.saved ?? false) && props.write_playlist_uuid === Constants.library_write_playlist));
	const [downloading_progress, set_downloading_progress] = useState(0);

	const [context_menu, set_context_menu] = useState<MenuConfig>(TrackContextMenu.track_component_context_menu(props.track_data, props.write_playlist_uuid ?? ""));
	const [target_view_node, set_target_view_node] = useState();

	const disabled_from_write_playlist = props.write_playlist_uuid !== undefined && props.write_playlist_uuid !== Constants.library_write_playlist;
	const notdisabled_from_write_playlist = disabled_from_write_playlist ? !is_empty(props.track_data.media_uri) : false;
	const disabled_from_edit_mode = props.edit_mode !== undefined && props.edit_mode !== "NONE";

	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const outer_interval = useRef<ReturnType<typeof setInterval> | null>(null);
	const inner_interval = useRef<ReturnType<typeof setInterval> | null>(null);
	useEffect(() => {
		outer_interval.current = setInterval(() => {
			const is_currently_downloading_track = track_downloader?.get(props.track_data.uid);
			if (is_currently_downloading_track !== undefined) {
				set_is_downloading(true);
				set_downloading_progress(is_currently_downloading_track.progress ?? 0);
				inner_interval.current = setInterval(() => {
					const is_currently_downloading_track_inner = track_downloader?.get(props.track_data.uid);
					if (!is_currently_downloading_track_inner || !track_downloader.in_pop_range(props.track_data.uid)) {
						set_is_downloading(false);
						if (inner_interval.current !== null) {
							clearInterval(inner_interval.current);
							inner_interval.current = null;
						}
						const idx = GLOBALS.global_var.sql_tracks.findIndex((item) => item.uid === props.track_data.uid);
						if (idx !== -1 && !is_empty(GLOBALS.global_var.sql_tracks[idx].media_uri)) set_is_downloaded(true);
						return;
					}
					set_downloading_progress(is_currently_downloading_track_inner.progress ?? 0);
				}, 100);
				if (outer_interval.current !== null) {
					clearInterval(outer_interval.current);
					outer_interval.current = null;
				}
			}
		}, 1500);
		return () => {
			if (outer_interval.current !== null) clearInterval(outer_interval.current);
			if (inner_interval.current !== null) clearInterval(inner_interval.current);
		};
	}, []);

	useEffect(() => {
		(async () => {
			if (props.write_playlist_uuid && props.write_playlist_uuid !== Constants.library_write_playlist) {
				const temp_track_data = track_data;
				const new_track_data = {
					...temp_track_data,
					downloading_data: {
						saved: true,
						progress: 0,
						playlist_saved: await SQLPlaylists.track_exists_in_playlist({ uuid: props.write_playlist_uuid, track_uid: temp_track_data.uid })
					}
				};
				set_track_data(new_track_data);
				set_playlist_saved(((new_track_data.downloading_data?.playlist_saved ?? false) && props.write_playlist_uuid !== Constants.library_write_playlist) || ((new_track_data.downloading_data?.saved ?? false) && props.write_playlist_uuid === Constants.library_write_playlist));
			}
		})();
		return () => {
			set_target_view_node(undefined);
		};
	}, []);

	useEffect(() => {
		set_track_data(props.track_data);
	}, [props.track_data]);

	async function on_press() {
		if (notdisabled_from_write_playlist) {
			const clone: Track = JSON.parse(JSON.stringify(props.track_data));
			const track: Track = { ...clone, meta: { ...clone.meta!, begdur: clone.duration * 0.2 } };
			GLOBALS.global_var.play_tracks(track, [track], "Write Playlist");
		} else if (props.from !== undefined && props.track_callback !== undefined) play(props.track_data, props.from, props.track_callback);
	}

	return (
		<ContextMenuView
			shouldEnableAggressiveCleanup
			shouldCleanupOnComponentWillUnmountForMenuPreview
			shouldCleanupOnComponentWillUnmountForAuxPreview
			previewConfig={{ targetViewNode: target_view_node }}
			menuConfig={context_menu}
			onMenuWillShow={() => {
				set_context_menu(TrackContextMenu.track_component_context_menu(props.track_data, props.write_playlist_uuid ?? props.playlist_uuid ?? ""));
			}}
			onPressMenuItem={async ({ nativeEvent }) => {
				ContextResolver.resolve_track_context(props.track_data, props.write_playlist_uuid, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
			}}>
			<TrackComponentBase
				track_data={props.track_data}
				active_opacity={disabled_from_write_playlist ? 0.9 : 0.2}
				width_fn={props.width_fn}
				disabled={disabled_from_edit_mode || (disabled_from_write_playlist && !notdisabled_from_write_playlist)}
				style={{ opacity: props.write_playlist_uuid !== undefined && props.write_playlist_uuid !== Constants.library_write_playlist && playlist_saved ? 0.5 : 1 }}
				on_press={on_press}
				on_long_press={() => {}}
				base_background={props.base_background}
				replace_album_with={props.replace_album_with}>
				{props.write_playlist_uuid !== undefined && props.playlist_uuid !== Constants.library_write_playlist ? (
					<IoniconsTouchableOpacity
						on_press={() => {
							insert_into_write_playlist(props.track_data, props.write_playlist_uuid, playlist_saved, set_playlist_saved);
						}}
						style={{ ...styles.centered, paddingRight: 30 }}
						icon_name={!playlist_saved ? "add" : "checkmark"}
						icon_size={30}
						icon_color={colors.primary}
						icon_style={{ left: 40 }}
					/>
				) : null}
				{props.edit_mode === "DOWNLOAD" && !is_downloaded && is_empty(props.track_data.imported_id) && !is_downloading ? <IoniconsTouchableOpacity on_press={async () => download_track(props.track_data, false, is_downloading, set_is_downloading, set_is_downloaded)} style={styles.centered} icon_name="download" icon_size={30} icon_color={colors.primary} icon_style={{ left: 30 }} /> : null}
				{is_downloading ? <Text style={{ color: "white", alignSelf: "flex-end", right: 10, bottom: 10 }}>{Math.floor(downloading_progress * 100)}%</Text> : null}
				{props.edit_mode === "DELETE" && !is_downloading ? <IoniconsTouchableOpacity on_press={async () => delete_track(props.track_data, props.write_playlist_uuid)} style={styles.centered} icon_name="trash" icon_size={30} icon_color={colors.red} icon_style={styles.else_icon} /> : null}
				{props.edit_mode === "NONE" && (props.display_plays ?? false) ? <Text style={{ color: colors.text, left: 30, fontWeight: "800", fontSize: 25, alignSelf: "center" }}>{props.track_data.meta?.plays ?? 0}</Text> : null}
			</TrackComponentBase>
		</ContextMenuView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		track_box: {
			width: "100%",
			height: 60,
			flexDirection: "row"
		},
		image: {
			left: 10,
			height: 48,
			width: 52,
			borderRadius: 2,
			resizeMode: "cover"
		},
		text: {
			width: "65%",
			top: 5,
			left: 20
		},
		title: {
			color: colors.title,
			fontSize: 15
		},
		artist: {
			color: colors.subtext,
			fontSize: 14
		},
		album: {
			color: colors.deeptext,
			fontSize: 12,
			top: 1,
			marginRight: 4
		},
		line: {
			height: 1,
			backgroundColor: colors.line,
			width: "90%",
			left: 85
		},
		icon_thin: {
			marginRight: 5
		},
		icon_thick: {
			marginRight: 3
		},
		else_icon: {
			right: 10,
			paddingTop: 10,
			paddingBottom: 10,
			paddingLeft: 30,
			paddingRight: 30
		},
		centered: {
			justifyContent: "center"
		}
	});

export default TrackComponent;
