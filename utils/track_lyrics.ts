import { is_empty } from '@common/utils/util';
import { Lyrics } from '@illusive/lyrics';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import type { Track } from '@illusive/types';

export function has_synced_lyrics(track: Pick<Track, 'lyrics_uri' | 'sync_status'> | undefined | null): boolean {
	return !!track && !is_empty(track.lyrics_uri) && track.sync_status !== undefined && track.sync_status !== 'NONE';
}

export function track_lyrics_plain(lyrics: Lyrics.TrackLyrics): string {
	return lyrics.sync_status === 'NONE' ? lyrics.plain : Lyrics.to_plain(lyrics.lyrics);
}

export function track_lyrics_synced(lyrics: Lyrics.TrackLyrics): Lyrics.SyncedLyric[] | undefined {
	if (lyrics.sync_status === 'NONE') return undefined;
	const synced = Lyrics.to_synced_lyrics(lyrics.lyrics);
	return synced.length > 0 ? synced : undefined;
}

export async function read_plain_lyrics(track: Track): Promise<string | undefined> {
	const lyrics = await SQLTracks.read_track_lyrics(track);
	return lyrics === undefined ? undefined : track_lyrics_plain(lyrics);
}

export async function read_synced_lyrics(track: Track): Promise<Lyrics.SyncedLyric[] | undefined> {
	if (!has_synced_lyrics(track)) return undefined;
	const lyrics = await SQLTracks.read_track_lyrics(track);
	return lyrics === undefined ? undefined : track_lyrics_synced(lyrics);
}
