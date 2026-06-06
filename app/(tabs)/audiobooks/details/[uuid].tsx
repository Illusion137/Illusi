import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SQLAudiobook } from "@illusive/sql/sql_audiobook";
import { Audiobooks, type AudiobookTTSEngine } from "@illusive/audiobooks";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import type Roz from "@roze/types/roz";
import { voice_synth } from "@native/voice_synth/voice_synth";
import type { VoiceBank } from "@native/voice_synth/voice_synth.base";
import usePTheme from "@hooks/usePTheme";
import useAudiobookDownload, { download_label, download_percent } from "@hooks/useAudiobookDownload";
import IImage from "@components/IImage";
import { format_progress_text, novel_progress_percent } from "@components/audiobook/types";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";
import { duration_to_string } from "@illusive/illusive_utils";
import { GLOBALS } from "@illusive/globals";

const TTS_ENGINES: AudiobookTTSEngine[] = ["avs", "piper"];

interface GenState {
	active: boolean;
	current: number;
	total: number;
}

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
	const [roz, set_roz] = useState<Roz | null>(null);
	const [loading, set_loading] = useState(true);
	const [gen, set_gen] = useState<GenState | null>(null);
	const [reextracting, set_reextracting] = useState(false);

	const download = useAudiobookDownload(uuid);

	const [voice_open, set_voice_open] = useState(false);
	const [voices, set_voices] = useState<VoiceBank[]>([]);
	const [voices_loading, set_voices_loading] = useState(false);
	const [engine, set_engine] = useState<AudiobookTTSEngine>("avs");
	const [voice_id, set_voice_id] = useState("");
	// null target = generate the whole book; a number targets that single chapter.
	const [gen_chapter, set_gen_chapter] = useState<number | null>(null);

	const refresh = useCallback(async () => {
		const meta = await SQLAudiobook.get_audiobook_by_uuid(uuid);
		set_novel(meta ?? null);
		if (meta) {
			const roz_result = await Audiobooks.load_roz(meta);
			set_roz("error" in roz_result ? null : roz_result);
		} else {
			set_roz(null);
		}
		set_loading(false);
	}, [uuid]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	// When this book's background download advances (and especially when it
	// finishes and disappears), pull the freshly-written metadata + roz.
	const download_status = download?.status;
	useEffect(() => {
		refresh();
	}, [download_status, refresh]);

	const load_voices = useCallback(async (next_engine: AudiobookTTSEngine) => {
		set_voices_loading(true);
		try {
			voice_synth().set_engine?.(next_engine);
			const list = await voice_synth().get_voices();
			set_voices(list);
			set_voice_id((prev) => (list.some((v) => v.id === prev) ? prev : (list[0]?.id ?? "")));
		} catch {
			set_voices([]);
		} finally {
			set_voices_loading(false);
		}
	}, []);

	function open_voice_picker(target: number | null) {
		const start_engine: AudiobookTTSEngine = (novel?.tts_engine as AudiobookTTSEngine) || "avs";
		set_gen_chapter(target);
		set_engine(start_engine);
		set_voice_id(novel?.tts_voice_id ?? "");
		set_voice_open(true);
		load_voices(start_engine);
	}

	function on_select_engine(next_engine: AudiobookTTSEngine) {
		if (next_engine === engine) return;
		set_engine(next_engine);
		load_voices(next_engine);
	}

	async function run_generation() {
		if (novel === null) return;
		set_voice_open(false);
		const result =
			gen_chapter === null
				? await (async () => {
						set_gen({ active: true, current: 0, total: novel.chapter_count });
						return Audiobooks.generate_full_audio(novel.uuid, { engine, voice_id }, { on_chapter_start: (i, total) => set_gen({ active: true, current: i, total }) });
					})()
				: await (async () => {
						set_gen({ active: true, current: gen_chapter, total: novel.chapter_count });
						return Audiobooks.generate_chapter_audio(novel.uuid, gen_chapter, { engine, voice_id });
					})();
		set_gen(null);
		await refresh();
		if ("error" in result) {
			if_confirm("Generation failed", result.error.message, () => {});
		}
	}

	function on_play() {
		if (novel === null) return;
		GLOBALS.global_var.open_audiobook(novel.uuid);
	}

	async function on_reextract() {
		if (novel === null) return;
		set_reextracting(true);
		await Audiobooks.reextract_audiobook(novel.uuid);
		set_reextracting(false);
		await refresh();
	}

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

	const roz_chapters = roz?.chapters ?? [];
	const audio_chapter_indices = new Set(roz_chapters.map((c, i) => (c.chapter.audio_path ? i : -1)).filter((i) => i >= 0));
	const audio_count = audio_chapter_indices.size;
	const has_audio = audio_count > 0;
	const roz_ready = roz !== null && roz_chapters.length > 0;
	const fully_generated = roz_ready && audio_count === roz_chapters.length;
	const generating = gen !== null;
	const has_hq_voice = voices.some((v) => v.quality === "enhanced" || v.quality === "premium");

	async function on_mark_finished() {
		if (novel === null) return;
		await SQLAudiobook.update_audiobook(novel.uuid, { total_listened_ms: finished ? 0 : novel.total_duration_ms, last_read_date: new Date().toISOString() });
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
				<Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
					{novel.title || "Untitled"}
				</Text>
				{novel.author ? (
					<Text style={[styles.author, { color: colors.subtext }]} numberOfLines={2}>
						{novel.author}
					</Text>
				) : null}
				{novel.publisher ? (
					<Text style={[styles.publisher, { color: colors.deeptext }]} numberOfLines={1}>
						{novel.publisher}
						{novel.date ? ` • ${novel.date}` : ""}
					</Text>
				) : null}
				{in_series ? (
					<View style={[styles.series_pill, { backgroundColor: colors.primary_dark, borderColor: colors.line }]}>
						<Ionicons name="library-outline" size={14} color={colors.primary} />
						<Text style={[styles.series_pill_text, { color: colors.text }]}>
							{novel.series_name}
							{novel.series_no > 0 ? ` #${novel.series_no}` : ""}
						</Text>
					</View>
				) : null}
			</View>

			{download !== undefined ? (
				<View style={[styles.download_banner, { backgroundColor: colors.shelf, borderColor: download.status === "error" ? colors.red : colors.line }]}>
					<Ionicons name={download.status === "error" ? "alert-circle" : "cloud-download-outline"} size={18} color={download.status === "error" ? colors.red : colors.primary} />
					<View style={styles.download_banner_meta}>
						<Text style={[styles.download_banner_label, { color: colors.text }]}>{download_label(download)}</Text>
						<View style={[styles.download_banner_track, { backgroundColor: colors.line }]}>
							<View style={[styles.download_banner_fill, { width: `${download_percent(download) * 100}%`, backgroundColor: download.status === "error" ? colors.red : colors.primary }]} />
						</View>
					</View>
				</View>
			) : null}

			<View style={styles.actions_row}>
				<TouchableOpacity style={[styles.primary_btn, { backgroundColor: has_audio ? colors.primary : colors.line }]} disabled={!has_audio} onPress={on_play}>
					<Ionicons name={percent > 0 && !finished ? "play" : "play-outline"} size={18} color="#ffffff" />
					<Text style={styles.primary_btn_text}>{percent > 0 && !finished ? "Resume" : "Start Listening"}</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.secondary_btn, { backgroundColor: colors.shelf }]} onPress={on_mark_finished}>
					<MaterialIcons name={finished ? "replay" : "check-circle-outline"} size={18} color={colors.text} />
					<Text style={[styles.secondary_btn_text, { color: colors.text }]}>{finished ? "Reset" : "Mark Done"}</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.gen_row}>
				{!roz_ready ? (
					<TouchableOpacity style={[styles.gen_btn, { backgroundColor: colors.shelf }]} disabled={reextracting} onPress={on_reextract}>
						{reextracting ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh-circle-outline" size={18} color={colors.primary} />}
						<Text style={[styles.gen_btn_text, { color: colors.text }]}>{reextracting ? "Extracting…" : "Re-extract Source"}</Text>
					</TouchableOpacity>
				) : generating ? (
					<View style={[styles.gen_btn, { backgroundColor: colors.shelf }]}>
						<ActivityIndicator size="small" color={colors.primary} />
						<Text style={[styles.gen_btn_text, { color: colors.text }]}>
							Generating chapter {gen.current + 1} / {gen.total}
						</Text>
					</View>
				) : (
					<TouchableOpacity style={[styles.gen_btn, { backgroundColor: colors.primary_dark, borderColor: colors.primary, borderWidth: 1 }]} onPress={() => open_voice_picker(null)}>
						<Ionicons name="mic-outline" size={18} color={colors.primary} />
						<Text style={[styles.gen_btn_text, { color: colors.text }]}>{!has_audio ? "Generate Audio" : fully_generated ? "Regenerate Audio" : `Continue Generation (${audio_count}/${roz_chapters.length})`}</Text>
					</TouchableOpacity>
				)}
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

			{novel.tts_engine || novel.tts_voice_id ? (
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

			<View style={styles.chapters_section}>
				<Text style={[styles.chapters_heading, { color: colors.subtext }]}>{`CHAPTERS${novel.chapter_count > 0 ? ` (${novel.chapter_count})` : ""}`}</Text>
				{chapters.length === 0 ? (
					<Text style={[styles.empty_inline, { color: colors.subtext }]}>No chapter data</Text>
				) : (
					<View style={styles.chapters_list}>
						{chapters.map((i) => {
							const is_current = i === novel.last_chapter_index;
							const is_completed = i < novel.last_chapter_index;
							const has_chapter_audio = audio_chapter_indices.has(i);
							const chapter_title = roz_chapters[i]?.chapter.title?.trim() || `Chapter ${i + 1}`;
							const can_generate = roz_ready && !generating && i < roz_chapters.length;
							const filled_index = is_completed || is_current;
							return (
								<TouchableOpacity
									key={i}
									style={[styles.chapter_card, { borderColor: is_current ? colors.primary : colors.line, backgroundColor: is_current ? colors.primary_dark : colors.shelf }]}
									disabled={!can_generate}
									onPress={() => open_voice_picker(i)}>
									<View style={[styles.chapter_index, { borderColor: colors.line, backgroundColor: filled_index ? colors.primary : "transparent" }]}>
										{is_completed ? (
											<Ionicons name="checkmark" size={13} color="#ffffff" />
										) : is_current ? (
											<Ionicons name="play" size={11} color="#ffffff" />
										) : (
											<Text style={[styles.chapter_index_text, { color: colors.subtext }]}>{i + 1}</Text>
										)}
									</View>
									<View style={styles.chapter_meta}>
										<Text style={[styles.chapter_title, { color: is_current ? colors.primary : colors.text }]} numberOfLines={1}>
											{chapter_title}
										</Text>
										<Text style={[styles.chapter_sub, { color: colors.subtext }]} numberOfLines={1}>
											{is_current && novel.last_chapter_timestamp_ms > 0 ? `${duration_to_string(Math.floor(novel.last_chapter_timestamp_ms / 1000))} in` : has_chapter_audio ? "Audio ready" : roz_ready ? "Text only" : "Locked"}
										</Text>
									</View>
									{is_current && has_chapter_audio ? (
										<Ionicons name="headset" size={16} color={colors.primary} />
									) : has_chapter_audio ? (
										<Ionicons name="volume-medium" size={16} color={colors.subtext} />
									) : can_generate ? (
										<Ionicons name="mic-outline" size={15} color={colors.primary} />
									) : roz_ready ? (
										<Ionicons name="lock-closed" size={13} color={colors.deeptext} />
									) : null}
								</TouchableOpacity>
							);
						})}
					</View>
				)}
			</View>

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

			<Modal visible={voice_open} animationType="slide" transparent onRequestClose={() => set_voice_open(false)}>
				<View style={voice_styles.backdrop}>
					<View style={[voice_styles.sheet, { backgroundColor: colors.background, borderColor: colors.line }]}>
						<View style={voice_styles.header}>
							<Text style={[voice_styles.title, { color: colors.text }]}>{gen_chapter !== null ? `Chapter ${gen_chapter + 1}` : "Generate Audio"}</Text>
							<TouchableOpacity onPress={() => set_voice_open(false)} hitSlop={12}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						<Text style={[voice_styles.section_label, { color: colors.subtext }]}>ENGINE</Text>
						<View style={voice_styles.engine_row}>
							{TTS_ENGINES.map((e) => (
								<TouchableOpacity key={e} onPress={() => on_select_engine(e)} style={[voice_styles.engine_pill, { backgroundColor: engine === e ? colors.primary : colors.shelf, borderColor: colors.line }]}>
									<Text style={[voice_styles.engine_text, { color: engine === e ? "#ffffff" : colors.text }]}>{e.toUpperCase()}</Text>
								</TouchableOpacity>
							))}
						</View>

						<Text style={[voice_styles.section_label, { color: colors.subtext }]}>VOICE</Text>
						{voices_loading ? (
							<View style={voice_styles.voices_loading}>
								<ActivityIndicator size="small" color={colors.primary} />
							</View>
						) : voices.length === 0 ? (
							<View style={voice_styles.notice}>
								<Ionicons name={engine === "piper" ? "cube-outline" : "alert-circle-outline"} size={22} color={colors.subtext} />
								<Text style={[voice_styles.empty, { color: colors.subtext }]}>
									{engine === "piper" ? "Piper's bundled voice isn't available in this build. Rebuild the app to include it, or use the AVS engine in the meantime." : "No system voices are available on this device."}
								</Text>
							</View>
						) : (
							<>
								{engine === "avs" && !has_hq_voice ? (
									<TouchableOpacity style={[voice_styles.notice, voice_styles.notice_action, { borderColor: colors.line }]} onPress={async () => Linking.openSettings()}>
										<Ionicons name="sparkles-outline" size={18} color={colors.primary} />
										<Text style={[voice_styles.notice_text, { color: colors.subtext }]}>
											Only standard-quality voices found. Download enhanced/premium voices in Settings → Accessibility → Spoken Content / Reak & Speak → Voices.
										</Text>
										<Ionicons name="chevron-forward" size={16} color={colors.subtext} />
									</TouchableOpacity>
								) : null}
								<ScrollView style={voice_styles.voice_list}>
									{voices.map((v) => {
										const selected = v.id === voice_id;
										const is_hq = v.quality === "enhanced" || v.quality === "premium";
										return (
											<TouchableOpacity key={v.id} onPress={() => set_voice_id(v.id)} style={[voice_styles.voice_row, { borderColor: colors.line }, selected && { backgroundColor: colors.primary_dark }]}>
												<Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={18} color={selected ? colors.primary : colors.subtext} />
												<View style={voice_styles.voice_meta}>
													<Text style={[voice_styles.voice_name, { color: colors.text }]} numberOfLines={1}>
														{v.name || v.id}
													</Text>
													{v.language || v.quality ? (
														<Text style={[voice_styles.voice_sub, { color: colors.subtext }]} numberOfLines={1}>
															{[v.language, v.quality].filter(Boolean).join(" • ")}
														</Text>
													) : null}
												</View>
												{is_hq ? <Ionicons name="sparkles" size={14} color={colors.primary} /> : null}
											</TouchableOpacity>
										);
									})}
								</ScrollView>
							</>
						)}

						<TouchableOpacity style={[voice_styles.confirm_btn, { backgroundColor: voice_id.length > 0 ? colors.primary : colors.line, borderColor: colors.line }]} disabled={voice_id.length === 0} onPress={run_generation}>
							<Ionicons name="mic" size={18} color="#ffffff" />
							<Text style={voice_styles.confirm_text}>
								{gen_chapter !== null
									? audio_chapter_indices.has(gen_chapter)
										? `Regenerate Chapter ${gen_chapter + 1}`
										: `Generate Chapter ${gen_chapter + 1}`
									: fully_generated
										? "Regenerate All"
										: has_audio
											? "Continue Generation"
											: "Generate All Chapters"}
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</ScrollView>
	);
}

function Section(props: { title: string; colors: Prefs.Theme["colors"]; children: React.ReactNode }) {
	return (
		<View style={[section_styles.wrap]}>
			<Text style={[section_styles.title, { color: props.colors.subtext }]}>{props.title.toUpperCase()}</Text>
			<View style={[section_styles.body, { backgroundColor: props.colors.shelf, borderColor: props.colors.line }]}>{props.children}</View>
		</View>
	);
}

function DetailRow(props: { label: string; value: string; colors: Prefs.Theme["colors"]; mono?: boolean }) {
	return (
		<View style={section_styles.detail_row}>
			<Text style={[section_styles.detail_label, { color: props.colors.subtext }]}>{props.label}</Text>
			<Text style={[section_styles.detail_value, { color: props.colors.text }, props.mono && { fontFamily: "Courier" }]} numberOfLines={2} selectable>
				{props.value}
			</Text>
		</View>
	);
}

function StatCard(props: { color: Prefs.Theme["colors"]; label: string; value: string }) {
	return (
		<View style={[stat_styles.card, { backgroundColor: props.color.shelf, borderColor: props.color.line }]}>
			<Text style={[stat_styles.value, { color: props.color.text }]} numberOfLines={1}>
				{props.value}
			</Text>
			<Text style={[stat_styles.label, { color: props.color.subtext }]}>{props.label}</Text>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, gap: 14 },
		error_text: { fontSize: 16 },
		back_btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		back_btn_text: { color: "#ffffff", fontWeight: "700" },
		hero: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 22, alignItems: "center", gap: 8 },
		hero_cover: { width: 170, height: 240, borderRadius: 2, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, marginBottom: 14 },
		title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
		author: { fontSize: 15, textAlign: "center" },
		publisher: { fontSize: 12, textAlign: "center" },
		series_pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2, borderWidth: 1, marginTop: 6 },
		series_pill_text: { fontSize: 12, fontWeight: "600" },
		download_banner: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, marginTop: 4, marginBottom: 6, padding: 12, borderRadius: 2, borderWidth: 1 },
		download_banner_meta: { flex: 1, gap: 6 },
		download_banner_label: { fontSize: 13, fontWeight: "700" },
		download_banner_track: { height: 4, borderRadius: 2, overflow: "hidden" },
		download_banner_fill: { height: "100%", borderRadius: 2 },
		actions_row: { flexDirection: "row", gap: 10, padding: 14, paddingBottom: 6 },
		gen_row: { paddingHorizontal: 14, marginBottom: 6 },
		gen_btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		gen_btn_text: { fontWeight: "700", fontSize: 13 },
		primary_btn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		primary_btn_text: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
		secondary_btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		secondary_btn_text: { fontWeight: "700", fontSize: 13 },
		progress_block: { paddingHorizontal: 16, gap: 6, marginBottom: 18 },
		progress_label_row: { flexDirection: "row", justifyContent: "space-between" },
		progress_label: { fontSize: 12, fontWeight: "600" },
		progress_value: { fontSize: 13, fontWeight: "700" },
		progress_track: { height: 6, borderRadius: 2, overflow: "hidden" },
		progress_fill: { height: "100%", borderRadius: 2 },
		progress_sub: { fontSize: 11, textAlign: "right" },
		stats_grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, gap: 8, marginBottom: 8 },
		chapters_section: { paddingHorizontal: 14, marginTop: 12 },
		chapters_heading: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, paddingHorizontal: 4 },
		chapters_list: { gap: 8 },
		chapter_card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 2, borderWidth: 1 },
		chapter_index: { width: 28, height: 28, borderRadius: 2, borderWidth: 1, justifyContent: "center", alignItems: "center" },
		chapter_index_text: { fontSize: 12, fontWeight: "700" },
		chapter_meta: { flex: 1 },
		chapter_title: { fontSize: 14, fontWeight: "600" },
		chapter_sub: { fontSize: 11, marginTop: 1 },
		empty_inline: { fontSize: 13, padding: 14, textAlign: "center" },
		danger_section: { padding: 14, gap: 6 },
		danger_btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		danger_btn_text: { fontSize: 14, fontWeight: "600" }
	});

const section_styles = StyleSheet.create({
	wrap: { paddingHorizontal: 14, marginTop: 12 },
	title: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, paddingHorizontal: 4 },
	body: { borderRadius: 2, borderWidth: 1, overflow: "hidden" },
	detail_row: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 14, gap: 12, alignItems: "flex-start" },
	detail_label: { fontSize: 12, fontWeight: "600", width: 80 },
	detail_value: { flex: 1, fontSize: 13 }
});

const stat_styles = StyleSheet.create({ card: { flexGrow: 1, flexBasis: "45%", padding: 12, borderRadius: 2, borderWidth: 1, gap: 2 }, value: { fontSize: 18, fontWeight: "700" }, label: { fontSize: 11, fontWeight: "600" } });

const voice_styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
	sheet: { maxHeight: "78%", borderTopLeftRadius: 2, borderTopRightRadius: 2, borderWidth: 1, paddingTop: 14, paddingHorizontal: 18, paddingBottom: 26 },
	header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
	title: { fontSize: 18, fontWeight: "700" },
	section_label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
	engine_row: { flexDirection: "row", gap: 10, marginBottom: 18 },
	engine_pill: { flex: 1, paddingVertical: 10, borderRadius: 2, borderWidth: 1, alignItems: "center" },
	engine_text: { fontSize: 13, fontWeight: "700" },
	voices_loading: { paddingVertical: 24, alignItems: "center" },
	empty: { flex: 1, fontSize: 13, lineHeight: 19 },
	notice: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 },
	notice_action: { paddingHorizontal: 12, borderWidth: 1, borderRadius: 2, marginBottom: 12 },
	notice_text: { flex: 1, fontSize: 12, lineHeight: 17 },
	voice_list: { maxHeight: 280, marginBottom: 14 },
	voice_row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 2, borderWidth: 1, marginBottom: 6 },
	voice_meta: { flex: 1 },
	voice_name: { fontSize: 14, fontWeight: "600" },
	voice_sub: { fontSize: 11, marginTop: 1 },
	confirm_btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 2, borderWidth: 1 },
	confirm_text: { color: "#ffffff", fontWeight: "700", fontSize: 14 }
});
