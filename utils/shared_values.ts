import { reinterpret_cast } from '@common/cast';
import type { CompactArtist, CompactPlaylist, Continuation, Track } from '@illusive/types';

export const shared_values = {
	album_grid: reinterpret_cast<CompactPlaylist[]>([]),
	album_grid_continuation: reinterpret_cast<Continuation<CompactPlaylist> | undefined>(undefined),
	artist_grid: reinterpret_cast<CompactArtist[]>([]),
	artist_grid_continuation: reinterpret_cast<Continuation<CompactArtist> | undefined>(undefined),
	tracks_list: reinterpret_cast<Track[]>([]),
	tracks_list_continuation: reinterpret_cast<Continuation<Track> | undefined>(undefined)
};
