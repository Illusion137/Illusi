import { catch_log } from '@common/utils/error_util';
import type { Track } from '@illusive/types';
import type { ParsedLyrics } from '@origin/illusi/types';
import { get_cached_lyrics, load_lyrics } from '@utils/lyrics_cache';
import { useEffect, useState } from 'react';

/** undefined while loading, null when the track has none */
export default function useTrackLyrics(track: Track | undefined, enabled = true): ParsedLyrics | null | undefined {
	const [lyrics, set_lyrics] = useState<ParsedLyrics | null | undefined>(() => (enabled && track !== undefined ? get_cached_lyrics(track) : null));

	useEffect(() => {
		if (!enabled || track === undefined) {
			set_lyrics(null);
			return;
		}
		const cached = get_cached_lyrics(track);
		if (cached !== undefined) {
			set_lyrics(cached);
			return;
		}
		let cancelled = false;
		set_lyrics(undefined);
		load_lyrics(track)
			.then((loaded) => {
				if (!cancelled) set_lyrics(loaded);
			})
			.catch((error: unknown) => {
				if (!cancelled) set_lyrics(null);
				catch_log(error);
			});
		return () => {
			cancelled = true;
		};
	}, [enabled, track?.uid, track?.lyrics_uri, track?.sync_status]);

	return lyrics;
}
