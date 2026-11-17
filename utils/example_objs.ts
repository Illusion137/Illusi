import type { Playlist, Track } from '@illusive/types';

export namespace ExampleObj {
	export const track_example0: Track = {
		uid: '',
		title: '',
		artists: [],
		duration: 0
	};

	export const playlist_example0: Playlist = {
		uuid: '',
		title: '',
		description: '',
		pinned: false,
		archived: false,
		thumbnail_uri: '',
		artwork_path: null,
		sort: 'NEWEST',
		public: false,
		public_uuid: '',
		inherited_playlists: [],
		inherited_searchs: [],
		linked_playlists: [],
		date: ''
	};
}
