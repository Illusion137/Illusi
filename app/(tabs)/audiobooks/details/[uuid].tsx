import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { SQLAudiobook } from "@illusive/sql/sql_audiobook";
import { Audiobooks, type AudiobookTTSEngine } from "@illusive/audiobooks";
import { AudiobookPlayer } from "@illusive/audiobook_player_service";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Prefs } from "@illusive/prefs";
import type Roz from "@roze/types/roz";
import { voice_synth } from "@native/voice_synth/voice_synth";
import type { VoiceBank } from "@native/voice_synth/voice_synth.base";
import usePTheme from "@hooks/usePTheme";
import useAudiobookDownload, { download_label, download_percent } from "@hooks/useAudiobookDownload";
import useAudiobookGeneration from "@hooks/useAudiobookGeneration";
import { AudiobookGeneration } from "@illusive/audiobook_generation";
import IImage from "@components/IImage";
import { chapter_frac as gen_chapter_frac } from "@components/AudiobookGenerationIndicator";
import { format_progress_text, novel_progress_percent } from "@components/audiobook/types";
import { if_confirm } from "@illusive/illusi/src/illusi_utils";
import { alert_error } from "@illusive/illusi/src/alert";
import { duration_to_string } from "@illusive/illusive_utils";
import { GLOBALS } from "@illusive/globals";

const TTS_ENGINES: AudiobookTTSEngine[] = ["avs", "kokoro", "piper"];
const VOICE_PREVIEW_TEXT = "This is a quick preview of how this voice sounds.";

function format_date(iso: string): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString();
}

export default function AudiobookDetailsScreen() {
	const { colors, dark } = usePTheme();
	const styles = theme_styles(colors);
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { uuid } = useLocalSearchParams<{ uuid: string }>();

	const [novel, set_novel] = useState<AudiobookTableItem | null>(null);
	const [roz, set_roz] = useState<Roz | null>(null);
	const [loading, set_loading] = useState(true);
	const [reextracting, set_reextracting] = useState(false);
	const [info_open, set_info_open] = useState(false);

	const download = useAudiobookDownload(uuid);
	// Generation state lives outside this screen (audiobook_generation.ts) so it
	// survives navigating away and back — reading it here just subscribes.
	const gen = useAudiobookGeneration(uuid);

	const [voice_open, set_voice_open] = useState(false);
	const [voices, set_voices] = useState<VoiceBank[]>([]);
	const [voices_loading, set_voices_loading] = useState(false);
	const [engine, set_engine] = useState<AudiobookTTSEngine>("avs");
	const [voice_id, set_voice_id] = useState("");
	const [downloading_voice_id, set_downloading_voice_id] = useState<string | null>(null);
	const [previewing_voice_id, set_previewing_voice_id] = useState<string | null>(null);
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

	// Same idea for generation: it keeps running after this screen unmounts, so
	// pick up the freshly-written audio/roz once it disappears (finishes/fails).
	const gen_active = gen !== undefined;
	useEffect(() => {
		refresh();
	}, [gen_active, refresh]);

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

	// Piper/Kokoro voices are on-device models that may need downloading (or
	// reloading into the native engine after an app restart) before they're
	// usable — AVS voices are always ready. See download_voice in voice_synth.
	// Shared by selecting a voice and by previewing one, since both need the
	// exact model active in the native engine before they can do anything.
	async function ensure_voice_ready(v: VoiceBank): Promise<boolean> {
		if (engine === "avs" || voice_synth().download_voice === undefined) return true;
		set_downloading_voice_id(v.id);
		const result = await voice_synth().download_voice!(v);
		set_downloading_voice_id(null);
		if (result !== undefined && "error" in result) {
			alert_error(result);
			return false;
		}
		if (!v.installed) await load_voices(engine);
		return true;
	}

	async function on_select_voice(v: VoiceBank) {
		if (downloading_voice_id !== null || previewing_voice_id !== null) return;
		if (await ensure_voice_ready(v)) set_voice_id(v.id);
	}

	// No native stop() exists for TTS playback, so a preview always runs to
	// completion — keep it short and block other preview/select taps meanwhile.
	// The timeout race is a safety net: a hung native speak() promise must not
	// leave previewing_voice_id set forever and lock every row's buttons.
	async function on_preview_voice(v: VoiceBank) {
		if (downloading_voice_id !== null || previewing_voice_id !== null) return;
		if (!(await ensure_voice_ready(v))) return;
		set_previewing_voice_id(v.id);
		try {
			await Promise.race([voice_synth().speak(VOICE_PREVIEW_TEXT, { voice_bank: v }), new Promise((resolve) => setTimeout(resolve, 30_000))]);
		} catch (error) {
			if_confirm("Preview failed", error instanceof Error ? error.message : String(error), () => {});
		} finally {
			set_previewing_voice_id(null);
		}
	}

	// Kicks off generation via the global generation service and returns
	// immediately — it keeps running (and reporting progress) even if this
	// screen unmounts; see audiobook_generation.ts and useAudiobookGeneration.
	async function run_generation() {
		if (novel === null || roz === null || downloading_voice_id !== null || previewing_voice_id !== null) return;
		// A downloaded piper/kokoro voice can be on disk but not loaded into the
		// native engine (e.g. after a cold start) — models aren't bundled, so the
		// engine starts empty. Load/download the selected voice's model first.
		const selected_voice = voices.find((v) => v.id === voice_id);
		if (selected_voice !== undefined && !(await ensure_voice_ready(selected_voice))) return;
		set_voice_open(false);
		AudiobookGeneration.start(novel, roz, gen_chapter, { engine, voice_id });
	}

	function on_play() {
		if (novel === null) return;
		GLOBALS.global_var.open_audiobook(novel.uuid);
	}

	// Tapping a chapter that has audio starts playback from it. If the player
	// already holds this book, jump in place; otherwise point the saved position
	// at the chapter so the player loads there.
	async function on_play_chapter(i: number) {
		if (novel === null) return;
		if (AudiobookPlayer.is_loaded(novel.uuid) && roz !== null) {
			await AudiobookPlayer.skip_to_chapter(AudiobookPlayer.build_chapter_tracks(roz), i);
		} else {
			await SQLAudiobook.update_audiobook(novel.uuid, { last_chapter_index: i, last_chapter_timestamp_ms: 0 });
		}
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
	const generating = gen !== undefined;
	const has_hq_voice = voices.some((v) => v.quality === "enhanced" || v.quality === "premium");
	const selected_voice_ready = voice_id.length > 0 && voices.find((v) => v.id === voice_id)?.installed !== false;

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
			<View style={styles.hero}>
				<IImage source={novel.cover || null} style={StyleSheet.absoluteFill} blurRadius={40} />
				<BlurView intensity={50} tint={dark ? "prominent" : "extraLight"} style={StyleSheet.absoluteFill} />
				<LinearGradient colors={["transparent", "rgba(0,0,0,0.2)", colors.background]} style={styles.hero_fade} />
				<TouchableOpacity onPress={() => router.back()} hitSlop={10} style={[styles.hero_back_btn, { top: insets.top + 8 }]}>
					<Ionicons name="chevron-back" size={22} color="#ffffff" />
				</TouchableOpacity>
				<View style={[styles.hero_content, { paddingTop: insets.top + 26 }]}>
					<View style={styles.hero_cover_shadow}>
						<IImage source={novel.cover || null} style={styles.hero_cover} />
					</View>
					<Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
						{novel.title || "Untitled"}
					</Text>
					{novel.author ? (
						<Text style={[styles.author, { color: colors.subtext }]} numberOfLines={2}>
							{novel.author}
						</Text>
					) : null}
					{novel.publisher || novel.date ? (
						<Text style={[styles.publisher, { color: colors.deeptext }]} numberOfLines={1}>
							{[novel.publisher, novel.date].filter(Boolean).join(" • ")}
						</Text>
					) : null}
					{in_series ? (
						<TouchableOpacity onPress={() => router.push(`/audiobooks/series/${encodeURIComponent(novel.series_name)}`)} style={[styles.series_pill, { backgroundColor: colors.primary_dark, borderColor: colors.line }]}>
							<Ionicons name="library-outline" size={14} color={colors.primary} />
							<Text style={[styles.series_pill_text, { color: colors.text }]} numberOfLines={1}>
								{novel.series_name}
								{novel.series_no > 0 ? ` #${novel.series_no}` : ""}
							</Text>
							<Ionicons name="chevron-forward" size={12} color={colors.subtext} />
						</TouchableOpacity>
					) : null}
				</View>
			</View>

			{percent > 0 || has_audio ? (
				<View style={styles.progress_block}>
					<View style={[styles.progress_track, { backgroundColor: colors.line }]}>
						<View style={[styles.progress_fill, { width: `${percent * 100}%`, backgroundColor: colors.primary }]} />
					</View>
					<View style={styles.progress_label_row}>
						<Text style={[styles.progress_label, { color: colors.subtext }]}>{format_progress_text(novel)}</Text>
						<Text style={[styles.progress_sub, { color: colors.deeptext }]}>
							{duration_to_string(Math.floor(novel.total_listened_ms / 1000))} / {duration_to_string(Math.floor(novel.total_duration_ms / 1000))}
						</Text>
					</View>
				</View>
			) : null}

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
				{has_audio ? (
					<TouchableOpacity style={[styles.primary_btn, { backgroundColor: colors.primary }]} onPress={on_play}>
						<Ionicons name="play" size={18} color="#ffffff" />
						<Text style={styles.primary_btn_text}>{percent > 0 && !finished ? "Resume" : "Start Listening"}</Text>
					</TouchableOpacity>
				) : roz_ready ? (
					<TouchableOpacity style={[styles.primary_btn, { backgroundColor: colors.primary }]} disabled={generating} onPress={() => open_voice_picker(null)}>
						{generating ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="mic" size={18} color="#ffffff" />}
						<Text style={styles.primary_btn_text}>{generating ? "Generating…" : "Generate Audio"}</Text>
					</TouchableOpacity>
				) : (
					<TouchableOpacity style={[styles.primary_btn, { backgroundColor: colors.primary }]} disabled={reextracting} onPress={on_reextract}>
						{reextracting ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="refresh" size={18} color="#ffffff" />}
						<Text style={styles.primary_btn_text}>{reextracting ? "Extracting…" : "Re-extract Source"}</Text>
					</TouchableOpacity>
				)}
				{has_audio && roz_ready ? (
					<TouchableOpacity style={[styles.icon_btn, { backgroundColor: colors.shelf, borderColor: colors.line }]} disabled={generating} onPress={() => open_voice_picker(null)}>
						{generating ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="mic-outline" size={20} color={colors.primary} />}
					</TouchableOpacity>
				) : null}
				<TouchableOpacity style={[styles.icon_btn, { backgroundColor: colors.shelf, borderColor: colors.line }]} onPress={on_mark_finished}>
					<MaterialIcons name={finished ? "replay" : "check-circle-outline"} size={20} color={finished ? colors.primary : colors.text} />
				</TouchableOpacity>
			</View>

			{generating ? (
				<View style={[styles.gen_banner, { backgroundColor: colors.shelf, borderColor: colors.primary }]}>
					<ActivityIndicator size="small" color={colors.primary} />
					<View style={styles.gen_banner_meta}>
						<Text style={[styles.gen_banner_label, { color: colors.text }]}>
							Generating chapter {gen.current + 1} of {gen.total}
						</Text>
						<View style={[styles.gen_banner_track, { backgroundColor: colors.line }]}>
							<View style={[styles.gen_banner_fill, { width: `${gen.total > 0 ? ((gen.current + gen_chapter_frac(gen)) / gen.total) * 100 : 0}%`, backgroundColor: colors.primary }]} />
						</View>
					</View>
				</View>
			) : roz_ready && has_audio && !fully_generated ? (
				<TouchableOpacity style={[styles.gen_banner, { backgroundColor: colors.shelf, borderColor: colors.line }]} onPress={() => open_voice_picker(null)}>
					<Ionicons name="mic-outline" size={18} color={colors.primary} />
					<View style={styles.gen_banner_meta}>
						<Text style={[styles.gen_banner_label, { color: colors.text }]}>Continue generation</Text>
						<Text style={[styles.gen_banner_sub, { color: colors.subtext }]}>
							{audio_count} of {roz_chapters.length} chapters have audio
						</Text>
					</View>
					<Ionicons name="chevron-forward" size={16} color={colors.subtext} />
				</TouchableOpacity>
			) : null}

			<View style={styles.chapters_section}>
				<View style={styles.section_header_row}>
					<Text style={[styles.chapters_heading, { color: colors.subtext }]}>{`CHAPTERS${novel.chapter_count > 0 ? ` (${novel.chapter_count})` : ""}`}</Text>
					{roz_ready && has_audio ? <Text style={[styles.chapters_hint, { color: colors.deeptext }]}>tap to play • mic to generate</Text> : null}
				</View>
				{chapters.length === 0 ? (
					<Text style={[styles.empty_inline, { color: colors.subtext }]}>No chapter data</Text>
				) : (
					<View>
						{chapters.map((i) => {
							const is_current = i === novel.last_chapter_index;
							const is_completed = i < novel.last_chapter_index;
							const has_chapter_audio = audio_chapter_indices.has(i);
							const chapter_title = roz_chapters[i]?.chapter.title?.trim() || `Chapter ${i + 1}`;
							const can_generate = roz_ready && !generating && i < roz_chapters.length;
							const filled_index = is_completed || is_current;
							const is_generating_this = gen?.current === i;
							const chapter_frac = is_generating_this ? gen_chapter_frac(gen) : 0;
							const tappable = has_chapter_audio || can_generate;
							return (
								<TouchableOpacity
									key={i}
									activeOpacity={0.6}
									style={[styles.chapter_row, i > 0 && { borderTopWidth: 0.5, borderTopColor: colors.line }, is_current && { backgroundColor: colors.primary_dark }]}
									disabled={!tappable}
									onPress={async () => (has_chapter_audio ? on_play_chapter(i) : open_voice_picker(i))}>
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
										<Text style={[styles.chapter_title, { color: is_generating_this || is_current ? colors.primary : has_chapter_audio || !roz_ready ? colors.text : colors.subtext }]} numberOfLines={1}>
											{chapter_title}
										</Text>
										<Text style={[styles.chapter_sub, { color: is_generating_this ? colors.primary : colors.deeptext }]} numberOfLines={1}>
											{is_generating_this
												? gen.encode_progress !== null
													? `Encoding… ${Math.round(gen.encode_progress * 100)}%`
													: `Generating… ${gen.chapter_done}/${gen.chapter_total || "?"}${gen.chapter_total > 0 ? ` (${Math.round((gen.chapter_done / gen.chapter_total) * 100)}%)` : ""}`
												: is_current && novel.last_chapter_timestamp_ms > 0
													? `${duration_to_string(Math.floor(novel.last_chapter_timestamp_ms / 1000))} in`
													: has_chapter_audio
														? "Ready to play"
														: roz_ready
															? "No audio yet — tap to generate"
															: "Source not extracted"}
										</Text>
										{is_generating_this ? (
											<View style={[styles.chapter_gen_track, { backgroundColor: colors.line }]}>
												<View style={[styles.chapter_gen_fill, { width: `${Math.round(chapter_frac * 100)}%`, backgroundColor: colors.primary }]} />
											</View>
										) : null}
									</View>
									{is_generating_this ? (
										<ActivityIndicator size="small" color={colors.primary} />
									) : has_chapter_audio ? (
										<>
											<Ionicons name={is_current ? "headset" : "play-circle-outline"} size={20} color={is_current ? colors.primary : colors.subtext} />
											{can_generate ? (
												<TouchableOpacity onPress={() => open_voice_picker(i)} hitSlop={10} style={styles.chapter_mic_btn}>
													<Ionicons name="mic-outline" size={16} color={colors.deeptext} />
												</TouchableOpacity>
											) : null}
										</>
									) : can_generate ? (
										<View style={[styles.chapter_gen_chip, { borderColor: colors.line }]}>
											<Ionicons name="mic-outline" size={13} color={colors.primary} />
											<Text style={[styles.chapter_gen_chip_text, { color: colors.primary }]}>Generate</Text>
										</View>
									) : (
										<Ionicons name="lock-closed" size={13} color={colors.deeptext} />
									)}
								</TouchableOpacity>
							);
						})}
					</View>
				)}
			</View>

			<View style={styles.info_section}>
				<TouchableOpacity style={styles.section_header_row} onPress={() => set_info_open((v) => !v)}>
					<Text style={[styles.chapters_heading, { color: colors.subtext }]}>ABOUT</Text>
					<Ionicons name={info_open ? "chevron-up" : "chevron-down"} size={14} color={colors.subtext} />
				</TouchableOpacity>
				<View style={[styles.info_body, { backgroundColor: colors.shelf, borderColor: colors.line }]}>
					<View style={styles.stats_row}>
						<Stat colors={colors} label="Chapters" value={String(novel.chapter_count)} />
						<View style={[styles.stat_divider, { backgroundColor: colors.line }]} />
						<Stat colors={colors} label="Last Read" value={format_date(novel.last_read_date)} />
						<View style={[styles.stat_divider, { backgroundColor: colors.line }]} />
						<Stat colors={colors} label="Added" value={format_date(novel.added_date)} />
					</View>
					{info_open ? (
						<View style={[styles.info_details, { borderTopColor: colors.line }]}>
							{novel.tts_engine ? <DetailRow label="Engine" value={novel.tts_engine} colors={colors} /> : null}
							{novel.tts_voice_id ? <DetailRow label="Voice" value={novel.tts_voice_id} colors={colors} /> : null}
							<DetailRow label="Type" value={novel.source_file_type || "—"} colors={colors} />
							{novel.source_file ? <DetailRow label="File" value={novel.source_file} colors={colors} mono /> : null}
							{novel.roz_uri ? <DetailRow label="Roz URI" value={novel.roz_uri} colors={colors} mono /> : null}
							{novel.source_raw_uri ? <DetailRow label="Raw URI" value={novel.source_raw_uri} colors={colors} mono /> : null}
						</View>
					) : null}
				</View>
			</View>

			<View style={styles.danger_section}>
				{in_series ? (
					<TouchableOpacity onPress={on_remove_from_series} style={[styles.danger_btn, { borderColor: colors.line }]}>
						<Ionicons name="remove-circle-outline" size={18} color={colors.subtext} />
						<Text style={[styles.danger_btn_text, { color: colors.subtext }]}>Remove from Series</Text>
					</TouchableOpacity>
				) : null}
				<TouchableOpacity onPress={on_delete} style={[styles.danger_btn, { borderColor: colors.line }]}>
					<Ionicons name="trash-outline" size={18} color={colors.red} />
					<Text style={[styles.danger_btn_text, { color: colors.red }]}>Delete Audiobook</Text>
				</TouchableOpacity>
			</View>

			<Modal visible={voice_open} animationType="slide" transparent onRequestClose={() => set_voice_open(false)}>
				<View style={voice_styles.backdrop}>
					<View style={[voice_styles.sheet, { backgroundColor: colors.background, borderColor: colors.line }]}>
						<View style={voice_styles.header}>
							<View>
								<Text style={[voice_styles.title, { color: colors.text }]}>{gen_chapter !== null ? roz_chapters[gen_chapter]?.chapter.title?.trim() || `Chapter ${gen_chapter + 1}` : "Generate Audio"}</Text>
								<Text style={[voice_styles.subtitle, { color: colors.subtext }]}>
									{gen_chapter !== null
										? `Chapter ${gen_chapter + 1} of ${novel.chapter_count}`
										: fully_generated
											? "Regenerates every chapter"
											: has_audio
												? `${roz_chapters.length - audio_count} chapters remaining`
												: `${roz_chapters.length} chapters`}
								</Text>
							</View>
							<TouchableOpacity onPress={() => set_voice_open(false)} hitSlop={12}>
								<Ionicons name="close" size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						<Text style={[voice_styles.section_label, { color: colors.subtext }]}>ENGINE</Text>
						<View style={voice_styles.engine_row}>
							{TTS_ENGINES.map((e) => (
								<TouchableOpacity
									key={e}
									onPress={() => on_select_engine(e)}
									style={[voice_styles.engine_pill, { backgroundColor: engine === e ? colors.primary : colors.shelf, borderColor: engine === e ? colors.primary : colors.line }]}>
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
								<Ionicons name={engine === "avs" ? "alert-circle-outline" : "cube-outline"} size={22} color={colors.subtext} />
								<Text style={[voice_styles.empty, { color: colors.subtext }]}>{engine === "avs" ? "No system voices are available on this device." : "Couldn't load voices for this engine. Check your connection and try again."}</Text>
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
										const not_installed = v.installed === false;
										const is_downloading = downloading_voice_id === v.id;
										const is_previewing = previewing_voice_id === v.id;
										const busy = downloading_voice_id !== null || previewing_voice_id !== null;
										return (
											<TouchableOpacity
												key={v.id}
												disabled={busy}
												onPress={async () => on_select_voice(v)}
												style={[voice_styles.voice_row, { borderColor: selected ? colors.primary : colors.line }, selected && { backgroundColor: colors.primary_dark }, not_installed && { opacity: 0.8 }]}>
												{is_downloading ? (
													<ActivityIndicator size="small" color={colors.primary} />
												) : not_installed ? (
													<Ionicons name="cloud-download-outline" size={18} color={colors.subtext} />
												) : (
													<Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={18} color={selected ? colors.primary : colors.subtext} />
												)}
												<View style={voice_styles.voice_meta}>
													<Text style={[voice_styles.voice_name, { color: colors.text }]} numberOfLines={1}>
														{v.name || v.id}
													</Text>
													{v.language || v.quality ? (
														<Text style={[voice_styles.voice_sub, { color: colors.subtext }]} numberOfLines={1}>
															{[v.language, v.quality, not_installed ? "tap to download" : is_previewing ? "playing preview…" : null].filter(Boolean).join(" • ")}
														</Text>
													) : null}
												</View>
												{is_hq ? <Ionicons name="sparkles" size={14} color={colors.primary} /> : null}
												<TouchableOpacity onPress={async () => on_preview_voice(v)} disabled={busy} hitSlop={10} style={voice_styles.voice_preview_btn}>
													{is_previewing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="play-circle-outline" size={22} color={busy ? colors.deeptext : colors.subtext} />}
												</TouchableOpacity>
											</TouchableOpacity>
										);
									})}
								</ScrollView>
							</>
						)}

						<TouchableOpacity style={[voice_styles.confirm_btn, { backgroundColor: selected_voice_ready ? colors.primary : colors.line }]} disabled={!selected_voice_ready} onPress={run_generation}>
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

function DetailRow(props: { label: string; value: string; colors: Prefs.Theme["colors"]; mono?: boolean }) {
	return (
		<View style={detail_styles.detail_row}>
			<Text style={[detail_styles.detail_label, { color: props.colors.subtext }]}>{props.label}</Text>
			<Text style={[detail_styles.detail_value, { color: props.colors.text }, props.mono && { fontFamily: "Courier" }]} numberOfLines={2} selectable>
				{props.value}
			</Text>
		</View>
	);
}

function Stat(props: { colors: Prefs.Theme["colors"]; label: string; value: string }) {
	return (
		<View style={detail_styles.stat}>
			<Text style={[detail_styles.stat_value, { color: props.colors.text }]} numberOfLines={1}>
				{props.value}
			</Text>
			<Text style={[detail_styles.stat_label, { color: props.colors.subtext }]}>{props.label}</Text>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, gap: 14 },
		error_text: { fontSize: 16 },
		back_btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		back_btn_text: { color: "#ffffff", fontWeight: "700" },
		hero: { overflow: "hidden" },
		hero_fade: { position: "absolute", bottom: 0, height: 140, width: "100%" },
		hero_back_btn: { position: "absolute", left: 14, zIndex: 5, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
		hero_content: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 18, alignItems: "center", gap: 6 },
		hero_cover_shadow: { shadowColor: "#000000", shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 10, marginBottom: 14 },
		hero_cover: { width: 170, height: 240, borderRadius: 2, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background },
		title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
		author: { fontSize: 15, textAlign: "center" },
		publisher: { fontSize: 12, textAlign: "center" },
		series_pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2, borderWidth: 1, marginTop: 6, maxWidth: "90%" },
		series_pill_text: { fontSize: 12, fontWeight: "600", flexShrink: 1 },
		progress_block: { paddingHorizontal: 16, paddingTop: 2, gap: 5 },
		progress_label_row: { flexDirection: "row", justifyContent: "space-between" },
		progress_label: { fontSize: 11, fontWeight: "600" },
		progress_sub: { fontSize: 11 },
		progress_track: { height: 4, borderRadius: 2, overflow: "hidden" },
		progress_fill: { height: "100%", borderRadius: 2 },
		download_banner: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, marginTop: 12, padding: 12, borderRadius: 2, borderWidth: 1 },
		download_banner_meta: { flex: 1, gap: 6 },
		download_banner_label: { fontSize: 13, fontWeight: "700" },
		download_banner_track: { height: 4, borderRadius: 2, overflow: "hidden" },
		download_banner_fill: { height: "100%", borderRadius: 2 },
		actions_row: { flexDirection: "row", gap: 8, paddingHorizontal: 14, paddingTop: 14 },
		primary_btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 2 },
		primary_btn_text: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
		icon_btn: { width: 46, height: 46, borderRadius: 2, borderWidth: 1, alignItems: "center", justifyContent: "center" },
		gen_banner: { flexDirection: "row", alignItems: "center", gap: 12, marginHorizontal: 14, marginTop: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 2, borderWidth: 1 },
		gen_banner_meta: { flex: 1, gap: 4 },
		gen_banner_label: { fontSize: 13, fontWeight: "600" },
		gen_banner_sub: { fontSize: 11 },
		gen_banner_track: { height: 4, borderRadius: 2, overflow: "hidden" },
		gen_banner_fill: { height: "100%", borderRadius: 2 },
		chapters_section: { paddingHorizontal: 14, marginTop: 22 },
		section_header_row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, marginBottom: 6 },
		chapters_heading: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
		chapters_hint: { fontSize: 10 },
		chapters_list: { borderRadius: 2, borderWidth: 1, overflow: "hidden" },
		chapter_row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 12 },
		chapter_index: { width: 28, height: 28, borderRadius: 2, borderWidth: 1, justifyContent: "center", alignItems: "center" },
		chapter_index_text: { fontSize: 12, fontWeight: "700" },
		chapter_meta: { flex: 1 },
		chapter_title: { fontSize: 14, fontWeight: "600" },
		chapter_sub: { fontSize: 11, marginTop: 1 },
		chapter_gen_track: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 5 },
		chapter_gen_fill: { height: "100%", borderRadius: 2 },
		chapter_mic_btn: { marginLeft: 4, padding: 4 },
		chapter_gen_chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 2, borderWidth: 1 },
		chapter_gen_chip_text: { fontSize: 11, fontWeight: "700" },
		empty_inline: { fontSize: 13, padding: 14, textAlign: "center" },
		info_section: { paddingHorizontal: 14, marginTop: 22 },
		info_body: { borderRadius: 2, borderWidth: 1, overflow: "hidden" },
		stats_row: { flexDirection: "row", alignItems: "stretch" },
		stat_divider: { width: 1 },
		info_details: { borderTopWidth: 1, paddingVertical: 4 },
		danger_section: { padding: 14, marginTop: 14, gap: 8 },
		danger_btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 2, borderWidth: 1 },
		danger_btn_text: { fontSize: 14, fontWeight: "600" }
	});

const detail_styles = StyleSheet.create({
	detail_row: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 14, gap: 12, alignItems: "flex-start" },
	detail_label: { fontSize: 12, fontWeight: "600", width: 80 },
	detail_value: { flex: 1, fontSize: 13 },
	stat: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 2 },
	stat_value: { fontSize: 15, fontWeight: "700" },
	stat_label: { fontSize: 10, fontWeight: "600", letterSpacing: 0.3 }
});

const voice_styles = StyleSheet.create({
	backdrop: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
	sheet: { maxHeight: "78%", borderTopLeftRadius: 2, borderTopRightRadius: 2, borderWidth: 1, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 30 },
	header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
	title: { fontSize: 18, fontWeight: "700" },
	subtitle: { fontSize: 12, marginTop: 2 },
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
	voice_preview_btn: { marginLeft: 4, padding: 4 },
	confirm_btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 2 },
	confirm_text: { color: "#ffffff", fontWeight: "700", fontSize: 14 }
});
