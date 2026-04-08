import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Easing, Animated, PanResponder } from "react-native";
import { empty_join_dot } from "@common/utils/util";
import { Ionicons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import type { TrackMetaData } from "@illusive/types";
import type { Track } from "@illusive/types";
import { GLOBALS } from "@illusive/globals";
import { artist_string, sum, time_to_timestamp } from "@illusive/illusive_utils";
import TrackIconTags from "@components/TrackIconTags";
import { KeepDelete } from "@illusive/keep_delete";
import TextTicker from "react-native-text-ticker";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";
import { illusive_track_to_track_player_track, setup_track_player } from "@illusive/track_player_service";
import { router } from "expo-router";
import { alert_error } from "@illusive/illusi/src/alert";
import { generror } from "@common/utils/error_util";
import { reinterpret_cast } from "@common/cast";
import { delete_track } from "@illusive/illusi/src/components/track";
import { SQLTracks } from "@illusive/sql/sql_tracks";

const SWIPE_THRESHOLD = 100;

function RenderKeepDeletePlayingTrack(props: { track_data: Track; sum_plays: number; screen_width: number }) {
	const { colors } = usePTheme();
	const plays = props.track_data?.meta?.plays ?? 0;
	const track_value = Math.round(KeepDelete.track_value(props.track_data, props.sum_plays, GLOBALS.global_var.sql_tracks.length));
	const weeks_ago = Math.floor(KeepDelete.track_weeks_since_last_played(props.track_data));

	return (
		<View>
			<View
				style={{
					alignSelf: "center",
					borderRadius: 12,
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.2,
					shadowRadius: 8,
					elevation: 5
				}}>
				<IImage
					source={props.track_data.playback?.artwork}
					width={props.screen_width - 70}
					style={{
						borderRadius: 12,
						maxWidth: props.screen_width - 70,
						height: props.screen_width - 70
					}}
				/>
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
					<TrackIconTags is_downloading={false} size={20} track_data={props.track_data} />
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
			<Text style={{ color: colors.subtext, fontSize: 15, marginTop: 12, textAlign: "center", lineHeight: 22 }}>Keep/Delete helps you curate your library by surfacing tracks you haven't listened to in a while. Come back when you have more music.</Text>
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

	// Refs to keep advance() closure fresh without re-creating PanResponder
	const tracks_ref = useRef(tracks);
	const current_index_ref = useRef(current_index);
	tracks_ref.current = tracks;
	current_index_ref.current = current_index;

	const is_advancing = useRef(false);
	const playing_track = useRef<Track>(tracks[0]);

	const [player_state_trackplayer, set_player_state_trackplayer] = useState({
		elapsed_time: 0,
		duration_remaining: tracks[0]?.duration ?? 0
	});
	const [player_state_type, set_player_state_type] = useState<State>(State.None);

	// Swipe gesture animation
	const pan = useRef(new Animated.ValueXY()).current;

	const card_rotate = pan.x.interpolate({
		inputRange: [-screen_width / 2, screen_width / 2],
		outputRange: ["-8deg", "8deg"],
		extrapolate: "clamp"
	});
	const red_opacity = pan.x.interpolate({
		inputRange: [-SWIPE_THRESHOLD, 0],
		outputRange: [0.45, 0],
		extrapolate: "clamp"
	});
	const green_opacity = pan.x.interpolate({
		inputRange: [0, SWIPE_THRESHOLD],
		outputRange: [0, 0.45],
		extrapolate: "clamp"
	});

	const advance_ref = useRef<(action: "keep" | "delete") => Promise<void>>(null);

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => !is_advancing.current,
			onMoveShouldSetPanResponder: (_, gs) => !is_advancing.current && Math.abs(gs.dx) > 8,
			onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
			onPanResponderRelease: (_, gs) => {
				if (gs.dx < -SWIPE_THRESHOLD) {
					advance_ref.current?.("delete");
				} else if (gs.dx > SWIPE_THRESHOLD) {
					advance_ref.current?.("keep");
				} else {
					Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
				}
			},
			onPanResponderTerminate: () => {
				Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
			}
		})
	).current;

	useEffect(() => {
		if (tracks.length === 0) return;
		GLOBALS.global_var.kill_audioplayer();
		load_and_play(tracks[0]);
	}, []);

	async function load_and_play(track: Track) {
		playing_track.current = {
			...track,
			meta: reinterpret_cast<TrackMetaData>({ ...(track ?? {}) })
		};

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
				alert_error(generror("Couldn't play track", "INFO", { playing_track: playing_track.current }));
				router.back();
				return;
			}
			await TrackPlayer.add(trackplayer_track);
		}
		await TrackPlayer.play();
	}

	async function animate_off(direction: 1 | -1): Promise<void> {
		return new Promise((resolve) => {
			Animated.timing(pan, {
				toValue: { x: direction * screen_width * 1.5, y: 0 },
				duration: 220,
				useNativeDriver: false
			}).start(() => resolve());
		});
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

		pan.setValue({ x: 0, y: 0 });

		const new_tracks = action === "delete" ? cur_tracks.filter((t) => t.uid !== track.uid) : cur_tracks;
		const new_idx = action === "delete" ? cur_index : cur_index + 1;

		if (new_idx >= new_tracks.length) {
			set_tracks([]);
		} else {
			set_tracks(new_tracks);
			set_current_index(new_idx);
			await load_and_play(new_tracks[new_idx]);
		}

		is_advancing.current = false;
	}

	advance_ref.current = advance;

	async function undo_delete() {
		if (!undo_track) return;
		await SQLTracks.insert_track(undo_track);
		GLOBALS.global_var.sql_tracks.push(undo_track);

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
			set_player_state_trackplayer({
				elapsed_time: event.position,
				duration_remaining: event.duration - event.position
			});
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
			{/* Full-screen tint overlays driven by swipe gesture */}
			<Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#cc2222", opacity: red_opacity }} />
			<Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#22aa44", opacity: green_opacity }} />

			{/* Card area */}
			<View style={{ flex: 1, paddingTop: 60 }}>
				{/* Next card shown behind current one */}
				{next_track && (
					<View
						style={{
							position: "absolute",
							top: 60,
							left: 0,
							right: 0,
							alignItems: "center",
							transform: [{ scale: 0.94 }],
							opacity: 0.55
						}}
						pointerEvents="none">
						<RenderKeepDeletePlayingTrack track_data={next_track} sum_plays={sum_plays.current} screen_width={screen_width} />
					</View>
				)}

				{/* Current card with gesture handler */}
				<Animated.View
					style={{
						transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: card_rotate }]
					}}
					{...panResponder.panHandlers}>
					<RenderKeepDeletePlayingTrack track_data={current_track} sum_plays={sum_plays.current} screen_width={screen_width} />
				</Animated.View>
			</View>

			{/* Playback footer */}
			<View style={{ paddingBottom: 36 }}>
				<View style={{ marginHorizontal: 35 }}>
					<Slider value={player_state_trackplayer.elapsed_time} onValueChange={async (val) => await TrackPlayer.seekTo(val[0])} thumbTintColor={colors.primary} minimumTrackTintColor={colors.primary} maximumTrackTintColor="#DADADAA0" thumbStyle={{ width: 8, height: 8 }} thumbTouchSize={{ width: 40, height: 40 }} minimumValue={0} maximumValue={isNaN(playing_track.current.duration) ? 1 : playing_track.current.duration} />
					<View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: -6 }}>
						<Text style={{ color: "#808080", fontSize: 12 }}>{time_to_timestamp(player_state_trackplayer.elapsed_time)}</Text>
						<Text style={{ color: "#808080", fontSize: 12 }}>-{time_to_timestamp(player_state_trackplayer.duration_remaining)}</Text>
					</View>
				</View>

				{/* Undo delete — only visible after a deletion */}
				{undo_track ? (
					<TouchableOpacity onPress={undo_delete} style={{ alignSelf: "center", marginTop: 10, paddingHorizontal: 16, paddingVertical: 5 }}>
						<Text style={{ color: colors.subtext, fontSize: 13 }} numberOfLines={1}>
							↩ Undo delete "{undo_track.title}"
						</Text>
					</TouchableOpacity>
				) : (
					<View style={{ height: 28 }} />
				)}

				{/* Controls: Delete | Skip- | Play/Pause | Skip+ | Keep */}
				<View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8, gap: 10 }}>
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
			</View>
		</View>
	);
}
