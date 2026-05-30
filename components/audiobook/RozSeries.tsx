import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import { Constants } from "@illusive/constants";
import { ContextMenuView } from "@components/ContextMenu";
import IImage from "@components/IImage";
import { novel_progress_percent } from "./types";
import { SeriesContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";

export interface RozSeriesProps {
	series_name: string;
	novels: AudiobookTableItem[];
	size: number;
	container_style?: ViewStyle;
	highlighted?: boolean;
	on_press?: (series_name: string, novels: AudiobookTableItem[]) => void;
	on_long_press?: (series_name: string, novels: AudiobookTableItem[]) => void;
	on_refresh?: () => void | Promise<void>;
}

const cover_touch_active_opacity = 0.7;

export default function RozSeries(props: RozSeriesProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const head = props.novels[0];
	const stack_inset = Math.min(props.size * 0.08, 10);
	const cover_height = props.size * 1.45;
	const total_listened = props.novels.reduce((a, n) => a + n.total_listened_ms, 0);
	const total_duration = props.novels.reduce((a, n) => a + n.total_duration_ms, 0);
	const overall_percent = total_duration > 0 ? Math.min(1, total_listened / total_duration) : 0;
	const finished = props.novels.filter(n => novel_progress_percent(n) >= 0.999).length;
	const back_cover = props.novels[1]?.cover ?? head?.cover ?? null;
	const back2_cover = props.novels[2]?.cover ?? back_cover;

	return (
		<ContextMenuView
			menuConfig={SeriesContextMenu.series_component_context_menu(props.series_name, props.novels)}
			onPressMenuItem={async ({ nativeEvent }) => {
				await ContextResolver.resolve_series_context(props.series_name, props.novels, nativeEvent.actionKey as ContextResolver.SeriesContextKeys, {
					on_open: props.on_press,
					on_resume: props.on_press,
					on_refresh: props.on_refresh
				});
			}}>
			<View style={{ ...props.container_style, width: props.size }}>
				<TouchableOpacity activeOpacity={cover_touch_active_opacity} onPress={() => props.on_press?.(props.series_name, props.novels)} onLongPress={() => props.on_long_press?.(props.series_name, props.novels)} delayLongPress={Constants.long_press_delay}>
					<View style={{ width: props.size, height: cover_height + stack_inset * 2 }}>
						<IImage source={back2_cover} style={[styles.cover, { width: props.size - stack_inset * 2, height: cover_height, top: stack_inset * 2, left: stack_inset * 2, opacity: 0.55, transform: [{ rotate: "4deg" }] }]} />
						<IImage source={back_cover} style={[styles.cover, { width: props.size - stack_inset, height: cover_height, top: stack_inset, left: stack_inset, opacity: 0.85, transform: [{ rotate: "-3deg" }] }]} />
						<IImage source={head?.cover ?? null} style={[styles.cover, styles.front_cover, { width: props.size, height: cover_height }]} />
						<View style={[styles.count_badge, { backgroundColor: colors.primary }]}>
							<Text style={styles.count_badge_text}>{props.novels.length}</Text>
						</View>
						{overall_percent > 0 ? (
							<View style={[styles.progress_track, { width: props.size - 8 }]}>
								<View style={[styles.progress_fill, { width: `${overall_percent * 100}%`, backgroundColor: colors.primary }]} />
							</View>
						) : null}
						{props.highlighted ? <View style={[styles.highlight_ring, { borderColor: colors.primary }]} pointerEvents="none" /> : null}
					</View>
				</TouchableOpacity>
				<View style={styles.bottom_info_container}>
					<Text numberOfLines={1} style={[styles.title_text, { color: colors.text, width: props.size }]}>
						{props.series_name}
					</Text>
				</View>
				{head?.author ? (
					<Text numberOfLines={1} style={[styles.author_text, { color: colors.subtext, width: props.size }]}>
						{head.author}
					</Text>
				) : null}
				<View style={styles.meta_row}>
					<Text style={[styles.meta_text, { color: colors.deeptext }]}>{props.novels.length} books</Text>
					<Text style={[styles.meta_text, { color: colors.deeptext }]}>
						{finished}/{props.novels.length} done
					</Text>
				</View>
			</View>
		</ContextMenuView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		cover: { position: "absolute", borderRadius: 6, borderColor: "#ffffff20", borderTopWidth: 0.4, borderRightWidth: 0.6, backgroundColor: colors.shelf },
		front_cover: { top: 0, left: 0, zIndex: 3 },
		count_badge: { position: "absolute", top: 6, right: 6, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, justifyContent: "center", alignItems: "center", zIndex: 5 },
		count_badge_text: { color: "#ffffff", fontSize: 11, fontWeight: "800" },
		progress_track: { position: "absolute", bottom: 6, left: 4, height: 3, borderRadius: 2, backgroundColor: "#00000066", overflow: "hidden", zIndex: 4 },
		progress_fill: { height: "100%", borderRadius: 2 },
		highlight_ring: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 8, borderWidth: 2, zIndex: 6 },
		bottom_info_container: { paddingTop: 7, flexDirection: "row", justifyContent: "space-between" },
		title_text: { fontSize: 13, fontWeight: "700" },
		author_text: { fontSize: 11, marginTop: 1 },
		meta_row: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
		meta_text: { fontSize: 10, fontWeight: "600" }
	});
