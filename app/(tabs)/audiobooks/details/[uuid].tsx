import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SQLAudiobook } from "@illusive/sql/sql_audiobook";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import IImage from "@components/IImage";
import { format_progress_text, novel_progress_percent } from "@components/audiobook/types";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";
import { duration_to_string } from "@illusive/illusive_utils";

function format_date(iso: string): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString();
}

export default function AudiobookDetailsScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const router = useRouter();
	const { uuid } = useLocalSearchParams<{ uuid: string }>();

	const [novel, set_novel] = useState<AudiobookTableItem | null>(null);
	const [loading, set_loading] = useState(true);

	const refresh = useCallback(async () => {
		const result = await SQLAudiobook.get_audiobook_by_uuid(uuid);
		set_novel(result ?? null);
		set_loading(false);
	}, [uuid]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	if (loading) {
		return (
			<View style={[styles.center, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		);
	}
	if (novel === null) {
		return (
			<View style={[styles.center, { backgroundColor: colors.background }]}>
				<Ionicons name="alert-circle-outline" size={56} color={colors.subtext} />
				<Text style={[styles.error_text, { color: colors.text }]}>Audiobook not found</Text>
				<TouchableOpacity onPress={() => router.back()} style={[styles.back_btn, { backgroundColor: colors.primary }]}>
					<Text style={styles.back_btn_text}>Back</Text>
				</TouchableOpacity>
			</View>
		);
	}

	const percent = novel_progress_percent(novel);
	const finished = percent >= 0.999;
	const in_series = (novel.series_name?.trim() ?? "").length > 0;

	async function on_mark_finished() {
		if (novel === null) return;
		await SQLAudiobook.update_audiobook(novel.uuid, {
			total_listened_ms: finished ? 0 : novel.total_duration_ms,
			last_read_date: new Date().toISOString()
		});
		await refresh();
	}

	async function on_remove_from_series() {
		if (novel === null) return;
		await SQLAudiobook.update_audiobook(novel.uuid, { series_name: "", series_no: 0 });
		await refresh();
	}

	async function on_delete() {
		if (novel === null) return;
		if_confirm("Delete this audiobook?", "This action cannot be reversed", async () => {
			await SQLAudiobook.delete_audiobook(novel.uuid);
			router.back();
		});
	}

	const chapters = Array.from({ length: Math.max(0, novel.chapter_count) }, (_, i) => i);

	return (
		<ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 64 }}>
			<View style={[styles.hero, { backgroundColor: colors.shelf }]}>
				<IImage source={novel.cover || null} style={styles.hero_cover} />
				<Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>{novel.title || "Untitled"}</Text>
				{novel.author ? <Text style={[styles.author, { color: colors.subtext }]} numberOfLines={2}>{novel.author}</Text> : null}
				{novel.publisher ? <Text style={[styles.publisher, { color: colors.deeptext }]} numberOfLines={1}>{novel.publisher}{novel.date ? ` • ${novel.date}` : ""}</Text> : null}
				{in_series ? (
					<View style={[styles.series_pill, { backgroundColor: colors.primary_dark, borderColor: colors.primary }]}>
						<Ionicons name="library-outline" size={14} color={colors.primary} />
						<Text style={[styles.series_pill_text, { color: colors.text }]}>{novel.series_name}{novel.series_no > 0 ? ` #${novel.series_no}` : ""}</Text>
					</View>
				) : null}
			</View>

			<View style={styles.actions_row}>
				<TouchableOpacity style={[styles.primary_btn, { backgroundColor: colors.primary }]}>
					<Ionicons name={percent > 0 && !finished ? "play" : "play-outline"} size={18} color="#ffffff" />
					<Text style={styles.primary_btn_text}>{percent > 0 && !finished ? "Resume" : "Start Listening"}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.secondary_btn, { backgroundColor: colors.shelf }]} onPress={on_mark_finished}>
					<MaterialIcons name={finished ? "replay" : "check-circle-outline"} size={18} color={colors.text} />
					<Text style={[styles.secondary_btn_text, { color: colors.text }]}>{finished ? "Reset" : "Mark Done"}</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.progress_block}>
				<View style={styles.progress_label_row}>
					<Text style={[styles.progress_label, { color: colors.subtext }]}>Progress</Text>
					<Text style={[styles.progress_value, { color: colors.text }]}>{format_progress_text(novel)}</Text>
				</View>
				<View style={[styles.progress_track, { backgroundColor: colors.line }]}>
					<View style={[styles.progress_fill, { width: `${percent * 100}%`, backgroundColor: colors.primary }]} />
				</View>
				<Text style={[styles.progress_sub, { color: colors.deeptext }]}>
					{duration_to_string(Math.floor(novel.total_listened_ms / 1000))} of {duration_to_string(Math.floor(novel.total_duration_ms / 1000))}
				</Text>
			</View>

			<View style={styles.stats_grid}>
				<StatCard color={colors} label="Chapters" value={String(novel.chapter_count)} />
				<StatCard color={colors} label="Last Chapter" value={novel.chapter_count > 0 ? `${novel.last_chapter_index + 1} / ${novel.chapter_count}` : "—"} />
				<StatCard color={colors} label="Last Read" value={format_date(novel.last_read_date)} />
				<StatCard color={colors} label="Added" value={format_date(novel.added_date)} />
			</View>

			{(novel.tts_engine || novel.tts_voice_id) ? (
				<Section title="Voice" colors={colors}>
					<DetailRow label="Engine" value={novel.tts_engine || "—"} colors={colors} />
					<DetailRow label="Voice" value={novel.tts_voice_id || "—"} colors={colors} />
				</Section>
			) : null}

			<Section title="Source" colors={colors}>
				<DetailRow label="Type" value={novel.source_file_type || "—"} colors={colors} />
				{novel.source_file ? <DetailRow label="File" value={novel.source_file} colors={colors} mono /> : null}
				{novel.roz_uri ? <DetailRow label="Roz URI" value={novel.roz_uri} colors={colors} mono /> : null}
				{novel.source_raw_uri ? <DetailRow label="Raw URI" value={novel.source_raw_uri} colors={colors} mono /> : null}
			</Section>

			<Section title={`Chapters${novel.chapter_count > 0 ? ` (${novel.chapter_count})` : ""}`} colors={colors}>
				{chapters.length === 0 ? (
					<Text style={[styles.empty_inline, { color: colors.subtext }]}>No chapter data</Text>
				) : (
					chapters.map(i => {
						const is_current = i === novel.last_chapter_index;
						const is_completed = i < novel.last_chapter_index;
						return (
							<View key={i} style={[styles.chapter_row, { borderBottomColor: colors.line }]}>
								<View style={[styles.chapter_dot, { backgroundColor: is_completed ? colors.primary : is_current ? colors.primary : colors.line }]}>
									{is_completed ? <Ionicons name="checkmark" size={12} color="#ffffff" /> : is_current ? <Ionicons name="play" size={10} color="#ffffff" /> : null}
								</View>
								<View style={styles.chapter_meta}>
									<Text style={[styles.chapter_title, { color: is_current ? colors.primary : colors.text }]}>Chapter {i + 1}</Text>
									{is_current && novel.last_chapter_timestamp_ms > 0 ? (
										<Text style={[styles.chapter_sub, { color: colors.subtext }]}>
											{duration_to_string(Math.floor(novel.last_chapter_timestamp_ms / 1000))} in
										</Text>
									) : null}
								</View>
								{is_current ? <Ionicons name="headset" size={16} color={colors.primary} /> : null}
							</View>
						);
					})
				)}
			</Section>

			<View style={styles.danger_section}>
				{in_series ? (
					<TouchableOpacity onPress={on_remove_from_series} style={styles.danger_btn}>
						<Ionicons name="remove-circle-outline" size={18} color={colors.subtext} />
						<Text style={[styles.danger_btn_text, { color: colors.subtext }]}>Remove from Series</Text>
					</TouchableOpacity>
				) : null}
				<TouchableOpacity onPress={on_delete} style={styles.danger_btn}>
					<Ionicons name="trash-outline" size={18} color={colors.red} />
					<Text style={[styles.danger_btn_text, { color: colors.red }]}>Delete Audiobook</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

function Section(props: { title: string; colors: Prefs.Theme["colors"]; children: React.ReactNode }) {
	return (
		<View style={[section_styles.wrap]}>
			<Text style={[section_styles.title, { color: props.colors.subtext }]}>{props.title.toUpperCase()}</Text>
			<View style={[section_styles.body, { backgroundColor: props.colors.shelf }]}>{props.children}</View>
		</View>
	);
}

function DetailRow(props: { label: string; value: string; colors: Prefs.Theme["colors"]; mono?: boolean }) {
	return (
		<View style={section_styles.detail_row}>
			<Text style={[section_styles.detail_label, { color: props.colors.subtext }]}>{props.label}</Text>
			<Text
				style={[section_styles.detail_value, { color: props.colors.text }, props.mono && { fontFamily: "Courier" }]}
				numberOfLines={2}
				selectable>
				{props.value}
			</Text>
		</View>
	);
}

function StatCard(props: { color: Prefs.Theme["colors"]; label: string; value: string }) {
	return (
		<View style={[stat_styles.card, { backgroundColor: props.color.shelf }]}>
			<Text style={[stat_styles.value, { color: props.color.text }]} numberOfLines={1}>{props.value}</Text>
			<Text style={[stat_styles.label, { color: props.color.subtext }]}>{props.label}</Text>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, gap: 14 },
		error_text: { fontSize: 16 },
		back_btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
		back_btn_text: { color: "#ffffff", fontWeight: "700" },
		hero: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 22, alignItems: "center", gap: 8 },
		hero_cover: { width: 170, height: 240, borderRadius: 8, backgroundColor: colors.background, marginBottom: 14 },
		title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
		author: { fontSize: 15, textAlign: "center" },
		publisher: { fontSize: 12, textAlign: "center" },
		series_pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, marginTop: 6 },
		series_pill_text: { fontSize: 12, fontWeight: "600" },
		actions_row: { flexDirection: "row", gap: 10, padding: 14 },
		primary_btn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10 },
		primary_btn_text: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
		secondary_btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10 },
		secondary_btn_text: { fontWeight: "700", fontSize: 13 },
		progress_block: { paddingHorizontal: 16, gap: 6, marginBottom: 18 },
		progress_label_row: { flexDirection: "row", justifyContent: "space-between" },
		progress_label: { fontSize: 12, fontWeight: "600" },
		progress_value: { fontSize: 13, fontWeight: "700" },
		progress_track: { height: 6, borderRadius: 3, overflow: "hidden" },
		progress_fill: { height: "100%", borderRadius: 3 },
		progress_sub: { fontSize: 11, textAlign: "right" },
		stats_grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, gap: 8, marginBottom: 8 },
		chapter_row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
		chapter_dot: { width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center" },
		chapter_meta: { flex: 1 },
		chapter_title: { fontSize: 14, fontWeight: "600" },
		chapter_sub: { fontSize: 11, marginTop: 1 },
		empty_inline: { fontSize: 13, padding: 14, textAlign: "center" },
		danger_section: { padding: 14, gap: 6 },
		danger_btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 8 },
		danger_btn_text: { fontSize: 14, fontWeight: "600" }
	});

const section_styles = StyleSheet.create({
	wrap: { paddingHorizontal: 14, marginTop: 12 },
	title: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, paddingHorizontal: 4 },
	body: { borderRadius: 10, overflow: "hidden" },
	detail_row: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 14, gap: 12, alignItems: "flex-start" },
	detail_label: { fontSize: 12, fontWeight: "600", width: 80 },
	detail_value: { flex: 1, fontSize: 13 }
});

const stat_styles = StyleSheet.create({
	card: { flexGrow: 1, flexBasis: "45%", padding: 12, borderRadius: 10, gap: 2 },
	value: { fontSize: 18, fontWeight: "700" },
	label: { fontSize: 11, fontWeight: "600" }
});
