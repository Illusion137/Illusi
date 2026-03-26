import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Dimensions, Easing } from "react-native";
import { empty_join_dot } from "@common/utils/util";
import { Ionicons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import type { TrackMetaData } from "@illusive/types";
import type { Track } from "@illusive/types";
import { GLOBALS } from "@illusive/globals";
import Swiper from "react-native-swiper";
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
import { LinearGradient } from "expo-linear-gradient";

function RenderKeepDeletePlayingTrack(props: { track_data: Track; sum_plays: number }) {
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
					width={Dimensions.get("screen").width - 70}
					style={{
						borderRadius: 12,
						maxWidth: Dimensions.get("screen").width - 70,
						height: Dimensions.get("screen").width - 70
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
	const seek_amount_seconds = 15;

	const sum_plays = useRef(sum(GLOBALS.global_var.sql_tracks.map((track) => track.meta?.plays ?? 0)));
	const tracks = useRef<Track[]>(KeepDelete.ordered_keep_delete_tracks(GLOBALS.global_var.sql_tracks.filter((track) => track.media_uri)).slice(0, 20));

	const [player_state_trackplayer, set_player_state_trackplayer] = useState({
		elapsed_time: 0,
		duration_remaining: tracks.current[0]?.duration ?? 0
	});
	const [player_state_type, set_player_state_type] = useState<State>(State.None);
	const playing_track = useRef<Track>(tracks.current[0]);

	useEffect(() => {
		if (tracks.current.length === 0) return;
		GLOBALS.global_var.kill_audioplayer();
		on_index_changed(0);
	}, []);

	async function on_index_changed(index: number) {
		playing_track.current = {
			...tracks.current[index],
			meta: reinterpret_cast<TrackMetaData>({ ...(tracks.current[index] ?? {}) })
		};
		console.log(index);

		const is_setup = await setup_track_player();
		await TrackPlayer.reset();
		const queue = await TrackPlayer.getQueue();
		if (is_setup && queue.length <= 0) {
			if (playing_track.current !== null) {
				GLOBALS.global_var.playing_track_index = 0;
				GLOBALS.global_var.playing_tracks = [playing_track.current];
				if (playing_track.current.playback) {
					playing_track.current.playback.successful = false;
					playing_track.current.playback.added = false;
				}
				const trackplayer_track = await illusive_track_to_track_player_track(playing_track.current);
				if (trackplayer_track === "skip") {
					alert_error(generror("Couldn't play track", "INFO", { playing_track: playing_track.current }));
					router.back();
				} else {
					await TrackPlayer.add(trackplayer_track);
				}
			}
		}
		await TrackPlayer.play();
	}

	const toggle_playing = useCallback(async () => {
		const tp_state = await TrackPlayer.getPlaybackState();
		set_player_state_type(player_state_type === State.Playing ? State.Paused : State.Playing);

		if (tp_state.state === State.Playing) await TrackPlayer.pause();
		else await TrackPlayer.play();
	}, []);

	useTrackPlayerEvents([Event.PlaybackProgressUpdated, Event.PlaybackActiveTrackChanged, Event.PlaybackState], async (event) => {
		if (event.type === Event.PlaybackProgressUpdated) {
			set_player_state_trackplayer({
				elapsed_time: event.position,
				duration_remaining: event.duration - event.position
			});
		} else if (event.type === Event.PlaybackState) {
			set_player_state_type(event.state);
		}
	});

	async function on_swipe_left_delete() {}
	async function delete_undo() {}
	async function on_swipe_right_keep() {}
	async function skip_forward() {
		await TrackPlayer.seekBy(seek_amount_seconds);
	}
	async function skip_backward() {
		await TrackPlayer.seekBy(-seek_amount_seconds);
	}

	if (tracks.current.length === 0) {
		return (
			<View style={{ backgroundColor: colors.background, flex: 1 }}>
				<EmptyState />
			</View>
		);
	}

	return (
		<View style={{ backgroundColor: colors.background, width: "100%", flex: 1 }}>
			<LinearGradient colors={["red", colors.background]} locations={[0.0, 0.5]} start={{ x: 0, y: 0.5 }} end={{ x: 0.5, y: 0.5 }} style={{ width: 100, height: "100%", position: "absolute", top: 0, left: 0 }} />
			<LinearGradient colors={["green", colors.background]} locations={[0.0, 0.5]} start={{ x: 0.5, y: 0.5 }} end={{ x: 0, y: 0.5 }} style={{ width: 100, height: "100%", position: "absolute", top: 0, right: -45 }} />

			{/* Track swiper */}
			<View style={{ flex: 1, paddingTop: 60 }}>
				<Swiper showsButtons={false} showsPagination={false} onIndexChanged={on_index_changed}>
					{tracks.current.map((track) => (
						<RenderKeepDeletePlayingTrack key={track.uid} track_data={track} sum_plays={sum_plays.current} />
					))}
				</Swiper>
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

				{/* Controls row */}
				<View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16, gap: 8 }}>
					{/* Delete */}
					<TouchableOpacity onPress={on_swipe_left_delete} style={{ alignItems: "center" }}>
						<Ionicons name="close-circle" size={50} color={colors.red} />
					</TouchableOpacity>

					{/* Undo */}
					<TouchableOpacity onPress={delete_undo} style={{ alignItems: "center", width: 50 }}>
						<Ionicons name="arrow-undo-circle" size={40} color={colors.secondary} />
						<Text style={{ color: colors.secondary, fontSize: 11, marginTop: 2 }}>10s</Text>
					</TouchableOpacity>

					{/* Skip back */}
					<TouchableOpacity onPress={skip_backward} style={{ alignItems: "center", width: 44 }}>
						<Ionicons name="play-skip-back" size={32} color={colors.primary} />
						<Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>{seek_amount_seconds}s</Text>
					</TouchableOpacity>

					{/* Play / Pause */}
					<TouchableOpacity onPress={toggle_playing} style={{ alignItems: "center" }}>
						<Ionicons name={player_state_type === State.Playing ? "pause-circle-sharp" : "play-circle-sharp"} size={80} color={colors.primary} />
					</TouchableOpacity>

					{/* Skip forward */}
					<TouchableOpacity onPress={skip_forward} style={{ alignItems: "center", width: 44 }}>
						<Ionicons name="play-skip-forward" size={32} color={colors.primary} />
						<Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>{seek_amount_seconds}s</Text>
					</TouchableOpacity>

					{/* Keep */}
					<TouchableOpacity onPress={on_swipe_right_keep} style={{ alignItems: "center", width: 50 }}>
						<Ionicons name="checkmark-circle" size={50} color={colors.green} />
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
}
