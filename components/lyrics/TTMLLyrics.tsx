import type { ParsedLyrics } from '@origin/illusi/types';
import { Canvas, createPicture, FontWeight, Picture } from '@shopify/react-native-skia';
import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, type NativeGesture } from 'react-native-gesture-handler';
import Animated, { Easing, scrollTo, useAnimatedReaction, useAnimatedRef, useAnimatedScrollHandler, useDerivedValue, useFrameCallback, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { CASCADE_LIFETIME_MS, draw_lyrics, type Cascade } from './draw_lyrics';
import { build_lyrics_layout, item_at, type LyricItem, type LyricsLayout } from './lyrics_layout';
import { usePlaybackClock } from './usePlaybackClock';

/** Scroll starts this early so the cascade has landed by the time the line is sung */
const SCROLL_LEAD_MS = 500;
const FOCUS_MS = 450;
const DEFAULT_FONT_FAMILIES = ['SF Pro Display', 'System Font', 'Helvetica Neue'];

export interface TTMLLyricsHandle {
	resume_follow: () => void;
}

export interface TTMLLyricsProps {
	ref?: Ref<TTMLLyricsHandle>;
	lyrics: ParsedLyrics;
	/** Keep the active line anchored; manual scrolling pauses this until `resume_follow_ms` of inactivity */
	follow?: boolean;
	on_follow_change?: (following: boolean) => void;
	/** Defaults to seeking the player */
	on_seek?: (ms: number) => void;
	/** Drive the lyrics from an external clock instead of the player */
	time_ms?: SharedValue<number>;
	color?: string;
	font_size?: number;
	font_weight?: FontWeight;
	font_families?: string[];
	line_height?: number;
	padding_horizontal?: number;
	/** Where the active line rests, as a fraction of the height */
	anchor?: number;
	blur?: boolean;
	resume_follow_ms?: number;
	/** Lets an enclosing gesture (e.g. a pull-down panel) wait on lyric scrolling */
	scroll_gesture?: NativeGesture;
	style?: StyleProp<ViewStyle>;
}

interface HitboxProps {
	item: LyricItem;
	inset: number;
	line_gap: number;
	on_press: (ms: number) => void;
}

const Hitbox = memo(function Hitbox({ item, inset, line_gap, on_press }: HitboxProps) {
	if (item.kind !== 'line' && item.kind !== 'gap') return null;
	return (
		<Pressable
			style={({ pressed }) => [styles.hitbox, { top: item.y + line_gap * 0.2, height: item.height - line_gap * 0.4, left: inset, right: inset }, pressed && styles.pressed]}
			onPress={() => on_press(item.begin_ms)}
			accessibilityRole="button"
			accessibilityLabel={item.kind === 'line' ? item.text : 'Instrumental'}
		/>
	);
});

export default memo(function TTMLLyrics({
	ref,
	lyrics,
	follow = true,
	on_follow_change,
	on_seek,
	time_ms: external_time_ms,
	color = '#FFFFFF',
	font_size = 34,
	font_weight = FontWeight.Bold,
	font_families = DEFAULT_FONT_FAMILIES,
	line_height = 1.2,
	padding_horizontal = 28,
	anchor = 0.3,
	blur = true,
	resume_follow_ms = 3500,
	scroll_gesture,
	style
}: TTMLLyricsProps) {
	const [size, set_size] = useState({ width: 0, height: 0 });
	const clock = usePlaybackClock(external_time_ms === undefined);
	const time_ms = external_time_ms ?? clock.time_ms;

	const layout = useMemo(
		() => (size.width === 0 || size.height === 0 ? null : build_lyrics_layout(lyrics, size.width, size.height, { color, font_size, font_weight, font_families, line_height, padding_horizontal, anchor })),
		[lyrics, size, color, font_size, font_weight, font_families, line_height, padding_horizontal, anchor]
	);

	const layout_sv = useSharedValue<LyricsLayout | null>(null);
	const viewport_height = useSharedValue(0);
	const scroll_y = useSharedValue(0);
	const focus = useSharedValue(0);
	const manual = useSharedValue(follow ? 0 : 1);
	const following = useSharedValue(follow);
	const cascades = useSharedValue<Cascade[]>([]);
	const now = useSharedValue(0);
	const scroll_ref = useAnimatedRef<Animated.ScrollView>();

	const user_paused = useRef(false);
	const resume_timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const on_follow_change_ref = useRef(on_follow_change);
	on_follow_change_ref.current = on_follow_change;

	useEffect(() => {
		layout_sv.value = layout;
		viewport_height.value = size.height;
	}, [layout, layout_sv, size.height, viewport_height]);

	const clear_resume = useCallback(() => {
		if (resume_timer.current !== null) clearTimeout(resume_timer.current);
		resume_timer.current = null;
	}, []);

	useEffect(() => {
		clear_resume();
		user_paused.current = false;
		following.value = follow;
		manual.value = withTiming(follow ? 0 : 1, { duration: 400 });
	}, [clear_resume, follow, following, manual]);

	useEffect(() => clear_resume, [clear_resume]);

	const pause_follow = useCallback(() => {
		clear_resume();
		if (!follow || user_paused.current) return;
		user_paused.current = true;
		following.value = false;
		manual.value = withTiming(1, { duration: 300 });
		on_follow_change_ref.current?.(false);
	}, [clear_resume, follow, following, manual]);

	const resume_follow = useCallback(() => {
		clear_resume();
		if (!follow || !user_paused.current) return;
		user_paused.current = false;
		following.value = true;
		manual.value = withTiming(0, { duration: 600 });
		on_follow_change_ref.current?.(true);
	}, [clear_resume, follow, following, manual]);

	useImperativeHandle(ref, () => ({ resume_follow }), [resume_follow]);

	const schedule_resume = useCallback(() => {
		clear_resume();
		if (user_paused.current) resume_timer.current = setTimeout(resume_follow, resume_follow_ms);
	}, [clear_resume, resume_follow, resume_follow_ms]);

	const seek = useCallback((ms: number) => {
		if (on_seek === undefined) clock.seek(ms);
		else on_seek(ms);
		resume_follow();
	}, [clock, on_seek, resume_follow]);

	useAnimatedReaction(
		() => {
			const current = layout_sv.value;
			return !current?.timed ? -1 : item_at(current, time_ms.value);
		},
		(index, previous) => {
			if (index < 0 || index === previous) return;
			focus.value = previous === null || previous < 0 ? index : withTiming(index, { duration: FOCUS_MS, easing: Easing.out(Easing.cubic) });
		}
	);

	useAnimatedReaction(
		() => {
			const current = layout_sv.value;
			const index = current === null || !current.timed || !following.value ? -1 : item_at(current, time_ms.value + SCROLL_LEAD_MS);
			return { index, current };
		},
		({ index, current }, previous) => {
			if (index < 0 || current === null || (previous?.index === index && previous.current === current)) return;
			const target = Math.min(Math.max(current.items[index].y - current.top_inset, 0), Math.max(current.content_height - viewport_height.value, 0));
			const delta = target - scroll_y.value;
			if (Math.abs(delta) < 0.5) return;
			if (previous?.current === current) {
				const started = Date.now();
				cascades.value = [...cascades.value.filter(cascade => started - cascade.start < CASCADE_LIFETIME_MS), { index, delta, start: started }];
			}
			scroll_y.value = target;
			scrollTo(scroll_ref, 0, target, false);
		}
	);

	useFrameCallback(() => {
		'worklet';
		if (cascades.value.length === 0) return;
		const started = Date.now();
		now.value = started;
		if (cascades.value.every(cascade => started - cascade.start > CASCADE_LIFETIME_MS)) cascades.value = [];
	});

	const on_scroll = useAnimatedScrollHandler({
		onScroll: (event) => {
			scroll_y.value = event.contentOffset.y;
		},
		onBeginDrag: () => {
			scheduleOnRN(pause_follow);
		},
		onEndDrag: () => {
			scheduleOnRN(schedule_resume);
		},
		onMomentumEnd: () => {
			scheduleOnRN(schedule_resume);
		}
	}, [pause_follow, schedule_resume]);

	const sync_native_scroll = useCallback(() => {
		scheduleOnUI(() => {
			'worklet';
			scrollTo(scroll_ref, 0, scroll_y.value, false);
		});
	}, [scroll_ref, scroll_y]);

	const picture = useDerivedValue(() => createPicture((canvas) => {
		const current = layout_sv.value;
		if (current === null) return;
		draw_lyrics(canvas, current, {
			time_ms: time_ms.value,
			now: now.value,
			scroll_y: scroll_y.value,
			focus: focus.value,
			manual: manual.value,
			cascades: cascades.value,
			viewport_height: viewport_height.value,
			blur
		});
	}), [blur, time_ms]);

	const on_layout = useCallback((event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout;
		set_size(previous => (previous.width === width && previous.height === height ? previous : { width, height }));
	}, []);

	const scroll_view = (
		<Animated.ScrollView
			ref={scroll_ref}
			style={StyleSheet.absoluteFill}
			contentContainerStyle={{ height: layout?.content_height ?? 0 }}
			onScroll={on_scroll}
			onContentSizeChange={sync_native_scroll}
			scrollEventThrottle={16}
			showsVerticalScrollIndicator={false}
		>
			{layout?.items.map((item, index) => <Hitbox key={index} item={item} inset={layout.padding_horizontal / 2} line_gap={layout.line_gap} on_press={seek} />)}
		</Animated.ScrollView>
	);

	return (
		<View style={[styles.container, style]} onLayout={on_layout}>
			<Canvas style={StyleSheet.absoluteFill}>
				<Picture picture={picture} />
			</Canvas>
			{scroll_gesture === undefined ? scroll_view : <GestureDetector gesture={scroll_gesture}>{scroll_view}</GestureDetector>}
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		flex: 1,
		overflow: 'hidden'
	},
	hitbox: {
		position: 'absolute',
		borderRadius: 14
	},
	pressed: {
		backgroundColor: 'rgba(255, 255, 255, 0.08)'
	}
});
