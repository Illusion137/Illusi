import { useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, type LayoutRectangle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import RozNovel from "./RozNovel";
import RozSeries from "./RozSeries";
import { group_audiobooks_into_entries, type RozNovelCallbacks, type RozNovelsEntry } from "./types";

export interface RozNovelsGridProps extends RozNovelCallbacks {
	novels: AudiobookTableItem[];
	columns?: number;
	horizontal_padding?: number;
	row_gap?: number;
}

interface DragTarget {
	type: "novel" | "series" | "reorder";
	entry_key: string;
	insert_index?: number;
}

export default function RozNovelsGrid(props: RozNovelsGridProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const { width } = useDimensions();
	const columns = props.columns ?? 3;
	const horizontal_padding = props.horizontal_padding ?? 14;
	const row_gap = props.row_gap ?? 22;
	const novel_size = (width - horizontal_padding * 2) / columns - 6;

	const entries = useMemo(() => group_audiobooks_into_entries(props.novels), [props.novels]);

	const layouts = useRef<Map<string, LayoutRectangle>>(new Map());
	const [drag_state, set_drag_state] = useState<{ source_key: string; target: DragTarget | null } | null>(null);

	function find_target(absolute_x: number, absolute_y: number, source_key: string): DragTarget | null {
		for (const [key, rect] of layouts.current) {
			if (key === source_key) continue;
			if (absolute_x >= rect.x && absolute_x <= rect.x + rect.width && absolute_y >= rect.y && absolute_y <= rect.y + rect.height) {
				const entry = entries.find(e => e.key === key);
				if (entry === undefined) return null;
				return { type: entry.type, entry_key: key };
			}
		}
		return null;
	}

	function on_drop(source_key: string, target: DragTarget | null) {
		const source_entry = entries.find(e => e.key === source_key);
		if (source_entry === undefined) return;
		if (target === null) return;
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
		<ScrollView contentContainerStyle={[styles.grid, { paddingHorizontal: horizontal_padding, rowGap: row_gap }]}>
			{entries.map((entry, i) => (
				<DraggableCell
					key={entry.key}
					entry={entry}
					index={i}
					size={novel_size}
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

interface DraggableCellProps extends RozNovelCallbacks {
	entry: RozNovelsEntry;
	index: number;
	size: number;
	on_layout_change: (rect: LayoutRectangle) => void;
	on_drag_start: (key: string) => void;
	on_drag_update: (key: string, abs_x: number, abs_y: number) => void;
	on_drag_end: (key: string) => void;
	drop_target_active: boolean;
	dim: boolean;
}

function DraggableCell(props: DraggableCellProps) {
	const translation_x = useSharedValue(0);
	const translation_y = useSharedValue(0);
	const scale = useSharedValue(1);
	const z_index = useSharedValue(0);

	const pan = Gesture.Pan()
		.activateAfterLongPress(280)
		.onStart(() => {
			scale.value = withSpring(1.08);
			z_index.value = 100;
			runOnJS(haptic_light)();
			runOnJS(props.on_drag_start)(props.entry.key);
		})
		.onUpdate((e) => {
			translation_x.value = e.translationX;
			translation_y.value = e.translationY;
			runOnJS(props.on_drag_update)(props.entry.key, e.absoluteX, e.absoluteY);
		})
		.onEnd(() => {
			runOnJS(props.on_drag_end)(props.entry.key);
			translation_x.value = withTiming(0);
			translation_y.value = withTiming(0);
			scale.value = withSpring(1);
			z_index.value = 0;
		});

	const animated_style = useAnimatedStyle(() => ({
		transform: [{ translateX: translation_x.value }, { translateY: translation_y.value }, { scale: scale.value }],
		zIndex: z_index.value,
		elevation: z_index.value
	}));

	return (
		<GestureDetector gesture={pan}>
			<Animated.View
				onLayout={(e) => props.on_layout_change(e.nativeEvent.layout)}
				style={[{ width: props.size + 6, padding: 3 }, animated_style]}>
				{props.entry.type === "novel" ? (
					<RozNovel novel={props.entry.novel} size={props.size} dimmed={props.drop_target_active} on_press={props.on_press_novel} on_refresh={props.on_refresh} />
				) : (
					<RozSeries series_name={props.entry.series_name} novels={props.entry.novels} size={props.size} highlighted={props.drop_target_active} on_press={props.on_press_series} on_refresh={props.on_refresh} />
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
		grid: {
			flexDirection: "row",
			flexWrap: "wrap",
			paddingTop: 12,
			paddingBottom: 64,
			justifyContent: "flex-start"
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
