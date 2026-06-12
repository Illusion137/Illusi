import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { SQLAudiobook } from "@illusive/sql/sql_audiobook";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import IImage from "@components/IImage";
import CompactRozNovel from "@components/audiobook/CompactRozNovel";
import { compare_by_title, novel_progress_percent, series_display_title, series_title_prefix, strip_series_prefix } from "@components/audiobook/types";
import { duration_to_string } from "@illusive/illusive_utils";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";

export default function AudiobookSeriesScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const router = useRouter();
	const { name } = useLocalSearchParams<{ name: string }>();
	const series_name = decodeURIComponent(name ?? "");

	const [all_novels, set_all_novels] = useState<AudiobookTableItem[]>([]);

	const refresh = useCallback(async () => {
		const data = await SQLAudiobook.get_all_audiobooks();
		set_all_novels(data);
	}, []);

	useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

	const novels = useMemo(
		() => all_novels.filter(n => (n.series_name ?? "").trim() === series_name).sort(compare_by_title),
		[all_novels, series_name]
	);
	const title_prefix = useMemo(() => series_title_prefix(novels), [novels]);
	const display_title = series_display_title(series_name, novels);

	const head = novels[0];
	const total_listened = novels.reduce((a, n) => a + n.total_listened_ms, 0);
	const total_duration = novels.reduce((a, n) => a + n.total_duration_ms, 0);
	const overall_percent = total_duration > 0 ? Math.min(1, total_listened / total_duration) : 0;
	const finished = novels.filter(n => novel_progress_percent(n) >= 0.999).length;

	async function on_ungroup() {
		if_confirm(`Ungroup "${series_name}"?`, "Each book will be removed from the series.", async () => {
			for (const novel of novels) {
				await SQLAudiobook.update_audiobook(novel.uuid, { series_name: "", series_no: 0 });
			}
			router.back();
		});
	}

	if (novels.length === 0) {
		return (
			<View style={[styles.center, { backgroundColor: colors.background }]}>
				<Ionicons name="library-outline" size={56} color={colors.subtext} />
				<Text style={[styles.empty_text, { color: colors.text }]}>Series is empty</Text>
				<TouchableOpacity onPress={() => router.back()} style={[styles.back_btn, { backgroundColor: colors.primary }]}>
					<Text style={styles.back_btn_text}>Back</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 64 }}>
			<View style={[styles.hero, { backgroundColor: colors.shelf }]}>
				<View style={styles.stack_wrap}>
					<IImage source={novels[2]?.cover ?? head.cover ?? null} style={[styles.cover, styles.cover_back2]} />
					<IImage source={novels[1]?.cover ?? head.cover ?? null} style={[styles.cover, styles.cover_back]} />
					<IImage source={head.cover ?? null} style={[styles.cover, styles.cover_front]} />
				</View>
				<Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>{display_title}</Text>
				{head.author ? <Text style={[styles.author, { color: colors.subtext }]} numberOfLines={2}>{head.author}</Text> : null}
				<Text style={[styles.meta, { color: colors.deeptext }]}>
					{novels.length} books • {finished}/{novels.length} done
				</Text>
			</View>

			<View style={styles.progress_block}>
				<View style={styles.progress_label_row}>
					<Text style={[styles.progress_label, { color: colors.subtext }]}>Series Progress</Text>
					<Text style={[styles.progress_value, { color: colors.text }]}>{Math.round(overall_percent * 100)}%</Text>
				</View>
				<View style={[styles.progress_track, { backgroundColor: colors.line }]}>
					<View style={[styles.progress_fill, { width: `${overall_percent * 100}%`, backgroundColor: colors.primary }]} />
				</View>
				<Text style={[styles.progress_sub, { color: colors.deeptext }]}>
					{duration_to_string(Math.floor(total_listened / 1000))} of {duration_to_string(Math.floor(total_duration / 1000))}
				</Text>
			</View>

			<View style={styles.section_header}>
				<Text style={[styles.section_title, { color: colors.subtext }]}>BOOKS</Text>
			</View>
			<View style={[styles.list, { backgroundColor: colors.shelf }]}>
				{novels.map(novel => (
					<CompactRozNovel
						key={novel.uuid}
						novel={title_prefix.length > 0 ? { ...novel, title: strip_series_prefix(novel.title, title_prefix) } : novel}
						on_press={() => router.push(`/audiobooks/details/${novel.uuid}`)}
						on_refresh={refresh}
					/>
				))}
			</View>

			<View style={styles.danger_section}>
				<TouchableOpacity onPress={on_ungroup} style={styles.danger_btn}>
					<Ionicons name="trash-outline" size={18} color={colors.red} />
					<Text style={[styles.danger_btn_text, { color: colors.red }]}>Ungroup Series</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, gap: 14 },
		empty_text: { fontSize: 16 },
		back_btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		back_btn_text: { color: "#ffffff", fontWeight: "700" },
		hero: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 22, alignItems: "center", gap: 8 },
		stack_wrap: { width: 220, height: 260, marginBottom: 14 },
		cover: { position: "absolute", width: 170, height: 240, borderRadius: 2, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background },
		cover_front: { top: 0, left: 25, zIndex: 3 },
		cover_back: { top: 10, left: 38, opacity: 0.85, zIndex: 2, transform: [{ rotate: "-3deg" }] },
		cover_back2: { top: 20, left: 12, opacity: 0.55, zIndex: 1, transform: [{ rotate: "4deg" }] },
		title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
		author: { fontSize: 15, textAlign: "center" },
		meta: { fontSize: 12, textAlign: "center" },
		progress_block: { paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
		progress_label_row: { flexDirection: "row", justifyContent: "space-between" },
		progress_label: { fontSize: 12, fontWeight: "600" },
		progress_value: { fontSize: 13, fontWeight: "700" },
		progress_track: { height: 6, borderRadius: 2, overflow: "hidden" },
		progress_fill: { height: "100%", borderRadius: 2 },
		progress_sub: { fontSize: 11, textAlign: "right" },
		section_header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 },
		section_title: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
		list: { marginHorizontal: 14, borderRadius: 2, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
		danger_section: { padding: 14 },
		danger_btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		danger_btn_text: { fontSize: 14, fontWeight: "600" }
	});
