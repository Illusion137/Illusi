import { useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import CompactRozNovel from "./CompactRozNovel";
import CompactRozSeries from "./CompactRozSeries";
import { group_audiobooks_into_entries, type RozNovelCallbacks, type RozNovelsEntry } from "./types";

export interface RozNovelsListProps extends RozNovelCallbacks {
	novels: AudiobookTableItem[];
}

interface DragTarget {
	type: "novel" | "series";
	entry_key: string;
}

export default function RozNovelsList(props: RozNovelsListProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const entries = useMemo(() => group_audiobooks_into_entries(props.novels), [props.novels]);

	const layouts = useRef<Map<string, LayoutRectangle>>(new Map());
	const [drag_state, set_drag_state] = useState<{ source_key: string; target: DragTarget | null } | null>(null);

	function find_target(_abs_x: number, abs_y: number, source_key: string): DragTarget | null {
		for (const [key, rect] of layouts.current) {
			if (key === source_key) continue;
			if (abs_y >= rect.y && abs_y <= rect.y + rect.height) {
				const entry = entries.find(e => e.key === key);
				if (entry === undefined) return null;
				return { type: entry.type, entry_key: key };
			}
		}
		return null;
	}

	function on_drop(source_key: string, target: DragTarget | null) {
		const source_entry = entries.find(e => e.key === source_key);
		if (source_entry === undefined || target === null) return;
		const target_entry = entries.find(e => e.key === target.entry_key);
		if (target_entry === undefined) return;
		Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
		if (source_entry.type === "novel" && target_entry.type === "novel") {
			props.on_group_novels?.(source_entry.novel, target_entry.novel);
		} else if (source_entry.type === "novel" && target_entry.type === "series") {
			props.on_add_to_series?.(source_entry.novel, target_entry.series_name);
		}
	}

	return (
		<ScrollView contentContainerStyle={styles.list_container}>
			{entries.map(entry => (
				<DraggableRow
					key={entry.key}
					entry={entry}
					on_layout_change={(rect) => layouts.current.set(entry.key, rect)}
					on_drag_start={(key) => set_drag_state({ source_key: key, target: null })}
					on_drag_update={(key, abs_x, abs_y) => {
						const target = find_target(abs_x, abs_y, key);
						set_drag_state((prev) => (prev?.source_key === key && prev?.target?.entry_key === target?.entry_key ? prev : { source_key: key, target }));
					}}
					on_drag_end={(key) => {
						on_drop(key, drag_state?.target ?? null);
						set_drag_state(null);
					}}
					drop_target_active={drag_state?.target?.entry_key === entry.key}
					dim={drag_state !== null && drag_state.source_key === entry.key}
					{...props}
				/>
			))}
			{entries.length === 0 ? (
				<View style={styles.empty_wrap}>
					<Text style={[styles.empty_text, { color: colors.subtext }]}>No audiobooks yet</Text>
				</View>
			) : null}
		</ScrollView>
	);
}

interface DraggableRowProps extends RozNovelCallbacks {
	entry: RozNovelsEntry;
	on_layout_change: (rect: LayoutRectangle) => void;
	on_drag_start: (key: string) => void;
	on_drag_update: (key: string, abs_x: number, abs_y: number) => void;
	on_drag_end: (key: string) => void;
	drop_target_active: boolean;
	dim: boolean;
}

function DraggableRow(props: DraggableRowProps) {
	const translation_y = useSharedValue(0);
	const scale = useSharedValue(1);
	const z_index = useSharedValue(0);

	const pan = Gesture.Pan()
		.activateAfterLongPress(320)
		.onStart(() => {
			scale.value = withSpring(1.03);
			z_index.value = 100;
			runOnJS(haptic_light)();
			runOnJS(props.on_drag_start)(props.entry.key);
		})
		.onUpdate((e) => {
			translation_y.value = e.translationY;
			runOnJS(props.on_drag_update)(props.entry.key, e.absoluteX, e.absoluteY);
		})
		.onEnd(() => {
			runOnJS(props.on_drag_end)(props.entry.key);
			translation_y.value = withTiming(0);
			scale.value = withSpring(1);
			z_index.value = 0;
		});

	const animated_style = useAnimatedStyle(() => ({
		transform: [{ translateY: translation_y.value }, { scale: scale.value }],
		zIndex: z_index.value,
		elevation: z_index.value
	}));

	return (
		<GestureDetector gesture={pan}>
			<Animated.View onLayout={(e) => props.on_layout_change(e.nativeEvent.layout)} style={animated_style}>
				{props.entry.type === "novel" ? (
					<CompactRozNovel novel={props.entry.novel} dimmed={props.drop_target_active} on_press={props.on_press_novel} on_refresh={props.on_refresh} />
				) : (
					<CompactRozSeries series_name={props.entry.series_name} novels={props.entry.novels} highlighted={props.drop_target_active} on_press={props.on_press_series} on_press_novel={props.on_press_novel} on_refresh={props.on_refresh} />
				)}
			</Animated.View>
		</GestureDetector>
	);
}

function haptic_light() {
	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

const theme_styles = (_colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		list_container: {
			paddingTop: 4,
			paddingBottom: 64
		},
		empty_wrap: {
			width: "100%",
			alignItems: "center",
			paddingTop: 60
		},
		empty_text: {
			fontSize: 14
		}
	});
