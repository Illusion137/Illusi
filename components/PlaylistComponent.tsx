import { useEffect, useState } from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import * as GLOBALS from "@illusive/illusi/src/globals";
import { SQLPlaylists } from '@illusive/sql/sql_playlists';
import FourTrackArtwork from "./FourTrackArtwork";
import { Playlist, Track } from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import { ContextMenuView } from "react-native-ios-context-menu";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";
import { sprinkle_into_queue } from "@illusive/illusi/src/play";
import { Constants } from "@illusive/constants";
import usePTheme from "@hooks/usePTheme";
import { SharedRouter } from "@utils/shared_routes";

export default function PlaylistComponent(props: {
	playlist_data: Playlist;
	select?: {
		mode: boolean;
		track: Track;
	};
	compact?: boolean;
	refresh_data: (update_with?: Playlist) => void;
}) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [pinned, set_pinned] = useState(props.playlist_data.pinned);
	const [is_public, set_is_public] = useState(props.playlist_data.pinned);
	const [disabled, set_disabled] = useState(false);
	const [visual_data, set_visual_data] = useState<Playlist["visual_data"]>();

	const select_mode = props.select?.mode ?? false;
	const compact = props.compact ?? false;
	const [selected, set_selected] = useState(
		GLOBALS.global_var.selected_playlists_uuids.has(
			props.playlist_data.uuid
		)
	);
	const [is_playing_music, set_is_playing_music] = useState(GLOBALS.global_var.is_playing);

	const [target_view_node, set_target_view_node] = useState();
  
	useEffect(() => {
	  	return () => {
			set_target_view_node(undefined);
		}
	}, []);
  
	useEffect(() => {
		set_pinned(props.playlist_data.pinned);
	}, [props.playlist_data.pinned]);
	useEffect(() => {
		set_is_public(props.playlist_data.public);
	}, [props.playlist_data.public]);
	useEffect(() => {
		(async () => {
			if (props.playlist_data.visual_data) {
				const resolved_tracks = await Promise.resolve(
					props.playlist_data.visual_data.four_track
				);
				set_visual_data({
					four_track: resolved_tracks?.slice(0, 4) ?? [],
					track_count: resolved_tracks?.length ?? 0,
				});
			}
		})();
	}, [props.playlist_data]);

	async function is_disabled(): Promise<boolean> {
		if (props.select === undefined) return false;
		return await SQLPlaylists.deep_track_exists_in_playlist(
			props.playlist_data.uuid,
			props.select.track
		);
	}

	useEffect(() => {
		async function init() {
			if (props.select === undefined || disabled === true) return;
			set_disabled(await is_disabled());
		}
		init();
	}, [props.select]);

	function toggle_state() {
		let _selected = !selected;
		set_selected(_selected);
		if (_selected) {
			GLOBALS.global_var.selected_playlists_uuids.add(
				props.playlist_data.uuid
			);
		} else {
			GLOBALS.global_var.selected_playlists_uuids.delete(
				props.playlist_data.uuid
			);
		}
	}

	async function on_press() {
		SharedRouter.goto_shared_playlist(props.playlist_data.uuid, "UUID", {});
	}

	async function toggle_pin() {
		const new_pin = !(props.playlist_data.pinned ?? false);
		await SQLPlaylists.pin_unpin_playlist(
			props.playlist_data.uuid,
			new_pin
		);
		await props.refresh_data({...props.playlist_data, pinned: new_pin});
	}
	async function toggle_public() {
		const new_public = !(props.playlist_data.public ?? false);
		await SQLPlaylists.public_private_playlist(
			props.playlist_data.uuid,
			new_public
		);
		await props.refresh_data({...props.playlist_data, public: new_public});
	}
	async function toggle_archive() {
		const new_archive = !(props.playlist_data.archived ?? false);
		await SQLPlaylists.archive_playlist(
			props.playlist_data.uuid,
			new_archive
		);
		await props.refresh_data({...props.playlist_data, archived: new_archive});
	}
	const confirm_delete = () =>
		if_confirm(
			"Are you sure you want to delete this playlist?",
			"This action can NOT be reversed",
			async () => {
				await SQLPlaylists.delete_playlist(props.playlist_data.uuid);
				await props.refresh_data({...props.playlist_data});
			}
		);

	return (
		<ContextMenuView
			previewConfig={{
				targetViewNode: target_view_node,
			}}
			menuConfig={{
				menuTitle: `Playlist - ${props.playlist_data.title}`,
				menuItems: [
					{
						actionKey: "playlist-sprinkle-in-queue",
						actionTitle: "Sprinke in Queue",
						menuAttributes: is_playing_music ? undefined : ["hidden"],
						icon: {
							type: 'IMAGE_SYSTEM',
							imageValue: {
							 	systemName: 'square.3.layers.3d.middle.filled',
							},
						},
					},
					{
						actionKey: "playlist-pin",
						actionTitle: props.playlist_data.pinned ? "Unpin" : "Pin",
						icon: {
							type: 'IMAGE_SYSTEM',
							imageValue: {
							 	systemName: 'pin',
							},
						}
					},
					{
						actionKey: "playlist-public",
						actionTitle: props.playlist_data.public ? "Make Private" : "Make Public",
						icon: {
							type: 'IMAGE_SYSTEM',
							imageValue: {
							 	systemName: props.playlist_data.public ? "person" : "person.3.sequence",
							},
						}
					},
					{
						actionKey: "playlist-archive",
						actionTitle: props.playlist_data.archived ? "Unarchive" : "Archive",
						icon: {
							type: 'IMAGE_SYSTEM',
							imageValue: {
							 	systemName: 'archivebox',
							},
						}
					},
					{
						actionKey: "playlist-delete",
						actionSubtitle: props.playlist_data.pinned ? "Unable to delete a pinned playlist" : undefined,
						actionTitle: "Delete",
						menuAttributes: props.playlist_data.pinned ? ['disabled', 'destructive'] : ['destructive'],
						icon: {
							type: 'IMAGE_SYSTEM',
							imageOptions: {
                                tint: colors.red,
                                renderingMode: 'alwaysOriginal',
                            },
							imageValue: {
							 	systemName: 'trash',
							},
						}
					},
				],
			}}
			isContextMenuEnabled={select_mode === false}
			onMenuWillShow={() => {
				set_is_playing_music(GLOBALS.global_var.is_playing);
			}}
			onPressMenuItem={async({nativeEvent}) => {
				switch(nativeEvent.actionKey){
					case "playlist-sprinkle-in-queue": sprinkle_into_queue(await SQLPlaylists.playlist_tracks(props.playlist_data.uuid));  break;
					case "playlist-pin": toggle_pin(); break;
					case "playlist-public": toggle_public(); break;
					case "playlist-archive": toggle_archive(); break;
					case "playlist-delete": confirm_delete(); break;
					default: break;
				}
			}}
		>
			<TouchableOpacity
				disabled={disabled}
				style={{
					...styles.button,
					opacity: disabled ? 0.5 : 1.0,
					height: compact ? 55 : 80,
				}}
				onLongPress={() => {}} delayLongPress={Constants.long_press_delay}
				onPress={select_mode ? toggle_state : on_press}
				onLayout={!target_view_node && (({nativeEvent}: any) => {
					set_target_view_node(nativeEvent.target)
				})}
				// onLongPress={select_mode ? () => {} : on_hold}
			>
				<>
					<View style={{ width: 15 }} />
					<FourTrackArtwork
						thumbnail_uri={props.playlist_data.thumbnail_uri}
						four_track={visual_data?.four_track ?? []}
						size={compact ? 22 : 35}
					/>
					<View style={{ flexDirection: "column", left: 25 }}>
						<Text style={{ color: colors.text, fontSize: 15 }}>
							{props.playlist_data.title}
						</Text>
						<View style={{ flexDirection: "row", top: 5, alignItems: 'center' }}>
							{pinned ? (
								<MaterialIcons
								name="push-pin"
								size={22}
								color={colors.primary}
								/>
							) : null}
							<Text style={{ color: colors.subtext }}>
								{visual_data?.track_count ?? 0} Tracks
							</Text>
							{is_public ? (
								<MaterialIcons
									name="person"
									size={22}
									color={colors.primary}
									style={{left: 5}}
								/>
							) : null}
						</View>
					</View>
					{!select_mode ? null : (
						<View
							style={{
								flex: 1,
								justifyContent: "flex-end",
								alignItems: "center",
							}}
						>
							<Ionicons
								name={"checkmark"}
								size={22}
								color={selected ? colors.green : "#808080"}
								style={{ left: 80 }}
							/>
						</View>
					)}
				</>
			</TouchableOpacity>
			<View
				style={{
					width: "100%",
					height: 1,
					marginLeft: 90,
					backgroundColor: colors.line,
				}}
			/>
		</ContextMenuView>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		button: {
			width: "100%",
			alignItems: "center",
			backgroundColor: colors.track,
			flexDirection: "row",
		},
		notfound: {
			width: 70,
			height: 70,
			borderRadius: 5,
			left: 15,
		},
	});
