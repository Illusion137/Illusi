import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Prefs } from "@illusive/prefs";
import { GLOBALS } from "@illusive/globals";
import { is_empty } from "@common/utils/util";
import { artist_string } from "@illusive/illusive_utils";
import { Ionicons } from "@expo/vector-icons";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import TextTicker from "react-native-text-ticker";
import { Easing } from "react-native";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { get_youtube_music_track_mix, get_soundcloud_track_mix } from "@illusive/get_track_mix";
import { illusive_track_to_track_player_track, setup_track_player } from "@illusive/track_player_service";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";
import type { Track } from "@illusive/types";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	interpolate,
	cancelAnimation,
	Extrapolation
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const SWIPE_THRESHOLD = 100;

function EmptyState(props: { loading: boolean; on_retry: () => void }) {
	const { colors } = usePTheme();
	if (props.loading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" color={colors.primary} />
				<Text style={{ color: colors.subtext, marginTop: 16, fontSize: 14 }}>Finding recommendations…</Text>
			</View>
		);
	}
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
			<Ionicons name="color-wand-outline" size={80} color={colors.primary} />
			<Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 20, textAlign: "center" }}>No recommendations yet</Text>
			<Text style={{ color: colors.subtext, fontSize: 15, marginTop: 12, textAlign: "center", lineHeight: 22 }}>Make sure you have music with YouTube Music or SoundCloud IDs, and try again.</Text>
			<TouchableOpacity onPress={props.on_retry} style={{ marginTop: 28, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 }}>
				<Text style={{ color: colors.background, fontSize: 16, fontWeight: "600" }}>Retry</Text>
			</TouchableOpacity>
			<TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12, paddingHorizontal: 28, paddingVertical: 10 }}>
				<Text style={{ color: colors.subtext, fontSize: 14 }}>Go Back</Text>
			</TouchableOpacity>
		</View>
	);
}

function ServiceChip(props: { track: Track }) {
	const { colors } = usePTheme();
	let label = "Unknown";
	let chip_color = colors.subtext;
	if (!is_empty(props.track.youtubemusic_id)) { label = "YouTube Music"; chip_color = "#FF0000"; }
	else if (!is_empty(props.track.youtube_id)) { label = "YouTube"; chip_color = "#FF0000"; }
	else if (!is_empty(props.track.soundcloud_id)) { label = "SoundCloud"; chip_color = "#ff5500"; }
	else if (!is_empty(props.track.spotify_id)) { label = "Spotify"; chip_color = "#1db954"; }

	return (
		<View style={{ backgroundColor: chip_color + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start", marginTop: 8 }}>
			<Text style={{ color: chip_color, fontSize: 12, fontWeight: "600" }}>{label}</Text>
		</View>
	);
}

export default function ExtraSamplesScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const { width: screen_width } = useDimensions();

	const [recommendations, set_recommendations] = useState<Track[]>([]);
	const [current_index, set_current_index] = useState(0);
	const [loading, set_loading] = useState(true);
	const [toast, set_toast] = useState<string | null>(null);
	const [is_previewing, set_is_previewing] = useState(false);
	const [preview_state, set_preview_state] = useState<State>(State.None);

	const is_swiping = useRef(false);
	const toast_timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const translate_x = useSharedValue(0);
	const translate_y = useSharedValue(0);

	const card_style = useAnimatedStyle(() => {
		const rotate = interpolate(translate_x.value, [-screen_width / 2, screen_width / 2], [-8, 8], Extrapolation.CLAMP);
		return {
			transform: [
				{ translateX: translate_x.value },
				{ translateY: translate_y.value },
				{ rotate: `${rotate}deg` }
			]
		};
	});

	const add_overlay_style = useAnimatedStyle(() => ({
		opacity: interpolate(translate_x.value, [0, SWIPE_THRESHOLD], [0, 0.45], Extrapolation.CLAMP)
	}));

	const skip_overlay_style = useAnimatedStyle(() => ({
		opacity: interpolate(translate_x.value, [-SWIPE_THRESHOLD, 0], [0.45, 0], Extrapolation.CLAMP)
	}));

	const swipe = useRef<(direction: "add" | "skip") => Promise<void>>(null!);

	const swipe_gesture = Gesture.Pan()
		.activeOffsetX([-10, 10])
		.failOffsetY([-15, 15])
		.runOnJS(true)
		.onUpdate((e) => {
			if (is_swiping.current) return;
			translate_x.value = e.translationX;
			translate_y.value = e.translationY;
		})
		.onEnd((e) => {
			if (is_swiping.current) return;
			if (e.translationX > SWIPE_THRESHOLD) swipe.current?.("add");
			else if (e.translationX < -SWIPE_THRESHOLD) swipe.current?.("skip");
			else {
				translate_x.value = withSpring(0, { damping: 20, stiffness: 200 });
				translate_y.value = withSpring(0, { damping: 20, stiffness: 200 });
			}
		});

	useEffect(() => {
		load_recommendations();
	}, []);

	// Kill TrackPlayer on exit
	useEffect(() => {
		return () => {
			TrackPlayer.pause().catch(() => {});
			TrackPlayer.reset().catch(() => {});
		};
	}, []);

	useTrackPlayerEvents([Event.PlaybackState], (event) => {
		set_preview_state(event.state);
	});

	async function load_recommendations() {
		set_loading(true);
		set_recommendations([]);
		set_current_index(0);

		const seeded_tracks = GLOBALS.global_var.sql_tracks.filter(
			t => !is_empty(t.youtubemusic_id) || !is_empty(t.soundcloud_id)
		);
		if (seeded_tracks.length === 0) {
			set_loading(false);
			return;
		}

		const seed = seeded_tracks[Math.floor(Math.random() * seeded_tracks.length)];

		let mix_tracks: Track[] = [];
		try {
			if (!is_empty(seed.youtubemusic_id)) {
				const result = await get_youtube_music_track_mix(seed.youtubemusic_id!);
				if ("tracks" in result) mix_tracks = result.tracks;
			} else if (!is_empty(seed.soundcloud_id)) {
				const result = await get_soundcloud_track_mix(String(seed.soundcloud_id!));
				if ("tracks" in result) mix_tracks = result.tracks;
			}
		} catch (_) {}

		// Build owned-ID sets for all services
		const owned_youtube_ids = new Set(GLOBALS.global_var.sql_tracks.map(t => t.youtube_id).filter(Boolean) as string[]);
		const owned_ytm_ids = new Set(GLOBALS.global_var.sql_tracks.map(t => t.youtubemusic_id).filter(Boolean) as string[]);
		const owned_sc_ids = new Set(GLOBALS.global_var.sql_tracks.map(t => t.soundcloud_id).filter(v => v !== undefined) as number[]);
		const owned_sp_ids = new Set(GLOBALS.global_var.sql_tracks.map(t => t.spotify_id).filter(Boolean) as string[]);

		const filtered = mix_tracks.filter(t => {
			if (!is_empty(t.youtube_id) && owned_youtube_ids.has(t.youtube_id!)) return false;
			if (!is_empty(t.youtubemusic_id) && owned_ytm_ids.has(t.youtubemusic_id!)) return false;
			if (t.soundcloud_id !== undefined && owned_sc_ids.has(t.soundcloud_id)) return false;
			if (!is_empty(t.spotify_id) && owned_sp_ids.has(t.spotify_id!)) return false;
			return true;
		});

		set_recommendations(filtered);
		set_loading(false);
	}

	async function animate_card_off(direction: 1 | -1): Promise<void> {
		cancelAnimation(translate_x);
		cancelAnimation(translate_y);
		translate_x.value = withTiming(direction * screen_width * 1.5, { duration: 220 });
		return new Promise(resolve => setTimeout(resolve, 225));
	}

	async function do_swipe(direction: "add" | "skip") {
		if (is_swiping.current) return;
		is_swiping.current = true;

		const track = recommendations[current_index];

		await animate_card_off(direction === "add" ? 1 : -1);

		if (direction === "add") {
			await SQLTracks.insert_track(track);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
			show_toast("Added to library!");
			GLOBALS.global_var.bottom_alert(`Added "${track.title}"`, "GOOD");
		}

		translate_x.value = 0;
		translate_y.value = 0;

		const next_idx = current_index + 1;
		if (next_idx >= recommendations.length) {
			set_recommendations([]);
		} else {
			set_current_index(next_idx);
		}

		is_swiping.current = false;
	}

	swipe.current = do_swipe;

	function show_toast(msg: string) {
		set_toast(msg);
		if (toast_timer.current) clearTimeout(toast_timer.current);
		toast_timer.current = setTimeout(() => set_toast(null), 1500);
	}

	async function toggle_preview(track: Track) {
		if (is_previewing) {
			await TrackPlayer.pause();
			set_is_previewing(false);
			return;
		}
		set_is_previewing(true);
		try {
			await setup_track_player();
			await TrackPlayer.reset();
			const tp_track = await illusive_track_to_track_player_track(track);
			if (tp_track === "skip") {
				GLOBALS.global_var.bottom_alert("Couldn't preview track", "WARN");
				set_is_previewing(false);
				return;
			}
			await TrackPlayer.add(tp_track);
			await TrackPlayer.play();
			// Seek to 30% for a representative snippet
			if (track.duration > 60) {
				setTimeout(async () => {
					await TrackPlayer.seekTo(track.duration * 0.3).catch(() => {});
				}, 800);
			}
		} catch (_) {
			set_is_previewing(false);
		}
	}

	if (loading || recommendations.length === 0) {
		return (
			<View style={{ backgroundColor: colors.background, flex: 1 }}>
				<EmptyState loading={loading} on_retry={load_recommendations} />
			</View>
		);
	}

	const current_track = recommendations[current_index];
	const next_track = recommendations[current_index + 1];
	const artwork = current_track?.playback?.artwork ?? current_track?.artwork_url;
	const is_playing_preview = is_previewing && preview_state === State.Playing;

	return (
		<View style={{ backgroundColor: colors.background, flex: 1 }}>
			{/* Tint overlays */}
			<Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#22aa44" }, add_overlay_style]} />
			<Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#cc2222" }, skip_overlay_style]} />

			{/* Card stack */}
			<View style={{ flex: 1, paddingTop: 20 }}>
				{/* Next card (behind) */}
				{next_track && (
					<View
						style={{ position: "absolute", top: 20, left: 0, right: 0, alignItems: "center", transform: [{ scale: 0.90 }], opacity: 0.25 }}
						pointerEvents="none">
						<View style={styles.card_inner}>
							<IImage
								source={next_track.playback?.artwork ?? next_track.artwork_url}
								width={screen_width - 60}
								style={{ borderRadius: 16, height: screen_width - 60, maxWidth: screen_width - 60 }}
							/>
						</View>
					</View>
				)}

				{/* Current card */}
				<GestureDetector gesture={swipe_gesture}>
					<Animated.View style={[card_style, { alignItems: "center" }]}>
						<View style={styles.card_inner}>
							<View style={styles.artwork_shadow}>
								<IImage
									source={artwork}
									width={screen_width - 60}
									style={{ borderRadius: 16, height: screen_width - 60, maxWidth: screen_width - 60 }}
								/>
							</View>
							<View style={{ paddingHorizontal: 8, paddingTop: 16 }}>
								<TextTicker
									style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}
									scroll={false}
									duration={12000}
									bounce={false}
									easing={Easing.linear}>
									{current_track.title}
								</TextTicker>
								<Text numberOfLines={1} style={{ color: colors.subtext, fontSize: 15, marginTop: 3 }}>
									{artist_string(current_track)}
								</Text>
								<ServiceChip track={current_track} />
							</View>
						</View>
					</Animated.View>
				</GestureDetector>
			</View>

			{/* Toast */}
			{toast !== null && (
				<View style={styles.toast}>
					<Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{toast}</Text>
				</View>
			)}

			{/* Button row */}
			<View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 24, paddingBottom: 48, paddingTop: 12 }}>
				<TouchableOpacity onPress={() => do_swipe("skip")} disabled={is_swiping.current}>
					<Ionicons name="close-circle" size={60} color={colors.red} />
				</TouchableOpacity>

				<TouchableOpacity onPress={() => toggle_preview(current_track)}>
					<Ionicons
						name={is_playing_preview ? "pause-circle" : "play-circle"}
						size={60}
						color={colors.primary}
					/>
				</TouchableOpacity>

				<TouchableOpacity onPress={() => do_swipe("add")} disabled={is_swiping.current}>
					<Ionicons name="heart-circle" size={60} color={colors.green} />
				</TouchableOpacity>
			</View>
		</View>
	);
}

const theme_styles = (_colors: Prefs.Theme["colors"]) => StyleSheet.create({
	card_inner: {
		width: "100%",
		paddingHorizontal: 30
	},
	artwork_shadow: {
		borderRadius: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.25,
		shadowRadius: 10,
		elevation: 6
	},
	toast: {
		position: "absolute",
		bottom: 120,
		alignSelf: "center",
		backgroundColor: "#000000BB",
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 20
	}
});
