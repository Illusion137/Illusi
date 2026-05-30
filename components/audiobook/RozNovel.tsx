import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import { Constants } from "@illusive/constants";
import { ContextMenuView } from "@components/ContextMenu";
import IImage from "@components/IImage";
import { format_progress_text, novel_progress_percent } from "./types";
import { AudiobookContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";

export interface RozNovelProps {
	novel: AudiobookTableItem;
	size: number;
	container_style?: ViewStyle;
	dimmed?: boolean;
	on_press?: (novel: AudiobookTableItem) => void;
	on_long_press?: (novel: AudiobookTableItem) => void;
	on_refresh?: () => void | Promise<void>;
}

const cover_touch_active_opacity = 0.7;

export default function RozNovel(props: RozNovelProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const percent = novel_progress_percent(props.novel);

	return (
		<ContextMenuView
			menuConfig={AudiobookContextMenu.audiobook_component_context_menu(props.novel)}
			onPressMenuItem={async ({ nativeEvent }) => {
				await ContextResolver.resolve_audiobook_context(props.novel, nativeEvent.actionKey as ContextResolver.AudiobookContextKeys, {
					on_play: props.on_press,
					on_restart: props.on_press,
					on_view_details: props.on_press,
					on_refresh: props.on_refresh
				});
			}}>
			<View style={{ ...props.container_style, width: props.size, opacity: props.dimmed ? 0.4 : 1 }}>
				<TouchableOpacity activeOpacity={cover_touch_active_opacity} onPress={() => props.on_press?.(props.novel)} onLongPress={() => props.on_long_press?.(props.novel)} delayLongPress={Constants.long_press_delay}>
					<IImage source={props.novel.cover || null} style={{ ...styles.cover, width: props.size, height: props.size * 1.45 }} />
					{percent > 0 ? (
						<View style={[styles.progress_track, { width: props.size - 8 }]}>
							<View style={[styles.progress_fill, { width: `${percent * 100}%`, backgroundColor: colors.primary }]} />
						</View>
					) : null}
					{props.novel.series_no > 0 ? (
						<View style={styles.series_badge}>
							<Text style={styles.series_badge_text}>#{props.novel.series_no}</Text>
						</View>
					) : null}
				</TouchableOpacity>
				<View style={styles.bottom_info_container}>
					<Text numberOfLines={1} style={[styles.title_text, { color: colors.text, width: props.size - 18 }]}>
						{props.novel.title || "Untitled"}
					</Text>
				</View>
				{props.novel.author ? (
					<Text numberOfLines={1} style={[styles.author_text, { color: colors.subtext, width: props.size }]}>
						{props.novel.author}
					</Text>
				) : null}
				<View style={styles.bottom_meta_row}>
					<Text style={[styles.meta_text, { color: colors.deeptext }]}>{format_progress_text(props.novel)}</Text>
					{props.novel.chapter_count > 0 ? <Text style={[styles.meta_text, { color: colors.deeptext }]}>{props.novel.chapter_count} ch</Text> : null}
				</View>
				{props.dimmed ? (
					<View style={styles.drop_overlay} pointerEvents="none">
						<Ionicons name="add-circle" size={28} color={colors.primary} />
					</View>
				) : null}
			</View>
		</ContextMenuView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		cover: { borderRadius: 6, borderColor: "#ffffff20", borderTopWidth: 0.4, borderRightWidth: 0.6, backgroundColor: colors.shelf },
		progress_track: { position: "absolute", bottom: 6, left: 4, height: 3, borderRadius: 2, backgroundColor: "#00000066", overflow: "hidden" },
		progress_fill: { height: "100%", borderRadius: 2 },
		series_badge: { position: "absolute", top: 6, left: 6, backgroundColor: "#000000aa", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
		series_badge_text: { color: "#ffffff", fontSize: 10, fontWeight: "700" },
		bottom_info_container: { paddingTop: 7, flexDirection: "row", justifyContent: "space-between" },
		title_text: { fontSize: 13, fontWeight: "600" },
		author_text: { fontSize: 11, marginTop: 1 },
		bottom_meta_row: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
		meta_text: { fontSize: 10, fontWeight: "600" },
		drop_overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }
	});
