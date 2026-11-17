import type { Lyrics } from '@illusive/lyrics';
import type { Track } from '@illusive/types';
import { player_queue_tracks } from '@utils/player_queue';
import { has_synced_lyrics, read_synced_lyrics } from '@utils/track_lyrics';

const INTRO_MARKER_GAP_SECONDS = 2;

export function find_current_line_idx(synced_lyrics: Lyrics.SyncedLyric[], position: number): number {
	for (let i = synced_lyrics.length - 1; i >= 0; i--) {
		if (position >= synced_lyrics[i].interval.from) return i;
	}
	return 0;
}

// Prepend a "♪" line when the song has a long intro before the first lyric.
export function with_intro_marker(synced_lyrics: Lyrics.SyncedLyric[]): Lyrics.SyncedLyric[] {
	if (synced_lyrics.length > 0 && synced_lyrics[0].interval.from > INTRO_MARKER_GAP_SECONDS) {
		return [{ text: '♪', interval: { from: 0 } }, ...synced_lyrics];
	}
	return synced_lyrics;
}

// null = confirmed no synced lyrics for this track; SyncedLyric[] = loaded; absent = not loaded yet.
type CacheEntry = Lyrics.SyncedLyric[] | null;

const MAX_CACHE_ENTRIES = 50;
const cache = new Map<string, CacheEntry>();
const in_flight = new Map<string, Promise<CacheEntry>>();

// Key on the lyrics uri too so a track that gets synced lyrics added later isn't
// permanently cached as "none".
function cache_key(track: Track): string {
	return `${track.uid}|${track.lyrics_uri ?? ''}|${track.sync_status ?? ''}`;
}

function remember(key: string, entry: CacheEntry) {
	if (cache.size >= MAX_CACHE_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest !== undefined) cache.delete(oldest);
	}
	cache.set(key, entry);
}

// Returns the cached entry, or undefined when nothing has been loaded for this track yet.
export function get_cached_synced_lyrics(track: Track): CacheEntry | undefined {
	if (!has_synced_lyrics(track)) return null;
	return cache.get(cache_key(track));
}

export async function load_synced_lyrics(track: Track): Promise<CacheEntry> {
	if (!has_synced_lyrics(track)) return null;
	const key = cache_key(track);
	const cached = cache.get(key);
	if (cached !== undefined) return cached;
	const existing = in_flight.get(key);
	if (existing) return existing;

	const promise = (async (): Promise<CacheEntry> => (await read_synced_lyrics(track)) ?? null)();
	in_flight.set(key, promise);
	const result = await promise;
	remember(key, result);
	in_flight.delete(key);
	return result;
}

// Drop every cached entry for this track so the next load re-reads from disk. Run after the
// user edits/saves lyrics — the lyrics_uri may stay the same but the file contents change.
export function invalidate_synced_lyrics(track: Track) {
	const prefix = `${track.uid}|`;
	for (const key of Array.from(cache.keys())) {
		if (key.startsWith(prefix)) cache.delete(key);
	}
}

// Warm the cache for a track without blocking; safe to call repeatedly.
export function preload_synced_lyrics(track: Track | undefined) {
	if (!track || !has_synced_lyrics(track)) return;
	const key = cache_key(track);
	if (cache.has(key) || in_flight.has(key)) return;
	load_synced_lyrics(track).catch(() => {});
}

// Preload the lyrics for the tracks immediately before/after the given one in the
// active queue so switching to them is instant. The queue can change underneath us,
// so this reads the current neighbours each time it's called.
export function preload_neighbor_lyrics(current_track: Track | undefined) {
	if (!current_track) return;
	const tracks = player_queue_tracks();
	const idx = tracks.findIndex(track => track.uid === current_track.uid);
	if (idx === -1) return;
	preload_synced_lyrics(tracks[idx - 1]);
	preload_synced_lyrics(tracks[idx + 1]);
}
