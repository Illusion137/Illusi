/* eslint-disable @typescript-eslint/no-deprecated */
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Fontisto, Ionicons, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { GestureDetector, Gesture, type GestureType } from 'react-native-gesture-handler';
import { Waveform } from '@simform_solutions/react-native-audio-waveform';
import { ActivityIndicator, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TextTicker from 'react-native-text-ticker';
import EverythingPlayer, { Event, RepeatMode, State, useTrackPlayerEvents } from 'react-native-everything-player';
import LyricsPlayer from '@screens/LyricsPlayer';
import QueueHandle from '@components/QueueHandle';
import NavLink from '@components/NavLink';
import IImage from '@components/IImage';
import * as Sentry from '@sentry/react-native';
import { Illusive } from '@illusive/illusive';
import { GLOBALS } from '@illusive/globals';
import type * as IllusiveType from '@illusive/types';
import { Prefs } from '@illusive/prefs';
import { is_empty, shuffle_array } from '@common/utils/util';
import { get_metadata_update_threshold, get_restart_threshold, save_past_queue, setup_track_player, track_player_next, track_player_previous, watch_playback_duration } from '@illusive/track_player_service';
import { active_track_index, player_queue_track, player_queue_tracks, refresh_player_queue_tracks, skip_to_next_resolved, start_player_queue } from '@utils/player_queue';
import { has_synced_lyrics } from '@utils/track_lyrics';
import { alert_error } from '@illusive/illusi/src/alert';
import { artist_string, track_exists } from '@illusive/illusive_utils';
import { ContextMenuButton, ContextMenuView } from '@components/ContextMenu';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { SQLfs } from '@illusive/sql/sql_fs';
import { remove_topic } from '@common/utils/clean_util';
import usePTheme from '@hooks/usePTheme';
import { SharedRouter } from '@utils/shared_routes';
import { extract_menu_items, PlaybackContextMenu, TrackContextMenu } from '@utils/context_menu';
import { ContextResolver } from '@utils/context_resolver';
import { reinterpret_cast } from '@common/cast';
import SlidingUpPanel, { type SlidingUpPanelHandle } from 'rn-sliding-up-panel-reanimated';
import useGlobalTracksRefresh from '@hooks/useGlobalTracksRefresh';
import TrackIconTags from '@components/TrackIconTags';
import { Lyrics } from '@illusive/lyrics';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, { cancelAnimation, Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { catch_log } from '@common/utils/error_util';

// TODO ensure highest quality thumbnails here
type LyricsLoadingState = 'NONE' | 'LOADING' | 'FAILED' | 'DOWNLOADED';
const screen_w = Dimensions.get('screen').width;
const seekbar_width = screen_w - 70; // marginHorizontal: 35 each side
const top_padding = Dimensions.get('screen').height * 0.08;
const panel_min_height = 125 + top_padding;
const panel_max_height = Dimensions.get('screen').height;
const art_top_y = top_padding + 45; // y-offset of center art within the full-panel overlay
// const panel_bottom_height = panel_max_height - panel_min_height;

function time_to_timestamp(time_seconds: number): string {
	const time_ms = Math.floor(time_seconds * 1000);
	const time_min = Math.floor(time_ms / 60000);
	const time_sec = Math.floor((time_ms - time_min * 60000) / 1000);
	return String(time_min).padStart(2, '0') + ':' + String(time_sec).padStart(2, '0');
}

const TrackTimestamps = memo(function TrackTimestamps() {
	const [elapsed, set_elapsed] = useState(0);
	const [remaining, set_remaining] = useState(0);
	useTrackPlayerEvents([Event.PlaybackProgressUpdated], (event) => {
		set_elapsed(event.position);
		set_remaining(event.duration - event.position);
	});
	return (
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 35, marginTop: 4 }}>
			<Text style={{ color: '#808080', fontSize: 12 }}>{time_to_timestamp(elapsed)}</Text>
			<Text style={{ color: '#808080', fontSize: 12 }}>
				-
				{time_to_timestamp(remaining)}
			</Text>
		</View>
	);
});

function usePlaybackPlaying() {
	const [is_playing, set_is_playing] = useState(false);
	useEffect(() => {
		try {
			set_is_playing(EverythingPlayer.getPlaybackState().state === State.Playing);
		} catch {}
	}, []);
	useTrackPlayerEvents([Event.PlaybackState], (event) => {
		if (event.type === Event.PlaybackState) set_is_playing(prev => (prev === (event.state === State.Playing) ? prev : event.state === State.Playing));
	});
	return [is_playing, set_is_playing] as const;
}

interface PlayPauseButtonProps {
	variant: 'mini' | 'big';
	primary_color: string;
}

const PlayPauseButton = memo(function PlayPauseButton({ variant, primary_color }: PlayPauseButtonProps) {
	const [is_playing, set_is_playing] = usePlaybackPlaying();
	const toggle = useCallback(() => {
		try {
			const tp_state = EverythingPlayer.getPlaybackState();
			set_is_playing(prev => !prev);
			if (tp_state.state === State.Playing) EverythingPlayer.pause();
			else EverythingPlayer.play();
		} catch {
			// player not initialized yet
		}
	}, [set_is_playing]);

	if (variant === 'mini') {
		return (
			<TouchableOpacity hitSlop={{ left: 20, top: 20, bottom: 20, right: 20 }} style={{ top: 0, right: 20 }} onPress={toggle}>
				<Ionicons name={is_playing ? 'pause-circle-sharp' : 'play-circle-sharp'} size={30} color={primary_color} />
			</TouchableOpacity>
		);
	}
	return (
		<TouchableOpacity onPress={toggle}>
			<Ionicons name={is_playing ? 'pause' : 'play'} size={60} color={primary_color} />
		</TouchableOpacity>
	);
});

// The collapsed mini-bar progress fill + shimmer. Only mounted while the panel is
// collapsed, so its infinite shimmer animation (and its PlaybackState subscription)
// stay off the JS/UI threads while the full panel is open.
const MiniProgressBar = memo(function MiniProgressBar({ seek_progress, primary_color }: { seek_progress: SharedValue<number>; primary_color: string }) {
	const shimmer_position = useSharedValue(0);
	const [phase, set_phase] = useState<State>(State.None);
	useEffect(() => {
		try {
			set_phase(EverythingPlayer.getPlaybackState().state);
		} catch {}
	}, []);
	useTrackPlayerEvents([Event.PlaybackState], (event) => {
		if (event.type === Event.PlaybackState) set_phase(prev => (prev === event.state ? prev : event.state));
	});
	useEffect(() => {
		cancelAnimation(shimmer_position);

		switch (phase) {
			case State.Loading:
			case State.Buffering:
				shimmer_position.value = 0;
				shimmer_position.value = withRepeat(withTiming(1, { duration: 300 }), -1, false);
				break;
			case State.Error:
				shimmer_position.value = 0;
				shimmer_position.value = withRepeat(withTiming(1, { duration: 100 }), -1, false);
				break;
			default:
				shimmer_position.value = 0;
				break;
		}
		return () => cancelAnimation(shimmer_position);
	}, [phase, shimmer_position]);
	const fill_style = useAnimatedStyle(() => ({ width: seek_progress.value * screen_w }));
	const shimmer_style = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(shimmer_position.value, [0, 1], [-200, 600]) }] }));
	return (
		<Animated.View style={[{ position: 'absolute', top: 0, left: 0, bottom: 0, overflow: 'hidden' }, fill_style]}>
			<View style={[StyleSheet.absoluteFill, { backgroundColor: primary_color + '22' }]} />
			<Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 200 }, shimmer_style]}>
				<LinearGradient colors={['transparent', primary_color + '15', primary_color + '55', primary_color + '15', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
			</Animated.View>
		</Animated.View>
	);
});

const PlayerBackdrop = memo(function PlayerBackdrop({ best_artwork, track_uid }: { best_artwork: IllusiveType.Artwork | undefined | null; track_uid: string }) {
	return (
		<>
			<View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: art_top_y, overflow: 'hidden' }}>
				<IImage source={best_artwork} recycling_key={track_uid} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: screen_w, maxWidth: screen_w, transform: [{ scaleY: -1 }] }} resizeMode="cover" />
			</View>
			<View style={{ position: 'absolute', top: art_top_y + screen_w, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
				<IImage source={best_artwork} recycling_key={track_uid} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: screen_w, maxWidth: screen_w, transform: [{ scaleY: -1 }] }} resizeMode="cover" />
			</View>
			<IImage source={best_artwork} recycling_key={track_uid} style={{ position: 'absolute', top: art_top_y, left: 0, right: 0, height: screen_w, maxWidth: screen_w }} resizeMode="cover" />
			<MaskedView
				style={{ position: 'absolute', top: 0, left: 0, right: 0, height: art_top_y + 60 }}
				maskElement={<LinearGradient colors={['black', 'black', 'transparent']} locations={[0, 0.65, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />}
			>
				<IImage source={best_artwork} recycling_key={track_uid} blurRadius={18} style={{ position: 'absolute', bottom: 60, left: 0, right: 0, height: screen_w, maxWidth: screen_w, transform: [{ scaleY: -1 }] }} resizeMode="cover" />
				<IImage source={best_artwork} recycling_key={track_uid} blurRadius={18} style={{ position: 'absolute', top: art_top_y, left: 0, right: 0, height: screen_w, maxWidth: screen_w }} resizeMode="cover" />
				<View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />
			</MaskedView>
			<MaskedView
				style={{ position: 'absolute', top: art_top_y + screen_w - 200, left: 0, right: 0, bottom: 0 }}
				maskElement={<LinearGradient colors={['transparent', 'transparent', 'black', 'black']} locations={[0, 0.1, 0.45, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />}
			>
				<IImage source={best_artwork} recycling_key={track_uid} blurRadius={30} style={{ position: 'absolute', top: 200 - screen_w, left: 0, right: 0, height: screen_w, maxWidth: screen_w }} resizeMode="cover" />
				<IImage source={best_artwork} recycling_key={track_uid} blurRadius={30} style={{ position: 'absolute', top: 200, left: 0, right: 0, height: screen_w, maxWidth: screen_w, transform: [{ scaleY: -1 }] }} resizeMode="cover" />
				<View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
			</MaskedView>
			<LinearGradient colors={['rgba(0,0,0,0.75)', 'rgba(0,0,0,0.25)', 'transparent']} locations={[0, 0.55, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: art_top_y + 25 }} />
			<LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']} locations={[0, 0.45, 1]} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 320 }} />
		</>
	);
});

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
	const [playing_track, set_playing_track] = useState<IllusiveType.Track>(props.tracks[0]);
	const [does_track_exist, set_does_track_exist] = useState<boolean>(true);
	const [repeat_mode, set_repeat_mode] = useState<RepeatMode>(RepeatMode.Off);
	const [lyrics_loading_state, set_lyrics_loading_state] = useState<LyricsLoadingState>('NONE');
	const [lyrics_overlay_visible, set_lyrics_overlay_visible] = useState(false);
	const open_lyrics_token = useRef(0);
	const stop_duration_watch = useRef<() => void>(() => {});
	useEffect(() => () => stop_duration_watch.current(), []);
	// const [sample_artwork_color, _] = useState<string>(Prefs.dark_theme.colors.background);

	const [panel_state_visible, set_panel_state_visible] = useState(false);

	useAnimatedReaction(
		() => panel_animated.value > panel_min_height + 1,
		(isVisible, wasVisible) => {
			if (isVisible !== wasVisible) {
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

	const header_bg_opacity_style = useAnimatedStyle(() => ({ opacity: interpolate(panel_animated.value, [panel_min_height, (panel_min_height + panel_max_height) / 2], [1, 0], Extrapolation.CLAMP) }));

	const lyrics_dim_opacity = useSharedValue(0);
	useEffect(() => {
		lyrics_dim_opacity.value = withTiming(lyrics_overlay_visible ? 1 : 0, { duration: 300 });
	}, [lyrics_overlay_visible]);
	const lyrics_dim_style = useAnimatedStyle(() => ({ opacity: lyrics_dim_opacity.value }));

	const queue_expanded_progress = useSharedValue(0);
	const queue_dim_style = useAnimatedStyle(() => ({ opacity: interpolate(queue_expanded_progress.value, [0, 1], [0, 0.65], Extrapolation.CLAMP) }));
	const [queue_drag_disabled, set_queue_drag_disabled] = useState(false);
	const outer_drag_enabled = !queue_drag_disabled;
	const lyrics_scroll_gesture = useMemo(() => Gesture.Native(), []);
	const queue_pan_ref = useRef<GestureType | undefined>(undefined);
	const panel_blocking_gestures = useMemo(() => [lyrics_scroll_gesture, queue_pan_ref], [lyrics_scroll_gesture]);

	useAnimatedReaction(
		() => queue_expanded_progress.value > 0.01,
		(queue_open, was_open) => {
			if (queue_open !== was_open && was_open !== null) {
				runOnJS(set_queue_drag_disabled)(queue_open);
			}
		}
	);

	const seek_progress = useSharedValue(0);
	const is_seeking = useSharedValue(false);

	const do_seek = useCallback((ratio: number) => {
		EverythingPlayer.seekTo(ratio * (metadata_duration_ref.current || 1));
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
		const setup_t0 = Date.now();
		const tracks_input = reshuffled_tracks ?? props.tracks;
		Sentry.addBreadcrumb({ message: 'AudioPlayer: setup start', category: 'audio', level: 'info', data: { track_count: tracks_input.length, first_title: tracks_input[0]?.title?.slice(0, 60) } });
		let has_active_track = false;
		try {
			has_active_track = EverythingPlayer.getActiveTrack() !== undefined;
		} catch {}
		if (!Prefs.get_pref('play_without_popup') || !has_active_track) show_sheet();
		const is_setup = await setup_track_player();
		EverythingPlayer.reset();
		EverythingPlayer.setRate(1.0);
		let track_misses_skipped = 0;
		if (is_setup && EverythingPlayer.getQueue().length <= 0) {
			const tracks = tracks_input.map((track) => {
				const with_playback = track.playback === undefined ? SQLTracks.add_playback_saved_data_to_track(track) : track;
				with_playback.playback!.successful = false;
				with_playback.playback!.added = false;
				return with_playback;
			});
			track_misses_skipped = await start_player_queue(tracks);
		}
		EverythingPlayer.play();
		save_past_queue().catch(catch_log);
		Sentry.addBreadcrumb({ message: 'AudioPlayer: setup done', category: 'audio', level: 'info', data: { elapsed_ms: Date.now() - setup_t0, track_misses_skipped } });
	}

	useEffect(() => {
		setup().catch(catch_log);
		try {
			set_repeat_mode(EverythingPlayer.getRepeatMode());
		} catch {}
	}, []);

	const playback_menu_config = useMemo(() => PlaybackContextMenu.playback_modes_menu(repeat_mode), [repeat_mode]);
	async function on_press_playback_menu({ nativeEvent }: { nativeEvent: { actionKey: string } }) {
		switch (nativeEvent.actionKey) {
			case 'playback-shuffle':
				await reshuffle();
				break;
			case 'playback-repeat-off':
				EverythingPlayer.setRepeatMode(RepeatMode.Off);
				set_repeat_mode(RepeatMode.Off);
				break;
			case 'playback-repeat-queue':
				EverythingPlayer.setRepeatMode(RepeatMode.Queue);
				set_repeat_mode(RepeatMode.Queue);
				break;
			case 'playback-repeat-track':
				EverythingPlayer.setRepeatMode(RepeatMode.Track);
				set_repeat_mode(RepeatMode.Track);
				break;
			default:
				break;
		}
	}
	const repeat_icon = repeat_mode === RepeatMode.Track ? 'repeat-once' : repeat_mode === RepeatMode.Queue ? 'repeat' : 'repeat-off';

	function refresh_data() {
		const refresh_map = GLOBALS.global_var.sql_tracks.length > 0 ? new Map<string, IllusiveType.Track>(GLOBALS.global_var.sql_tracks.map(track => [track.uid, track])) : new Map<string, IllusiveType.Track>();
		const refresh = (track: IllusiveType.Track) => {
			const refreshed_track = refresh_map.get(track.uid);
			return refreshed_track ? { ...refreshed_track, playback: track.playback ?? refreshed_track.playback } : track;
		};
		refresh_player_queue_tracks(refresh);
		const index = active_track_index();
		const active = player_queue_track(index);
		if (active === undefined) return;
		const refreshed = refresh(active);
		set_playing_track(refreshed);
		set_player_state_metadata(metadata => ({
			title: refreshed.title,
			artist: artist_string(refreshed),
			duration: metadata.duration ?? 0,
			artwork: refreshed.playback!.artwork,
			album: refreshed.album
		}));
	}

	useGlobalTracksRefresh(refresh_data);

	const handle_prev = useCallback(() => {
		track_player_previous().catch(catch_log);
	}, []);

	const handle_next = useCallback(async () => {
		if (await skip_to_next_resolved()) await track_player_next();
	}, []);

	function toggle_panel() {
		if (panel_state_visible) hide_sheet();
		else show_sheet();
	}

	useTrackPlayerEvents([Event.PlaybackProgressUpdated], (event) => {
		if (!is_seeking.value) {
			seek_progress.value = event.position / (metadata_duration_ref.current || 1);
		}
		const progress_track = player_queue_track(event.track);
		if (progress_track !== undefined && is_empty(metadata_duration_ref.current) && !is_empty(event.duration)) {
			progress_track.duration = event.duration ?? 0;
			set_player_state_metadata({
				title: progress_track.title,
				artist: artist_string(progress_track),
				duration: event.duration ?? 0,
				artwork: progress_track.playback!.artwork,
				album: progress_track.album
			});
			set_playing_track(progress_track);
		}
	});

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], (event) => {
		if (event.index === undefined) return;
		open_lyrics_token.current++; // cancel any in-flight open_lyrics fetch for the old track
		const active_track = player_queue_track(event.index);
		if (active_track === undefined) return;
		set_playing_track(active_track);
		set_does_track_exist(track_exists(active_track, GLOBALS.global_var.sql_tracks));
		set_lyrics_loading_state(!is_empty(active_track.lyrics_uri) ? 'DOWNLOADED' : 'NONE');
		// TODO investigate auto downloading n shit (FSCache results for a week)
		// if (is_empty(GLOBALS.global_var.playing_tracks[event.index].lyrics_uri)) set_lyrics_overlay_visible(false);
		set_player_state_metadata({ title: active_track?.title, artist: artist_string(active_track), duration: event.track?.duration ?? 0, artwork: active_track?.playback!.artwork, album: active_track?.album });
		stop_duration_watch.current();
		stop_duration_watch.current = watch_playback_duration(active_track, event.index, (duration) => {
			set_playing_track(track => (track.uid === active_track.uid ? { ...track, duration } : track));
			set_player_state_metadata(metadata => ({ ...metadata, duration }));
		});
		Sentry.addBreadcrumb({
			message: 'AudioPlayer: track changed',
			category: 'audio',
			level: 'info',
			data: { index: event.index, title: active_track?.title?.slice(0, 60), has_lyrics: !is_empty(active_track?.lyrics_uri), queue_remaining: player_queue_tracks().length - event.index }
		});
	});

	async function open_lyrics() {
		if (lyrics_overlay_visible) {
			Sentry.addBreadcrumb({ message: 'LyricsPlayer: closed', category: 'audio', level: 'info' });
			Sentry.setTag('lyrics_open', 'false');
			set_lyrics_overlay_visible(false);
			return;
		}
		Sentry.addBreadcrumb({ message: 'LyricsPlayer: opening', category: 'audio', level: 'info', data: { has_lyrics: !is_empty(playing_track.lyrics_uri), has_synced: has_synced_lyrics(playing_track) } });
		Sentry.setTag('lyrics_open', 'true');
		const token = ++open_lyrics_token.current;
		set_lyrics_loading_state('LOADING');
		const track = player_queue_track(active_track_index());
		if (token !== open_lyrics_token.current || track === undefined) return;
		if (track.lyrics_uri && !is_empty(track.lyrics_uri)) {
			set_lyrics_loading_state('DOWNLOADED');
			set_lyrics_overlay_visible(true);
			return;
		}
		const lyrics = await Lyrics.get_track_lyrics(track);
		if (token !== open_lyrics_token.current) return;
		if ('error' in lyrics) {
			set_lyrics_loading_state('FAILED');
			if (!lyrics.error.message.includes('YouTube')) {
				alert_error(lyrics);
			}
			return;
		}
		const saved_uri = await SQLTracks.save_track_lyrics(track, lyrics);
		if (token !== open_lyrics_token.current) return;
		track.lyrics_uri = saved_uri;
		track.sync_status = lyrics.sync_status;
		set_playing_track({ ...track });
		set_lyrics_loading_state('DOWNLOADED');
		set_lyrics_overlay_visible(true);
	}

	const [best_artwork, set_best_artwork] = useState<IllusiveType.Artwork | undefined | null>(() => (props.tracks[0] ? (props.tracks[0].playback?.artwork ?? Illusive.get_track_artwork(SQLfs.document_directory(''), props.tracks[0])) : undefined));
	useEffect(() => {
		let cancelled = false;
		set_best_artwork(playing_track.playback?.artwork ?? Illusive.get_track_artwork(SQLfs.document_directory(''), playing_track));
		Illusive.get_best_track_artwork(SQLfs.document_directory(''), playing_track)
			.then((artwork) => {
				if (!cancelled) set_best_artwork(artwork);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [playing_track.uid]);
	const waveform_path = useMemo(() => (playing_track.media_uri ? SQLfs.media_directory(playing_track.media_uri) : null), [playing_track.media_uri]);
	const begdur = playing_track.meta?.begdur ?? 0,
		enddur = playing_track.meta?.enddur ?? playing_track.duration;

	const artwork_menu_config = useMemo(
		() => ({
			menuTitle: '',
			menuItems: [...extract_menu_items<ContextResolver.TrackContextKeys>(TrackContextMenu.track_all_functions(playing_track, ''), ['track-push-discord']), ...TrackContextMenu.track_component_inner_context_menu(playing_track, '')]
		}),
		[playing_track]
	);
	const share_menu_config = useMemo(() => ({ menuTitle: '', menuItems: TrackContextMenu.track_share_folder(playing_track, '').menuItems }), [playing_track]);
	const on_press_artwork_menu = useCallback(
		({ nativeEvent }: { nativeEvent: { actionKey: string } }) => {
			ContextResolver.resolve_track_context(playing_track, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey)).catch(catch_log);
		},
		[playing_track]
	);
	const on_press_share_menu = on_press_artwork_menu;

	return (
		<SlidingUpPanel
			ref={bottom_sheet_ref}
			allowDragging={outer_drag_enabled}
			blockingGesture={panel_blocking_gestures}
			showBackdrop={true}
			animatedValue={panel_animated}
			height={panel_max_height}
			friction={1}
			minimumDistanceThreshold={24}
			draggableRange={{ bottom: panel_min_height, top: panel_max_height }}
			snappingPoints={[panel_min_height, panel_max_height]}
			containerStyle={{ left: 0, right: 0, display: 'flex', zIndex: 10, top: '100%' }}
		>
			<>
				{panel_state_visible ? (
					<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, panel_content_style]}>
						<PlayerBackdrop best_artwork={best_artwork} track_uid={playing_track.uid} />
						<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, lyrics_dim_style, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
					</Animated.View>
				)
					: null}
				<Animated.View pointerEvents={panel_state_visible ? 'auto' : 'none'} style={[{ height: top_padding }, panel_top_padding_style]} />
				{/* HEADER ---------------------------------------------------- */}
				<View style={[styles.header, { backgroundColor: 'transparent' }]}>
					<Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.playScreen }, header_bg_opacity_style]} pointerEvents="none" />
					{!panel_state_visible && <MiniProgressBar seek_progress={seek_progress} primary_color={colors.primary} />}
					<Animated.View style={[{ left: 25 }, panel_chevron_style]}>
						<TouchableOpacity hitSlop={{ left: 20, top: 20, bottom: 20, right: 20 }} onPress={toggle_panel}>
							<Ionicons name="chevron-down-sharp" size={20} color={colors.subtext} style={styles.text_glow} />
						</TouchableOpacity>
					</Animated.View>
					<TouchableOpacity style={{ alignItems: 'center', justifyContent: 'center', width: 250 }} disabled={panel_state_visible} onPress={show_sheet}>
						<Text style={[{ color: colors.subtext, fontSize: 12, top: panel_state_visible ? -4 : 19 }, panel_state_visible ? styles.text_glow : {}]} numberOfLines={1}>
							{panel_state_visible ? 'PLAYING FROM' : remove_topic(player_state_metadata.artist)}
						</Text>
						<Text numberOfLines={1} style={[{ color: colors.text, fontWeight: 'bold', top: panel_state_visible ? -2 : -15 }, panel_state_visible ? styles.text_glow : {}]}>
							{' '}
							{panel_state_visible ? props.playing_from : player_state_metadata.title}
						</Text>
					</TouchableOpacity>
					{panel_state_visible ? (
						<View>
							<Fontisto name="play-list" size={15} color="#00000000" />
						</View>
					)
						: null}
					{!panel_state_visible ? <PlayPauseButton variant="mini" primary_color={colors.primary} /> : null}
				</View>
				<Animated.View pointerEvents={panel_state_visible ? 'auto' : 'none'} style={[{ flex: 1, justifyContent: 'flex-end' }, panel_content_style]}>
					{/* Transparent context menu covering the artwork square */}
					<View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: Dimensions.get('screen').width }}>
						<ContextMenuView shouldEnableAggressiveCleanup shouldCleanupOnComponentWillUnmountForMenuPreview shouldCleanupOnComponentWillUnmountForAuxPreview menuConfig={artwork_menu_config} onPressMenuItem={on_press_artwork_menu}>
							<View style={{ width: '100%', height: Dimensions.get('screen').width }} />
						</ContextMenuView>
					</View>
					<View style={[styles.textcontainer, { flexDirection: 'row', alignItems: 'flex-start' }]}>
						<TextTicker style={[styles.title, { width: screen_w - 70 }]} scroll={false} duration={12000} bounce={false} easing={Easing.linear}>
							{player_state_metadata.title}
						</TextTicker>
					</View>
					{/* TITLE & ARTIST ---------------------------------------------------- */}
					<View style={[styles.textcontainer, { flexDirection: 'row', alignItems: 'flex-start' }]}>
						<View style={{ flex: 1 }}>
							<View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
								{playing_track.artists.map((artist, index) => {
									const artist_uri = artist?.uri ?? '';
									const separator = index === playing_track.artists.length - 1 ? '' : index === playing_track.artists.length - 2 ? ' & ' : ', ';
									return (
										<View key={`${artist_uri || artist?.name}-${index}`} style={{ flexDirection: 'row' }}>
											<NavLink type="artist" text_style={[styles.artist, is_empty(artist_uri) ? { color: colors.subtext + 'A0' } : null]} text={remove_topic(artist?.name ?? '')} uri={artist_uri} callforward={hide_sheet} />
											{separator ? <Text style={styles.artist}>{separator}</Text> : null}
										</View>
									);
								})}
							</View>
							{!is_empty(player_state_metadata.album?.name ?? '') ? (
								<>
									<NavLink
										type="album"
										text_style={[styles.artist, is_empty(player_state_metadata.album?.uri ?? '') ? { color: colors.subtext + 'A0' } : null]}
										text={player_state_metadata.album?.name ?? ''}
										uri={player_state_metadata.album?.uri ?? ''}
										callforward={hide_sheet}
									/>
									<View style={{ flexDirection: 'row', marginTop: 3 }}>
										<TrackIconTags track_data={playing_track} is_downloading={false} size={20} darken />
									</View>
								</>
							) : (
								<>
									<View style={{ flexDirection: 'row', marginTop: 3 }}>
										<TrackIconTags track_data={playing_track} is_downloading={false} size={20} darken />
									</View>
									<NavLink
										type="album"
										text_style={[styles.artist, is_empty(player_state_metadata.album?.uri ?? '') ? { color: colors.subtext + 'A0' } : null]}
										text={player_state_metadata.album?.name ?? ''}
										uri={player_state_metadata.album?.uri ?? ''}
										callforward={hide_sheet}
									/>
								</>
							)}
						</View>
						{/* ACTION BUTTONS */}
						<View style={{ flexDirection: 'row', gap: 8, paddingTop: 4, top: 5, marginLeft: 10 }}>
							<TouchableOpacity
								onPress={async () => {
									if (playing_track === undefined) return;
									else if (!does_track_exist) {
										await SQLTracks.insert_track(playing_track);
										set_does_track_exist(true);
									} else {
										SharedRouter.goto_shared_add_to_playlists(playing_track);
									}
								}}
							>
								<View style={styles.action_btn}>
									<Ionicons name={does_track_exist ? 'add' : 'library-outline'} size={22} color={colors.primary} />
								</View>
							</TouchableOpacity>
							{lyrics_loading_state === 'LOADING' ? (
								<View style={styles.action_btn}>
									<ActivityIndicator size={22} />
								</View>
							) : (
								<TouchableOpacity disabled={lyrics_loading_state === 'FAILED'} onPress={open_lyrics}>
									<View style={[styles.action_btn, { borderWidth: lyrics_overlay_visible ? 1 : 0, borderColor: colors.text }]}>
										<MaterialCommunityIcons
											name="comment-quote-outline"
											style={lyrics_loading_state === 'DOWNLOADED' ? styles.icon_glow : {}}
											size={22}
											color={lyrics_loading_state === 'FAILED' ? colors.inactive : colors.primary}
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
					{/* TIMESTAMPS & TIME---------------------------------------------------- */}
					<View style={styles.timestampslidercontainer}>
						{waveform_path ? (
							<View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -10, height: 64, opacity: 0.28 }}>
								<Waveform
									key={waveform_path}
									mode="static"
									path={waveform_path}
									waveColor={colors.text}
									scrubColor={colors.text}
									candleWidth={1}
									candleSpace={0}
									candleHeightScale={6}
									containerStyle={{ height: 64 }}
									onError={() => {}}
								/>
							</View>
						)
							: null}
						<GestureDetector gesture={seek_gesture}>
							<View style={{ height: 44, justifyContent: 'center' }}>
								<View style={{ height: 3, backgroundColor: '#DADADAA0', borderRadius: 2 }}>
									<Animated.View style={[{ height: '100%', backgroundColor: colors.primary, borderRadius: 2 }, track_fill_style]} />
								</View>
								<Animated.View style={[{ position: 'absolute', top: 18, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }, thumb_seek_style]} />
							</View>
						</GestureDetector>
						<View style={{ height: 10, width: 1, left: `${get_restart_threshold(playing_track) * 100}%`, backgroundColor: colors.orange, position: 'absolute' }} />
						<View style={{ height: 10, width: 1, left: `${get_metadata_update_threshold(playing_track) * 100}%`, backgroundColor: colors.orange, position: 'absolute' }} />
						{playing_track.meta?.begdur && begdur !== 0 ? <View style={{ height: 20, width: 1, left: `${(begdur / playing_track.duration) * 100}%`, backgroundColor: colors.green, position: 'absolute' }} /> : null}
						{playing_track.meta?.enddur && enddur !== playing_track.duration ? <View style={{ height: 20, width: 1, left: `${(enddur / playing_track.duration) * 100}%`, backgroundColor: colors.red, position: 'absolute' }} /> : null}
					</View>
					<TrackTimestamps />
					<View style={{ height: 4 }} />
					{/* PLAY CONTROLS ---------------------------------------------------- */}
					<View style={{ marginBottom: 60 }}>
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
							<TouchableOpacity onPress={handle_prev}>
								<Ionicons name="play-back" size={36} color={colors.primary} />
							</TouchableOpacity>
							<PlayPauseButton variant="big" primary_color={colors.primary} />
							<TouchableOpacity onPress={handle_next}>
								<Ionicons name="play-forward" size={36} color={colors.primary} />
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
					<LyricsPlayer visible={lyrics_overlay_visible} playing_track={playing_track} lyrics_uri={playing_track.lyrics_uri ?? null} scroll_gesture={lyrics_scroll_gesture} />
				</Animated.View>
				{/* Single queue dim — covers everything (background, top padding, header, content) */}
				<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, panel_content_style]}>
					<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'black' }, queue_dim_style]} />
				</Animated.View>
				<QueueHandle expanded_progress={queue_expanded_progress} pan_gesture_ref={queue_pan_ref} />
			</>
		</SlidingUpPanel>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		topcontainer: { flex: 1, backgroundColor: colors.playScreen },
		header: { backgroundColor: colors.playScreen, height: 45, alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row' },
		topfrom: { color: colors.subtext, fontSize: 12, top: -4 },
		toptitle: { color: colors.text, fontWeight: 'bold', top: -2 },
		timestampslidercontainer: { alignItems: 'stretch', justifyContent: 'center', marginHorizontal: 35 },
		textcontainer: { justifyContent: 'flex-start', alignItems: 'flex-start', top: 10, marginLeft: 35, marginRight: 35, zIndex: 10 },
		tsstyle: { color: colors.subtext },
		title: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
		artist: { color: colors.subtext },
		playbackcontainer: { justifyContent: 'space-evenly', alignItems: 'center', flexDirection: 'row' },
		volumeslidercontainer: { marginLeft: 40, marginRight: 80 },
		lyrics_text: { color: colors.text, fontWeight: 'bold', width: '85%', fontSize: 24, margin: 15, marginVertical: 10 },
		text_glow: { textShadowColor: colors.background + '8A', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
		icon_glow: { textShadowColor: colors.background, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 2 },
		action_btn: { backgroundColor: colors.shelf + '8A', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
		round_btn: { backgroundColor: colors.primary + '22', width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
		repeat_badge: { position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }
	});
