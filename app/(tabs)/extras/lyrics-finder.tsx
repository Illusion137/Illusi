import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import type { Prefs } from "@illusive/prefs";
import { Lyrics } from "@illusive/lyrics";
import { GLOBALS } from "@illusive/globals";
import { artist_string } from "@illusive/illusive_utils";
import { is_empty } from "@common/utils/util";
import { Ionicons } from "@expo/vector-icons";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import type { Track } from "@illusive/types";

type RawSearchResult = Awaited<ReturnType<typeof Lyrics.fuzzy_search_lyrics>>[number];
interface SearchResult {
	raw: RawSearchResult;
	matched_line: string;
	match_count: number;
}

const LRC_TIMESTAMP_RE = /\[[\d:.]+\]/g;

function clean_lyric_line(line: string): string {
	return line.replace(LRC_TIMESTAMP_RE, "").trim();
}

function pick_matched_line(content: string, query_words: string[]): { line: string; count: number } {
	if (query_words.length === 0) return { line: "", count: 0 };
	let best_line = "";
	let best_count = 0;
	for (const raw_line of content.split("\n")) {
		const cleaned = clean_lyric_line(raw_line);
		if (cleaned.length === 0) continue;
		const lower = cleaned.toLowerCase();
		let count = 0;
		for (const w of query_words) if (lower.includes(w)) count++;
		if (count > best_count) {
			best_line = cleaned;
			best_count = count;
			if (count === query_words.length) break;
		}
	}
	return { line: best_line, count: best_count };
}

function highlight_text(line: string, query_words: string[], colors: { text: string; primary: string }) {
	if (query_words.length === 0 || line.length === 0) return line;
	const pattern = new RegExp(`(${query_words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
	const parts = line.split(pattern);
	return parts.map((part, i) =>
		pattern.test(part) ? (
			<Text key={i} style={{ color: colors.primary, fontWeight: "700" }}>
				{part}
			</Text>
		) : (
			<Text key={i} style={{ color: colors.text }}>
				{part}
			</Text>
		)
	);
}

export default function ExtraLyricsFinderScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [query, set_query] = useState("");
	const [results, set_results] = useState<SearchResult[]>([]);
	const [is_loading, set_is_loading] = useState(true);
	const [has_lyrics, set_has_lyrics] = useState(false);

	const uri_to_track = useRef<Map<string, Track>>(new Map());
	const debounce_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const tracks = GLOBALS.global_var.sql_tracks;
		const map = new Map<string, Track>();
		tracks.forEach((t) => {
			if (!is_empty(t.lyrics_uri)) map.set(t.lyrics_uri!, t);
		});
		uri_to_track.current = map;
		set_has_lyrics(map.size > 0);

		Lyrics.load_lyrics_into_fuzzy_memory(tracks).then(() => set_is_loading(false));
	}, []);

	const run_search = useCallback(async (q: string) => {
		const trimmed = q.trim();
		if (is_empty(trimmed)) {
			set_results([]);
			return;
		}
		const query_words = trimmed
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 0);
		const raw = await Lyrics.fuzzy_search_lyrics(trimmed);
		const filtered: SearchResult[] = [];
		for (const r of Array.from(raw)) {
			const track = uri_to_track.current.get(r.obj.filename);
			const title = (track?.title ?? "").toLowerCase();
			const title_match = query_words.every((w) => title.includes(w));
			const { line, count } = pick_matched_line(r.obj.content, query_words);
			const content_match = count > 0;
			if (!title_match && !content_match) continue;
			filtered.push({ raw: r, matched_line: line, match_count: count });
		}
		filtered.sort((a, b) => b.match_count - a.match_count);
		set_results(filtered);
	}, []);

	function on_query_change(text: string) {
		set_query(text);
		if (debounce_ref.current !== null) clearTimeout(debounce_ref.current);
		debounce_ref.current = setTimeout(async () => run_search(text), 280);
	}

	function on_result_press(result: SearchResult, all: SearchResult[]) {
		const track = uri_to_track.current.get(result.raw.obj.filename);
		if (track === undefined) return;
		const queue = all.map((r) => uri_to_track.current.get(r.raw.obj.filename)).filter((t): t is Track => t !== undefined);
		const start_idx = queue.findIndex((t) => t.uid === track.uid);
		const ordered = start_idx >= 0 ? [...queue.slice(start_idx), ...queue.slice(0, start_idx)] : [track];
		GLOBALS.global_var.play_tracks(track, ordered, "Lyrics Finder");
	}

	function render_result({ item }: { item: SearchResult }) {
		const track = uri_to_track.current.get(item.raw.obj.filename);
		const title = track?.title ?? item.raw.obj.filename;
		const artist = track ? artist_string(track) : "";
		const query_words = query
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 0);

		return (
			<TouchableOpacity onPress={() => on_result_press(item, results)} style={styles.result_row} activeOpacity={0.6}>
				<View style={styles.artwork_wrap}>
					{track?.playback?.artwork ? (
						<IImage source={track?.playback?.artwork} style={styles.artwork} />
					) : (
						<View style={[styles.artwork, styles.artwork_fallback]}>
							<Ionicons name="musical-note" size={18} color={colors.subtext} />
						</View>
					)}
				</View>
				<View style={styles.result_meta}>
					<Text style={styles.result_title} numberOfLines={1}>
						{title}
					</Text>
					{!is_empty(artist) && (
						<Text style={styles.result_artist} numberOfLines={1}>
							{artist}
						</Text>
					)}
					{!is_empty(item.matched_line) && (
						<Text style={styles.result_snippet} numberOfLines={2}>
							{highlight_text(item.matched_line, query_words, { text: colors.deeptext, primary: colors.primary })}
						</Text>
					)}
				</View>
				<Ionicons name="play-circle-outline" size={26} color={colors.primary} style={{ alignSelf: "center" }} />
			</TouchableOpacity>
		);
	}

	return (
		<View style={{ backgroundColor: colors.background, flex: 1 }}>
			<View style={styles.search_bar}>
				<Ionicons name="search" size={17} color={colors.subtext} />
				<TextInput style={styles.search_input} placeholder="Search lyrics..." placeholderTextColor={colors.searchPlaceholder} value={query} onChangeText={on_query_change} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
				{query.length > 0 && (
					<TouchableOpacity
						onPress={() => {
							set_query("");
							set_results([]);
						}}>
						<Ionicons name="close-circle" size={18} color={colors.subtext} />
					</TouchableOpacity>
				)}
			</View>

			{is_loading ? (
				<View style={styles.state_wrap}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={styles.state_sub}>Indexing lyrics...</Text>
				</View>
			) : !has_lyrics ? (
				<View style={styles.state_wrap}>
					<Ionicons name="document-text-outline" size={56} color={colors.subtext} />
					<Text style={styles.state_title}>No Lyrics Found</Text>
					<Text style={styles.state_sub}>Download lyrics for your tracks to search them here.</Text>
				</View>
			) : is_empty(query) ? (
				<View style={styles.state_wrap}>
					<Ionicons name="search-outline" size={56} color={colors.subtext} />
					<Text style={styles.state_title}>Find Lyrics</Text>
					<Text style={styles.state_sub}>Search across all your downloaded lyrics by title or lyric content.</Text>
				</View>
			) : results.length === 0 ? (
				<View style={styles.state_wrap}>
					<Ionicons name="musical-notes-outline" size={56} color={colors.subtext} />
					<Text style={styles.state_title}>No Results</Text>
					<Text style={styles.state_sub}>Try a different search term.</Text>
				</View>
			) : (
				<>
					<Text style={styles.results_count}>
						{results.length} result{results.length !== 1 ? "s" : ""}
					</Text>
					<FlatList data={results} keyExtractor={(item, i) => item.raw.obj.path + i} renderItem={render_result} contentContainerStyle={{ paddingBottom: 24 }} />
				</>
			)}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		search_bar: {
			flexDirection: "row",
			alignItems: "center",
			gap: 10,
			marginHorizontal: 14,
			marginTop: 14,
			marginBottom: 8,
			backgroundColor: colors.shelf,
			borderRadius: 2,
			borderWidth: 1,
			borderColor: colors.line,
			paddingHorizontal: 14,
			paddingVertical: 10
		},
		search_input: { flex: 1, color: colors.text, fontSize: 15 },
		state_wrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40, gap: 10 },
		state_title: { color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" },
		state_sub: { color: colors.subtext, fontSize: 14, textAlign: "center", lineHeight: 20 },
		results_count: { color: colors.deeptext, fontSize: 12, fontWeight: "600", paddingHorizontal: 16, paddingBottom: 4 },
		result_row: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
		artwork_wrap: { justifyContent: "center" },
		artwork: { width: 55, height: 55, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		artwork_fallback: { backgroundColor: colors.shelf, justifyContent: "center", alignItems: "center" },
		result_meta: { flex: 1, justifyContent: "center", gap: 2 },
		result_title: { color: colors.text, fontSize: 15, fontWeight: "600" },
		result_artist: { color: colors.subtext, fontSize: 13 },
		result_snippet: { color: colors.deeptext, fontSize: 12, fontStyle: "italic", lineHeight: 16, marginTop: 1 }
	});
