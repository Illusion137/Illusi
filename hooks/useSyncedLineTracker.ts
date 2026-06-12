/* eslint-disable @typescript-eslint/no-deprecated */
import type { Lyrics } from "@illusive/lyrics";
import { find_current_line_idx } from "@utils/synced_lyrics_cache";
import { useCallback, useEffect, useRef, useState } from "react";
import { runOnJS, runOnUI, useFrameCallback, useSharedValue, type SharedValue } from "react-native-reanimated";
import TrackPlayer, { Event, State, useTrackPlayerEvents } from "react-native-track-player";

const MIN_LINE_DWELL_MS = 200;
const SEEK_JUMP_LINES = 4;
const ANCHOR_INTERVAL_MS = 3000;
const CROSSFADE_RESYNC_MS = 350;
const WINDOW_REINDEX = 2;

export interface SyncedLineTracker {
	synced_lyrics: Lyrics.SyncedLyric[] | null;
	active_line_sv: SharedValue<number>;
	window_center: number;
	current_line_idx_ref: React.MutableRefObject<number>;
	pending_initial_ref: React.MutableRefObject<boolean>;
	begin: (synced: Lyrics.SyncedLyric[], position: number) => void;
	clear: () => void;
	resync: () => void;
}

interface UseSyncedLineTrackerParams {
	enabled: boolean;
	on_active_line: (idx: number, animated: boolean) => void;
}

export function useSyncedLineTracker({ enabled, on_active_line }: UseSyncedLineTrackerParams): SyncedLineTracker {
	const [synced_lyrics, set_synced_lyrics] = useState<Lyrics.SyncedLyric[] | null>(null);
	const [window_center, set_window_center] = useState(0);

	const active_line_sv = useSharedValue(0);
	const lyric_times_sv = useSharedValue<number[]>([]);   // interval.from values only
	const anchor_pos_sv = useSharedValue(0);               // playhead position at the last anchor (seconds)
	const anchor_wall_ts_sv = useSharedValue(0);           // Date.now() at the last anchor (ms)
	const line_activated_at_sv = useSharedValue(0);        // Date.now() when the current line became active
	const playing_sv = useSharedValue(true);
	const force_snap_sv = useSharedValue(false);           // set by anchor/resync to snap next frame

	const synced_ref = useRef<Lyrics.SyncedLyric[] | null>(null);
	const current_line_idx_ref = useRef(0);
	const window_center_ref = useRef(0);
	const pending_initial_ref = useRef(false);
	const token_ref = useRef(0);
	const resync_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

	const on_active_line_ref = useRef(on_active_line);
	on_active_line_ref.current = on_active_line;

	// ── Stable JS callbacks (invoked from UI thread via runOnJS) ────────────
	const js_on_line_change = useCallback((next: number, animated: boolean) => {
		current_line_idx_ref.current = next;
		if (Math.abs(next - window_center_ref.current) > WINDOW_REINDEX) {
			window_center_ref.current = next;
			set_window_center(next);
		}
		on_active_line_ref.current(next, animated);
	}, []); // stable — all state read via refs or the stable useState setter

	const js_on_snap_same_line = useCallback((idx: number) => {
		on_active_line_ref.current(idx, false);
	}, []);

	const frame_controller = useFrameCallback(() => {
		"worklet";
		const times = lyric_times_sv.value;
		if (times.length === 0) return;

		const now = Date.now();
		// Wall-clock interpolation: estimated = anchor + elapsed-since-anchor.
		// When paused we hold the anchor position so a paused player doesn't drift.
		const estimated = playing_sv.value ? anchor_pos_sv.value + (now - anchor_wall_ts_sv.value) / 1000 : anchor_pos_sv.value;

		// Binary search: last line whose start time ≤ estimated.
		let lo = 0, hi = times.length - 1, target = 0;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			if (times[mid] <= estimated) { target = mid; lo = mid + 1; }
			else hi = mid - 1;
		}

		const current = active_line_sv.value;
		const force = force_snap_sv.value;
		if (force) force_snap_sv.value = false;

		const jump = Math.abs(target - current) > SEEK_JUMP_LINES;
		const snap = force || jump;
		const dwell_ms = now - line_activated_at_sv.value;

		let next = current;
		if (snap) {
			next = target;
		} else if (target > current && dwell_ms >= MIN_LINE_DWELL_MS) {
			// Advance one line at a time so a short line isn't skipped, but only when the
			// estimated playhead has actually crossed into a later line's interval.
			next = current + 1;
		}

		if (next !== current) {
			active_line_sv.value = next;
			line_activated_at_sv.value = now;
			runOnJS(js_on_line_change)(next, !snap);
		} else if (force) {
			runOnJS(js_on_snap_same_line)(current);
		}
	}, false);

	useEffect(() => {
		frame_controller.setActive(enabled);
		return () => frame_controller.setActive(false);
	}, [enabled, frame_controller]);

	useEffect(() => {
		if (!enabled) return;

		TrackPlayer.getPlaybackState()
			.then((s) => {
				playing_sv.value = s.state === State.Playing;
			})
			.catch(() => { });

		let cancelled = false;
		let handle: ReturnType<typeof setTimeout> | null = null;

		const schedule = () => {
			handle = setTimeout(() => {
				// Capture wall-clock time at the call site so the anchor accounts for the
				// bridge roundtrip — when the Promise resolves later, the position read
				// corresponds to ~called_at, not the resolve time.
				const called_at = Date.now();
				TrackPlayer.getProgress()
					.then(({ position }) => {
						if (cancelled) return;
						runOnUI(() => {
							"worklet";
							anchor_pos_sv.value = position;
							anchor_wall_ts_sv.value = called_at;
							force_snap_sv.value = true;
						})();
					})
					.catch(() => { })
					.finally(() => { if (!cancelled) schedule(); });
			}, ANCHOR_INTERVAL_MS);
		};
		schedule();

		return () => {
			cancelled = true;
			if (handle) clearTimeout(handle);
		};
	}, [enabled]);

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged, Event.PlaybackState], (event) => {
		if (event.type === Event.PlaybackState) {
			playing_sv.value = event.state === State.Playing;
			return;
		}
		if (synced_ref.current !== null) resync();
	});

	// ── Public API ───────────────────────────────────────────────────────────

	function resync() {
		const called_at = Date.now();
		TrackPlayer.getProgress()
			.then(({ position }) => {
				runOnUI(() => {
					"worklet";
					anchor_pos_sv.value = position;
					anchor_wall_ts_sv.value = called_at;
					force_snap_sv.value = true;
				})();
			})
			.catch(() => { });
	}

	function begin(synced: Lyrics.SyncedLyric[], position: number) {
		const token = ++token_ref.current;
		const idx = find_current_line_idx(synced, position);
		const times = synced.map((l) => l.interval.from);
		const now = Date.now();

		synced_ref.current = synced;
		current_line_idx_ref.current = idx;
		window_center_ref.current = idx;
		pending_initial_ref.current = true;

		lyric_times_sv.value = times;
		active_line_sv.value = idx;

		runOnUI(() => {
			"worklet";
			anchor_pos_sv.value = position;
			anchor_wall_ts_sv.value = now;
			line_activated_at_sv.value = now;
			force_snap_sv.value = false;
		})();

		// Refresh playing state so a stale `false` from a prior pause doesn't freeze
		// position interpolation in the frame callback.
		TrackPlayer.getPlaybackState()
			.then((s) => {
				playing_sv.value = s.state === State.Playing;
			})
			.catch(() => { });

		set_synced_lyrics(synced);
		set_window_center(idx);

		if (resync_timeout_ref.current) clearTimeout(resync_timeout_ref.current);
		resync_timeout_ref.current = setTimeout(() => {
			if (token === token_ref.current) resync();
		}, CROSSFADE_RESYNC_MS);
	}

	function clear() {
		token_ref.current++;
		synced_ref.current = null;
		lyric_times_sv.value = [];
		active_line_sv.value = 0;
		if (resync_timeout_ref.current) clearTimeout(resync_timeout_ref.current);
		set_synced_lyrics(null);
		set_window_center(0);
	}

	useEffect(
		() => () => { if (resync_timeout_ref.current) clearTimeout(resync_timeout_ref.current); },
		[]
	);

	return { synced_lyrics, active_line_sv, window_center, current_line_idx_ref, pending_initial_ref, begin, clear, resync };
}
