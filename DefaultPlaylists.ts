import { DefaultPlaylist } from './types';

export const default_playlists: DefaultPlaylist[] = [
    { "name": "Recently Added", "track_function": (() => []) },
    { "name": "Downloaded", "track_function": (() => []) },
    { "name": "Imported", "track_function": (() => []) },
    { "name": "Recently Played", "track_function": (() => []) },
    { "name": "Most Played", "track_function": (() => []) },
    { "name": "Least Played", "track_function": (() => []) },
];