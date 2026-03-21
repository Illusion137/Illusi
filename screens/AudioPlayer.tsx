import React, { useCallback, useEffect, useState } from "react";
import { Fontisto, Ionicons, SimpleLineIcons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import { ActivityIndicator, Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import TrackPlayer, { Event, RepeatMode, State, useTrackPlayerEvents } from "react-native-track-player";
import NavLink from "@components/NavLink";
import { GLOBALS } from "@illusive/globals";
import type * as IllusiveType from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import { is_empty, shuffle_array } from "@common/utils/util";
import { get_metadata_update_threshold, get_restart_threshold, illusive_track_to_track_player_track, save_past_queue, setup_track_player, track_player_next, track_player_previous } from "@illusive/track_player_service";
import { Illusive } from "@illusive/illusive";
import { alert_error } from "@illusive/illusi/src/alert";
import { artist_string, track_exists } from "@illusive/illusive_utils";
import ScaledImage from "@components/ScaledImage";
import { ContextMenuButton, ContextMenuView } from "react-native-ios-context-menu";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { remove_topic } from "@common/utils/clean_util";
import usePTheme from "@hooks/usePTheme";
import { SharedRouter } from "@utils/shared_routes";
import { TrackContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";
import { reinterpret_cast } from "@common/cast";
import SlidingUpPanel from "rn-sliding-up-panel";
import useGlobalTracksRefresh from "@hooks/useGlobalTracksRefresh";
import TrackIconTags from "@components/TrackIconTags";

type LyricsLoadingState = "NONE" | "LOADING" | "FAILED" | "DOWNLOADED";
const top_padding = Dimensions.get("screen").height * 0.08;
const panel_min_height = 125 + top_padding;
const panel_max_height = Dimensions.get("screen").height;
// const panel_bottom_height = panel_max_height - panel_min_height;

const panel_animated = new Animated.Value(panel_min_height);
export default function AudioPlayer(props: { tracks: IllusiveType.Track[]; playing_from: string }) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const bottom_sheet_ref = React.useRef<SlidingUpPanel>(null);

	const [artist_data, set_artist_data] = useState<IllusiveType.NamedUUID>();
	const [player_state_metadata, set_player_state_metadata] = useState({
		title: props.tracks[0]?.title,
		artist: artist_string(props.tracks[0]),
		artwork: props.tracks[0]?.playback!.artwork,
		album: props.tracks[0]?.album,
		duration: props.tracks[0]?.duration ?? 0
	});
	const [player_state_trackplayer, set_player_state_trackplayer] = useState({
		elapsed_time: 0,
		duration_remaining: props.tracks[0]?.duration ?? 0,
		volume: 1,
		loop_track: false
	});
	const [player_state_type, set_player_state_type] = useState<State>(State.None);
	const [playing_track, set_playing_track] = useState<IllusiveType.Track>(props.tracks[0]);
	const [does_track_exist, set_does_track_exist] = useState<boolean>(true);
	const [lyrics_loading_state, set_lyrics_loading_state] = useState<LyricsLoadingState>("NONE");
	// const [sample_artwork_color, _] = useState<string>(Prefs.dark_theme.colors.background);

	const [panel_state_visible, set_panel_state_visible] = useState(true);

	// Register the panel visibility listener once (in an effect) with cleanup,
	// instead of on every render which accumulates duplicate listeners.
	useEffect(() => {
		const panel_transition_value = panel_min_height + 1;
		const id = panel_animated.addListener(({ value }) => {
			set_panel_state_visible(value > panel_transition_value);
		});
		return () => panel_animated.removeListener(id);
	}, []);

	function hide_sheet() {
		// bottom_sheet_ref.current?.snapToIndex(0);
		bottom_sheet_ref.current?.hide();
	}
	function show_sheet() {
		bottom_sheet_ref.current?.show();
		// bottom_sheet_ref.current?.snapToIndex(1);
	}

	function interpolatePanelPosition(output_range: any[]) {
		return panel_animated.interpolate({ inputRange: [panel_min_height, panel_max_height], outputRange: output_range, extrapolate: "clamp" });
	}

	async function reshuffle() {
		const reshuffled_tracks = shuffle_array([...props.tracks]);
		await setup(reshuffled_tracks);
		set_player_state_metadata({
			title: reshuffled_tracks[0]?.title,
			artist: artist_string(reshuffled_tracks[0]),
			artwork: reshuffled_tracks[0]?.playback!.artwork,
			album: reshuffled_tracks[0]?.album,
			duration: reshuffled_tracks[0]?.duration ?? 0
		});
	}

	async function setup(reshuffled_tracks?: IllusiveType.Track[]) {
		if (!Prefs.get_pref("play_without_popup") || TrackPlayer.getActiveTrack().catch((e) => e) instanceof Error) show_sheet();
		const is_setup = await setup_track_player();
		await TrackPlayer.reset();
		const queue = await TrackPlayer.getQueue();
		if (is_setup && queue.length <= 0) {
			const tracks = reshuffled_tracks ?? props.tracks;
			GLOBALS.global_var.playing_track_index = 0;
			GLOBALS.global_var.playing_tracks = tracks.slice();
			for (let i = 0; i < tracks.length; i++) {
				GLOBALS.global_var.playing_tracks[i].playback!.successful = false;
				GLOBALS.global_var.playing_tracks[i].playback!.added = false;
			}
			GLOBALS.global_var.playing_tracks[0].playback!.added = true;
			let track_misses = 0;
			let track = await illusive_track_to_track_player_track(GLOBALS.global_var.playing_tracks[0]);

			while ((track == null || track == "skip") && track_misses < 10) {
				GLOBALS.global_var.playing_tracks = GLOBALS.global_var.playing_tracks.slice(1);
				track = await illusive_track_to_track_player_track(GLOBALS.global_var.playing_tracks[0]);
				track_misses++;
			}
			if (track !== "skip") {
				await TrackPlayer.add(track);
			}
		}
		await TrackPlayer.play();
		save_past_queue();
	}

	useEffect(() => {
		setup();
	}, []);

	async function refresh_data() {
		const refresh_map = new Map<string, IllusiveType.Track>(GLOBALS.global_var.sql_tracks.map((track) => [track.uid, track]));
		for (let i = 0; i < GLOBALS.global_var.playing_tracks.length; i++) {
			const refreshed_track = refresh_map.get(GLOBALS.global_var.playing_tracks[i].uid);
			if (refreshed_track) {
				GLOBALS.global_var.playing_tracks[i] = { ...refreshed_track, playback: GLOBALS.global_var.playing_tracks[i].playback ?? refreshed_track.playback };
			}
		}
		const index = await TrackPlayer.getActiveTrackIndex();
		if (index === undefined) return;
		set_playing_track(GLOBALS.global_var.playing_tracks[index]);
		set_player_state_metadata((metadata) => ({
			title: GLOBALS.global_var.playing_tracks[index]?.title,
			artist: artist_string(GLOBALS.global_var.playing_tracks[index]),
			duration: metadata.duration ?? 0,
			artwork: GLOBALS.global_var.playing_tracks[index]?.playback!.artwork,
			album: GLOBALS.global_var.playing_tracks[index]?.album
		}));
	}

	useGlobalTracksRefresh(refresh_data);

	const toggle_playing = useCallback(async () => {
		const tp_state = await TrackPlayer.getPlaybackState();
		set_player_state_type(player_state_type === State.Playing ? State.Paused : State.Playing);

		if (tp_state.state === State.Playing) await TrackPlayer.pause();
		else await TrackPlayer.play();
	}, []);

	function toggle_panel() {
		if (panel_state_visible) hide_sheet();
		else show_sheet();
	}

	function time_to_timestamp(time_seconds: number): string {
		const time_ms = Math.floor(time_seconds * 1000);
		const time_min = Math.floor(time_ms / 60000);
		const time_sec = Math.floor((time_ms - time_min * 60000) / 1000);

		return String(time_min).padStart(2, "0") + ":" + String(time_sec).padStart(2, "0");
	}

	useTrackPlayerEvents([Event.PlaybackProgressUpdated, Event.PlaybackActiveTrackChanged, Event.PlaybackState], async (event) => {
		if (event.type === Event.PlaybackProgressUpdated) {
			set_player_state_trackplayer({
				elapsed_time: event.position,
				duration_remaining: event.duration - event.position,
				volume: await TrackPlayer.getVolume(),
				loop_track: (await TrackPlayer.getRepeatMode()) === RepeatMode.Track
			});
			if (is_empty(player_state_metadata.duration)) {
				GLOBALS.global_var.playing_tracks[event.track].duration = event.duration ?? 0;
				set_player_state_metadata({
					title: GLOBALS.global_var.playing_tracks[event.track]?.title,
					artist: artist_string(GLOBALS.global_var.playing_tracks[event.track]),
					duration: event.duration ?? 0,
					artwork: GLOBALS.global_var.playing_tracks[event.track]?.playback!.artwork,
					album: GLOBALS.global_var.playing_tracks[event.track]?.album
				});
				set_playing_track(GLOBALS.global_var.playing_tracks[event.track]);
			}
		} else if (event.type === Event.PlaybackActiveTrackChanged) {
			if (event.index === undefined) return;
			set_playing_track(GLOBALS.global_var.playing_tracks[event.index]);
			set_does_track_exist(track_exists(GLOBALS.global_var.playing_tracks[event.index], GLOBALS.global_var.sql_tracks));
			set_lyrics_loading_state(!is_empty(GLOBALS.global_var.playing_tracks[event.index].lyrics_uri) ? "DOWNLOADED" : "NONE");
			set_artist_data(GLOBALS.global_var.playing_tracks[event.index].artists[0]);
			set_player_state_metadata({
				title: GLOBALS.global_var.playing_tracks[event.index]?.title,
				artist: artist_string(GLOBALS.global_var.playing_tracks[event.index]),
				duration: event.track?.duration ?? 0,
				artwork: GLOBALS.global_var.playing_tracks[event.index]?.playback!.artwork,
				album: GLOBALS.global_var.playing_tracks[event.index]?.album
			});
		} else if (event.type === Event.PlaybackState) {
			set_player_state_type(event.state);
		}
	});

	async function open_lyrics() {
		set_lyrics_loading_state("LOADING");
		const current_track_index = await TrackPlayer.getActiveTrackIndex();
		if (current_track_index === undefined) return;
		const track = GLOBALS.global_var.playing_tracks[current_track_index];
		if (track.lyrics_uri)
			if (!is_empty(track.lyrics_uri)) {
				set_lyrics_loading_state("DOWNLOADED");
				SharedRouter.goto_shared_player_lyrics(track.lyrics_uri);
				return;
			}
		const lyrics = await Illusive.get_track_lryics(track);
		if (typeof lyrics === "object") {
			set_lyrics_loading_state("FAILED");
			if (!lyrics.error.message.includes("YouTube")) {
				alert_error(lyrics);
				return;
			}
			return;
		}
		const lyrics_uri = await SQLTracks.save_track_lyrics(track, lyrics);
		set_lyrics_loading_state("DOWNLOADED");
		SharedRouter.goto_shared_player_lyrics(lyrics_uri);
	}

	const tint = GLOBALS.global_var.tint_table.get(playing_track.uid);
	const begdur = playing_track.meta?.begdur ?? 0,
		enddur = playing_track.meta?.enddur ?? playing_track.duration;

	return (
		<SlidingUpPanel ref={bottom_sheet_ref} allowDragging={true} showBackdrop={true} animatedValue={panel_animated} height={panel_max_height} friction={1} draggableRange={{ bottom: panel_min_height, top: panel_max_height }} snappingPoints={[panel_min_height, panel_max_height]} containerStyle={{ left: 0, right: 0, display: "flex", zIndex: 10, top: "100%" }}>
			<>
				<Animated.View pointerEvents={panel_state_visible ? "auto" : "none"} style={{ backgroundColor: colors.playScreen, height: top_padding, opacity: interpolatePanelPosition([0, 1]) }} />
				{/* HEADER ---------------------------------------------------- */}
				<View style={styles.header}>
					<Animated.View
						style={{
							left: 25,
							transform: [{ rotate: interpolatePanelPosition(["180deg", "0deg"]) }]
						}}>
						<TouchableOpacity hitSlop={{ left: 20, top: 20, bottom: 20, right: 20 }} onPress={toggle_panel}>
							<Ionicons name="chevron-down-sharp" size={20} color="#808080" />
						</TouchableOpacity>
					</Animated.View>
					<TouchableOpacity style={{ alignItems: "center", justifyContent: "center", width: 250 }} disabled={panel_state_visible} onPress={show_sheet}>
						<Text style={{ color: colors.subtext, fontSize: 12, top: panel_state_visible ? -4 : 19 }} numberOfLines={1}>
							{panel_state_visible ? "PLAYING FROM" : remove_topic(player_state_metadata.artist)}
						</Text>
						<Text numberOfLines={1} style={{ color: colors.text, fontWeight: "bold", top: panel_state_visible ? -2 : -15 }}>
							{" "}
							{panel_state_visible ? props.playing_from : player_state_metadata.title}
						</Text>
					</TouchableOpacity>
					{panel_state_visible ? (
						<TouchableOpacity
							hitSlop={{ left: 20, top: 20, bottom: 20, right: 20 }}
							style={{ top: 0, right: 20 }}
							onPress={async () => {
								SharedRouter.goto_shared_player_queue();
							}}>
							<Fontisto name="play-list" size={15} color={colors.primary} />
						</TouchableOpacity>
					) : null}
					{!panel_state_visible ? (
						<TouchableOpacity hitSlop={{ left: 20, top: 20, bottom: 20, right: 20 }} style={{ top: 0, right: 20 }} onPress={toggle_playing}>
							<Ionicons name={player_state_type === State.Playing ? "pause-circle-sharp" : "play-circle-sharp"} size={30} color={colors.primary} />
						</TouchableOpacity>
					) : null}
				</View>
				<Animated.View pointerEvents={panel_state_visible ? "auto" : "none"} style={{ flex: 1, backgroundColor: colors.playScreen, opacity: interpolatePanelPosition([0, 2]) }}>
					<View style={{ width: "100%", alignItems: "center", maxHeight: 500, minHeight: 400, overflow: "hidden" }}>
						<View style={{ flexGrow: 1, height: 50 }} />
						<ContextMenuView
							shouldEnableAggressiveCleanup
							shouldCleanupOnComponentWillUnmountForMenuPreview
							shouldCleanupOnComponentWillUnmountForAuxPreview
							menuConfig={{ menuTitle: "", menuItems: TrackContextMenu.track_component_inner_context_menu(playing_track, "") }}
							onPressMenuItem={async ({ nativeEvent }) => {
								ContextResolver.resolve_track_context(playing_track, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
							}}>
							<ScaledImage
								tint={tint ? { color: tint, opacity: 0.15 } : undefined}
								artwork={player_state_metadata.artwork}
								width={Dimensions.get("screen").width - 70}
								style={{
									opacity: player_state_type === State.Buffering ? 0.7 : 0.9,
									borderRadius: 10
								}}
							/>
						</ContextMenuView>
					</View>
					<View style={{ height: 10 }} />
					{/* TITLE & ARTIST ----------------------------------------------------*/}
					<View style={styles.textcontainer}>
						<TextTicker style={styles.title} scroll={false} duration={12000} bounce={false} easing={Easing.linear}>
							{player_state_metadata.title}
						</TextTicker>
						<NavLink type="artist" text_style={styles.artist} text={remove_topic(player_state_metadata.artist)} uri={artist_data?.uri ?? ""} callforward={hide_sheet} />
						{!is_empty(player_state_metadata.album?.name ?? "") ? (
							<>
								<NavLink type="album" text_style={styles.artist} text={player_state_metadata.album?.name ?? ""} uri={player_state_metadata.album?.uri ?? ""} callforward={hide_sheet} />
								<View style={{ flexDirection: "row", marginTop: 3 }}>
									<TrackIconTags track_data={playing_track} is_downloading={false} size={20} />
								</View>
							</>
						) : (
							<>
								<View style={{ flexDirection: "row", marginTop: 3 }}>
									<TrackIconTags track_data={playing_track} is_downloading={false} size={20} />
								</View>
								<NavLink type="album" text_style={styles.artist} text={player_state_metadata.album?.name ?? ""} uri={player_state_metadata.album?.uri ?? ""} callforward={hide_sheet} />
							</>
						)}
					</View>
					<View style={{ height: 45 }} />
					{/* TIMESTAMPS & TIME----------------------------------------------------*/}
					<View style={styles.timestampslidercontainer}>
						<Slider value={player_state_trackplayer.elapsed_time} onValueChange={async (val) => await TrackPlayer.seekTo(val[0])} thumbTintColor={colors.primary} minimumTrackTintColor={colors.primary} maximumTrackTintColor="#DADADAA0" thumbStyle={{ width: 8, height: 8 }} thumbTouchSize={{ width: 40, height: 40 }} minimumValue={0} maximumValue={isNaN(player_state_metadata.duration) ? 1 : player_state_metadata.duration} />
						<View style={{ height: 10, width: 1, left: `${get_restart_threshold(playing_track) * 100}%`, backgroundColor: colors.orange, position: "absolute" }} />
						<View style={{ height: 10, width: 1, left: `${get_metadata_update_threshold(playing_track) * 100}%`, backgroundColor: colors.orange, position: "absolute" }} />
						{playing_track.meta?.begdur && begdur !== 0 ? <View style={{ height: 20, width: 1, left: `${(begdur / playing_track.duration) * 100}%`, backgroundColor: colors.green, position: "absolute" }} /> : null}
						{playing_track.meta?.enddur && enddur !== playing_track.duration ? <View style={{ height: 20, width: 1, left: `${(enddur / playing_track.duration) * 100}%`, backgroundColor: colors.red, position: "absolute" }} /> : null}
					</View>
					<View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 35, bottom: 40 }}>
						<Text style={{ color: "#808080", fontSize: 12 }}>{time_to_timestamp(player_state_trackplayer.elapsed_time)}</Text>
						<Text style={{ color: "#808080", fontSize: 12 }}>-{time_to_timestamp(player_state_trackplayer.duration_remaining)}</Text>
					</View>
					{/* PLAY CONTROLS ----------------------------------------------------*/}
					<View style={{ bottom: 35 }}>
						<View style={styles.playbackcontainer}>
							<TouchableOpacity onPress={reshuffle}>
								<Ionicons name="shuffle" size={40} color={colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity onPress={track_player_previous}>
								<Ionicons name="play-back" size={40} color={colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity onPress={toggle_playing}>
								<Ionicons name={player_state_type === State.Playing ? "pause-circle-sharp" : "play-circle-sharp"} size={90} color={colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity onPress={track_player_next}>
								<Ionicons name="play-forward" size={40} color={colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity onPress={async () => await TrackPlayer.setRepeatMode(player_state_trackplayer.loop_track ? RepeatMode.Off : RepeatMode.Track)}>
								<Ionicons name="repeat-sharp" size={40} color={player_state_trackplayer.loop_track ? colors.primary : colors.inactive} />
							</TouchableOpacity>
						</View>
						<View style={{ height: 30 }} />
						{/* EXTRA CONTROLS ----------------------------------------------------*/}
						<View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 32, top: 10 }}>
							<TouchableOpacity
								onPress={async () => {
									if (playing_track === undefined) return;
									else if (!does_track_exist) {
										await SQLTracks.insert_track(playing_track);
										set_does_track_exist(true);
									} else {
										SharedRouter.goto_shared_add_to_playlists(playing_track);
									}
								}}>
								<View style={{ backgroundColor: colors.primary, height: 35, width: 65, borderRadius: 20, justifyContent: "center", alignItems: "center", flexDirection: "row" }}>
									<Ionicons name={does_track_exist ? "add" : "library-outline"} size={14} color={colors.background} />
									<Text>{does_track_exist ? "Add" : " Add"}</Text>
								</View>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => SharedRouter.goto_shared_player_settings()}>
								<SimpleLineIcons name="equalizer" size={29} color={colors.primary} />
							</TouchableOpacity>
							{lyrics_loading_state === "LOADING" ? (
								<ActivityIndicator size={29} />
							) : (
								<TouchableOpacity disabled={lyrics_loading_state === "FAILED"} onPress={open_lyrics}>
									<Ionicons name="mic-outline" style={lyrics_loading_state === "DOWNLOADED" ? styles.icon_glow : {}} size={29} color={lyrics_loading_state === "FAILED" ? colors.inactive : colors.primary} />
								</TouchableOpacity>
							)}
							<TouchableOpacity>
								<ContextMenuButton
									menuConfig={{ menuTitle: "", menuItems: TrackContextMenu.track_share_folder(playing_track, "").menuItems }}
									onPressMenuItem={async ({ nativeEvent }) => {
										ContextResolver.resolve_track_context(playing_track, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
									}}>
									<Ionicons name="share-outline" size={29} color={colors.primary} />
								</ContextMenuButton>
							</TouchableOpacity>
						</View>
					</View>
				</Animated.View>
			</>
		</SlidingUpPanel>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		topcontainer: {
			flex: 1,
			backgroundColor: colors.playScreen
		},
		header: {
			backgroundColor: colors.playScreen,
			height: 45,
			alignItems: "center",
			justifyContent: "space-between",
			flexDirection: "row"
		},
		topfrom: {
			color: colors.subtext,
			fontSize: 12,
			top: -4
		},
		toptitle: {
			color: colors.text,
			fontWeight: "bold",
			top: -2
		},
		timestampslidercontainer: {
			alignItems: "stretch",
			justifyContent: "center",
			bottom: 30,
			marginHorizontal: 35
		},
		textcontainer: {
			justifyContent: "flex-start",
			alignItems: "flex-start",
			top: 10,
			marginLeft: 35,
			marginRight: 35,
			zIndex: 10
		},
		tsstyle: {
			color: colors.subtext
		},
		title: {
			color: colors.text,
			fontSize: 22,
			fontWeight: "bold"
		},
		artist: {
			color: colors.subtext
		},
		playbackcontainer: {
			justifyContent: "space-evenly",
			alignItems: "center",
			flexDirection: "row"
		},
		volumeslidercontainer: {
			marginLeft: 40,
			marginRight: 80
		},
		lyrics_text: {
			color: colors.text,
			fontWeight: "bold",
			width: "85%",
			fontSize: 24,
			margin: 15,
			marginVertical: 10
		},
		icon_glow: {
			textShadowColor: colors.secondary,
			textShadowOffset: { width: 2, height: 2 },
			textShadowRadius: 10
		}
	});
