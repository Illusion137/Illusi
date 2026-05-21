/* eslint-disable @typescript-eslint/no-deprecated */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Fontisto, Ionicons, SimpleLineIcons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { Waveform } from "@simform_solutions/react-native-audio-waveform";
import { ActivityIndicator, Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";
import LyricsPlayer from "@screens/LyricsPlayer";
import QueueHandle from "@components/QueueHandle";
import NavLink from "@components/NavLink";
import { GLOBALS } from "@illusive/globals";
import type * as IllusiveType from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import { is_empty, shuffle_array } from "@common/utils/util";
import { get_metadata_update_threshold, get_restart_threshold, illusive_track_to_track_player_track, save_past_queue, setup_track_player, track_player_next, track_player_previous } from "@illusive/track_player_service";
import { alert_error } from "@illusive/illusi/src/alert";
import { artist_string, track_exists } from "@illusive/illusive_utils";
import { ContextMenuButton, ContextMenuView } from "@components/ContextMenu";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLfs } from "@illusive/sql/sql_fs";
import { remove_topic } from "@common/utils/clean_util";
import usePTheme from "@hooks/usePTheme";
import { SharedRouter } from "@utils/shared_routes";
import { extract_menu_items, TrackContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";
import { reinterpret_cast } from "@common/cast";
import SlidingUpPanel, { type SlidingUpPanelHandle } from "rn-sliding-up-panel-reanimated";
import useGlobalTracksRefresh from "@hooks/useGlobalTracksRefresh";
import TrackIconTags from "@components/TrackIconTags";
import { Lyrics } from "@illusive/lyrics";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import Animated, { cancelAnimation, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

type LyricsLoadingState = "NONE" | "LOADING" | "FAILED" | "DOWNLOADED";
const screen_w = Dimensions.get("screen").width;
const seekbar_width = screen_w - 70; // marginHorizontal: 35 each side
const top_padding = Dimensions.get("screen").height * 0.08;
const panel_min_height = 125 + top_padding;
const panel_max_height = Dimensions.get("screen").height;
const art_top_y = top_padding + 45; // y-offset of center art within the full-panel overlay
// const panel_bottom_height = panel_max_height - panel_min_height;

export default function AudioPlayer(props: { tracks: IllusiveType.Track[]; playing_from: string }) {
	const { colors } = usePTheme();
	const styles = useMemo(() => theme_styles(colors), [colors]);

	const bottom_sheet_ref = React.useRef<SlidingUpPanelHandle>(null);
	const panel_animated = useSharedValue(panel_min_height);

	const [artist_data, set_artist_data] = useState<IllusiveType.NamedUUID>();
	const [player_state_metadata, set_player_state_metadata] = useState({
		title: props.tracks[0]?.title,
		artist: artist_string(props.tracks[0]),
		artwork: props.tracks[0]?.playback!.artwork,
		album: props.tracks[0]?.album,
		duration: props.tracks[0]?.duration ?? 0
	});
	const [player_state_trackplayer, set_player_state_trackplayer] = useState({ elapsed_time: 0, duration_remaining: props.tracks[0]?.duration ?? 0 });
	const metadata_duration_ref = useRef(props.tracks[0]?.duration ?? 0);
	metadata_duration_ref.current = player_state_metadata.duration;
	const [player_state_type, set_player_state_type] = useState<State>(State.None);
	const [playing_track, set_playing_track] = useState<IllusiveType.Track>(props.tracks[0]);
	const [does_track_exist, set_does_track_exist] = useState<boolean>(true);
	const [lyrics_loading_state, set_lyrics_loading_state] = useState<LyricsLoadingState>("NONE");
	const [lyrics_overlay_visible, set_lyrics_overlay_visible] = useState(false);
	// const [sample_artwork_color, _] = useState<string>(Prefs.dark_theme.colors.background);

	const [panel_state_visible, set_panel_state_visible] = useState(true);

	// Drive panel_state_visible from the UI thread whenever the position crosses
	// the transition threshold, then dispatch to the JS thread via runOnJS.
	useAnimatedReaction(
		() => panel_animated.value > panel_min_height + 1,
		(isVisible, wasVisible) => {
			if (wasVisible !== null && isVisible !== wasVisible) {
				runOnJS(set_panel_state_visible)(isVisible);
			}
		}
	);

	function hide_sheet() {
		// bottom_sheet_ref.current?.snapToIndex(0);
		bottom_sheet_ref.current?.hide();
	}
	function show_sheet() {
		bottom_sheet_ref.current?.show();
		// bottom_sheet_ref.current?.snapToIndex(1);
	}

	const panel_top_padding_style = useAnimatedStyle(() => ({ opacity: interpolate(panel_animated.value, [panel_min_height, panel_max_height], [0, 1], Extrapolation.CLAMP) }));
	const panel_chevron_style = useAnimatedStyle(() => ({ transform: [{ rotate: `${interpolate(panel_animated.value, [panel_min_height, panel_max_height], [180, 0], Extrapolation.CLAMP)}deg` }] }));
	const panel_content_style = useAnimatedStyle(() => ({ opacity: interpolate(panel_animated.value, [panel_min_height, panel_max_height], [0, 2], Extrapolation.CLAMP) }));

	const shimmer_position = useSharedValue(0);
	useEffect(() => {
		shimmer_position.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
		return () => cancelAnimation(shimmer_position);
	}, []);
	const shimmer_style = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(shimmer_position.value, [0, 1], [-200, 600]) }] }));
	const header_bg_opacity_style = useAnimatedStyle(() => ({ opacity: interpolate(panel_animated.value, [panel_min_height, (panel_min_height + panel_max_height) / 2], [1, 0], Extrapolation.CLAMP) }));

	const lyrics_dim_opacity = useSharedValue(0);
	useEffect(() => {
		lyrics_dim_opacity.value = withTiming(lyrics_overlay_visible ? 1 : 0, { duration: 300 });
	}, [lyrics_overlay_visible]);
	const lyrics_dim_style = useAnimatedStyle(() => ({ opacity: lyrics_dim_opacity.value }));

	const queue_expanded_progress = useSharedValue(0);
	const queue_dim_style = useAnimatedStyle(() => ({ opacity: interpolate(queue_expanded_progress.value, [0, 1], [0, 0.65], Extrapolation.CLAMP) }));
	const [outer_drag_enabled, set_outer_drag_enabled] = useState(true);

	useAnimatedReaction(
		() => queue_expanded_progress.value > 0.01,
		(queue_open, was_open) => {
			if (queue_open !== was_open && was_open !== null) {
				runOnJS(set_outer_drag_enabled)(!queue_open);
			}
		}
	);

	const seek_progress = useSharedValue(0);
	const is_seeking = useSharedValue(false);

	const do_seek = useCallback((ratio: number) => {
		TrackPlayer.seekTo(ratio * (metadata_duration_ref.current || 1));
	}, []);

	const pan_seek = Gesture.Pan()
		.activeOffsetX([-3, 3])
		.failOffsetY([-20, 20])
		.onStart((e) => {
			is_seeking.value = true;
			seek_progress.value = Math.max(0, Math.min(e.x / seekbar_width, 1));
		})
		.onUpdate((e) => {
			seek_progress.value = Math.max(0, Math.min(e.x / seekbar_width, 1));
		})
		.onEnd(() => {
			runOnJS(do_seek)(seek_progress.value);
			is_seeking.value = false;
		})
		.onFinalize(() => {
			is_seeking.value = false;
		});

	const tap_seek = Gesture.Tap()
		.maxDuration(250)
		.onEnd((e) => {
			const ratio = Math.max(0, Math.min(e.x / seekbar_width, 1));
			seek_progress.value = ratio;
			runOnJS(do_seek)(ratio);
		});

	const seek_gesture = Gesture.Race(pan_seek, tap_seek);

	const track_fill_style = useAnimatedStyle(() => ({ width: seek_progress.value * seekbar_width }));
	const thumb_seek_style = useAnimatedStyle(() => ({ left: seek_progress.value * seekbar_width - 4 }));

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
		set_player_state_type((prev) => (prev === State.Playing ? State.Paused : State.Playing));

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
			set_player_state_trackplayer({ elapsed_time: event.position, duration_remaining: event.duration - event.position });
			if (!is_seeking.value) {
				seek_progress.value = event.position / (metadata_duration_ref.current || 1);
			}
			if (is_empty(metadata_duration_ref.current)) {
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
			if (is_empty(GLOBALS.global_var.playing_tracks[event.index].lyrics_uri)) set_lyrics_overlay_visible(false);
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
			switch (event.state) {
				default:
				case State.None:
				case State.Ready:
				case State.Playing:
					shimmer_position.value = 0;
					shimmer_position.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
					break;
				case State.Stopped:
				case State.Ended:
				case State.Paused:
					shimmer_position.value = 0;
					break;
				case State.Loading:
				case State.Buffering:
					shimmer_position.value = withRepeat(withTiming(1, { duration: 300 }), -1, false);
					break;
				case State.Error:
					shimmer_position.value = 0;
					shimmer_position.value = withRepeat(withTiming(1, { duration: 100 }), -1, false);
					break;
			}
		}
	});

	async function open_lyrics() {
		if (lyrics_overlay_visible) {
			set_lyrics_overlay_visible(false);
			return;
		}
		set_lyrics_loading_state("LOADING");
		const current_track_index = await TrackPlayer.getActiveTrackIndex();
		if (current_track_index === undefined) return;
		const track = GLOBALS.global_var.playing_tracks[current_track_index];
		if (track.lyrics_uri && !is_empty(track.lyrics_uri)) {
			set_lyrics_loading_state("DOWNLOADED");
			set_lyrics_overlay_visible(true);
			return;
		}
		const lyrics = await Lyrics.get_track_lyrics(track);
		if ("error" in lyrics) {
			set_lyrics_loading_state("FAILED");
			if (!lyrics.error.message.includes("YouTube")) {
				alert_error(lyrics);
			}
			return;
		}
		const saved_uri = await SQLTracks.save_track_lyrics(track, lyrics);
		GLOBALS.global_var.playing_tracks[current_track_index].lyrics_uri = saved_uri;
		set_playing_track({ ...GLOBALS.global_var.playing_tracks[current_track_index] });
		set_lyrics_loading_state("DOWNLOADED");
		set_lyrics_overlay_visible(true);
	}

	const artwork_source = useMemo(() => {
		const artwork = player_state_metadata.artwork;
		return artwork == null ? undefined : typeof artwork === "number" ? artwork : typeof artwork === "string" ? { uri: artwork } : { uri: artwork.uri, cache: artwork.cache };
	}, [player_state_metadata.artwork]);
	const waveform_path = useMemo(() => (playing_track.media_uri ? SQLfs.media_directory(playing_track.media_uri) : null), [playing_track.media_uri]);
	const begdur = playing_track.meta?.begdur ?? 0,
		enddur = playing_track.meta?.enddur ?? playing_track.duration;

	return (
		<SlidingUpPanel
			ref={bottom_sheet_ref}
			allowDragging={outer_drag_enabled}
			showBackdrop={true}
			animatedValue={panel_animated}
			height={panel_max_height}
			friction={1}
			minimumDistanceThreshold={8}
			draggableRange={{ bottom: panel_min_height, top: panel_max_height }}
			snappingPoints={[panel_min_height, panel_max_height]}
			containerStyle={{ left: 0, right: 0, display: "flex", zIndex: 10, top: "100%" }}>
			<>
				<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, panel_content_style]}>
					<View style={{ position: "absolute", top: 0, left: 0, right: 0, height: art_top_y, overflow: "hidden" }}>
						<Image source={artwork_source} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: screen_w, transform: [{ scaleY: -1 }] }} resizeMode="cover" />
					</View>
					<View style={{ position: "absolute", top: art_top_y + screen_w, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
						<Image source={artwork_source} style={{ position: "absolute", top: 0, left: 0, right: 0, height: screen_w, transform: [{ scaleY: -1 }] }} resizeMode="cover" />
					</View>
					<Image source={artwork_source} style={{ position: "absolute", top: art_top_y, left: 0, right: 0, height: screen_w, opacity: player_state_type === State.Buffering ? 0.6 : 1 }} resizeMode="cover" />
					<MaskedView
						style={{ position: "absolute", top: 0, left: 0, right: 0, height: art_top_y + 60 }}
						maskElement={<LinearGradient colors={["black", "black", "transparent"]} locations={[0, 0.65, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />}>
						<BlurView intensity={35} tint="dark" style={{ flex: 1 }} />
					</MaskedView>
					<MaskedView
						style={{ position: "absolute", top: art_top_y + screen_w - 270, left: 0, right: 0, bottom: 0 }}
						maskElement={<LinearGradient colors={["transparent", "transparent", "black", "black"]} locations={[0, 0.1, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />}>
						<BlurView intensity={80} tint="dark" style={{ flex: 1 }} />
					</MaskedView>
					<LinearGradient colors={["rgba(0,0,0,0.75)", "rgba(0,0,0,0.25)", "transparent"]} locations={[0, 0.55, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: art_top_y + 25 }} />
					<LinearGradient colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.95)"]} locations={[0, 0.45, 1]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 320 }} />
					<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, lyrics_dim_style, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
				</Animated.View>
				<Animated.View pointerEvents={panel_state_visible ? "auto" : "none"} style={[{ height: top_padding }, panel_top_padding_style]} />
				{/* HEADER ---------------------------------------------------- */}
				<View style={[styles.header, { backgroundColor: "transparent" }]}>
					<Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.playScreen }, header_bg_opacity_style]} pointerEvents="none" />
					{!panel_state_visible &&
						(() => {
							const progress = player_state_metadata.duration > 0 ? player_state_trackplayer.elapsed_time / player_state_metadata.duration : 0;
							return (
								<View style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${Math.round(progress * 100)}%`, overflow: "hidden" }}>
									<View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary + "22" }]} />
									<Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 200 }, shimmer_style]}>
										<LinearGradient colors={["transparent", colors.primary + "15", colors.primary + "55", colors.primary + "15", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
									</Animated.View>
								</View>
							);
						})()}
					<Animated.View style={[{ left: 25 }, panel_chevron_style]}>
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
				<Animated.View pointerEvents={panel_state_visible ? "auto" : "none"} style={[{ flex: 1, justifyContent: "flex-end" }, panel_content_style]}>
					{/* Transparent context menu covering the artwork square */}
					<View style={{ position: "absolute", top: 0, left: 0, right: 0, height: Dimensions.get("screen").width }}>
						<ContextMenuView
							shouldEnableAggressiveCleanup
							shouldCleanupOnComponentWillUnmountForMenuPreview
							shouldCleanupOnComponentWillUnmountForAuxPreview
							menuConfig={{
								menuTitle: "",
								menuItems: [
									...extract_menu_items<ContextResolver.TrackContextKeys>(TrackContextMenu.track_all_functions(playing_track, ""), ["track-push-discord"]),
									...TrackContextMenu.track_component_inner_context_menu(playing_track, "")
								]
							}}
							onPressMenuItem={async ({ nativeEvent }) => {
								ContextResolver.resolve_track_context(playing_track, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
							}}>
							<View style={{ width: "100%", height: Dimensions.get("screen").width }} />
						</ContextMenuView>
					</View>
					{/* TITLE & ARTIST ----------------------------------------------------*/}
					<View style={[styles.textcontainer, { flexDirection: "row", alignItems: "flex-start" }]}>
						<View style={{ flex: 1 }}>
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
						{/* ACTION BUTTONS */}
						<View style={{ flexDirection: "row", gap: 8, paddingTop: 4, marginLeft: 10 }}>
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
								<View style={styles.action_btn}>
									<Ionicons name={does_track_exist ? "add" : "library-outline"} size={22} color={colors.primary} />
								</View>
							</TouchableOpacity>
							{lyrics_loading_state === "LOADING" ? (
								<View style={styles.action_btn}>
									<ActivityIndicator size={22} />
								</View>
							) : (
								<TouchableOpacity disabled={lyrics_loading_state === "FAILED"} onPress={open_lyrics}>
									<View style={styles.action_btn}>
										<Ionicons name="mic-outline" style={lyrics_loading_state === "DOWNLOADED" ? styles.icon_glow : {}} size={22} color={lyrics_loading_state === "FAILED" ? colors.inactive : colors.primary} />
									</View>
								</TouchableOpacity>
							)}
							<TouchableOpacity onPress={() => SharedRouter.goto_shared_player_settings()}>
								<View style={styles.action_btn}>
									<SimpleLineIcons name="equalizer" size={20} color={colors.primary} />
								</View>
							</TouchableOpacity>
						</View>
					</View>
					<View style={{ height: 12 }} />
					{/* TIMESTAMPS & TIME----------------------------------------------------*/}
					<View style={styles.timestampslidercontainer}>
						{waveform_path ? (
							<View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: -10, height: 64, opacity: 0.28 }}>
								<Waveform
									key={waveform_path}
									mode="static"
									path={waveform_path}
									waveColor={colors.text}
									scrubColor={colors.text}
									candleWidth={1}
									candleSpace={1}
									candleHeightScale={5}
									containerStyle={{ height: 64 }}
									onError={() => {}}
								/>
							</View>
						) : null}
						<GestureDetector gesture={seek_gesture}>
							<View style={{ height: 44, justifyContent: "center" }}>
								<View style={{ height: 3, backgroundColor: "#DADADAA0", borderRadius: 2 }}>
									<Animated.View style={[{ height: "100%", backgroundColor: colors.primary, borderRadius: 2 }, track_fill_style]} />
								</View>
								<Animated.View style={[{ position: "absolute", top: 18, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }, thumb_seek_style]} />
							</View>
						</GestureDetector>
						<View style={{ height: 10, width: 1, left: `${get_restart_threshold(playing_track) * 100}%`, backgroundColor: colors.orange, position: "absolute" }} />
						<View style={{ height: 10, width: 1, left: `${get_metadata_update_threshold(playing_track) * 100}%`, backgroundColor: colors.orange, position: "absolute" }} />
						{playing_track.meta?.begdur && begdur !== 0 ? <View style={{ height: 20, width: 1, left: `${(begdur / playing_track.duration) * 100}%`, backgroundColor: colors.green, position: "absolute" }} /> : null}
						{playing_track.meta?.enddur && enddur !== playing_track.duration ? <View style={{ height: 20, width: 1, left: `${(enddur / playing_track.duration) * 100}%`, backgroundColor: colors.red, position: "absolute" }} /> : null}
					</View>
					<View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 35, marginTop: 4 }}>
						<Text style={{ color: "#808080", fontSize: 12 }}>{time_to_timestamp(player_state_trackplayer.elapsed_time)}</Text>
						<Text style={{ color: "#808080", fontSize: 12 }}>-{time_to_timestamp(player_state_trackplayer.duration_remaining)}</Text>
					</View>
					<View style={{ height: 8 }} />
					{/* PLAY CONTROLS ----------------------------------------------------*/}
					<View style={{ marginBottom: 72 }}>
						<View style={styles.playbackcontainer}>
							<TouchableOpacity onPress={reshuffle}>
								<View style={styles.round_btn}>
									<Ionicons name="shuffle" size={22} color={colors.primary} />
								</View>
							</TouchableOpacity>
							<TouchableOpacity onPress={track_player_previous}>
								<Ionicons name="play-back" size={36} color={colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity onPress={toggle_playing}>
								<Ionicons name={player_state_type === State.Playing ? "pause-circle-sharp" : "play-circle-sharp"} size={84} color={colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity onPress={track_player_next}>
								<Ionicons name="play-forward" size={36} color={colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity>
								<ContextMenuButton
									menuConfig={{ menuTitle: "", menuItems: TrackContextMenu.track_share_folder(playing_track, "").menuItems }}
									onPressMenuItem={async ({ nativeEvent }) => {
										ContextResolver.resolve_track_context(playing_track, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
									}}>
									<View style={styles.round_btn}>
										<Ionicons name="share-outline" size={22} color={colors.primary} />
									</View>
								</ContextMenuButton>
							</TouchableOpacity>
						</View>
					</View>
					<LyricsPlayer key={playing_track.uid} visible={lyrics_overlay_visible} playing_track={playing_track} lyrics_uri={playing_track.lyrics_uri ?? null} />
				</Animated.View>
				{/* Single queue dim — covers everything (background, top padding, header, content) */}
				<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, panel_content_style]}>
					<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "black" }, queue_dim_style]} />
				</Animated.View>
				<QueueHandle expanded_progress={queue_expanded_progress} />
			</>
		</SlidingUpPanel>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		topcontainer: { flex: 1, backgroundColor: colors.playScreen },
		header: { backgroundColor: colors.playScreen, height: 45, alignItems: "center", justifyContent: "space-between", flexDirection: "row" },
		topfrom: { color: colors.subtext, fontSize: 12, top: -4 },
		toptitle: { color: colors.text, fontWeight: "bold", top: -2 },
		timestampslidercontainer: { alignItems: "stretch", justifyContent: "center", marginHorizontal: 35 },
		textcontainer: { justifyContent: "flex-start", alignItems: "flex-start", top: 10, marginLeft: 35, marginRight: 35, zIndex: 10 },
		tsstyle: { color: colors.subtext },
		title: { color: colors.text, fontSize: 22, fontWeight: "bold" },
		artist: { color: colors.subtext },
		playbackcontainer: { justifyContent: "space-evenly", alignItems: "center", flexDirection: "row" },
		volumeslidercontainer: { marginLeft: 40, marginRight: 80 },
		lyrics_text: { color: colors.text, fontWeight: "bold", width: "85%", fontSize: 24, margin: 15, marginVertical: 10 },
		icon_glow: { textShadowColor: colors.secondary, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 10 },
		action_btn: { backgroundColor: colors.shelf, width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
		round_btn: { backgroundColor: colors.primary + "22", width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" }
	});
