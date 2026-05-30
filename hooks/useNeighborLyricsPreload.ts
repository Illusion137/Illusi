import { subscribe_track_player_queue_modified } from "@illusive/track_player_service";
import type { Track } from "@illusive/types";
import { preload_neighbor_lyrics } from "@utils/synced_lyrics_cache";
import { useEffect, useRef } from "react";

// Warm the synced-lyrics cache for the tracks immediately before/after `track`, and
// re-warm whenever the queue changes (the next track may become a different one).
export default function useNeighborLyricsPreload(track: Track | undefined) {
	const track_ref = useRef(track);
	track_ref.current = track;

	useEffect(() => {
		preload_neighbor_lyrics(track);
	}, [track?.uid]);

	useEffect(() => subscribe_track_player_queue_modified(() => preload_neighbor_lyrics(track_ref.current)), []);
}
