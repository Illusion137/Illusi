import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from "react-native-reanimated";
import { FontAwesome6 } from "@expo/vector-icons";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import { SwipeListView } from "react-native-swipe-list-view";
import * as Haptics from "expo-haptics";
import { GLOBALS } from "@illusive/globals";
import usePTheme from "@hooks/usePTheme";
import { delete_track_from_player_queue } from "@illusive/track_player_service";
import { artist_string, duration_to_string } from "@illusive/illusive_utils";
import type { Track } from "@illusive/types";
import TrackComponentBase from "@components/TrackComponentBase";
import { empty_join_dot } from "@common/utils/util";

const HANDLE_H = 58;
const PANEL_H = Math.min(Dimensions.get("screen").height * 0.58, 520);

const QueueHandle = memo<{ expanded_progress: SharedValue<number> }>(function QueueHandle({ expanded_progress }) {
	const { colors } = usePTheme();
	const [queue, set_queue] = useState<Track[]>([]);

	const panel_h = useSharedValue(HANDLE_H);
	const drag_base = useSharedValue(HANDLE_H);

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
	}, []);

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], (event) => {
		if (event.type === Event.PlaybackActiveTrackChanged && event.index !== undefined) {
			set_queue(GLOBALS.global_var.playing_tracks.slice(event.index));
		}
	});

	const pan = Gesture.Pan()
		.activeOffsetY([-8, 8])
		.failOffsetX([-10, 10])
		.onStart(() => {
			drag_base.value = panel_h.value;
		})
		.onUpdate((e) => {
			const new_h = Math.max(HANDLE_H, Math.min(PANEL_H, drag_base.value - e.translationY));
			panel_h.value = new_h;
			expanded_progress.value = (new_h - HANDLE_H) / (PANEL_H - HANDLE_H);
		})
		.onEnd((e) => {
			const snap_open = e.velocityY < -400 || panel_h.value > (HANDLE_H + PANEL_H) / 2;
			panel_h.value = withSpring(snap_open ? PANEL_H : HANDLE_H, { damping: 22, stiffness: 220 });
			expanded_progress.value = withSpring(snap_open ? 1 : 0, { damping: 22, stiffness: 220 });
		});

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

	const render_item = useCallback(({ item }: { item: Track }) => <TrackComponentBase track_data={item} on_press={undefined} on_long_press={() => {}} disabled={true} background_opacity="C0" />, []);

	const render_hidden_item = useCallback(
		(data: { item: Track; index: number }) => (
			<TouchableOpacity onPress={async () => remove_track(data.item, data.index)} style={{ backgroundColor: "#8B000040", flex: 1, justifyContent: "center", alignItems: "flex-end" }}>
				<FontAwesome6 name="delete-left" style={{ right: 10 }} color="white" size={22} />
			</TouchableOpacity>
		),
		[remove_track]
	);

	const key_extractor = useCallback((item: Track, i: number) => item.uid + i, []);

	return (
		<Animated.View style={[{ position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.shelf + "40", overflow: "hidden", zIndex: 30 }, container_style]}>
			{/* Drag handle + collapsed next-up preview */}
			<GestureDetector gesture={pan}>
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
			{/* Expanded queue list */}
			<SwipeListView
				data={up_next_data}
				keyExtractor={key_extractor}
				scrollEnabled={true}
				nestedScrollEnabled={true}
				removeClippedSubviews={true}
				initialNumToRender={10}
				maxToRenderPerBatch={8}
				windowSize={7}
				ListHeaderComponent={list_header}
				renderItem={render_item}
				renderHiddenItem={render_hidden_item}
				rightOpenValue={-75}
				rightActionValue={-80}
				rightActivationValue={-80}
				disableRightSwipe
			/>
		</Animated.View>
	);
});

export default QueueHandle;
