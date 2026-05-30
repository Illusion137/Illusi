import { is_empty } from "@common/utils/util";
import { GLOBALS } from "@illusive/globals";
import type { Track } from "@illusive/types";
import { useEffect, useState } from "react";
import { View } from "react-native";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import ExternalSyncedLyrics from "./ExternalSyncedLyrics";
import IdleWanderingTracks from "./IdleWanderingTracks";
import NowPlayingBackground from "./NowPlayingBackground";
import NowPlayingContent from "./NowPlayingContent";

interface ExternalDisplayContentProps {
	width: number;
	height: number;
}

const TRANSITION_DURATION = 650;

// Keep a layer mounted while it fades out, then drop it so its animations/images
// stop competing with the in-app player for the UI thread. Must stay camelCase so
// React (and the React Compiler) recognise it as a hook.
function useDelayedUnmount(active: boolean, delay: number): boolean {
	const [mounted, set_mounted] = useState(active);
	useEffect(() => {
		if (active) {
			set_mounted(true);
			return;
		}
		const timeout = setTimeout(() => set_mounted(false), delay);
		return () => clearTimeout(timeout);
	}, [active, delay]);
	return mounted;
}

export default function ExternalDisplayContent({ width, height }: ExternalDisplayContentProps) {
	const [playing_track, set_playing_track] = useState<Track | undefined>(undefined);

	// Apply a track update without ever downgrading synced-lyrics availability for the
	// same song — the app refreshes the global track list mid-playback and the refreshed
	// copy may transiently drop synced_lyrics_uri, which otherwise flips the layout.
	function apply_track(next: Track | undefined) {
		set_playing_track((prev) => {
			if (!next) return undefined;
			if (!prev || prev.uid !== next.uid) return next;
			if (!is_empty(prev.synced_lyrics_uri) && is_empty(next.synced_lyrics_uri)) return prev;
			return next;
		});
	}

	async function sync_active_track() {
		try {
			const index = await TrackPlayer.getActiveTrackIndex();
			if (index === undefined) apply_track(undefined);
			else apply_track(GLOBALS.global_var.playing_tracks[index]);
		} catch {
			// TrackPlayer not set up yet — nothing is playing.
			apply_track(undefined);
		}
	}

	useEffect(() => {
		sync_active_track();
	}, []);

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged, Event.PlaybackState], (event) => {
		if (event.type === Event.PlaybackActiveTrackChanged) {
			if (event.index === undefined) apply_track(undefined);
			else apply_track(GLOBALS.global_var.playing_tracks[event.index]);
		} else if (event.type === Event.PlaybackState) {
			if (event.state === State.None || event.state === State.Stopped) apply_track(undefined);
		}
	});

	const is_idle = playing_track === undefined;
	const has_synced = !is_idle && !is_empty(playing_track.synced_lyrics_uri);

	const idle_progress = useSharedValue(is_idle ? 1 : 0);
	const synced_progress = useSharedValue(has_synced ? 1 : 0);

	useEffect(() => {
		idle_progress.value = withTiming(is_idle ? 1 : 0, { duration: TRANSITION_DURATION });
	}, [is_idle]);
	useEffect(() => {
		synced_progress.value = withTiming(has_synced ? 1 : 0, { duration: TRANSITION_DURATION });
	}, [has_synced]);

	const mount_idle = useDelayedUnmount(is_idle, TRANSITION_DURATION);
	const mount_playing = useDelayedUnmount(!is_idle, TRANSITION_DURATION);
	const mount_synced = useDelayedUnmount(has_synced, TRANSITION_DURATION);

	const idle_layer_style = useAnimatedStyle(() => ({ opacity: idle_progress.value }));
	const playing_layer_style = useAnimatedStyle(() => ({ opacity: 1 - idle_progress.value }));
	const now_playing_content_style = useAnimatedStyle(() => ({
		transform: [
			{ translateX: interpolate(synced_progress.value, [0, 1], [0, -width * 0.25], Extrapolation.CLAMP) },
			{ scale: interpolate(synced_progress.value, [0, 1], [1, 0.82], Extrapolation.CLAMP) }
		]
	}));
	const lyrics_layer_style = useAnimatedStyle(() => ({
		opacity: synced_progress.value,
		transform: [{ translateX: interpolate(synced_progress.value, [0, 1], [width * 0.5, 0], Extrapolation.CLAMP) }]
	}));

	return (
		<View style={{ width, height, overflow: "hidden" }}>
			{/* SCREEN 1 — idle wandering tracks */}
			{mount_idle ? (
				<Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, width, height }, idle_layer_style]}>
					<IdleWanderingTracks width={width} height={height} active={is_idle} />
				</Animated.View>
			) : null}

			{/* SCREEN 2 / 3 — now-playing background + content (shifts left when synced lyrics show) */}
			{mount_playing ? (
				<>
					<Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, width, height }, playing_layer_style]}>
						<NowPlayingBackground track={playing_track} width={width} height={height} active={!is_idle} />
					</Animated.View>
					<Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, width, height, alignItems: "center", justifyContent: "center" }, playing_layer_style, now_playing_content_style]}>
						<NowPlayingContent track={playing_track} width={width} height={height} />
					</Animated.View>
				</>
			) : null}

			{/* SCREEN 3 — synced lyrics on the right half */}
			{mount_synced ? (
				<Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: 0, width: width * 0.5, height }, lyrics_layer_style]}>
					<ExternalSyncedLyrics track={playing_track} width={width * 0.5} height={height} />
				</Animated.View>
			) : null}
		</View>
	);
}
