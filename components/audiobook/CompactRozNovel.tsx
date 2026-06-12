import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import { Constants } from "@illusive/constants";
import { ContextMenuView } from "@components/ContextMenu";
import IImage from "@components/IImage";
import { format_progress_text, novel_progress_percent } from "./types";
import { empty_join_dot } from "@common/utils/util";
import { AudiobookContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";
import useAudiobookDownload, { download_label, download_percent } from "@hooks/useAudiobookDownload";

export interface CompactRozNovelProps {
	novel: AudiobookTableItem;
	container_style?: ViewStyle;
	dimmed?: boolean;
	indented?: boolean;
	on_press?: (novel: AudiobookTableItem) => void;
	on_long_press?: (novel: AudiobookTableItem) => void;
	on_refresh?: () => void | Promise<void>;
}

const COVER_SIZE = 46;

export default function CompactRozNovel(props: CompactRozNovelProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const percent = novel_progress_percent(props.novel);
	const download = useAudiobookDownload(props.novel.uuid);

	const subtitle_parts: string[] = [];
	if (props.novel.author) subtitle_parts.push(props.novel.author);
	subtitle_parts.push(format_progress_text(props.novel));
	if (props.novel.chapter_count > 0) subtitle_parts.push(`${props.novel.chapter_count} ch`);

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
			<TouchableOpacity
				activeOpacity={0.7}
				style={[styles.row, { paddingLeft: props.indented ? 36 : 12, opacity: props.dimmed ? 0.5 : 1, backgroundColor: props.dimmed ? colors.primary_dark : "transparent" }, props.container_style]}
				onPress={() => props.on_press?.(props.novel)}
				onLongPress={() => props.on_long_press?.(props.novel)}
				delayLongPress={Constants.long_press_delay}>
				<IImage source={props.novel.cover || null} style={styles.cover} />
				<View style={styles.meta}>
					<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
						{props.novel.series_no > 0 ? <Text style={{ color: colors.subtext, fontWeight: "500" }}>#{props.novel.series_no} </Text> : null}
						{props.novel.title || "Untitled"}
					</Text>
					<Text style={[styles.subtitle, { color: download?.status === "error" ? colors.red : colors.subtext }]} numberOfLines={1}>
						{download !== undefined ? download_label(download) : empty_join_dot(subtitle_parts)}
					</Text>
					{download !== undefined ? (
						<View style={[styles.progress_track, { backgroundColor: colors.line }]}>
							<View style={[styles.progress_fill, { width: `${download_percent(download) * 100}%`, backgroundColor: download.status === "error" ? colors.red : colors.primary }]} />
						</View>
					) : percent > 0 ? (
						<View style={[styles.progress_track, { backgroundColor: colors.line }]}>
							<View style={[styles.progress_fill, { width: `${percent * 100}%`, backgroundColor: colors.primary }]} />
						</View>
					) : null}
				</View>
			</TouchableOpacity>
		</ContextMenuView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingRight: 12, gap: 12 },
		cover: { width: COVER_SIZE, height: COVER_SIZE * 1.4, borderRadius: 2, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.shelf },
		meta: { flex: 1, gap: 2 },
		title: { fontSize: 14, fontWeight: "600" },
		subtitle: { fontSize: 12 },
		progress_track: { height: 2, borderRadius: 1, marginTop: 4, overflow: "hidden" },
		progress_fill: { height: "100%", borderRadius: 1 }
	});
