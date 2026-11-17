import EverythingPlayer, { Event, type EmitterSubscription } from 'react-native-everything-player';
import type { Track } from '@illusive/types';
import { reinterpret_cast } from '@common/cast';
import { catch_log } from '@common/utils/error_util';
import { delete_track_from_player_queue, illusive_track_to_track_player_track, on_modify_track_player_queue } from '@illusive/track_player_service';

const RESOLVED_AHEAD = 2;
const MAX_CONSECUTIVE_MISSES = 10;

let pending_tail: Track[] = [];
let generation = 0;
let fill_chain: Promise<void> = Promise.resolve();
let active_track_subscription: EmitterSubscription | undefined;

function native_tracks(): Track[] {
	try {
		return EverythingPlayer.getQueue().map(queued => reinterpret_cast<Track>(queued.otherData));
	} catch {
		return [];
	}
}

export function active_track_index(): number | undefined {
	try {
		return EverythingPlayer.getActiveTrackIndex() ?? undefined;
	} catch {
		return undefined;
	}
}

export function player_queue_tracks(): Track[] {
	return native_tracks().concat(pending_tail);
}

export function player_queue_track(index: number | undefined): Track | undefined {
	if (index === undefined) return undefined;
	return player_queue_tracks()[index];
}

export function active_track(): Track | undefined {
	return player_queue_track(active_track_index());
}

async function fill_ahead_impl(run_generation: number) {
	let misses = 0;
	while (run_generation === generation && pending_tail.length > 0) {
		const native_length = EverythingPlayer.getQueue().length;
		const upcoming = native_length - (active_track_index() ?? 0) - 1;
		if (upcoming >= RESOLVED_AHEAD) return;
		const next = pending_tail[0];
		const converted = await illusive_track_to_track_player_track(next);
		if (run_generation !== generation) return;
		pending_tail = pending_tail.slice(1);
		if (converted === 'skip') {
			if (++misses >= MAX_CONSECUTIVE_MISSES) return;
			continue;
		}
		misses = 0;
		EverythingPlayer.add(converted);
		next.playback!.successful = true;
		await on_modify_track_player_queue();
	}
}

export async function fill_player_queue_ahead(): Promise<void> {
	const run_generation = generation;
	const run = fill_chain.then(async () => fill_ahead_impl(run_generation));
	fill_chain = run.catch(catch_log);
	return run;
}

function ensure_active_track_subscription() {
	if (active_track_subscription) return;
	active_track_subscription = EverythingPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {
		fill_player_queue_ahead().catch(catch_log);
	});
}

export async function start_player_queue(tracks: Track[]): Promise<number> {
	generation++;
	pending_tail = [];
	ensure_active_track_subscription();
	let remaining = tracks;
	let misses = 0;
	while (remaining.length > 0 && misses < MAX_CONSECUTIVE_MISSES) {
		const [first, ...rest] = remaining;
		remaining = rest;
		first.playback!.added = true;
		const converted = await illusive_track_to_track_player_track(first);
		if (converted === 'skip') {
			misses++;
			continue;
		}
		EverythingPlayer.add(converted);
		first.playback!.successful = true;
		pending_tail = remaining;
		fill_player_queue_ahead().catch(catch_log);
		return tracks.length - remaining.length - 1;
	}
	return tracks.length;
}

export function clear_player_queue() {
	generation++;
	pending_tail = [];
}

export async function remove_from_player_queue(track: Track, current_track_index: number) {
	const pending_index = pending_tail.findIndex(pending => pending.uid === track.uid);
	const in_native = native_tracks().some((queued, i) => i >= current_track_index && queued.uid === track.uid);
	if (!in_native && pending_index !== -1) {
		pending_tail = pending_tail.filter((_, i) => i !== pending_index);
		await on_modify_track_player_queue();
		return;
	}
	await delete_track_from_player_queue(track, current_track_index);
	fill_player_queue_ahead().catch(catch_log);
}

export function refresh_player_queue_tracks(refresh: (track: Track) => Track) {
	pending_tail = pending_tail.map(refresh);
}

export async function skip_to_next_resolved(): Promise<boolean> {
	const index = active_track_index();
	if (index === undefined) return false;
	if (EverythingPlayer.getQueue().length - index - 1 > 0) return true;
	await fill_player_queue_ahead();
	return EverythingPlayer.getQueue().length - index - 1 > 0;
}
