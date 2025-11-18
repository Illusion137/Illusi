import { reinterpret_cast } from "@common/cast";
import type { CompactArtist, CompactPlaylist, Track } from "@illusive/types";

export const shared_values = { 
    cached_new_releases: reinterpret_cast<CompactPlaylist[]>([]),
    album_grid: reinterpret_cast<CompactPlaylist[]>([]),
    artist_grid: reinterpret_cast<CompactArtist[]>([]),
    tracks_list: reinterpret_cast<Track[]>([])
};
