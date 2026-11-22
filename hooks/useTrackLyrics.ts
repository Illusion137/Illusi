import { catch_log } from '@common/utils/error_util';
import type { Track } from '@illusive/types';
import type { Lyrics } from '@illusive/lyrics';
import type { ParsedLyrics } from '@origin/illusi/types';
import { get_cached_lyrics, get_cached_translation, load_lyrics, load_translation } from '@utils/lyrics_cache';
import { useEffect, useState } from 'react';

function cached_display(track: Track): Lyrics.TranslatedLyrics | null | undefined {
	return get_cached_translation(track) ?? get_cached_lyrics(track);
}

/** undefined while loading, null when the track has none; translated lines arrive in a second update */
export default function useTrackLyrics(track: Track | undefined, enabled = true): Lyrics.TranslatedLyrics | null | undefined {
	const [lyrics, set_lyrics] = useState<Lyrics.TranslatedLyrics | null | undefined>(() => (enabled && track !== undefined ? cached_display(track) : null));

	useEffect(() => {
		if (!enabled || track === undefined) {
			set_lyrics(null);
			return;
		}
		let cancelled = false;
		const show = (loaded: ParsedLyrics | null) => {
			set_lyrics(get_cached_translation(track) ?? loaded);
			if (loaded === null || get_cached_translation(track) !== undefined) return;
			load_translation(track, loaded)
				.then((translated) => {
					if (!cancelled && translated !== null) set_lyrics(translated);
				})
				.catch(catch_log);
		};
		const cached = get_cached_lyrics(track);
		if (cached !== undefined) {
			show(cached);
		} else {
			set_lyrics(undefined);
			load_lyrics(track)
				.then((loaded) => {
					if (!cancelled) show(loaded);
				})
				.catch((error: unknown) => {
					if (!cancelled) set_lyrics(null);
					catch_log(error);
				});
		}
		return () => {
			cancelled = true;
		};
	}, [enabled, track?.uid, track?.lyrics_uri, track?.sync_status]);

	return lyrics;
}
