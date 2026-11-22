import { catch_log } from '@common/utils/error_util';
import { IllusiAccount } from '@illusive/db/sync/illusi_account';
import { IllusiViews } from '@illusive/illusi_views';
import type { NamedUUID } from '@illusive/types';
import { Illusi } from '@origin/illusi/illusi';
import { useEffect, useState } from 'react';

export interface CatalogSuggestion {
	named: NamedUUID;
	artwork: string;
	subtitle: string;
}

const DEBOUNCE_MS = 250;
const LIMIT = 10;

/** Artists or albums in the Illusi catalog whose names match the query, empty while signed out */
export default function useCatalogSuggestions(type: 'artist' | 'album', query: string, enabled: boolean): CatalogSuggestion[] {
	const [suggestions, set_suggestions] = useState<CatalogSuggestion[]>([]);

	useEffect(() => {
		const q = query.trim();
		if (!enabled || q.length < 2 || !IllusiAccount.is_logged_in()) {
			set_suggestions([]);
			return;
		}
		let cancelled = false;
		const timer = setTimeout(() => {
			(async () => {
				const result = await Illusi.search(q, { types: [type], limit: LIMIT });
				if (cancelled) return;
				if (Illusi.is_error(result)) {
					set_suggestions([]);
					return;
				}
				set_suggestions(type === 'artist'
					? (result.artists?.items ?? []).map(view => ({
							named: IllusiViews.artist_named(view),
							artwork: IllusiViews.best_thumbnail_url(view.thumbnails) || view.itunes?.artwork_url || '',
							subtitle: `${view.track_count} tracks`
						}))
					: (result.albums?.items ?? []).map(view => ({
							named: IllusiViews.album_named(view),
							artwork: IllusiViews.best_thumbnail_url(view.thumbnails) || view.itunes?.artwork_url || '',
							subtitle: view.artists.map(artist => artist.name).join(', ')
						})));
			})().catch(catch_log);
		}, DEBOUNCE_MS);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [type, query, enabled]);

	return suggestions;
}
