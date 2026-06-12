import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TrackPlayer, { Event, State, useProgress, useTrackPlayerEvents } from "react-native-track-player";
import type Roz from "@roze/types/roz";
import type { AudiobookTableItem } from "@illusive/db/schema";
import { Audiobooks } from "@illusive/audiobooks";
import { AudiobookPlayer, type AudiobookChapterTrack } from "@illusive/audiobook_player_service";
import {
	build_content_timeline,
	build_image_timeline,
	content_at_time,
	global_time_for,
	image_at_time,
	total_spoken_duration,
	type AudiobookContentTimeline,
	type AudiobookImageTimeline,
	type TimedContent,
	type TimedImage,
} from "@roze/mobile/audiobook_timeline";

const SAVE_INTERVAL_MS = 5000;

export interface UseAudiobookPlayer {
	loading: boolean;
	error: string | null;
	meta: AudiobookTableItem | null;
	roz: Roz | null;
	chapter_tracks: AudiobookChapterTrack[];
	content_timeline: AudiobookContentTimeline | null;
	image_timeline: AudiobookImageTimeline | null;
	has_audio: boolean;
	is_playing: boolean;
	is_buffering: boolean;
	chapter_index: number;
	chapter_title: string;
	position: number;
	chapter_duration: number;
	global_time: number;
	total_duration: number;
	current_content: TimedContent | undefined;
	current_image: TimedImage | undefined;
	rate: number;
	toggle: () => void;
	seek_to: (sec: number) => void;
	seek_by: (delta_sec: number) => void;
	next: () => void;
	previous: () => void;
	skip_to_chapter: (roz_chapter_index: number) => void;
	set_rate: (rate: number) => void;
}

export default function useAudiobookPlayer(uuid: string): UseAudiobookPlayer {
	const [loading, set_loading] = useState(true);
	const [error, set_error] = useState<string | null>(null);
	const [meta, set_meta] = useState<AudiobookTableItem | null>(null);
	const [roz, set_roz] = useState<Roz | null>(null);
	const [chapter_tracks, set_chapter_tracks] = useState<AudiobookChapterTrack[]>([]);
	const [content_timeline, set_content_timeline] = useState<AudiobookContentTimeline | null>(null);
	const [image_timeline, set_image_timeline] = useState<AudiobookImageTimeline | null>(null);
	const [player_state, set_player_state] = useState<State>(State.None);
	const [queue_index, set_queue_index] = useState(0);
	const [rate, set_rate_state] = useState(1);

	const meta_ref = useRef<AudiobookTableItem | null>(null);
	const chapter_tracks_ref = useRef<AudiobookChapterTrack[]>([]);
	const loaded_ref = useRef(false);

	const progress = useProgress(250);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			const result = await Audiobooks.get_audiobook(uuid);
			if (cancelled) return;
			if ("error" in result) {
				set_error(result.error.message);
				set_loading(false);
				return;
			}
			const tracks = AudiobookPlayer.build_chapter_tracks(result.roz);
			meta_ref.current = result.meta;
			chapter_tracks_ref.current = tracks;
			set_meta(result.meta);
			set_roz(result.roz);
			set_chapter_tracks(tracks);
			set_content_timeline(build_content_timeline(result.roz));
			set_image_timeline(build_image_timeline(result.roz));

			if (tracks.length > 0 && !AudiobookPlayer.is_loaded(uuid)) {
				await AudiobookPlayer.load(result.meta, result.roz, {
					autoplay: true,
					start_chapter_index: result.meta.last_chapter_index,
					start_position_sec: result.meta.last_chapter_timestamp_ms / 1000,
				});
			}
			loaded_ref.current = tracks.length > 0;
			try {
				const idx = await TrackPlayer.getActiveTrackIndex();
				if (!cancelled && idx !== undefined) set_queue_index(idx);
			} catch (_) { /* not set up */ }
			if (!cancelled) set_loading(false);
		})();
		return () => { cancelled = true; };
	}, [uuid]);

	useTrackPlayerEvents([Event.PlaybackState, Event.PlaybackActiveTrackChanged], (event) => {
		if (event.type === Event.PlaybackState) set_player_state(event.state);
		else if (event.type === Event.PlaybackActiveTrackChanged && event.index !== undefined) set_queue_index(event.index);
	});

	useEffect(() => {
		if (!loaded_ref.current) return;
		const id = setInterval(() => {
			if (meta_ref.current !== null) AudiobookPlayer.save_progress(meta_ref.current, chapter_tracks_ref.current).catch(() => { });
		}, SAVE_INTERVAL_MS);
		return () => {
			clearInterval(id);
			if (meta_ref.current !== null) AudiobookPlayer.save_progress(meta_ref.current, chapter_tracks_ref.current).catch(() => { });
		};
	}, [loading]);

	const chapter_index = chapter_tracks[queue_index]?.index ?? 0;
	const chapter_title = chapter_tracks[queue_index]?.title ?? "";
	const total_duration = useMemo(() => (roz ? total_spoken_duration(roz) : 0), [roz]);
	const global_time = useMemo(
		() => (roz ? global_time_for(roz, chapter_index, progress.position) : 0),
		[roz, chapter_index, progress.position]
	);
	const current_content = useMemo(
		() => (content_timeline ? content_at_time(content_timeline, global_time) : undefined),
		[content_timeline, global_time]
	);
	const current_image = useMemo(
		() => (image_timeline ? image_at_time(image_timeline, global_time) : undefined),
		[image_timeline, global_time]
	);

	const toggle = useCallback(() => { AudiobookPlayer.toggle().catch(() => { }); }, []);
	const seek_to = useCallback((sec: number) => { AudiobookPlayer.seek_to(sec).catch(() => { }); }, []);
	const seek_by = useCallback((delta_sec: number) => { AudiobookPlayer.seek_by(delta_sec).catch(() => { }); }, []);
	const next = useCallback(() => { AudiobookPlayer.next().catch(() => { }); }, []);
	const previous = useCallback(() => { AudiobookPlayer.previous().catch(() => { }); }, []);
	const skip_to_chapter = useCallback((roz_chapter_index: number) => {
		AudiobookPlayer.skip_to_chapter(chapter_tracks_ref.current, roz_chapter_index).catch(() => { });
	}, []);
	const set_rate = useCallback((next_rate: number) => {
		set_rate_state(next_rate);
		AudiobookPlayer.set_rate(next_rate).catch(() => { });
	}, []);

	return {
		loading,
		error,
		meta,
		roz,
		chapter_tracks,
		content_timeline,
		image_timeline,
		has_audio: chapter_tracks.length > 0,
		is_playing: player_state === State.Playing,
		is_buffering: player_state === State.Buffering || player_state === State.Loading,
		chapter_index,
		chapter_title,
		position: progress.position,
		chapter_duration: progress.duration,
		global_time,
		total_duration,
		current_content,
		current_image,
		rate,
		toggle,
		seek_to,
		seek_by,
		next,
		previous,
		skip_to_chapter,
		set_rate,
	};
}
