import ModalHeader from "@components/ModalHeader";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import useTrackColors from "@hooks/useTrackColors";
import { GLOBALS } from "@illusive/globals";
import { artist_string } from "@illusive/illusive_utils";
import { Lyrics } from "@illusive/lyrics";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { LoadingState, Track } from "@illusive/types";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Clipboard from "@react-native-clipboard/clipboard";
import SegmentedControl, { type NativeSegmentedControlIOSChangeEvent } from "@react-native-segmented-control/segmented-control";
import { Slider } from "@miblanchard/react-native-slider";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, type NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import TrackPlayer, { Event, State, useProgress, useTrackPlayerEvents } from "react-native-track-player";
import { invalidate_synced_lyrics } from "@utils/synced_lyrics_cache";

type Mode = "edit" | "sync";

interface Line {
	id: string;
	text: string;
	ts: number | null;
}

function uid() {
	return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function pad2(n: number) {
	return n < 10 ? `0${n}` : String(n);
}
function pad3(n: number) {
	return n < 10 ? `00${n}` : n < 100 ? `0${n}` : String(n);
}

function format_lrc_timestamp(seconds: number): string {
	const safe = Math.max(0, seconds);
	const minutes = Math.floor(safe / 60);
	const sec = Math.floor(safe % 60);
	const ms_raw = Math.round((safe - Math.floor(safe)) * 1000);
	const ms = ms_raw >= 1000 ? 999 : ms_raw;
	return `[${pad2(minutes)}:${pad2(sec)}.${pad3(ms)}]`;
}

function format_clock(seconds: number): string {
	const safe = Math.max(0, isFinite(seconds) ? seconds : 0);
	const minutes = Math.floor(safe / 60);
	const sec = Math.floor(safe % 60);
	return `${minutes}:${pad2(sec)}`;
}

function format_clock_cs(seconds: number): string {
	const safe = Math.max(0, isFinite(seconds) ? seconds : 0);
	const minutes = Math.floor(safe / 60);
	const sec = Math.floor(safe % 60);
	const cs = Math.floor((safe - Math.floor(safe)) * 100);
	return `${minutes}:${pad2(sec)}.${pad2(cs)}`;
}

function lines_from_plain(plain: string): Line[] {
	return plain.split("\n").map((text) => ({ id: uid(), text, ts: null }));
}

function lines_from_synced(synced: Lyrics.SyncedLyric[]): Line[] {
	return synced.map((s) => ({ id: uid(), text: s.text, ts: s.interval.from }));
}

// Walk the plain lines and attach the matching synced timestamp by exact text. Synced parsers
// drop blank lines, so plain is the authoritative line set; this just enriches it. A moving
// cursor avoids matching the same synced row twice when the song repeats a line.
function lines_from_both(plain: string, synced: Lyrics.SyncedLyric[]): Line[] {
	const out = lines_from_plain(plain);
	let cursor = 0;
	for (const lyric of synced) {
		for (let i = cursor; i < out.length; i++) {
			if (out[i].ts === null && out[i].text.trim() === lyric.text.trim()) {
				out[i].ts = lyric.interval.from;
				cursor = i + 1;
				break;
			}
		}
	}
	return out;
}

interface BuildResult {
	plain: string;
	synced: string | undefined;
	aligned_count: number;
	content_count: number;
}

function build_output(lines: Line[]): BuildResult {
	const plain = lines.map((l) => l.text).join("\n");
	const content = lines.filter((l) => l.text.trim().length > 0);
	const aligned = content.filter((l) => typeof l.ts === "number" && isFinite(l.ts));
	if (content.length === 0 || aligned.length !== content.length) {
		return { plain, synced: undefined, aligned_count: aligned.length, content_count: content.length };
	}
	const lrc = aligned
		.slice()
		.sort((a, b) => (a.ts as number) - (b.ts as number))
		.map((l) => `${format_lrc_timestamp(l.ts as number)} ${l.text}`)
		.join("\n");
	return { plain, synced: lrc, aligned_count: aligned.length, content_count: content.length };
}

export default function PlayerEditLyrics() {
	const { lyrics_uri } = useLocalSearchParams<{ lyrics_uri: string }>();

	const { colors } = usePTheme();
	const { height } = useDimensions();
	const styles = theme_styles(colors);
	const gradient_height = useMemo(() => height * 0.4, [height]);

	const track_ref = useRef<Track | null>(GLOBALS.global_var.sql_tracks.find((t) => t.lyrics_uri === lyrics_uri) ?? null);
	const track = track_ref.current;

	const { track_colors } = useTrackColors(track ?? undefined);

	const [mode, set_mode] = useState<Mode>("edit");
	const [lines, set_lines] = useState<Line[]>([]);
	const [save_state, set_save_state] = useState<LoadingState>("NONE");
	const [loaded, set_loaded] = useState(false);
	const lines_ref = useRef<Line[]>([]);
	lines_ref.current = lines;

	useEffect(() => {
		(async () => {
			if (!track) {
				GLOBALS.global_var.bottom_alert?.("Track not found", "WARN");
				router.back();
				return;
			}
			const [plain_raw, synced_raw] = await Promise.all([SQLTracks.read_track_lyrics(track), SQLTracks.read_track_synced_lyrics(track)]);
			const plain = typeof plain_raw === "string" ? plain_raw : "";
			const synced_text = typeof synced_raw === "string" ? synced_raw : undefined;
			const synced_parsed = synced_text !== undefined ? Lyrics.lrclib_synced_lyrics_to_json(synced_text) : undefined;
			const synced_lyrics = synced_parsed !== undefined && !("error" in synced_parsed) ? synced_parsed.lyrics : undefined;

			let initial: Line[];
			if (plain.length > 0 && synced_lyrics !== undefined) initial = lines_from_both(plain, synced_lyrics);
			else if (plain.length > 0) initial = lines_from_plain(plain);
			else if (synced_lyrics !== undefined) initial = lines_from_synced(synced_lyrics);
			else initial = [{ id: uid(), text: "", ts: null }];
			set_lines(initial);
			set_loaded(true);
		})();
	}, []);

	function mutate(producer: (draft: Line[]) => Line[]) {
		set_lines((prev) => producer(prev.slice()));
	}

	const update_text = useCallback((id: string, text: string) => {
		mutate((draft) => {
			const idx = draft.findIndex((l) => l.id === id);
			if (idx === -1) return draft;
			draft[idx] = { ...draft[idx], text };
			return draft;
		});
	}, []);

	const update_ts = useCallback((id: string, ts: number | null) => {
		mutate((draft) => {
			const idx = draft.findIndex((l) => l.id === id);
			if (idx === -1) return draft;
			draft[idx] = { ...draft[idx], ts: ts === null ? null : Math.max(0, ts) };
			return draft;
		});
	}, []);

	const delete_line = useCallback((id: string) => {
		mutate((draft) => {
			const next = draft.filter((l) => l.id !== id);
			if (next.length === 0) next.push({ id: uid(), text: "", ts: null });
			return next;
		});
	}, []);

	const insert_after = useCallback((id: string) => {
		mutate((draft) => {
			const idx = draft.findIndex((l) => l.id === id);
			if (idx === -1) return draft;
			draft.splice(idx + 1, 0, { id: uid(), text: "", ts: null });
			return draft;
		});
	}, []);

	const move = useCallback((id: string, direction: -1 | 1) => {
		mutate((draft) => {
			const idx = draft.findIndex((l) => l.id === id);
			if (idx === -1) return draft;
			const target = idx + direction;
			if (target < 0 || target >= draft.length) return draft;
			const tmp = draft[idx];
			draft[idx] = draft[target];
			draft[target] = tmp;
			return draft;
		});
	}, []);

	function append_line() {
		mutate((draft) => {
			draft.push({ id: uid(), text: "", ts: null });
			return draft;
		});
	}

	async function paste_from_clipboard() {
		const content = await Clipboard.getString();
		if (!content) {
			GLOBALS.global_var.bottom_alert?.("Clipboard is empty", "WARN");
			return;
		}
		const incoming = lines_from_plain(content);
		mutate((draft) => {
			const last = draft[draft.length - 1];
			const only_empty = draft.length === 1 && last?.text === "" && last.ts === null;
			return only_empty ? incoming : draft.concat(incoming);
		});
	}

	function clear_all() {
		Alert.alert("Clear all lines?", "This will remove every line in the editor. Save afterward to persist the change.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Clear", style: "destructive", onPress: () => set_lines([{ id: uid(), text: "", ts: null }]) }
		]);
	}

	function clear_all_timestamps() {
		Alert.alert("Clear all timestamps?", "Line text stays. You'll need to re-align before saving synced lyrics.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Clear", style: "destructive", onPress: () => mutate((draft) => draft.map((l) => ({ ...l, ts: null }))) }
		]);
	}

	async function do_save() {
		if (!track) return;
		const built = build_output(lines_ref.current);
		set_save_state("LOADING");
		try {
			await SQLTracks.save_track_lyrics(track, { plain: built.plain, synced: built.synced });
			invalidate_synced_lyrics(track);
			// Pick up the updated track row so a subsequent save reads the new synced_lyrics_uri.
			const refreshed = GLOBALS.global_var.sql_tracks.find((t) => t.uid === track.uid);
			if (refreshed) track_ref.current = refreshed;
			set_save_state("COMPLETE");
			setTimeout(() => set_save_state("NONE"), 1800);
		} catch {
			set_save_state("NONE");
			GLOBALS.global_var.bottom_alert?.("Failed to save lyrics", "WARN");
		}
	}

	function handle_save() {
		if (!track) return;
		const built = build_output(lines_ref.current);
		const had_synced = typeof track.synced_lyrics_uri === "string" && track.synced_lyrics_uri.length > 0;
		if (built.synced === undefined && had_synced) {
			const reason = built.content_count === 0 ? "There are no content lines to sync." : `${built.aligned_count} of ${built.content_count} lines are aligned. Saving now will clear the existing synced lyrics.`;
			Alert.alert("Synced lyrics will be cleared", reason, [
				{ text: "Keep editing", style: "cancel" },
				{ text: "Save plain only", style: "destructive", onPress: async () => do_save() }
			]);
			return;
		}
		do_save();
	}

	if (!loaded) {
		return (
			<View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
				<ActivityIndicator color={colors.primary} />
			</View>
		);
	}

	const built_preview = build_output(lines);
	const sync_status = built_preview.synced !== undefined ? "Synced lyrics ready" : `${built_preview.aligned_count}/${built_preview.content_count} lines aligned`;
	const sync_status_color = built_preview.synced !== undefined ? colors.primary : colors.subtext;

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title="Edit Lyrics" background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background} />
			{track_colors ? <LinearGradient colors={[track_colors.primary, track_colors.background, "transparent"]} style={{ position: "absolute", top: 0, height: gradient_height, width: "100%", zIndex: -1 }} /> : null}
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={20}>
				<View style={{ marginHorizontal: 16, marginTop: 14 }}>
					<Text style={{ color: colors.text, fontWeight: "bold", fontSize: 20 }} numberOfLines={1}>
						{track?.title ?? ""}
					</Text>
					{track ? <Text style={{ color: colors.searchPlaceholder, fontSize: 14, marginTop: 2 }}>{artist_string(track)}</Text> : null}
				</View>

				<View style={{ marginHorizontal: 16, marginTop: 14 }}>
					<SegmentedControl
						values={["Lyrics", "Sync"]}
						selectedIndex={mode === "edit" ? 0 : 1}
						onChange={(event: NativeSyntheticEvent<NativeSegmentedControlIOSChangeEvent>) => set_mode(event.nativeEvent.selectedSegmentIndex === 0 ? "edit" : "sync")}
						style={{ backgroundColor: colors.shelf }}
						fontStyle={{ color: colors.text }}
					/>
					<Text style={{ color: sync_status_color, fontSize: 12, marginTop: 8, marginLeft: 4, fontWeight: "600" }}>{sync_status}</Text>
				</View>

				{mode === "edit" ? (
					<LyricsEditor
						lines={lines}
						colors={colors}
						styles={styles}
						update_text={update_text}
						delete_line={delete_line}
						insert_after={insert_after}
						move={move}
						append_line={append_line}
						paste_from_clipboard={paste_from_clipboard}
						clear_all={clear_all}
					/>
				) : (
					<SyncEditor lines={lines} colors={colors} styles={styles} update_ts={update_ts} clear_all_timestamps={clear_all_timestamps} />
				)}

				<View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, backgroundColor: colors.background }}>
					<TouchableOpacity style={{ height: 52, backgroundColor: colors.primary, borderRadius: 50, alignItems: "center", justifyContent: "center" }} onPress={handle_save} disabled={save_state === "LOADING"}>
						{save_state === "LOADING" ? (
							<ActivityIndicator size={26} color="#fff" />
						) : save_state === "COMPLETE" ? (
							<Ionicons name="checkmark" size={26} color="#fff" />
						) : (
							<Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>Save Lyrics</Text>
						)}
					</TouchableOpacity>
				</View>
			</KeyboardAvoidingView>
		</View>
	);
}

interface LyricsEditorProps {
	lines: Line[];
	colors: Prefs.Theme["colors"];
	styles: ReturnType<typeof theme_styles>;
	update_text: (id: string, text: string) => void;
	delete_line: (id: string) => void;
	insert_after: (id: string) => void;
	move: (id: string, direction: -1 | 1) => void;
	append_line: () => void;
	paste_from_clipboard: () => void;
	clear_all: () => void;
}

function LyricsEditor({ lines, colors, styles, update_text, delete_line, insert_after, move, append_line, paste_from_clipboard, clear_all }: LyricsEditorProps) {
	const [focused_id, set_focused_id] = useState<string | null>(null);

	return (
		<ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
			<View style={styles.section_card}>
				{lines.map((line, idx) => {
					const is_focused = focused_id === line.id;
					return (
						<View key={line.id} style={[styles.edit_row, idx === 0 ? null : styles.edit_row_divider]}>
							<View style={styles.line_index_pill}>
								<Text style={styles.line_index_text}>{idx + 1}</Text>
							</View>
							<TextInput
								value={line.text}
								onChangeText={(text) => update_text(line.id, text)}
								onFocus={() => set_focused_id(line.id)}
								onBlur={() => set_focused_id((curr) => (curr === line.id ? null : curr))}
								placeholder="Empty line"
								placeholderTextColor={colors.searchPlaceholder}
								multiline
								scrollEnabled={false}
								keyboardAppearance="dark"
								submitBehavior={"submit"}
								style={styles.line_input}
							/>
							{line.ts !== null ? (
								<View style={styles.row_ts_chip}>
									<Ionicons name="time-outline" size={11} color={colors.primary} />
									<Text style={styles.row_ts_text}>{format_clock_cs(line.ts)}</Text>
								</View>
							) : null}
							<View style={styles.row_actions}>
								<TouchableOpacity onPress={() => move(line.id, -1)} disabled={idx === 0} style={[styles.icon_btn, idx === 0 ? styles.icon_btn_disabled : null]}>
									<Ionicons name="chevron-up" size={16} color={idx === 0 ? colors.subtext : colors.text} />
								</TouchableOpacity>
								<TouchableOpacity onPress={() => move(line.id, 1)} disabled={idx === lines.length - 1} style={[styles.icon_btn, idx === lines.length - 1 ? styles.icon_btn_disabled : null]}>
									<Ionicons name="chevron-down" size={16} color={idx === lines.length - 1 ? colors.subtext : colors.text} />
								</TouchableOpacity>
								<TouchableOpacity onPress={() => insert_after(line.id)} style={styles.icon_btn}>
									<Ionicons name="add" size={18} color={colors.text} />
								</TouchableOpacity>
								<TouchableOpacity onPress={() => delete_line(line.id)} style={styles.icon_btn}>
									<Ionicons name="trash-outline" size={15} color={"#ff5b5b"} />
								</TouchableOpacity>
							</View>
							{is_focused ? <View style={[styles.focused_underline, { backgroundColor: colors.primary }]} /> : null}
						</View>
					);
				})}
			</View>

			<View style={[styles.section_card, { flexDirection: "row", gap: 10, padding: 10 }]}>
				<TouchableOpacity style={[styles.toolbar_btn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]} onPress={append_line}>
					<Ionicons name="add" size={16} color={colors.primary} />
					<Text style={[styles.toolbar_btn_text, { color: colors.primary }]}>Add line</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.toolbar_btn} onPress={paste_from_clipboard}>
					<Ionicons name="clipboard-outline" size={15} color={colors.text} />
					<Text style={[styles.toolbar_btn_text, { color: colors.text }]}>Paste</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.toolbar_btn} onPress={clear_all}>
					<Ionicons name="trash-outline" size={15} color={"#ff5b5b"} />
					<Text style={[styles.toolbar_btn_text, { color: "#ff5b5b" }]}>Clear</Text>
				</TouchableOpacity>
			</View>
		</ScrollView>
	);
}

interface SyncEditorProps {
	lines: Line[];
	colors: Prefs.Theme["colors"];
	styles: ReturnType<typeof theme_styles>;
	update_ts: (id: string, ts: number | null) => void;
	clear_all_timestamps: () => void;
}

const NUDGE_SECONDS = 0.1;

function SyncEditor({ lines, colors, styles, update_ts, clear_all_timestamps }: SyncEditorProps) {
	const progress = useProgress(100);
	const [is_playing, set_is_playing] = useState(false);
	const [tap_mode, set_tap_mode] = useState(false);
	const [follow, set_follow] = useState(true);
	const [scrub_seconds, set_scrub_seconds] = useState<number | null>(null);

	const scrollview_ref = useRef<ScrollView>(null);
	const line_y_ref = useRef<Record<string, number>>({});
	const scroll_height_ref = useRef(0);
	const last_scrolled_id_ref = useRef<string | null>(null);

	// Cursor for tap mode — the next row that should receive a timestamp. Skips empty lines
	// and lines that are already aligned so the user can re-tap mid-song without clobbering.
	const tap_cursor_id = useMemo(() => {
		if (!tap_mode) return null;
		const candidate = lines.find((l) => l.text.trim().length > 0 && l.ts === null);
		return candidate?.id ?? null;
	}, [tap_mode, lines]);

	useTrackPlayerEvents([Event.PlaybackState], (event) => {
		if (event.type === Event.PlaybackState) set_is_playing(event.state === State.Playing);
	});
	useEffect(() => {
		TrackPlayer.getPlaybackState()
			.then((s) => set_is_playing(s.state === State.Playing))
			.catch(() => {});
	}, []);

	const live_position = scrub_seconds !== null ? scrub_seconds : progress.position;

	const active_idx = useMemo(() => {
		let best = -1;
		for (let i = 0; i < lines.length; i++) {
			const ts = lines[i].ts;
			if (ts !== null && ts <= live_position) {
				if (best === -1 || (lines[best].ts as number) <= ts) best = i;
			}
		}
		return best;
	}, [lines, live_position]);

	// Auto-scroll the active line into view, but only when "follow" is on and the row actually
	// changed — re-centering on every progress tick would fight any manual scroll the user does.
	useEffect(() => {
		if (!follow) return;
		if (active_idx === -1) return;
		const active_id = lines[active_idx].id;
		if (last_scrolled_id_ref.current === active_id) return;
		const y = line_y_ref.current[active_id];
		if (y === undefined) return;
		const target = Math.max(0, y - scroll_height_ref.current * 0.35);
		scrollview_ref.current?.scrollTo({ y: target, animated: true });
		last_scrolled_id_ref.current = active_id;
	}, [active_idx, follow, lines]);

	function assign_now(id: string) {
		update_ts(id, live_position);
	}
	function clear_ts(id: string) {
		update_ts(id, null);
	}

	function on_row_tap(line: Line) {
		if (tap_mode) {
			if (tap_cursor_id !== line.id) {
				// Tapping the cursor row stamps it; tapping a different row stamps that one but
				// keeps the cursor at whatever the next unaligned row becomes.
				if (line.text.trim().length === 0) return;
			}
			update_ts(line.id, live_position);
			return;
		}
		if (line.ts !== null) {
			TrackPlayer.seekTo(line.ts).catch(() => {});
		}
	}

	function on_row_longpress(line: Line) {
		if (line.ts === null) return;
		Alert.alert("Clear this timestamp?", `Removes alignment for line "${line.text || "(empty)"}".`, [
			{ text: "Cancel", style: "cancel" },
			{ text: "Clear", style: "destructive", onPress: () => clear_ts(line.id) }
		]);
	}

	async function toggle_play() {
		try {
			if (is_playing) await TrackPlayer.pause();
			else await TrackPlayer.play();
		} catch {}
	}
	async function nudge_position(delta: number) {
		try {
			const target = Math.max(0, live_position + delta);
			await TrackPlayer.seekTo(target);
		} catch {}
	}

	const duration = progress.duration > 0 ? progress.duration : 0;

	return (
		<>
			<View style={[styles.section_card, { paddingVertical: 12, marginTop: 12 }]}>
				<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
					<Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>{format_clock_cs(live_position)}</Text>
					<Text style={{ color: colors.subtext, fontWeight: "600", fontSize: 12 }}>{format_clock(duration)}</Text>
				</View>
				<Slider
					value={duration > 0 ? live_position / duration : 0}
					onSlidingStart={() => set_scrub_seconds(live_position)}
					onValueChange={(value) => set_scrub_seconds((value[0] ?? 0) * duration)}
					onSlidingComplete={async (value) => {
						const target = (value[0] ?? 0) * duration;
						await TrackPlayer.seekTo(target).catch(() => {});
						set_scrub_seconds(null);
					}}
					thumbTintColor={colors.primary}
					thumbStyle={{ width: 14, height: 14 }}
					thumbTouchSize={{ width: 1, height: 1 }}
					minimumTrackTintColor={colors.primary}
					maximumTrackTintColor="#DADADA40"
					minimumValue={0}
					maximumValue={1}
				/>
				<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 6, gap: 14 }}>
					<TouchableOpacity onPress={async () => nudge_position(-1)} style={styles.transport_btn}>
						<MaterialCommunityIcons name="rewind-5" size={20} color={colors.text} />
					</TouchableOpacity>
					<TouchableOpacity onPress={toggle_play} style={[styles.transport_btn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
						<Ionicons name={is_playing ? "pause" : "play"} size={20} color={"#fff"} />
					</TouchableOpacity>
					<TouchableOpacity onPress={async () => nudge_position(1)} style={styles.transport_btn}>
						<MaterialCommunityIcons name="fast-forward-5" size={20} color={colors.text} />
					</TouchableOpacity>
				</View>
			</View>

			<View style={{ flexDirection: "row", marginHorizontal: 16, marginTop: 10, gap: 10 }}>
				<TouchableOpacity style={[styles.mode_pill, tap_mode ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.shelf, borderColor: colors.line }]} onPress={() => set_tap_mode((v) => !v)}>
					<Ionicons name={tap_mode ? "radio-button-on" : "radio-button-off"} size={14} color={tap_mode ? "#fff" : colors.text} />
					<Text style={[styles.mode_pill_text, { color: tap_mode ? "#fff" : colors.text }]}>Tap to align</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.mode_pill, follow ? { backgroundColor: colors.shelf, borderColor: colors.primary } : { backgroundColor: colors.shelf, borderColor: colors.line }]} onPress={() => set_follow((v) => !v)}>
					<Ionicons name={follow ? "lock-closed" : "lock-open"} size={13} color={follow ? colors.primary : colors.text} />
					<Text style={[styles.mode_pill_text, { color: follow ? colors.primary : colors.text }]}>Follow</Text>
				</TouchableOpacity>
				<TouchableOpacity style={[styles.mode_pill, { backgroundColor: colors.shelf, borderColor: colors.line }]} onPress={clear_all_timestamps}>
					<Ionicons name="refresh" size={13} color={colors.text} />
					<Text style={[styles.mode_pill_text, { color: colors.text }]}>Reset</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				ref={scrollview_ref}
				style={{ flex: 1, marginTop: 8 }}
				contentContainerStyle={{ paddingBottom: 24 }}
				onLayout={(e) => {
					scroll_height_ref.current = e.nativeEvent.layout.height;
				}}
				onScrollBeginDrag={() => {
					if (follow) set_follow(false);
				}}
				keyboardShouldPersistTaps="handled">
				<View style={[styles.section_card, { padding: 0, overflow: "hidden" }]}>
					{lines.map((line, idx) => {
						const is_active = idx === active_idx;
						const is_next_tap = tap_mode && tap_cursor_id === line.id;
						const is_empty = line.text.trim().length === 0;
						return (
							<Pressable
								key={line.id}
								onPress={() => on_row_tap(line)}
								onLongPress={() => on_row_longpress(line)}
								onLayout={(e) => {
									line_y_ref.current[line.id] = e.nativeEvent.layout.y;
								}}
								style={[styles.sync_row, idx === 0 ? null : styles.sync_row_divider, is_active ? { backgroundColor: colors.primary + "12" } : null, is_next_tap ? { backgroundColor: colors.primary + "22" } : null]}>
								<View style={{ width: 76 }}>
									{line.ts !== null ? (
										<View style={[styles.sync_ts_pill, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
											<Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>{format_clock_cs(line.ts)}</Text>
										</View>
									) : (
										<View style={[styles.sync_ts_pill, { backgroundColor: colors.shelf, borderColor: colors.line }]}>
											<Text style={{ color: colors.subtext, fontWeight: "600", fontSize: 12 }}>—:—</Text>
										</View>
									)}
								</View>
								<Text style={{ flex: 1, color: is_empty ? colors.subtext : colors.text, fontSize: 15, fontStyle: is_empty ? "italic" : "normal" }} numberOfLines={2}>
									{is_empty ? "(blank line)" : line.text}
								</Text>
								<View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginLeft: 6 }}>
									{line.ts !== null ? (
										<>
											<TouchableOpacity onPress={() => update_ts(line.id, (line.ts as number) - NUDGE_SECONDS)} style={styles.icon_btn}>
												<Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>-.1</Text>
											</TouchableOpacity>
											<TouchableOpacity onPress={() => update_ts(line.id, (line.ts as number) + NUDGE_SECONDS)} style={styles.icon_btn}>
												<Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>+.1</Text>
											</TouchableOpacity>
										</>
									) : null}
									{!is_empty ? (
										<TouchableOpacity onPress={() => assign_now(line.id)} style={[styles.assign_btn, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "18" }]}>
											<Ionicons name="locate" size={12} color={colors.primary} />
											<Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>Set</Text>
										</TouchableOpacity>
									) : null}
								</View>
							</Pressable>
						);
					})}
				</View>
			</ScrollView>
		</>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		section_card: { marginHorizontal: 16, marginTop: 14, backgroundColor: "#ffffff06", borderRadius: 2, borderWidth: 0.5, borderColor: "#ffffff0f", padding: 12 },
		edit_row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, gap: 8 },
		edit_row_divider: { borderTopWidth: 0.5, borderTopColor: "#ffffff10" },
		line_index_pill: { minWidth: 24, height: 22, paddingHorizontal: 6, borderRadius: 6, backgroundColor: colors.shelf, alignItems: "center", justifyContent: "center", marginTop: 2 },
		line_index_text: { color: colors.subtext, fontSize: 11, fontWeight: "700" },
		line_input: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: "500", paddingVertical: 0, paddingHorizontal: 0, minHeight: 22 },
		row_ts_chip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, height: 22, borderRadius: 6, backgroundColor: colors.primary + "18", marginTop: 2 },
		row_ts_text: { color: colors.primary, fontSize: 11, fontWeight: "700" },
		row_actions: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 1 },
		icon_btn: { width: 28, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
		icon_btn_disabled: { opacity: 0.35 },
		focused_underline: { position: "absolute", left: 38, right: 8, bottom: 2, height: 1.2, borderRadius: 1 },
		toolbar_btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 10, borderWidth: 0.5, borderColor: colors.line, backgroundColor: colors.shelf },
		toolbar_btn_text: { fontWeight: "700", fontSize: 13 },
		transport_btn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: colors.line, backgroundColor: colors.shelf },
		mode_pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 2, borderWidth: 1 },
		mode_pill_text: { fontSize: 12, fontWeight: "700" },
		sync_row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
		sync_row_divider: { borderTopWidth: 0.5, borderTopColor: "#ffffff10" },
		sync_ts_pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5 },
		assign_btn: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5 }
	});
