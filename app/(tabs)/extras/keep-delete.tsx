import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Easing } from "react-native";
import { empty_join_dot } from "@common/utils/util";
import { Ionicons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import type { Track } from "@illusive/types";
import { GLOBALS } from "@illusive/globals";
import { artist_string, sum, time_to_timestamp } from "@illusive/illusive_utils";
import TrackIconTags from "@components/TrackIconTags";
import { KeepDelete } from "@illusive/keep_delete";
import TextTicker from "react-native-text-ticker";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";
import { illusive_track_to_track_player_track, setup_track_player } from "@illusive/track_player_service";
import { router } from "expo-router";
import { delete_track } from "@illusive/illusi/src/components/track";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLGlobal } from "@illusive/sql/sql_global";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, cancelAnimation, Extrapolation } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const SWIPE_THRESHOLD = 100;

function RenderKeepDeletePlayingTrack(props: { track_data: Track; sum_plays: number; screen_width: number }) {
	const { colors } = usePTheme();
	const plays = props.track_data?.meta?.plays ?? 0;
	const track_value = Math.round(KeepDelete.track_value(props.track_data, props.sum_plays, GLOBALS.global_var.sql_tracks.length));
	const weeks_ago = Math.floor(KeepDelete.track_weeks_since_last_played(props.track_data));

	return (
		<View>
			<View style={{ alignSelf: "center", borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}>
				<IImage source={props.track_data.playback?.artwork} style={{ borderRadius: 2, borderWidth: 1, borderColor: colors.line, maxWidth: props.screen_width - 70, width: props.screen_width - 70, height: props.screen_width - 70 }} />
			</View>
			<View style={{ marginHorizontal: 35, paddingTop: 18 }}>
				<TextTicker style={{ color: colors.text, fontSize: 22, fontWeight: "800" }} scroll={false} duration={12000} bounce={false} easing={Easing.linear}>
					{props.track_data.title}
				</TextTicker>
				<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 16, fontWeight: "400", marginTop: 2 }}>
					{empty_join_dot([artist_string(props.track_data), props.track_data.album?.name])}
				</Text>
				<Text numberOfLines={1} style={{ color: colors.deeptext, fontSize: 13, marginTop: 4 }}>
					Last played {weeks_ago} {weeks_ago === 1 ? "week" : "weeks"} ago
				</Text>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
					<View style={{ backgroundColor: colors.shelf, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 }}>
						<Text style={{ color: colors.subtext, fontSize: 12 }}>{plays} plays</Text>
					</View>
					<View style={{ backgroundColor: colors.shelf, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 }}>
						<Text style={{ color: colors.subtext, fontSize: 12 }}>{track_value} value</Text>
					</View>
					<TrackIconTags is_downloading={false} size={20} track_data={props.track_data} darken />
				</View>
			</View>
		</View>
	);
}

function EmptyState() {
	const { colors } = usePTheme();
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
			<Ionicons name="checkmark-done-circle-outline" size={80} color={colors.primary} />
			<Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 20, textAlign: "center" }}>Your library is in good shape</Text>
			<Text style={{ color: colors.subtext, fontSize: 15, marginTop: 12, textAlign: "center", lineHeight: 22 }}>
				Keep/Delete helps you curate your library by surfacing tracks you haven't listened to in a while. Come back when you have more music.
			</Text>
			<TouchableOpacity onPress={() => router.back()} style={{ marginTop: 32, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 }}>
				<Text style={{ color: colors.background, fontSize: 16, fontWeight: "600" }}>Go Back</Text>
			</TouchableOpacity>
		</View>
	);
}

export default function ExtraKeepDeleteScreen() {
	const { colors } = usePTheme();
	const { width: screen_width } = useDimensions();
	const seek_amount_seconds = 15;

	const sum_plays = useRef(sum(GLOBALS.global_var.sql_tracks.map((track) => track.meta?.plays ?? 0)));
	const [tracks, set_tracks] = useState<Track[]>(() => KeepDelete.ordered_keep_delete_tracks(GLOBALS.global_var.sql_tracks.filter((track) => track.media_uri)).slice(0, 20));
	const [current_index, set_current_index] = useState(0);
	const [undo_track, set_undo_track] = useState<Track | null>(null);
	const [is_sliding, set_is_sliding] = useState(false);

	const tracks_ref = useRef(tracks);
	const current_index_ref = useRef(current_index);
	tracks_ref.current = tracks;
	current_index_ref.current = current_index;

	const is_advancing = useRef(false);
	const skip_count = useRef(0);
	const playing_track = useRef<Track>(tracks[0]);

	const [player_state_trackplayer, set_player_state_trackplayer] = useState({ elapsed_time: 0, duration_remaining: tracks[0]?.duration ?? 0 });
	const [player_state_type, set_player_state_type] = useState<State>(State.None);

	const translate_x = useSharedValue(0);
	const translate_y = useSharedValue(0);

	const card_style = useAnimatedStyle(() => {
		const rotate = interpolate(translate_x.value, [-screen_width / 2, screen_width / 2], [-8, 8], Extrapolation.CLAMP);
		return { transform: [{ translateX: translate_x.value }, { translateY: translate_y.value }, { rotate: `${rotate}deg` }] };
	});

	const red_overlay_style = useAnimatedStyle(() => ({ opacity: interpolate(translate_x.value, [-SWIPE_THRESHOLD, 0], [0.45, 0], Extrapolation.CLAMP) }));

	const green_overlay_style = useAnimatedStyle(() => ({ opacity: interpolate(translate_x.value, [0, SWIPE_THRESHOLD], [0, 0.45], Extrapolation.CLAMP) }));

	const advance_ref = useRef<(action: "keep" | "delete") => Promise<void>>(null);

	const swipe_gesture = Gesture.Pan()
		.activeOffsetX([-10, 10])
		.failOffsetY([-15, 15])
		.runOnJS(true)
		.onUpdate((e) => {
			if (is_advancing.current) return;
			translate_x.value = e.translationX;
			translate_y.value = e.translationY;
		})
		.onEnd((e) => {
			if (is_advancing.current) return;
			if (e.translationX < -SWIPE_THRESHOLD) advance_ref.current?.("delete");
			else if (e.translationX > SWIPE_THRESHOLD) advance_ref.current?.("keep");
			else {
				translate_x.value = withSpring(0, { damping: 20, stiffness: 200 });
				translate_y.value = withSpring(0, { damping: 20, stiffness: 200 });
			}
		});

	useEffect(() => {
		if (tracks.length === 0) return;
		GLOBALS.global_var.kill_audioplayer();
		load_and_play(tracks[0]);
	}, []);

	useEffect(() => {
		return () => {
			GLOBALS.global_var.kill_audioplayer?.();
			TrackPlayer.reset().catch(() => {});
		};
	}, []);

	async function load_and_play(track: Track) {
		playing_track.current = { ...track };

		const is_setup = await setup_track_player();
		await TrackPlayer.reset();
		if (is_setup) {
			GLOBALS.global_var.playing_track_index = 0;
			GLOBALS.global_var.playing_tracks = [track];
			if (track.playback) {
				track.playback.successful = false;
				track.playback.added = false;
			}
			const trackplayer_track = await illusive_track_to_track_player_track(playing_track.current);
			if (trackplayer_track === "skip") {
				throw new Error("skip");
			}
			await TrackPlayer.add(trackplayer_track);
		}
		await TrackPlayer.play();
	}

	async function animate_off(direction: 1 | -1): Promise<void> {
		cancelAnimation(translate_x);
		cancelAnimation(translate_y);
		translate_x.value = withTiming(direction * screen_width * 1.5, { duration: 220 });
		return new Promise((resolve) => setTimeout(resolve, 225));
	}

	async function advance(action: "keep" | "delete") {
		if (is_advancing.current) return;
		is_advancing.current = true;

		const cur_tracks = tracks_ref.current;
		const cur_index = current_index_ref.current;
		const track = cur_tracks[cur_index];

		await animate_off(action === "delete" ? -1 : 1);

		if (action === "delete") {
			await delete_track(track, undefined);
			set_undo_track(track);
		} else {
			set_undo_track(null);
		}

		translate_x.value = 0;
		translate_y.value = 0;

		const new_tracks = action === "delete" ? cur_tracks.filter((t) => t.uid !== track.uid) : cur_tracks;
		const new_idx = action === "delete" ? cur_index : cur_index + 1;

		if (new_idx >= new_tracks.length) {
			set_tracks([]);
			is_advancing.current = false;
			return;
		}

		set_tracks(new_tracks);
		set_current_index(new_idx);

		try {
			skip_count.current = 0;
			await load_and_play(new_tracks[new_idx]);
		} catch (_) {
			skip_count.current++;
			if (skip_count.current >= new_tracks.length) {
				set_tracks([]);
				is_advancing.current = false;
				return;
			}
			is_advancing.current = false;
			await advance("keep");
			return;
		}

		is_advancing.current = false;
	}

	advance_ref.current = advance;

	async function undo_delete() {
		if (!undo_track) return;
		await SQLTracks.undelete_track(undo_track.uid);
		SQLGlobal.add_global_track_item(undo_track);

		const cur_index = current_index_ref.current;
		const cur_tracks = tracks_ref.current;
		const restored_tracks = [...cur_tracks.slice(0, cur_index), undo_track, ...cur_tracks.slice(cur_index)];
		set_tracks(restored_tracks);
		set_undo_track(null);
		await load_and_play(undo_track);
	}

	const toggle_playing = useCallback(async () => {
		const tp_state = await TrackPlayer.getPlaybackState();
		if (tp_state.state === State.Playing) await TrackPlayer.pause();
		else await TrackPlayer.play();
	}, []);

	useTrackPlayerEvents([Event.PlaybackProgressUpdated, Event.PlaybackState], async (event) => {
		if (event.type === Event.PlaybackProgressUpdated) {
			if (!is_sliding) {
				set_player_state_trackplayer({ elapsed_time: event.position, duration_remaining: event.duration - event.position });
			}
		} else if (event.type === Event.PlaybackState) {
			set_player_state_type(event.state);
		}
	});

	async function skip_forward() {
		await TrackPlayer.seekBy(seek_amount_seconds);
	}
	async function skip_backward() {
		await TrackPlayer.seekBy(-seek_amount_seconds);
	}

	if (tracks.length === 0) {
		return (
			<View style={{ backgroundColor: colors.background, flex: 1 }}>
				<EmptyState />
			</View>
		);
	}

	const current_track = tracks[current_index];
	const next_track = tracks[current_index + 1];

	return (
		<View style={{ backgroundColor: colors.background, width: "100%", flex: 1 }}>
			{/* Full-screen tint overlays driven by swipe */}
			<Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#cc2222" }, red_overlay_style]} />
			<Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#22aa44" }, green_overlay_style]} />

			{/* Card area */}
			<View style={{ flex: 1, paddingTop: 60 }}>
				{/* Next card shown behind current — subtle */}
				{next_track && (
					<View style={{ position: "absolute", top: 60, left: 0, right: 0, alignItems: "center", transform: [{ scale: 0.9 }], opacity: 0.25 }} pointerEvents="none">
						<RenderKeepDeletePlayingTrack track_data={next_track} sum_plays={sum_plays.current} screen_width={screen_width} />
					</View>
				)}

				<GestureDetector gesture={swipe_gesture}>
					<Animated.View style={card_style}>
						<RenderKeepDeletePlayingTrack track_data={current_track} sum_plays={sum_plays.current} screen_width={screen_width} />
					</Animated.View>
				</GestureDetector>
			</View>

			{/* Playback footer */}
			<View>
				<View style={{ marginHorizontal: 35 }}>
					<Slider
						value={player_state_trackplayer.elapsed_time}
						onSlidingStart={() => set_is_sliding(true)}
						onSlidingComplete={async (val) => {
							set_is_sliding(false);
							await TrackPlayer.seekTo(val[0]);
						}}
						thumbTintColor={colors.primary}
						minimumTrackTintColor={colors.primary}
						maximumTrackTintColor="#DADADAA0"
						thumbStyle={{ width: 8, height: 8 }}
						thumbTouchSize={{ width: 40, height: 40 }}
						minimumValue={0}
						maximumValue={isNaN(playing_track.current.duration) ? 1 : playing_track.current.duration}
					/>
					<View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -6 }}>
						<Text style={{ color: "#808080", fontSize: 12 }}>{time_to_timestamp(player_state_trackplayer.elapsed_time)}</Text>
						<Text style={{ color: "#808080", fontSize: 12 }}>-{time_to_timestamp(player_state_trackplayer.duration_remaining)}</Text>
					</View>
				</View>

				<View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 }}>
					<TouchableOpacity onPress={async () => advance("delete")} style={{ alignItems: "center" }}>
						<Ionicons name="close-circle" size={52} color={colors.red} />
					</TouchableOpacity>

					<TouchableOpacity onPress={skip_backward} style={{ alignItems: "center", width: 44 }}>
						<Ionicons name="play-skip-back" size={30} color={colors.primary} />
						<Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>{seek_amount_seconds}s</Text>
					</TouchableOpacity>

					<TouchableOpacity onPress={toggle_playing} style={{ alignItems: "center" }}>
						<Ionicons name={player_state_type === State.Playing ? "pause-circle-sharp" : "play-circle-sharp"} size={72} color={colors.primary} />
					</TouchableOpacity>

					<TouchableOpacity onPress={skip_forward} style={{ alignItems: "center", width: 44 }}>
						<Ionicons name="play-skip-forward" size={30} color={colors.primary} />
						<Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>{seek_amount_seconds}s</Text>
					</TouchableOpacity>

					<TouchableOpacity onPress={async () => advance("keep")} style={{ alignItems: "center" }}>
						<Ionicons name="checkmark-circle" size={52} color={colors.green} />
					</TouchableOpacity>
				</View>

				{undo_track ? (
					<TouchableOpacity onPress={undo_delete} style={{ alignSelf: "center", marginTop: 10, paddingHorizontal: 16, paddingVertical: 5 }}>
						<Text style={{ color: colors.subtext, fontSize: 13 }} numberOfLines={1}>
							↩ Undo delete "{undo_track.title}"
						</Text>
					</TouchableOpacity>
				) : (
					<View style={{ height: 28 }} />
				)}
			</View>
		</View>
	);
}
