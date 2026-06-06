/* eslint-disable @typescript-eslint/no-deprecated */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Fontisto, Ionicons, MaterialCommunityIcons, SimpleLineIcons } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { Waveform } from "@simform_solutions/react-native-audio-waveform";
import { ActivityIndicator, Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import TextTicker from "react-native-text-ticker";
import TrackPlayer, { Event, RepeatMode, State, useTrackPlayerEvents } from "react-native-track-player";
import LyricsPlayer from "@screens/LyricsPlayer";
import QueueHandle from "@components/QueueHandle";
import NavLink from "@components/NavLink";
import { GLOBALS } from "@illusive/globals";
import type * as IllusiveType from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import { is_empty, shuffle_array } from "@common/utils/util";
import { P2P, type P2PStatus } from "@illusive/p2p";
import { get_metadata_update_threshold, get_restart_threshold, illusive_track_to_track_player_track, save_past_queue, setup_track_player, track_player_next, track_player_previous } from "@illusive/track_player_service";
import { alert_error } from "@illusive/illusi/src/alert";
import { artist_string, track_exists } from "@illusive/illusive_utils";
import { ContextMenuButton, ContextMenuView } from "@components/ContextMenu";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLfs } from "@illusive/sql/sql_fs";
import { remove_topic } from "@common/utils/clean_util";
import usePTheme from "@hooks/usePTheme";
import { SharedRouter } from "@utils/shared_routes";
import { extract_menu_items, PlaybackContextMenu, TrackContextMenu } from "@utils/context_menu";
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

// TODO ensure highest quality thumbnails here
type LyricsLoadingState = "NONE" | "LOADING" | "FAILED" | "DOWNLOADED";
const screen_w = Dimensions.get("screen").width;
const seekbar_width = screen_w - 70; // marginHorizontal: 35 each side
const top_padding = Dimensions.get("screen").height * 0.08;
const panel_min_height = 125 + top_padding;
const panel_max_height = Dimensions.get("screen").height;
const art_top_y = top_padding + 45; // y-offset of center art within the full-panel overlay
// const panel_bottom_height = panel_max_height - panel_min_height;

function time_to_timestamp(time_seconds: number): string {
	const time_ms = Math.floor(time_seconds * 1000);
	const time_min = Math.floor(time_ms / 60000);
	const time_sec = Math.floor((time_ms - time_min * 60000) / 1000);
	return String(time_min).padStart(2, "0") + ":" + String(time_sec).padStart(2, "0");
}

function TrackTimestamps() {
	const [elapsed, set_elapsed] = useState(0);
	const [remaining, set_remaining] = useState(0);
	useTrackPlayerEvents([Event.PlaybackProgressUpdated], (event) => {
		set_elapsed(event.position);
		set_remaining(event.duration - event.position);
	});
	return (
		<View style={{ flexDirection: "row", justifyContent: "space-between", marginHorizontal: 35, marginTop: 4 }}>
			<Text style={{ color: "#808080", fontSize: 12 }}>{time_to_timestamp(elapsed)}</Text>
			<Text style={{ color: "#808080", fontSize: 12 }}>-{time_to_timestamp(remaining)}</Text>
		</View>
	);
}

export default function AudioPlayer(props: { tracks: IllusiveType.Track[]; playing_from: string }) {
	const { colors } = usePTheme();
	const styles = useMemo(() => theme_styles(colors), [colors]);

	const bottom_sheet_ref = React.useRef<SlidingUpPanelHandle>(null);
	const panel_animated = useSharedValue(panel_min_height);

	const [player_state_metadata, set_player_state_metadata] = useState({
		title: props.tracks[0]?.title,
		artist: artist_string(props.tracks[0]),
		artwork: props.tracks[0]?.playback!.artwork,
		album: props.tracks[0]?.album,
		duration: props.tracks[0]?.duration ?? 0
	});
	const metadata_duration_ref = useRef(props.tracks[0]?.duration ?? 0);
	metadata_duration_ref.current = player_state_metadata.duration;
	const [player_state_type, set_player_state_type] = useState<State>(State.None);
	const [playing_track, set_playing_track] = useState<IllusiveType.Track>(props.tracks[0]);
	const [does_track_exist, set_does_track_exist] = useState<boolean>(true);
	const [repeat_mode, set_repeat_mode] = useState<RepeatMode>(RepeatMode.Off);
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

	// SyncPlay awareness: guests may have their controls locked by the host.
	// When connected as a guest with control permission, button taps proxy
	// through P2P to the host instead of acting on the local TrackPlayer.
	const [p2p_status, set_p2p_status] = useState<P2PStatus>(P2P.get_status());
	useEffect(() => P2P.subscribe_status(set_p2p_status), []);
	const is_guest = p2p_status.role === "guest" && p2p_status.connected;
	// Permanent lock from the host's permission toggle
	const guest_permission_locked = is_guest && !p2p_status.guest_can_control;
	// Transient lock during a coordinated track change (prepare/play_at cycle)
	// so guests can't spam play/seek/skip against a loading player.
	const guest_loading_locked = is_guest && p2p_status.loading;
	const guest_locked = guest_permission_locked || guest_loading_locked;
	// Controls are routed through P2P only when guest has permission AND
	// isn't in a loading window.
	const guest_controls_routed = is_guest && p2p_status.guest_can_control && !p2p_status.loading;

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

	const do_seek = useCallback(
		(ratio: number) => {
			const position = ratio * (metadata_duration_ref.current || 1);
			if (guest_controls_routed) {
				P2P.request_seek(position);
				return;
			}
			if (guest_locked) return;
			TrackPlayer.seekTo(position);
			if (P2P.get_role() === "host") P2P.on_seek(position);
		},
		[guest_controls_routed, guest_locked]
	);

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
	const mini_progress_fill_style = useAnimatedStyle(() => ({ width: seek_progress.value * screen_w }));

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
		await TrackPlayer.setRate(1.0);
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
		TrackPlayer.getRepeatMode()
			.then(set_repeat_mode)
			.catch(() => {});
	}, []);

	const playback_menu_config = useMemo(() => PlaybackContextMenu.playback_modes_menu(repeat_mode), [repeat_mode]);
	async function on_press_playback_menu({ nativeEvent }: { nativeEvent: { actionKey: string } }) {
		switch (nativeEvent.actionKey) {
			case "playback-shuffle":
				await reshuffle();
				break;
			case "playback-repeat-off":
				await TrackPlayer.setRepeatMode(RepeatMode.Off);
				set_repeat_mode(RepeatMode.Off);
				break;
			case "playback-repeat-queue":
				await TrackPlayer.setRepeatMode(RepeatMode.Queue);
				set_repeat_mode(RepeatMode.Queue);
				break;
			case "playback-repeat-track":
				await TrackPlayer.setRepeatMode(RepeatMode.Track);
				set_repeat_mode(RepeatMode.Track);
				break;
			default:
				break;
		}
	}
	const repeat_icon = repeat_mode === RepeatMode.Track ? "repeat-once" : repeat_mode === RepeatMode.Queue ? "repeat" : "repeat-off";

	async function refresh_data() {
		const refresh_map = new Map<string, IllusiveType.Track>(GLOBALS.global_var.sql_tracks.map((track) => [track.uid, track]));
		for (let i = 0; i < GLOBALS.global_var.playing_tracks.length; i++) {
			const refreshed_track = refresh_map.get(GLOBALS.global_var.playing_tracks[i].uid);
			if (refreshed_track) {
				GLOBALS.global_var.playing_tracks[i] = { ...refreshed_track, playback: GLOBALS.global_var.playing_tracks[i].playback ?? refreshed_track.playback };
			}
		}
		let index: number | undefined;
		try {
			index = await TrackPlayer.getActiveTrackIndex();
		} catch {
			return;
		}
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
		try {
			const tp_state = await TrackPlayer.getPlaybackState();
			if (guest_controls_routed) {
				if (tp_state.state === State.Playing) P2P.request_pause();
				else P2P.request_play();
				return;
			}
			if (guest_locked) return;
			set_player_state_type((prev) => (prev === State.Playing ? State.Paused : State.Playing));
			if (tp_state.state === State.Playing) await TrackPlayer.pause();
			else await TrackPlayer.play();
		} catch {
			// player not initialized yet
		}
	}, [guest_controls_routed, guest_locked]);

	const handle_prev = useCallback(() => {
		if (guest_controls_routed) {
			P2P.request_prev();
			return;
		}
		if (guest_locked) return;
		track_player_previous();
	}, [guest_controls_routed, guest_locked]);

	const handle_next = useCallback(() => {
		if (guest_controls_routed) {
			P2P.request_next();
			return;
		}
		if (guest_locked) return;
		track_player_next();
	}, [guest_controls_routed, guest_locked]);

	function toggle_panel() {
		if (panel_state_visible) hide_sheet();
		else show_sheet();
	}

	useTrackPlayerEvents([Event.PlaybackProgressUpdated, Event.PlaybackActiveTrackChanged, Event.PlaybackState], async (event) => {
		if (event.type === Event.PlaybackProgressUpdated) {
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
			// TODO investigate auto downloading n shit (FSCache results for a week)
			// if (is_empty(GLOBALS.global_var.playing_tracks[event.index].lyrics_uri)) set_lyrics_overlay_visible(false);
			set_player_state_metadata({
				title: GLOBALS.global_var.playing_tracks[event.index]?.title,
				artist: artist_string(GLOBALS.global_var.playing_tracks[event.index]),
				duration: event.track?.duration ?? 0,
				artwork: GLOBALS.global_var.playing_tracks[event.index]?.playback!.artwork,
				album: GLOBALS.global_var.playing_tracks[event.index]?.album
			});
		} else if (event.type === Event.PlaybackState) {
			set_player_state_type((prev) => (prev === event.state ? prev : event.state));
			cancelAnimation(shimmer_position);
			switch (event.state) {
				case State.Loading:
				case State.Buffering:
					shimmer_position.value = 0;
					shimmer_position.value = withRepeat(withTiming(1, { duration: 300 }), -1, false);
					break;
				case State.Error:
					shimmer_position.value = 0;
					shimmer_position.value = withRepeat(withTiming(1, { duration: 100 }), -1, false);
					break;
				case State.Playing:
				case State.Ready:
					shimmer_position.value = 0;
					shimmer_position.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
					break;
				case State.None:
				case State.Paused:
				case State.Stopped:
				case State.Ended:
				default:
					shimmer_position.value = 0;
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

	const artwork_menu_config = useMemo(
		() => ({
			menuTitle: "",
			menuItems: [...extract_menu_items<ContextResolver.TrackContextKeys>(TrackContextMenu.track_all_functions(playing_track, ""), ["track-push-discord"]), ...TrackContextMenu.track_component_inner_context_menu(playing_track, "")]
		}),
		[playing_track]
	);
	const share_menu_config = useMemo(() => ({ menuTitle: "", menuItems: TrackContextMenu.track_share_folder(playing_track, "").menuItems }), [playing_track]);
	const on_press_artwork_menu = useCallback(
		({ nativeEvent }: { nativeEvent: { actionKey: string } }) => {
			ContextResolver.resolve_track_context(playing_track, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
		},
		[playing_track]
	);
	const on_press_share_menu = on_press_artwork_menu;

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
					{!panel_state_visible && (
						<Animated.View style={[{ position: "absolute", top: 0, left: 0, bottom: 0, overflow: "hidden" }, mini_progress_fill_style]}>
							<View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary + "22" }]} />
							<Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 200 }, shimmer_style]}>
								<LinearGradient colors={["transparent", colors.primary + "15", colors.primary + "55", colors.primary + "15", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
							</Animated.View>
						</Animated.View>
					)}
					<Animated.View style={[{ left: 25 }, panel_chevron_style]}>
						<TouchableOpacity hitSlop={{ left: 20, top: 20, bottom: 20, right: 20 }} onPress={toggle_panel}>
							<Ionicons name="chevron-down-sharp" size={20} color={colors.subtext} style={styles.text_glow} />
						</TouchableOpacity>
					</Animated.View>
					<TouchableOpacity style={{ alignItems: "center", justifyContent: "center", width: 250 }} disabled={panel_state_visible} onPress={show_sheet}>
						<Text style={[{ color: colors.subtext, fontSize: 12, top: panel_state_visible ? -4 : 19 }, panel_state_visible ? styles.text_glow : {}]} numberOfLines={1}>
							{panel_state_visible ? "PLAYING FROM" : remove_topic(player_state_metadata.artist)}
						</Text>
						<Text numberOfLines={1} style={[{ color: colors.text, fontWeight: "bold", top: panel_state_visible ? -2 : -15 }, panel_state_visible ? styles.text_glow : {}]}>
							{" "}
							{panel_state_visible ? props.playing_from : player_state_metadata.title}
						</Text>
					</TouchableOpacity>
					{panel_state_visible ? (
						<View>
							<Fontisto name="play-list" size={15} color={"#00000000"} />
						</View>
					) : null}
					{!panel_state_visible ? (
						<TouchableOpacity disabled={guest_locked} hitSlop={{ left: 20, top: 20, bottom: 20, right: 20 }} style={{ top: 0, right: 20, opacity: guest_locked ? 0.4 : 1 }} onPress={toggle_playing}>
							<Ionicons name={player_state_type === State.Playing ? "pause-circle-sharp" : "play-circle-sharp"} size={30} color={guest_locked ? colors.subtext : colors.primary} />
						</TouchableOpacity>
					) : null}
				</View>
				<Animated.View pointerEvents={panel_state_visible ? "auto" : "none"} style={[{ flex: 1, justifyContent: "flex-end" }, panel_content_style]}>
					{/* Transparent context menu covering the artwork square */}
					<View style={{ position: "absolute", top: 0, left: 0, right: 0, height: Dimensions.get("screen").width }}>
						<ContextMenuView shouldEnableAggressiveCleanup shouldCleanupOnComponentWillUnmountForMenuPreview shouldCleanupOnComponentWillUnmountForAuxPreview menuConfig={artwork_menu_config} onPressMenuItem={on_press_artwork_menu}>
							<View style={{ width: "100%", height: Dimensions.get("screen").width }} />
						</ContextMenuView>
					</View>
					{/* TITLE & ARTIST ----------------------------------------------------*/}
					<View style={[styles.textcontainer, { flexDirection: "row", alignItems: "flex-start" }]}>
						<View style={{ flex: 1 }}>
							<TextTicker style={styles.title} scroll={false} duration={12000} bounce={false} easing={Easing.linear}>
								{player_state_metadata.title}
							</TextTicker>
							<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" }}>
								{playing_track.artists.map((artist, index) => {
									const artist_uri = artist?.uri ?? "";
									const separator = index === playing_track.artists.length - 1 ? "" : index === playing_track.artists.length - 2 ? " & " : ", ";
									return (
										<View key={`${artist_uri || artist?.name}-${index}`} style={{ flexDirection: "row" }}>
											<NavLink type="artist" text_style={[styles.artist, is_empty(artist_uri) ? { color: colors.subtext + "A0" } : null]} text={remove_topic(artist?.name ?? "")} uri={artist_uri} callforward={hide_sheet} />
											{separator ? <Text style={styles.artist}>{separator}</Text> : null}
										</View>
									);
								})}
							</View>
							{!is_empty(player_state_metadata.album?.name ?? "") ? (
								<>
									<NavLink
										type="album"
										text_style={[styles.artist, is_empty(player_state_metadata.album?.uri ?? "") ? { color: colors.subtext + "A0" } : null]}
										text={player_state_metadata.album?.name ?? ""}
										uri={player_state_metadata.album?.uri ?? ""}
										callforward={hide_sheet}
									/>
									<View style={{ flexDirection: "row", marginTop: 3 }}>
										<TrackIconTags track_data={playing_track} is_downloading={false} size={20} darken />
									</View>
								</>
							) : (
								<>
									<View style={{ flexDirection: "row", marginTop: 3 }}>
										<TrackIconTags track_data={playing_track} is_downloading={false} size={20} darken />
									</View>
									<NavLink
										type="album"
										text_style={[styles.artist, is_empty(player_state_metadata.album?.uri ?? "") ? { color: colors.subtext + "A0" } : null]}
										text={player_state_metadata.album?.name ?? ""}
										uri={player_state_metadata.album?.uri ?? ""}
										callforward={hide_sheet}
									/>
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
									<View style={[styles.action_btn, { borderWidth: lyrics_overlay_visible ? 1 : 0, borderColor: colors.text }]}>
										<MaterialCommunityIcons
											name="comment-quote-outline"
											style={lyrics_loading_state === "DOWNLOADED" ? styles.icon_glow : {}}
											size={22}
											color={lyrics_loading_state === "FAILED" ? colors.inactive : colors.primary}
										/>
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
					<TrackTimestamps />
					<View style={{ height: 8 }} />
					{/* PLAY CONTROLS ----------------------------------------------------*/}
					<View style={{ marginBottom: 72 }}>
						<View style={styles.playbackcontainer}>
							<TouchableOpacity>
								<ContextMenuButton menuConfig={playback_menu_config} onPressMenuItem={on_press_playback_menu}>
									<View style={styles.round_btn}>
										<Ionicons name="shuffle" size={24} color={colors.primary} style={{ left: -4, top: -3 }} />
										<View style={[styles.repeat_badge, { backgroundColor: colors.background, borderColor: colors.line }]}>
											<MaterialCommunityIcons name={repeat_icon} size={13} color={repeat_mode === RepeatMode.Off ? colors.subtext : colors.primary} />
										</View>
									</View>
								</ContextMenuButton>
							</TouchableOpacity>
							<TouchableOpacity disabled={guest_locked} onPress={handle_prev} style={{ opacity: guest_locked ? 0.35 : 1 }}>
								<Ionicons name="play-back" size={36} color={guest_locked ? colors.subtext : colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity disabled={guest_locked} onPress={toggle_playing} style={{ opacity: guest_locked ? 0.35 : 1 }}>
								<Ionicons name={player_state_type === State.Playing ? "pause" : "play"} size={60} color={guest_locked ? colors.subtext : colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity disabled={guest_locked} onPress={handle_next} style={{ opacity: guest_locked ? 0.35 : 1 }}>
								<Ionicons name="play-forward" size={36} color={guest_locked ? colors.subtext : colors.primary} />
							</TouchableOpacity>
							<TouchableOpacity>
								<ContextMenuButton menuConfig={share_menu_config} onPressMenuItem={on_press_share_menu}>
									<View style={styles.round_btn}>
										<Ionicons name="share-outline" size={22} color={colors.primary} />
									</View>
								</ContextMenuButton>
							</TouchableOpacity>
						</View>
					</View>
					<LyricsPlayer visible={lyrics_overlay_visible} playing_track={playing_track} lyrics_uri={playing_track.lyrics_uri ?? null} />
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
		text_glow: { textShadowColor: colors.background + "8A", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
		icon_glow: { textShadowColor: colors.background, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 2 },
		action_btn: { backgroundColor: colors.shelf + "8A", width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
		round_btn: { backgroundColor: colors.primary + "22", width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
		repeat_badge: { position: "absolute", right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" }
	});
