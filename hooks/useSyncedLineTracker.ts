import type { Lyrics } from "@illusive/lyrics";
import { find_current_line_idx } from "@utils/synced_lyrics_cache";
import { useEffect, useRef, useState } from "react";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";

// Each line stays active at least this long so a short (one-word) line isn't skipped.
const MIN_LINE_DWELL_MS = 200;
// A jump larger than this many lines is treated as a seek and re-centered instantly.
const SEEK_JUMP_LINES = 4;
// A backward move larger than this (seconds) is a real rewind/correction and snaps; anything
// smaller is treated as re-anchor jitter and ignored so the active line doesn't flicker.
const BACKWARD_RESYNC_SECONDS = 0.4;
// How often the authoritative playhead is re-read, and how often it is interpolated between.
const ANCHOR_INTERVAL_MS = 250;
const TICK_INTERVAL_MS = 16;
// A crossfaded track can still be advancing when lyrics first load — re-read after this.
const CROSSFADE_RESYNC_MS = 350;

export interface SyncedLineTracker {
	synced_lyrics: Lyrics.SyncedLyric[] | null;
	current_line_idx: number;
	current_line_idx_ref: React.MutableRefObject<number>;
	pending_initial_ref: React.MutableRefObject<boolean>;
	// Install a freshly-loaded set of lyrics and seed the active line from `position`.
	begin: (synced: Lyrics.SyncedLyric[], position: number) => void;
	clear: () => void;
	resync: () => void;
}

interface UseSyncedLineTrackerParams {
	// Run the interpolation timer (e.g. only while the lyrics view is visible).
	enabled: boolean;
	// Called when the active line should be revealed/scrolled to. The consumer owns the
	// actual scrolling (and whether to follow), so this stays layout-agnostic.
	on_active_line: (idx: number, animated: boolean) => void;
}

// Owns the synced-lyric position tracking shared by every lyrics view: anchors to the
// real playhead, interpolates between anchors for fine resolution, holds each line a
// minimum time, and resyncs on track change / crossfade.
export function useSyncedLineTracker({ enabled, on_active_line }: UseSyncedLineTrackerParams): SyncedLineTracker {
	const [synced_lyrics, set_synced_lyrics] = useState<Lyrics.SyncedLyric[] | null>(null);
	const [current_line_idx, set_current_line_idx] = useState(0);

	const synced_ref = useRef<Lyrics.SyncedLyric[] | null>(null);
	const current_line_idx_ref = useRef(0);
	const pending_initial_ref = useRef(false);
	const last_position_ref = useRef(0);
	const display_since_ref = useRef(0);
	const pos_base_ref = useRef(0);
	const pos_base_ts_ref = useRef(Date.now());
	const playing_ref = useRef(true);
	const token_ref = useRef(0);
	const resync_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Keep the latest callback without re-subscribing the timer/events.
	const on_active_line_ref = useRef(on_active_line);
	on_active_line_ref.current = on_active_line;

	function update_line(position: number, force_snap: boolean) {
		const lyrics = synced_ref.current;
		if (lyrics === null) return;
		const delta = position - last_position_ref.current;
		last_position_ref.current = position;

		const target = find_current_line_idx(lyrics, position);
		const current = current_line_idx_ref.current;
		// Snap on: an explicit request, a forward seek, a big index jump, or a meaningful
		// backward move. The backward case matters when a new track's first position read
		// lands the line ahead of where playback actually is (crossfade / stale read) — we
		// must drop back to it instead of waiting for playback to catch up. Only the tiny
		// sub-second nudge a re-anchor introduces is ignored, so steady playback never flickers.
		const snap = force_snap || delta > 1 || delta < -BACKWARD_RESYNC_SECONDS || Math.abs(target - current) > SEEK_JUMP_LINES;

		let next = current;
		if (snap) next = target;
		// Otherwise advance one line at a time, holding each a minimum so short lines aren't skipped.
		else if (target > current && Date.now() - display_since_ref.current >= MIN_LINE_DWELL_MS) next = current + 1;

		if (next !== current) {
			current_line_idx_ref.current = next;
			display_since_ref.current = Date.now();
			set_current_line_idx(next);
			on_active_line_ref.current(next, !snap);
		} else if (snap) {
			on_active_line_ref.current(target, false);
		}
	}

	function resync() {
		TrackPlayer.getProgress()
			.then(({ position }) => update_line(position, true))
			.catch(() => { });
	}

	function begin(synced: Lyrics.SyncedLyric[], position: number) {
		const token = ++token_ref.current;
		const idx = find_current_line_idx(synced, position);
		synced_ref.current = synced;
		last_position_ref.current = position;
		pos_base_ref.current = position;
		pos_base_ts_ref.current = Date.now();
		display_since_ref.current = Date.now();
		current_line_idx_ref.current = idx;
		pending_initial_ref.current = true;
		set_synced_lyrics(synced);
		set_current_line_idx(idx);

		if (resync_timeout_ref.current) clearTimeout(resync_timeout_ref.current);
		resync_timeout_ref.current = setTimeout(() => {
			if (token === token_ref.current) resync();
		}, CROSSFADE_RESYNC_MS);
	}

	function clear() {
		token_ref.current++;
		synced_ref.current = null;
		pending_initial_ref.current = false;
		if (resync_timeout_ref.current) clearTimeout(resync_timeout_ref.current);
		set_synced_lyrics(null);
		set_current_line_idx(0);
	}

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged, Event.PlaybackState], (event) => {
		if (event.type === Event.PlaybackState) {
			playing_ref.current = event.state === State.Playing;
			return;
		}
		if (synced_ref.current !== null) resync();
	});

	useEffect(() => {
		if (!enabled) return;
		let in_flight = false;
		let last_anchor = 0;
		const anchor = () => {
			if (in_flight) return;
			in_flight = true;
			TrackPlayer.getProgress()
				.then(({ position }) => {
					pos_base_ref.current = position;
					pos_base_ts_ref.current = Date.now();
				})
				.catch(() => { })
				.finally(() => {
					in_flight = false;
					last_anchor = Date.now();
				});
		};
		TrackPlayer.getPlaybackState()
			.then((s) => {
				playing_ref.current = s.state === State.Playing;
			})
			.catch(() => { });
		const interval = setInterval(() => {
			if (synced_ref.current === null) return;
			const now = Date.now();
			if (now - last_anchor >= ANCHOR_INTERVAL_MS) anchor();
			const estimated = playing_ref.current ? pos_base_ref.current + (now - pos_base_ts_ref.current) / 1000 : pos_base_ref.current;
			update_line(estimated, false);
		}, TICK_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [enabled]);

	useEffect(
		() => () => {
			if (resync_timeout_ref.current) clearTimeout(resync_timeout_ref.current);
		},
		[]
	);

	return { synced_lyrics, current_line_idx, current_line_idx_ref, pending_initial_ref, begin, clear, resync };
}
