import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from "react-native-reanimated";
import { FontAwesome6 } from "@expo/vector-icons";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { GLOBALS } from "@illusive/globals";
import usePTheme from "@hooks/usePTheme";
import { delete_track_from_player_queue, subscribe_track_player_queue_modified } from "@illusive/track_player_service";
import { artist_string, duration_to_string } from "@illusive/illusive_utils";
import type { Track } from "@illusive/types";
import TrackComponentBase from "@components/TrackComponentBase";
import { empty_join_dot } from "@common/utils/util";

const HANDLE_H = 58;
const PANEL_H = Math.min(Dimensions.get("screen").height * 0.72, 640);
const SNAP_SPRING = { damping: 34, stiffness: 350, overshootClamping: true };
const SWIPE_ACTION_W = 75;

const QueueRow = memo(function QueueRow({ item, index, on_remove }: { item: Track; index: number; on_remove: (item: Track, index: number) => void }) {
	const render_right_actions = useCallback(
		() => (
			<TouchableOpacity onPress={() => on_remove(item, index)} style={{ backgroundColor: "#8B000040", width: SWIPE_ACTION_W, justifyContent: "center", alignItems: "center" }}>
				<FontAwesome6 name="delete-left" color="white" size={22} />
			</TouchableOpacity>
		),
		[item, index, on_remove]
	);
	return (
		<ReanimatedSwipeable renderRightActions={render_right_actions} rightThreshold={40} overshootRight={false} friction={2} dragOffsetFromRightEdge={10}>
			<TrackComponentBase track_data={item} on_press={undefined} on_long_press={() => {}} disabled={true} background_opacity="C0" />
		</ReanimatedSwipeable>
	);
});

const QueueHandle = memo<{ expanded_progress: SharedValue<number> }>(function QueueHandle({ expanded_progress }) {
	const { colors } = usePTheme();
	const [queue, set_queue] = useState<Track[]>([]);

	const panel_h = useSharedValue(HANDLE_H);
	const drag_base = useSharedValue(HANDLE_H);
	// True while a drag is mid-flight and hasn't been resolved to a rest state yet.
	const needs_snap = useSharedValue(false);

	const [list_mounted, set_list_mounted] = useState(false);
	useAnimatedReaction(
		() => panel_h.value > HANDLE_H + 1,
		(open, was) => {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			if (open !== was && was !== null) runOnJS(set_list_mounted)(open);
		}
	);

	async function update_queue() {
		try {
			const idx = await TrackPlayer.getActiveTrackIndex();
			if (idx === undefined) return;
			set_queue(GLOBALS.global_var.playing_tracks.slice(idx));
		} catch {
			// player not yet initialized
		}
	}

	useEffect(() => {
		update_queue();
		const unsubscribe = subscribe_track_player_queue_modified(update_queue);
		return () => unsubscribe();
	}, []);

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], (event) => {
		if (event.type === Event.PlaybackActiveTrackChanged && event.index !== undefined) {
			set_queue(GLOBALS.global_var.playing_tracks.slice(event.index));
		}
	});

	const snap_to = useCallback(
		(open: boolean) => {
			"worklet";
			panel_h.value = withSpring(open ? PANEL_H : HANDLE_H, SNAP_SPRING);
			expanded_progress.value = withSpring(open ? 1 : 0, SNAP_SPRING);
		},
		[panel_h, expanded_progress]
	);

	const pan = Gesture.Pan()
		.activeOffsetY([-12, 12])
		.failOffsetX([-10, 10])
		.onStart(() => {
			drag_base.value = panel_h.value;
			needs_snap.value = true;
		})
		.onUpdate((e) => {
			const new_h = Math.max(HANDLE_H, Math.min(PANEL_H, drag_base.value - e.translationY));
			panel_h.value = new_h;
			expanded_progress.value = (new_h - HANDLE_H) / (PANEL_H - HANDLE_H);
		})
		.onEnd((e) => {
			// A deliberate flick wins over position; otherwise snap to nearest end.
			const snap_open = e.velocityY < -400 ? true : e.velocityY > 400 ? false : panel_h.value > (HANDLE_H + PANEL_H) / 2;
			snap_to(snap_open);
			needs_snap.value = false;
		})
		.onFinalize(() => {
			if (!needs_snap.value) return;
			needs_snap.value = false;
			snap_to(panel_h.value > (HANDLE_H + PANEL_H) / 2);
		});

	// Tap the handle to toggle fully open / closed (no precise drag needed).
	const tap = Gesture.Tap()
		.maxDuration(250)
		.onEnd(() => {
			const is_open = panel_h.value > (HANDLE_H + PANEL_H) / 2;
			snap_to(!is_open);
		});

	const handle_gesture = Gesture.Exclusive(pan, tap);

	const container_style = useAnimatedStyle(() => ({ height: panel_h.value }));

	const next_track = useMemo(() => queue[1] ?? null, [queue]);
	const up_next_data = useMemo(() => queue.slice(1, 50), [queue]);
	const now_playing = useMemo(() => queue[0] ?? null, [queue]);
	const has_up_next = up_next_data.length > 0;

	const remove_track = useCallback(async (item: Track, index: number) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
		await delete_track_from_player_queue(item, index);
		update_queue();
	}, []);

	const list_header = useCallback(
		() => (
			<View>
				<Text style={{ color: colors.text, fontSize: 14, fontWeight: "700", paddingHorizontal: 14, paddingTop: 2, paddingBottom: 2 }}>Now Playing</Text>
				{now_playing ? <TrackComponentBase track_data={now_playing} on_press={undefined} on_long_press={() => {}} disabled={true} background_opacity="40" /> : null}
				{has_up_next ? <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700", paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 }}>Up Next</Text> : null}
			</View>
		),
		[colors.text, now_playing, has_up_next]
	);

	const render_item = useCallback(({ item, index }: { item: Track; index: number }) => <QueueRow item={item} index={index} on_remove={remove_track} />, [remove_track]);

	const key_extractor = useCallback((item: Track, i: number) => item.uid + i, []);

	return (
		<Animated.View style={[{ position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.shelf + "40", overflow: "hidden", zIndex: 30 }, container_style]}>
			{/* Drag handle + collapsed next-up preview */}
			<GestureDetector gesture={handle_gesture}>
				<View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>
					<View style={{ alignSelf: "center", width: 32, height: 4, borderRadius: 2, backgroundColor: colors.subtext + "40", marginBottom: 4 }} />
					{next_track ? (
						<View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 40 }}>
							<View style={{ flex: 1 }}>
								<Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 2 }}>NEXT UP</Text>
								<Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
									{empty_join_dot([next_track.title, next_track ? artist_string(next_track) : undefined])}
								</Text>
							</View>
							{next_track.duration ? <Text style={{ color: colors.subtext, fontSize: 12 }}>{duration_to_string(next_track.duration)}</Text> : null}
						</View>
					) : (
						<Text style={{ color: colors.subtext, fontSize: 13, textAlign: "center", paddingBottom: 2 }}>End of queue</Text>
					)}
				</View>
			</GestureDetector>
			{/* Expanded queue list — only mounted while the panel is open. */}
			<View style={{ flex: 1 }}>{list_mounted ? <FlashList data={up_next_data} keyExtractor={key_extractor} ListHeaderComponent={list_header} renderItem={render_item} nestedScrollEnabled={true} /> : null}</View>
		</Animated.View>
	);
});

export default QueueHandle;
