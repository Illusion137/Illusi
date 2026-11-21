import { catch_log } from '@common/utils/error_util';
import { useCallback, useEffect, useRef } from 'react';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import EverythingPlayer, { Event, State, useTrackPlayerEvents } from 'react-native-everything-player';

const RESYNC_INTERVAL_MS = 1000;
/** The player reports the old position until a seek commits */
const SEEK_SETTLE_MS = 700;
/** Small backward corrections are absorbed by holding, so highlighted words never un-sweep */
const BACKSTEP_TOLERANCE_MS = 250;

interface Anchor {
	ms: number;
	wall: number;
	rate: number;
}

export interface PlaybackClock {
	time_ms: SharedValue<number>;
	seek: (ms: number) => void;
}

export function usePlaybackClock(enabled: boolean): PlaybackClock {
	const time_ms = useSharedValue(0);
	const playing = useSharedValue(false);
	const anchor = useSharedValue<Anchor>({ ms: 0, wall: 0, rate: 1 });
	const seek_settles_at = useRef(0);

	const frame = useFrameCallback(() => {
		'worklet';
		const current = anchor.value;
		if (!playing.value) {
			if (time_ms.value !== current.ms) time_ms.value = current.ms;
			return;
		}
		const estimated = current.ms + (Date.now() - current.wall) * current.rate;
		const behind = time_ms.value - estimated;
		if (behind > 0 && behind < BACKSTEP_TOLERANCE_MS) return;
		time_ms.value = estimated;
	}, false);

	useEffect(() => {
		frame.setActive(enabled);
		return () => frame.setActive(false);
	}, [enabled, frame]);

	const anchor_at = useCallback((position_s: number) => {
		if (Date.now() < seek_settles_at.current) return;
		let rate = 1;
		try {
			rate = EverythingPlayer.getRate();
		} catch { }
		anchor.value = { ms: position_s * 1000, wall: Date.now(), rate };
	}, [anchor]);

	const resync = useCallback(() => {
		try {
			playing.value = EverythingPlayer.getPlaybackState().state === State.Playing;
			anchor_at(EverythingPlayer.getProgress().position);
		} catch (error) {
			catch_log(error);
		}
	}, [anchor_at, playing]);

	useEffect(() => {
		if (!enabled) return;
		resync();
		const interval = setInterval(resync, RESYNC_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [enabled, resync]);

	useTrackPlayerEvents([Event.PlaybackState], (event) => {
		if (!enabled) return;
		playing.value = event.state === State.Playing;
		resync();
	});
	useTrackPlayerEvents([Event.PlaybackProgressUpdated], (event) => {
		if (enabled) anchor_at(event.position);
	});
	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], () => {
		if (enabled) resync();
	});

	const seek = useCallback((ms: number) => {
		seek_settles_at.current = Date.now() + SEEK_SETTLE_MS;
		anchor.value = { ms, wall: Date.now(), rate: anchor.value.rate };
		time_ms.value = ms;
		EverythingPlayer.seekTo(ms / 1000);
	}, [anchor, time_ms]);

	return { time_ms, seek };
}
