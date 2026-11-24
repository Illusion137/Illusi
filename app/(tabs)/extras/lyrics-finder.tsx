import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { Prefs } from '@illusive/prefs';
import { Lyrics } from '@illusive/lyrics';
import { GLOBALS } from '@illusive/globals';
import { artist_string } from '@illusive/illusive_utils';
import { is_empty } from '@common/utils/util';
import { Ionicons } from '@expo/vector-icons';
import IImage from '@components/IImage';
import usePTheme from '@hooks/usePTheme';
import { catch_log } from '@common/utils/error_util';

type SearchResult = Lyrics.LyricsSearchResult;

function highlight_text(line: string, query_words: string[], colors: { text: string; primary: string }) {
	if (query_words.length === 0 || line.length === 0) return line;
	const pattern = new RegExp(`(${query_words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
	const parts = line.split(pattern);
	return parts.map((part, i) =>
		pattern.test(part)
			? (
					<Text key={i} style={{ color: colors.primary, fontWeight: '700' }}>
						{part}
					</Text>
				)
			: (
					<Text key={i} style={{ color: colors.text }}>
						{part}
					</Text>
				)
	);
}

export default function ExtraLyricsFinderScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [query, set_query] = useState('');
	const [results, set_results] = useState<SearchResult[]>([]);
	const [is_loading, set_is_loading] = useState(true);
	const [has_lyrics, set_has_lyrics] = useState(false);

	const debounce_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const tracks = GLOBALS.global_var.sql_tracks;
		set_has_lyrics(tracks.some(t => !is_empty(t.lyrics_uri)));

		Lyrics.load_lyrics_into_fuzzy_memory(tracks).then(() => set_is_loading(false)).catch(catch_log);
	}, []);

	const run_search = useCallback(async (q: string) => {
		set_results(await Lyrics.fuzzy_search_lyrics(q));
	}, []);

	function on_query_change(text: string) {
		set_query(text);
		if (debounce_ref.current !== null) clearTimeout(debounce_ref.current);
		debounce_ref.current = setTimeout(async () => run_search(text), 280);
	}

	function on_result_press(result: SearchResult, all: SearchResult[]) {
		const track = result.track;
		const queue = all.map(r => r.track);
		const start_idx = queue.findIndex(t => t.uid === track.uid);
		const ordered = start_idx >= 0 ? [...queue.slice(start_idx), ...queue.slice(0, start_idx)] : [track];
		GLOBALS.global_var.play_tracks(track, ordered, 'Lyrics Finder');
	}

	function render_result({ item }: { item: SearchResult }) {
		const track = item.track;
		const title = track.title;
		const artist = artist_string(track);
		const query_words = query
			.trim()
			.toLowerCase()
			.split(/\s+/)
			.filter(w => w.length > 0);

		return (
			<TouchableOpacity onPress={() => on_result_press(item, results)} style={styles.result_row} activeOpacity={0.6}>
				<View style={styles.artwork_wrap}>
					{track.playback?.artwork ? (
						<IImage source={track.playback.artwork} style={styles.artwork} />
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
					{!is_empty(item.line) && (
						<Text style={styles.result_snippet} numberOfLines={2}>
							{highlight_text(item.line, query_words, { text: colors.deeptext, primary: colors.primary })}
						</Text>
					)}
				</View>
				<Ionicons name="play-circle-outline" size={26} color={colors.primary} style={{ alignSelf: 'center' }} />
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
							set_query('');
							set_results([]);
						}}
					>
						<Ionicons name="close-circle" size={18} color={colors.subtext} />
					</TouchableOpacity>
				)}
			</View>

			{is_loading ? (
				<View style={styles.state_wrap}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={styles.state_sub}>Indexing lyrics...</Text>
				</View>
			)
				: !has_lyrics
						? (
								<View style={styles.state_wrap}>
									<Ionicons name="document-text-outline" size={56} color={colors.subtext} />
									<Text style={styles.state_title}>No Lyrics Found</Text>
									<Text style={styles.state_sub}>Download lyrics for your tracks to search them here.</Text>
								</View>
							)
						: is_empty(query)
							? (
									<View style={styles.state_wrap}>
										<Ionicons name="search-outline" size={56} color={colors.subtext} />
										<Text style={styles.state_title}>Find Lyrics</Text>
										<Text style={styles.state_sub}>Search across all your downloaded lyrics by title or lyric content.</Text>
									</View>
								)
							: results.length === 0
								? (
										<View style={styles.state_wrap}>
											<Ionicons name="musical-notes-outline" size={56} color={colors.subtext} />
											<Text style={styles.state_title}>No Results</Text>
											<Text style={styles.state_sub}>Try a different search term.</Text>
										</View>
									)
								: (
										<>
											<Text style={styles.results_count}>
												{results.length}
												{' '}
												result
												{results.length !== 1 ? 's' : ''}
											</Text>
											<FlatList data={results} keyExtractor={item => item.track.uid} renderItem={render_result} contentContainerStyle={{ paddingBottom: 24 }} />
										</>
									)}
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) =>
	StyleSheet.create({
		search_bar: {
			flexDirection: 'row',
			alignItems: 'center',
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
		state_wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 10 },
		state_title: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
		state_sub: { color: colors.subtext, fontSize: 14, textAlign: 'center', lineHeight: 20 },
		results_count: { color: colors.deeptext, fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingBottom: 4 },
		result_row: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
		artwork_wrap: { justifyContent: 'center' },
		artwork: { width: 55, height: 55, borderRadius: 2, borderWidth: 1, borderColor: colors.line },
		artwork_fallback: { backgroundColor: colors.shelf, justifyContent: 'center', alignItems: 'center' },
		result_meta: { flex: 1, justifyContent: 'center', gap: 2 },
		result_title: { color: colors.text, fontSize: 15, fontWeight: '600' },
		result_artist: { color: colors.subtext, fontSize: 13 },
		result_snippet: { color: colors.deeptext, fontSize: 12, fontStyle: 'italic', lineHeight: 16, marginTop: 1 }
	});
