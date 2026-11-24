import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture, type ComposedGesture, type PanGesture } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { FontAwesome6 } from '@expo/vector-icons';
import { Event, useTrackPlayerEvents } from 'react-native-everything-player';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import usePTheme from '@hooks/usePTheme';
import { subscribe_track_player_queue_modified } from '@illusive/track_player_service';
import { active_track_index, player_queue_tracks, remove_from_player_queue } from '@utils/player_queue';
import { artist_string, duration_to_string } from '@illusive/illusive_utils';
import type { Track } from '@illusive/types';
import TrackComponentBase from '@components/TrackComponentBase';
import { empty_join_dot } from '@common/utils/util';
import { catch_log } from '@common/utils/error_util';

const HANDLE_H = 58;
const PANEL_H = Math.min(Dimensions.get('screen').height * 0.72, 640);
const SNAP_SPRING = { damping: 34, stiffness: 350, overshootClamping: true };
const SWIPE_ACTION_W = 75;

const QueueRow = memo(function QueueRow({ item, on_remove }: { item: Track; on_remove: (item: Track) => void }) {
	const render_right_actions = useCallback(
		() => (
			<TouchableOpacity onPress={() => on_remove(item)} style={{ backgroundColor: '#8B000040', width: SWIPE_ACTION_W, justifyContent: 'center', alignItems: 'center' }}>
				<FontAwesome6 name="delete-left" color="white" size={22} />
			</TouchableOpacity>
		),
		[item, on_remove]
	);
	return (
		<ReanimatedSwipeable renderRightActions={render_right_actions} rightThreshold={40} overshootRight={false} friction={2}>
			<TrackComponentBase track_data={item} on_press={undefined} on_long_press={() => {}} disabled={true} background_opacity="C0" />
		</ReanimatedSwipeable>
	);
});

export interface QueueHandleGestures {
	panel_h: SharedValue<number>;
	pan: PanGesture;
	handle_gesture: ComposedGesture;
}

// Created by the AudioPlayer rather than QueueHandle so the pan's handler tag
// is owned by the same component as the SlidingUpPanel that waits on it.
export function useQueueHandleGestures(expanded_progress: SharedValue<number>): QueueHandleGestures {
	const panel_h = useSharedValue(HANDLE_H);
	const drag_base = useSharedValue(HANDLE_H);

	const snap_to = useCallback(
		(open: boolean) => {
			'worklet';
			panel_h.value = withSpring(open ? PANEL_H : HANDLE_H, SNAP_SPRING);
			expanded_progress.value = withSpring(open ? 1 : 0, SNAP_SPRING);
		},
		[panel_h, expanded_progress]
	);

	const pan = usePanGesture({
		activeOffsetY: [-12, 12],
		failOffsetX: [-10, 10],
		onActivate: () => {
			drag_base.value = panel_h.value;
		},
		onUpdate: (e) => {
			const new_h = Math.max(HANDLE_H, Math.min(PANEL_H, drag_base.value - e.translationY));
			panel_h.value = new_h;
			expanded_progress.value = (new_h - HANDLE_H) / (PANEL_H - HANDLE_H);
		},
		onDeactivate: (e) => {
			// A deliberate flick wins over position; otherwise snap to nearest end.
			const halfway = panel_h.value > (HANDLE_H + PANEL_H) / 2;
			if (e.canceled) snap_to(halfway);
			else snap_to(e.velocityY < -400 ? true : e.velocityY > 400 ? false : halfway);
		}
	});

	// Tap the handle to toggle fully open / closed (no precise drag needed).
	const tap = useTapGesture({
		maxDuration: 250,
		onDeactivate: () => {
			snap_to(!(panel_h.value > (HANDLE_H + PANEL_H) / 2));
		}
	});

	const handle_gesture = useExclusiveGestures(pan, tap);

	return { panel_h, pan, handle_gesture };
}

const QueueHandle = memo<{ gestures: QueueHandleGestures }>(function QueueHandle({ gestures: { panel_h, handle_gesture } }) {
	const { colors } = usePTheme();
	const [queue, set_queue] = useState<Track[]>([]);

	// Mount the list on the first open and keep it mounted: repeatedly
	// mounting/unmounting a FlashList on the first frame of every drag caused a
	// visible hitch right as the panel started moving.
	const [list_mounted, set_list_mounted] = useState(false);
	useAnimatedReaction(
		() => panel_h.value > HANDLE_H + 1,
		(open, was) => {
			if (open && !was && was !== null) scheduleOnRN(set_list_mounted, true);
		}
	);

	function update_queue() {
		const idx = active_track_index();
		if (idx === undefined) return;
		set_queue(player_queue_tracks().slice(idx));
	}

	useEffect(() => {
		update_queue();
		const unsubscribe = subscribe_track_player_queue_modified(update_queue);
		return () => unsubscribe();
	}, []);

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], (event) => {
		if (event.index !== undefined) set_queue(player_queue_tracks().slice(event.index));
	});

	// Fixed height + translateY instead of animating `height`: a height change
	// forces a full layout pass (and a FlashList relayout) on every frame of the
	// drag, which is what made opening/closing stutter. A transform is
	// composited on the UI thread without any layout work.
	const container_style = useAnimatedStyle(() => ({ transform: [{ translateY: PANEL_H - panel_h.value }] }));

	const next_track = useMemo(() => queue[1] ?? null, [queue]);
	const up_next_data = useMemo(() => queue.slice(1, 50), [queue]);
	const now_playing = useMemo(() => queue[0] ?? null, [queue]);
	const has_up_next = up_next_data.length > 0;

	const remove_track = useCallback(async (item: Track) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(catch_log);
		const active_index = active_track_index();
		if (active_index === undefined) return;
		await remove_from_player_queue(item, active_index);
		update_queue();
	}, []);

	const list_header = useCallback(
		() => (
			<View>
				<Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', paddingHorizontal: 14, paddingTop: 2, paddingBottom: 2 }}>Now Playing</Text>
				{now_playing ? <TrackComponentBase track_data={now_playing} on_press={undefined} on_long_press={() => {}} disabled={true} background_opacity="40" /> : null}
				{has_up_next ? <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 2 }}>Up Next</Text> : null}
			</View>
		),
		[colors.text, now_playing, has_up_next]
	);

	const render_item = useCallback(({ item }: { item: Track }) => <QueueRow item={item} on_remove={remove_track} />, [remove_track]);

	const key_extractor = useCallback((item: Track, i: number) => item.uid + i, []);

	return (
		<Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, right: 0, height: PANEL_H, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.shelf + '40', overflow: 'hidden', zIndex: 30 }, container_style]}>
			{/* Drag handle + collapsed next-up preview */}
			<GestureDetector gesture={handle_gesture}>
				<View style={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 }}>
					<View style={{ alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: colors.subtext + '40', marginBottom: 4 }} />
					{next_track ? (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 40 }}>
							<View style={{ flex: 1 }}>
								<Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 2 }}>Upcoming</Text>
								<Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
									{empty_join_dot([next_track.title, next_track ? artist_string(next_track) : undefined])}
								</Text>
							</View>
							{next_track.duration ? <Text style={{ color: colors.subtext, fontSize: 12 }}>{duration_to_string(next_track.duration)}</Text> : null}
						</View>
					) : (
						<Text style={{ color: colors.subtext, fontSize: 13, textAlign: 'center', paddingBottom: 2 }}>End of queue</Text>
					)}
				</View>
			</GestureDetector>
			{/* Expanded queue list — only mounted while the panel is open. */}
			<View style={{ flex: 1 }}>{list_mounted ? <FlashList data={up_next_data} keyExtractor={key_extractor} ListHeaderComponent={list_header} renderItem={render_item} nestedScrollEnabled={true} /> : null}</View>
		</Animated.View>
	);
});

export default QueueHandle;
