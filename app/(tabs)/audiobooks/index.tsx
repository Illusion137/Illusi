import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { upload_music_files } from "@illusive/document_picker";
import type { Prefs } from "@illusive/prefs";
import { SQLAudiobook } from "@illusive/sql/sql_audiobook";
import { AudiobookDownloads } from "@illusive/audiobook_downloads";
import type { AudiobookTableItem } from "@illusive/db/schema";
import SearchBarV1 from "@components/SearchBarV1";
import usePTheme from "@hooks/usePTheme";
import { IoniconsTouchableOpacity } from "@components/TouchableIconOpacity";
import RozNovelsGrid from "@components/audiobook/RozNovelsGrid";
import RozNovelsList from "@components/audiobook/RozNovelsList";

type ViewMode = "grid" | "list";

export default function Audiobooks() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const router = useRouter();

	const [novels, set_novels] = useState<AudiobookTableItem[]>([]);
	const [view_mode, set_view_mode] = useState<ViewMode>("grid");
	const [search, set_search] = useState("");

	const refresh = useCallback(async () => {
		const data = await SQLAudiobook.get_all_audiobooks();
		set_novels(data);
	}, []);

	useFocusEffect(
		useCallback(() => {
			refresh();
		}, [refresh])
	);

	// Re-fetch when a download is enqueued (placeholder appears) or its status
	// changes (e.g. finishes → real cover/title land in sql). Keyed on status so
	// per-byte progress ticks don't trigger a full reload.
	const download_keys = useRef("");
	useEffect(() => {
		return AudiobookDownloads.subscribe(() => {
			const keys = AudiobookDownloads.get_states().map((s) => `${s.uuid}:${s.status}`).sort().join(",");
			if (keys === download_keys.current) return;
			download_keys.current = keys;
			refresh();
		});
	}, [refresh]);

	const filtered = search.length === 0 ? novels : novels.filter((n) => (n.title + " " + n.author + " " + n.series_name).toLowerCase().includes(search.toLowerCase()));

	async function group_novels(source: AudiobookTableItem, target: AudiobookTableItem) {
		const series_name = (target.series_name?.trim() ?? "").length > 0 ? target.series_name : target.title || `${target.author || "Untitled"} Series`;
		await SQLAudiobook.update_audiobook(target.uuid, { series_name, series_no: target.series_no || 1 });
		await SQLAudiobook.update_audiobook(source.uuid, { series_name, series_no: (target.series_no || 1) + 1 });
		await refresh();
	}

	async function add_to_series(novel: AudiobookTableItem, series_name: string) {
		const next_no = novels.filter((n) => n.series_name === series_name).length + 1;
		await SQLAudiobook.update_audiobook(novel.uuid, { series_name, series_no: next_no });
		await refresh();
	}

	async function reorder(ordered_uuids: string[]) {
		set_novels((prev) => {
			const by_uuid = new Map(prev.map((n) => [n.uuid, n]));
			return ordered_uuids.map((uuid) => by_uuid.get(uuid)).filter((n): n is AudiobookTableItem => n !== undefined);
		});
		await SQLAudiobook.reorder_audiobooks(ordered_uuids);
		await refresh();
	}

	return (
		<View style={styles.top_container}>
			<View style={styles.header}>
				<Text style={styles.top_text}>Audiobooks</Text>
				<View style={styles.search_container}>
					<View style={{ width: "70%", bottom: 5, right: 10 }}>
						<SearchBarV1 placeholder="Search Audiobooks" onChangeText={set_search} />
					</View>
					<IoniconsTouchableOpacity icon_name="cloud-upload" icon_size={23} icon_color={colors.inactive} style={{ bottom: 4 }} on_press={upload_music_files} />
					<IoniconsTouchableOpacity icon_name="globe-outline" icon_size={23} icon_color={colors.inactive} style={{ bottom: 4 }} on_press={() => router.push("/audiobooks/elscione")} />
				</View>
			</View>
			<View style={styles.toolbar}>
				<Text style={[styles.count_text, { color: colors.subtext }]}>
					{filtered.length} {filtered.length === 1 ? "book" : "books"}
				</Text>
				<View style={styles.view_toggle}>
					<TouchableOpacity onPress={() => set_view_mode("grid")} style={[styles.toggle_btn, view_mode === "grid" && { backgroundColor: colors.shelf }]}>
						<Ionicons name="grid-outline" size={16} color={view_mode === "grid" ? colors.primary : colors.subtext} />
					</TouchableOpacity>
					<TouchableOpacity onPress={() => set_view_mode("list")} style={[styles.toggle_btn, view_mode === "list" && { backgroundColor: colors.shelf }]}>
						<Ionicons name="list-outline" size={18} color={view_mode === "list" ? colors.primary : colors.subtext} />
					</TouchableOpacity>
				</View>
			</View>
			{view_mode === "grid" ? (
				<RozNovelsGrid
					novels={filtered}
					on_press_novel={(n) => router.push(`/audiobooks/details/${n.uuid}`)}
					on_press_series={(series_name) => router.push(`/audiobooks/series/${encodeURIComponent(series_name)}`)}
					on_group_novels={group_novels}
					on_add_to_series={add_to_series}
					on_reorder={reorder}
					on_refresh={refresh}
				/>
			) : (
				<RozNovelsList
					novels={filtered}
					on_press_novel={(n) => router.push(`/audiobooks/details/${n.uuid}`)}
					on_press_series={(series_name) => router.push(`/audiobooks/series/${encodeURIComponent(series_name)}`)}
					on_group_novels={group_novels}
					on_add_to_series={add_to_series}
					on_reorder={reorder}
					on_refresh={refresh}
				/>
			)}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		top_container: { backgroundColor: colors.background, flex: 1, justifyContent: "flex-start" },
		header: { backgroundColor: colors.shelf, width: "100%", height: "18%", top: 0, justifyContent: "flex-end", alignItems: "center", zIndex: 2 },
		top_text: { bottom: 20, color: colors.text, fontSize: 18, fontWeight: "500" },
		search_container: { justifyContent: "space-evenly", alignItems: "center", height: "24%", left: -5, width: "100%", flexDirection: "row" },
		toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 8 },
		count_text: { fontSize: 12, fontWeight: "600" },
		view_toggle: { flexDirection: "row", gap: 4 },
		toggle_btn: { padding: 6, borderRadius: 6 }
	});
