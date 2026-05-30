import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import { Constants } from "@illusive/constants";
import { ContextMenuView } from "@components/ContextMenu";
import IImage from "@components/IImage";
import { novel_progress_percent } from "./types";
import CompactRozNovel from "./CompactRozNovel";
import { SeriesContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";

export interface CompactRozSeriesProps {
	series_name: string;
	novels: AudiobookTableItem[];
	container_style?: ViewStyle;
	highlighted?: boolean;
	default_expanded?: boolean;
	on_press?: (series_name: string, novels: AudiobookTableItem[]) => void;
	on_press_novel?: (novel: AudiobookTableItem) => void;
	on_long_press_novel?: (novel: AudiobookTableItem) => void;
	on_refresh?: () => void | Promise<void>;
}

const COVER_SIZE = 46;

export default function CompactRozSeries(props: CompactRozSeriesProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const [expanded, set_expanded] = useState(props.default_expanded ?? false);
	const head = props.novels[0];
	const second = props.novels[1] ?? head;
	const total_listened = props.novels.reduce((a, n) => a + n.total_listened_ms, 0);
	const total_duration = props.novels.reduce((a, n) => a + n.total_duration_ms, 0);
	const overall_percent = total_duration > 0 ? Math.min(1, total_listened / total_duration) : 0;
	const finished = props.novels.filter((n) => novel_progress_percent(n) >= 0.999).length;

	return (
		<View style={[{ backgroundColor: props.highlighted ? colors.primary_dark : "transparent" }, props.container_style]}>
			<ContextMenuView
				menuConfig={SeriesContextMenu.series_component_context_menu(props.series_name, props.novels, expanded)}
				onPressMenuItem={async ({ nativeEvent }) => {
					await ContextResolver.resolve_series_context(props.series_name, props.novels, nativeEvent.actionKey as ContextResolver.SeriesContextKeys, {
						on_open: props.on_press,
						on_resume: props.on_press,
						on_toggle_expand: () => set_expanded((e) => !e),
						on_refresh: props.on_refresh
					});
				}}>
				<TouchableOpacity activeOpacity={0.7} style={styles.row} onPress={() => set_expanded((e) => !e)} onLongPress={() => props.on_press?.(props.series_name, props.novels)} delayLongPress={Constants.long_press_delay}>
					<View style={styles.stack_wrap}>
						<IImage source={second.cover || null} style={[styles.cover, styles.cover_back]} />
						<IImage source={head?.cover ?? null} style={[styles.cover, styles.cover_front]} />
					</View>
					<View style={styles.meta}>
						<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
							{props.series_name}
						</Text>
						<Text style={[styles.subtitle, { color: colors.subtext }]} numberOfLines={1}>
							{props.novels.length} books{head?.author ? ` • ${head.author}` : ""} • {finished}/{props.novels.length} done
						</Text>
						{overall_percent > 0 ? (
							<View style={[styles.progress_track, { backgroundColor: colors.line }]}>
								<View style={[styles.progress_fill, { width: `${overall_percent * 100}%`, backgroundColor: colors.primary }]} />
							</View>
						) : null}
					</View>
					<Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.subtext} />
				</TouchableOpacity>
			</ContextMenuView>
			{expanded ? props.novels.map((novel) => <CompactRozNovel key={novel.uuid} novel={novel} indented on_press={props.on_press_novel} on_long_press={props.on_long_press_novel} on_refresh={props.on_refresh} />) : null}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingLeft: 12, paddingRight: 12, gap: 12 },
		stack_wrap: { width: COVER_SIZE + 8, height: COVER_SIZE * 1.4, position: "relative" },
		cover: { width: COVER_SIZE, height: COVER_SIZE * 1.4, borderRadius: 4, position: "absolute", backgroundColor: colors.shelf },
		cover_back: { top: 0, left: 8, opacity: 0.7, transform: [{ rotate: "5deg" }] },
		cover_front: { top: 0, left: 0 },
		meta: { flex: 1, gap: 2 },
		title: { fontSize: 14, fontWeight: "700" },
		subtitle: { fontSize: 12 },
		progress_track: { height: 2, borderRadius: 1, marginTop: 4, overflow: "hidden" },
		progress_fill: { height: "100%", borderRadius: 1 }
	});
