import { is_empty } from '@common/utils/util';
import { Lyrics } from '@illusive/lyrics';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import type { Track } from '@illusive/types';
import type { ParsedLyrics } from '@origin/illusi/types';

export function has_synced_lyrics(track: Pick<Track, 'lyrics_uri' | 'sync_status'> | undefined | null): boolean {
	return !!track && !is_empty(track.lyrics_uri) && track.sync_status !== undefined && track.sync_status !== 'NONE';
}

export function track_lyrics_plain(lyrics: Lyrics.TrackLyrics): string {
	return lyrics.sync_status === 'NONE' ? lyrics.plain : Lyrics.to_plain(lyrics.lyrics);
}

export async function read_plain_lyrics(track: Track): Promise<string | undefined> {
	const lyrics = await SQLTracks.read_track_lyrics(track);
	return lyrics === undefined ? undefined : track_lyrics_plain(lyrics);
}

export async function read_parsed_lyrics(track: Track): Promise<ParsedLyrics | undefined> {
	const lyrics = await SQLTracks.read_track_lyrics(track);
	if (lyrics === undefined) return undefined;
	return lyrics.sync_status === 'NONE' ? Lyrics.from_plain(lyrics.plain) : lyrics.lyrics;
}
