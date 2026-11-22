import { catch_log } from '@common/utils/error_util';
import { Lyrics } from '@illusive/lyrics';
import { Prefs } from '@illusive/prefs';
import type { Track } from '@illusive/types';
import { useEffect, useMemo, useState } from 'react';

interface VocalSynced {
	from: Lyrics.TranslatedLyrics;
	lyrics: Lyrics.TranslatedLyrics;
}

export default function useWordSyncedLyrics(track: Track | undefined, lyrics: Lyrics.TranslatedLyrics | null | undefined): Lyrics.TranslatedLyrics | null | undefined {
	const word_sync = Prefs.get_pref('experimental_word_sync') && lyrics?.sync_type === 'LINE';
	const line_sync = lyrics?.sync_type === 'NONE';
	const estimated = useMemo(() => (word_sync && lyrics ? Lyrics.syllable_word_sync(lyrics) : null), [word_sync, lyrics]);
	const [vocal_synced, set_vocal_synced] = useState<VocalSynced | null>(null);

	useEffect(() => {
		if ((!word_sync && !line_sync) || !lyrics || track === undefined) return;
		let cancelled = false;
		(line_sync ? Lyrics.vocal_line_sync(track, lyrics) : Lyrics.vocal_word_sync(track, lyrics))
			.then((synced) => {
				if (!cancelled && synced !== null) set_vocal_synced({ from: lyrics, lyrics: synced });
			})
			.catch(catch_log);
		return () => {
			cancelled = true;
		};
	}, [word_sync, line_sync, lyrics, track?.uid]);

	if (vocal_synced !== null && vocal_synced.from === lyrics) return vocal_synced.lyrics;
	return estimated ?? lyrics;
}
