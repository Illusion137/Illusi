import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Platform } from "react-native";
import useDimensions from "@hooks/useDimensions";
import TrackComponent from "@components/TrackComponent";
import BigList from "react-native-big-list";
import { useIsFocused } from "@react-navigation/native";
import { Prefs } from "@illusive/prefs";
import { GLOBALS } from "@illusive/globals";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import type { EditMode, NamedUUID, Track } from "@illusive/types";
import type * as Types from "@illusive/types";
import { BlurView } from "expo-blur";
import FourTrackArtwork from "@components/FourTrackArtwork";
import ShufflePlayButton from "@components/ShufflePlayButton";
import { default_playlists } from "@illusive/default_playlists";
import { Illusive } from "@illusive/illusive";
import { music_service_uri_to_music_service, split_uri, track_query_filter, tracks_duration_string } from "@illusive/illusive_utils";
import { empty_join_dot, is_empty, json_catch } from "@common/utils/util";
import { Constants } from "@illusive/constants";
import { AntDesignTouchableOpacity, FontAwesomeTouchableOpacity, IoniconsTouchableOpacity, MaterialCommunityIconsTouchableOpacity } from "@components/TouchableIconOpacity";
import { alert_error } from "@illusive/illusi/src/alert";
import type { ShortcutOptions } from "react-native-siri-shortcut";
import { presentShortcut } from "react-native-siri-shortcut";
import { share_item } from "@illusive/illusi/src/illusi_utils";
import type { ResponseError } from "@common/types";
import { Ionicons } from "@expo/vector-icons";
import type { MenuConfig } from "@components/ContextMenu";
import { ContextMenuButton } from "@components/ContextMenu";
import LibraryTrackList from "@components/LibraryTrackList";
import SearchBarV1 from "@components/SearchBarV1";
import { TRACK_QUERY_FLAGS } from "@illusive/query_flags";
import { batch_download_track_lyrics, download_track_list } from "@illusive/downloader";
import { debounce } from "lodash";
import usePTheme from "@hooks/usePTheme";
import { router, useFocusEffect } from "expo-router";
import { BASE_WIDTH_FN } from "@components/TrackComponentBase";
import { PlaylistPage } from "@illusive/playlist_page";
import useGlobalTracksRefresh from "@hooks/useGlobalTracksRefresh";
import { LinearGradient } from "expo-linear-gradient";
import NavLink from "@components/NavLink";
import IImage from "@components/IImage";
import { SQLArtists } from "@illusive/sql/sql_artists";
import { menuconfig_local_playlist } from "@utils/context_menu";

let search_query = "";
let tracks_ref: Track[] = [];

export type PlaylistType = "DEFAULT_PLAYLIST" | "URI" | "UUID" | "WRITE_PLAYLIST" | "TRACKS_LIST";

export interface PlaylistDefaultPlaylistProps {
	type: "DEFAULT_PLAYLIST";
	default_playlist_title: string;
	force_order: boolean;
}
export interface PlaylistURIProps {
	type: "URI";
	uri: string;
	compact_playlist?: Types.CompactPlaylist;
	cache_as_album: boolean;
}
export interface PlaylistUUIDProps {
	type: "UUID";
	uuid: string;
}
export interface PlaylistWritePlaylistProps {
	type: "WRITE_PLAYLIST";
	write_playlist_uuid: string;
	serialized_playlist_data: Types.SerializedCompactPlaylistData;
}
export interface PlaylistTracksListProps {
	type: "TRACKS_LIST";
	title: string;
	tracks: Track[];
}
export type PlaylistProps = PlaylistDefaultPlaylistProps | PlaylistURIProps | PlaylistUUIDProps | PlaylistWritePlaylistProps | PlaylistTracksListProps;

export default function PlaylistBase(props: PlaylistProps) {
	const force_order = props.type === "DEFAULT_PLAYLIST" && (props.force_order ?? false);
	const force_hide_audioplayer = props.type === "WRITE_PLAYLIST" && props.write_playlist_uuid !== Constants.library_write_playlist;
	const pre_always_shuffle = Prefs.get_pref("always_shuffle");
	const pre_hide_audioplayer = Prefs.get_pref("play_without_popup");

	const writing_from_library: boolean = props.type === "WRITE_PLAYLIST" && props.serialized_playlist_data?.type === Constants.library_write_playlist;

	const { colors, dark } = usePTheme();
	const styles = theme_styles(colors);
	const { width, height } = useDimensions();

	const artwork_size = useMemo(() => width / 2, [width]);
	const artwork_top_offset = useMemo(() => -height / 6, [height]);

	const library_ref = useRef<typeof LibraryTrackList>(null);

	const [playlist_data, set_playlist_data] = useState<Types.Playlist & { creator?: NamedUUID[] }>();
	const [initial_tracks, set_initial_tracks] = useState<Track[]>([]);
	const [tracks, set_tracks] = useState<Track[]>([]);
	const [edit_mode_state, set_edit_mode_state] = useState<EditMode>("NONE");
	const [continuation, set_continuation] = useState<unknown>();
	const [search_query_state, set_search_query_state] = useState<string>("");
	const filtered_tracks = track_query_filter(tracks, search_query_state);

	function getShortcut(): ShortcutOptions {
		const key = props.type === "UUID" ? props.uuid : props.type === "DEFAULT_PLAYLIST" ? props.default_playlist_title : "";
		return {
			activityType: "com.illusion137.Illusi.ShuffleMusic",
			persistentIdentifier: "com.illusion137.Illusi.ShuffleMusic",
			title: "Shuffle Shortcut " + playlist_data?.title,
			isEligibleForHandoff: true,
			isEligibleForPrediction: true,
			isEligibleForPublicIndexing: true,
			isEligibleForSearch: true,
			keywords: ["Shuffle", "Music", "Illusi"],
			requiredUserInfoKeys: [key],
			userInfo: { uuid: key },
			description: "Shuffles Playlist"
		};
	}

	const menuconfig_external_playlist: MenuConfig = {
		menuTitle: "",
		menuItems: [
			{ actionKey: "playlist-actions-save-to-playlist", actionTitle: "Save Playlist", icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "list.bullet" } } },
			{ actionKey: "playlist-actions-add-tracks-to-library", actionTitle: "Add Tracks To Library", icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "books.vertical" } } }
		]
	};

	const is_focused = useIsFocused();
	useEffect(() => {
		search_query = "";
		if (force_order) Prefs.prefs.always_shuffle.current_value = false;
		if (force_hide_audioplayer) Prefs.prefs.play_without_popup.current_value = true;
		initial_data();
		return () => exit_handler();
	}, []);
	useGlobalTracksRefresh(refresh_data);
	useFocusEffect(
		useCallback(() => {
			search_query = "";
			refresh_data();
		}, [])
	);

	const on_debounce_uri_refresh = debounce(() => {
		(async () => {
			set_tracks((tracks_state) => SQLTracks.add_playback_saved_data_to_tracks(tracks_state));
		})();
	}, 1000);

	function exit_handler() {
		if (force_order) Prefs.prefs.always_shuffle.current_value = pre_always_shuffle;
		if (force_hide_audioplayer) Prefs.prefs.play_without_popup.current_value = pre_hide_audioplayer;
		search_query = "";
	}

	async function initial_data() {
		tracks_ref = [];
		let initial: PlaylistPage.PlaylistInitialData = await PlaylistPage.playlist_initial_data_default_playlist("Unknown");
		switch (props.type) {
			case "DEFAULT_PLAYLIST":
				initial = await PlaylistPage.playlist_initial_data_default_playlist(props.default_playlist_title);
				break;
			case "UUID":
				initial = (await PlaylistPage.playlist_initial_data_uuid(props.uuid)) ?? initial;
				break;
			case "URI":
				initial = await PlaylistPage.playlist_initial_data_uri(props.uri, props.cache_as_album);
				break;
			case "WRITE_PLAYLIST":
				initial = await PlaylistPage.playlist_initial_data_write_playlist_uuid(props.serialized_playlist_data);
				break;
			case "TRACKS_LIST":
				initial = await PlaylistPage.playlist_initial_data_tracks_list(props.title, props.tracks);
		}
		set_playlist_data(initial.playlist_data);
		initial.initial_tracks = await initial.initial_tracks;
		if (initial.initial_tracks.length > 0) {
			tracks_ref = initial.initial_tracks;
			set_initial_tracks(initial.initial_tracks);
			set_tracks(initial.initial_tracks);
		}
		set_continuation((await initial.continuation) ?? null);
		if (initial.error) {
			alert_error(initial.error);
		}
	}

	async function refresh_data(query?: string) {
		if (writing_from_library) return;

		search_query = query ?? search_query ?? "";
		set_search_query_state(search_query);

		if (props.type === "URI") {
			on_debounce_uri_refresh();
			return;
		}
		if (props.type === "TRACKS_LIST") {
			const refreshed_tracks = SQLTracks.add_playback_saved_data_to_tracks(props.tracks);
			tracks_ref = refreshed_tracks;
			set_tracks(refreshed_tracks);
			return;
		}
		if ((tracks.length === 0 && props.type !== "WRITE_PLAYLIST") || props.type === "UUID") {
			let playlist_tracks = initial_tracks;
			if (props.type === "DEFAULT_PLAYLIST") {
				const title = props.default_playlist_title;
				const default_playlist = default_playlists.find((playlist) => playlist.name === title)!;
				playlist_tracks = await default_playlist.track_function();
			} else if (props.uuid) {
				playlist_tracks = await SQLPlaylists.playlist_tracks(props.uuid);
			}
			tracks_ref = playlist_tracks;
			set_tracks(playlist_tracks);
		}
		if (props.type === "WRITE_PLAYLIST") {
			await SQLPlaylists.add_saved_data_to_write_playlist_tracks(props.write_playlist_uuid, props.serialized_playlist_data?.tracks ?? []);
			set_tracks(props.serialized_playlist_data?.tracks ?? []);
		} else if (props.type === "DEFAULT_PLAYLIST") {
			const title = props.default_playlist_title;
			const default_playlist = default_playlists.find((playlist) => playlist.name === title)!;
			set_tracks(await default_playlist.track_function());
		}
	}
	async function try_continuation() {
		if (!is_empty(continuation) && props.type === "URI") {
			const split = split_uri(props.uri);
			const playlist_continuation: Types.MusicServicePlaylistContinuation | ResponseError = await Illusive.music_service.get(music_service_uri_to_music_service(split[0]))!.get_playlist_continuation!(continuation).catch(json_catch);
			if ("error" in playlist_continuation) {
				alert_error(playlist_continuation as ResponseError);
				return false;
			}
			const o_playlist_data = playlist_data!;
			const n_tracks = initial_tracks.concat(SQLTracks.add_playback_saved_data_to_tracks(playlist_continuation.tracks));
			const n_continuation = playlist_continuation.continuation;
			tracks_ref = n_tracks;
			set_initial_tracks(n_tracks);
			set_tracks(n_tracks);
			set_continuation(n_continuation);
			GLOBALS.global_var.playlist_cache.update(props.uri, { tracks: n_tracks, playlist_data: o_playlist_data, continuation: n_continuation });
			return n_continuation !== null;
		}
		return false;
	}
	async function full_continue() {
		if (!is_empty(continuation) && props.type === "URI") {
			const split = split_uri(props.uri);
			const data = await Illusive.music_service.get(music_service_uri_to_music_service(split[0]))!.get_rest_of_playlist(continuation);
			tracks_ref = tracks_ref.concat(SQLTracks.add_playback_saved_data_to_tracks(data));
			set_initial_tracks(tracks_ref);
			set_tracks(tracks_ref);
			set_continuation(null);
			GLOBALS.global_var.playlist_cache.update(props.uri, { tracks: tracks_ref, playlist_data: playlist_data!, continuation: null });
		}
		return tracks_ref;
	}

	async function add_tracks_to_library() {
		await SQLTracks.insert_all_tracks(await full_continue());
		router.back();
	}

	async function save_to_playlist(new_playlist_title: string) {
		await add_tracks_to_library();
		const playlist_uuid = await SQLPlaylists.create_playlist(new_playlist_title);
		const promised_playlist_tracks: Types.Promises = [];
		for (const track of tracks_ref) {
			const track_uid = await SQLTracks.track_from_service_id(track);
			if (track_uid === null || track_uid === undefined) continue;
			if (!("uid" in track_uid)) continue;
			promised_playlist_tracks.push(SQLPlaylists.insert_track_playlist({ uuid: playlist_uuid, track_uid: track_uid.uid }));
		}
		await Promise.all(promised_playlist_tracks);
		router.back();
	}
	async function play_order(play_tracks: Track[], from_index?: number) {
		const prev_always_shuffle = Prefs.prefs.always_shuffle.current_value;
		Prefs.prefs.always_shuffle.current_value = false;
		const start_index = from_index ?? GLOBALS.global_var.past_track_index;
		const cloned_tracks = [...play_tracks].slice(start_index);
		try {
			GLOBALS.global_var.play_tracks(cloned_tracks[0], cloned_tracks, playlist_data!.title, true);
		} finally {
			Prefs.prefs.always_shuffle.current_value = prev_always_shuffle;
		}
	}
	function play_shuffle(play_tracks: Track[]) {
		const cloned_tracks = Illusive.shuffle_tracks("SHUFFLE", [...play_tracks]);
		GLOBALS.global_var.play_tracks(cloned_tracks[0], cloned_tracks, playlist_data!.title);
	}

	async function on_edit_text(q: string) {
		(library_ref?.current as any)?.refresh_data(q);
		refresh_data(q);
	}

	const write_playlist_uuid = props.type === "URI" ? Constants.library_write_playlist : props.type === "WRITE_PLAYLIST" ? props.write_playlist_uuid : undefined;

	const render_track = (item: { item: Track }) => (
		<TrackComponent
			playlist_uuid={playlist_data?.uuid}
			track_callback={() => [...tracks]}
			track_data={item.item}
			from={playlist_data?.title}
			display_plays={props.type === "DEFAULT_PLAYLIST" && props.default_playlist_title === "Most Played"}
			edit_mode={edit_mode_state}
			width_fn={() => BASE_WIDTH_FN(write_playlist_uuid)}
			write_playlist_uuid={write_playlist_uuid}
		/>
	);
	const header_component = () => (
		<View style={styles.playlist_list_header}>
			<FourTrackArtwork background={true} thumbnail_uri={playlist_data?.thumbnail_uri} four_track={!writing_from_library ? tracks : GLOBALS.global_var.sql_tracks} size={artwork_size} base_view_style={{ top: artwork_top_offset }} />
			<BlurView intensity={50} tint={dark ? "prominent" : "extraLight"} style={{ width: width, height: 800, bottom: 150 - (props.type === "WRITE_PLAYLIST" ? 80 : 0), justifyContent: "center", alignItems: "center", position: "absolute" }}>
				<FourTrackArtwork thumbnail_uri={playlist_data?.thumbnail_uri} four_track={!writing_from_library ? tracks : GLOBALS.global_var.sql_tracks} size={75} base_view_style={{ top: 260 }} />
				<LinearGradient colors={["transparent", "rgba(0,0,0,0.2)", colors.background]} style={{ position: "absolute", bottom: 0, height: 100, width: "100%" }} />
			</BlurView>
			<View style={{ alignItems: "center", width: "75%", top: 60, height: 40, zIndex: 2 }}>
				<View style={{ right: 10, zIndex: 3 }}>
					<SearchBarV1 placeholder="Search Playlist" background_color={colors.primary_dark} query_flags={TRACK_QUERY_FLAGS} onChangeText={on_edit_text} />
				</View>
				<View style={{ flexDirection: "row" }}>
					{playlist_data?.creator?.[0]?.uri && SQLArtists.artists_artwork_memo[playlist_data?.creator?.[0]?.uri ?? ""] ? (
						<IImage source={SQLArtists.artists_artwork_memo[playlist_data?.creator?.[0]?.uri ?? ""]} width={25} height={25} style={{ borderRadius: 100, resizeMode: "contain", height: 25, width: 25, top: 5, right: 10 }} />
					) : null}
					<NavLink
						text={empty_join_dot([playlist_data?.creator?.map((item) => item.name).join(", ") ?? "Sudo", new Date(playlist_data?.date ?? 0)?.getFullYear()])}
						uri={playlist_data?.creator?.[0]?.uri ?? ""}
						type="artist"
						text_style={{ color: colors.text, fontSize: 14, marginBottom: 20, top: 10 }}
					/>
				</View>
			</View>
			<View style={{ height: 220 }} />
			<View style={{ top: 40, alignItems: "center" }}>
				<Text numberOfLines={1} style={{ color: colors.text, fontSize: 20, fontWeight: "bold" }}>
					{playlist_data?.title}
				</Text>
				<Text numberOfLines={1} style={{ color: colors.text, fontSize: 20 }}>
					{playlist_data?.description}
				</Text>
				<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 12, top: -8 }}>
					{empty_join_dot([`${tracks.length}${continuation ? "+" : ""} tracks`, tracks_duration_string(tracks)])}
				</Text>
			</View>
			<View style={{ height: 5 }} />
			<View style={{ flexDirection: "row", top: 10, width: "100%" }}>
				<View style={styles.playlist_buttons_container}>
					{props.type !== "WRITE_PLAYLIST" ? (
						<IoniconsTouchableOpacity
							on_press={() => {
								play_order(track_query_filter(tracks, search_query_state), 0);
							}}
							style={styles.playlist_button}
							icon_name="play-sharp"
							icon_size={25}
							icon_color={colors.primary}
							icon_style={{ left: 3 }}
						/>
					) : null}
					{props.type === "UUID" ? (
						<>
							<IoniconsTouchableOpacity
								on_press={() => {
									router.push({ pathname: "/playlists/add-to-playlist", params: { write_playlist_uuid: props.uuid } });
								}}
								style={styles.playlist_button}
								icon_name="add"
								icon_size={35}
								icon_color={colors.primary}
								icon_style={{ left: 1 }}
							/>
							<MaterialCommunityIconsTouchableOpacity
								on_press={() => {
									router.push({ pathname: "/playlists/edit", params: { uuid: props.uuid } });
								}}
								style={styles.playlist_button}
								icon_name="pencil"
								icon_size={25}
								icon_color={colors.primary}
								icon_style={{}}
							/>
							<FontAwesomeTouchableOpacity
								disabled={!(playlist_data?.public ?? false)}
								on_press={async () => share_item({ link: `${Constants.illusi_url_base}/playlist/${playlist_data?.uuid}` })}
								style={!(playlist_data?.public ?? false) ? { ...styles.playlist_button, opacity: 0.4 } : styles.playlist_button}
								icon_name="share"
								icon_size={25}
								icon_color={colors.primary}
								icon_style={{}}
							/>
						</>
					) : null}
				</View>
			</View>
			{props.type !== "WRITE_PLAYLIST" ? (
				<ShufflePlayButton
					text={force_order ? "Continue Listening" : is_empty(search_query) ? undefined : "Shuffle Searched"}
					on_press={() => {
						if (force_order) play_order(tracks);
						else play_shuffle(track_query_filter(tracks, search_query_state));
					}}
					top={-50}
				/>
			) : null}
		</View>
	);
	const footer_component = () => <View style={{ height: 100 }}></View>;

	return (
		<View style={styles.top_container}>
			<View style={styles.header} pointerEvents="box-none">
				<AntDesignTouchableOpacity on_press={router.back} style={{}} icon_name="left" icon_size={30} icon_color={colors.primary} icon_style={{}} />
				{props.type !== "WRITE_PLAYLIST" ? (
					<TouchableOpacity>
						<ContextMenuButton
							menuConfig={
								props.type === "UUID" || props.type === "DEFAULT_PLAYLIST" || props.type === "TRACKS_LIST" ? menuconfig_local_playlist(edit_mode_state, colors, filtered_tracks) : props.uri ? menuconfig_external_playlist : undefined
							}
							onPressMenuItem={async ({ nativeEvent }: any) => {
								switch (nativeEvent.actionKey) {
									case "playlist-actions-default-mode":
										set_edit_mode_state("NONE");
										break;
									case "playlist-actions-download-mode":
										set_edit_mode_state("DOWNLOAD");
										break;
									case "playlist-actions-delete-mode":
										set_edit_mode_state("DELETE");
										break;
									case "playlist-actions-batch-download-media":
										await download_track_list(filtered_tracks);
										refresh_data();
										break;
									case "playlist-actions-batch-download-thumbnails":
										await SQLTracks.restore_thumbnail_cache(filtered_tracks);
										GLOBALS.global_var.bottom_alert("Downloaded all available thumbnails", "INFO");
										break;
									case "playlist-actions-batch-download-lyrics":
										await batch_download_track_lyrics(filtered_tracks);
										GLOBALS.global_var.bottom_alert("Downloaded all available lyrics", "INFO");
										break;
									case "playlist-actions-shortcut":
										if (Platform.OS === "ios") {
											presentShortcut(getShortcut(), (data) => data);
										}
										break;
									case "playlist-actions-save-to-playlist":
										await save_to_playlist(playlist_data?.title ?? "New Playlist");
										break;
									case "playlist-actions-add-tracks-to-library":
										await add_tracks_to_library();
										break;
								}
							}}>
							<Ionicons name="ellipsis-horizontal" size={40} color={colors.primary} />
						</ContextMenuButton>
					</TouchableOpacity>
				) : null}
			</View>
			<View style={{ height: "100%", bottom: 40 }}>
				{props.type === "WRITE_PLAYLIST" && props.serialized_playlist_data?.type === Constants.library_write_playlist ? (
					<LibraryTrackList
						is_focused={is_focused}
						refresh_query_on_focus={true}
						edit_mode="NONE"
						ref={library_ref}
						write_playlist_uuid={props.write_playlist_uuid}
						header_height={props.type === "WRITE_PLAYLIST" ? 360 : 455}
						header_item={header_component}
						adjusted_alphabet_scroll={-35}
					/>
				) : (
					<BigList
						style={{ backgroundColor: colors.background }}
						headerHeight={props.type === "WRITE_PLAYLIST" ? 360 : 455}
						itemHeight={61}
						footerHeight={50}
						renderHeader={header_component}
						renderFooter={footer_component}
						keyExtractor={(track) => track.uid}
						renderItem={render_track}
						data={filtered_tracks}
						onEndReached={try_continuation}
						onEndReachedThreshold={0.3}
					/>
				)}
			</View>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		top_container: {
			flex: 1,
			// backgroundColor: "blue",
			backgroundColor: colors.background
		},
		header: { top: 60, flexDirection: "row", justifyContent: "space-between", marginHorizontal: 10, zIndex: 1 },
		playlist_list_header: { top: 0, alignItems: "center", zIndex: -1 },
		info_text: { color: colors.text, fontSize: 20, fontWeight: "bold" },
		playlist_buttons_container: { flex: 1, flexDirection: "row", top: 28, marginBottom: 100, justifyContent: "center", alignItems: "center", right: 10 },
		playlist_button: { borderRadius: 20, backgroundColor: colors.primary_dark, marginHorizontal: 10, width: 40, height: 40, justifyContent: "center", alignItems: "center" },
		search_input: { backgroundColor: colors.primary_dark, color: colors.text, width: "75%", position: "absolute", top: -40, left: 50, padding: 10, fontSize: 15, borderRadius: 10 }
	});
