import { useEffect, useState } from "react";
import { AudiobookGeneration } from "@illusive/audiobook_generation";

function same(a: AudiobookGeneration.GenState | undefined, b: AudiobookGeneration.GenState | undefined): boolean {
	if (a === undefined || b === undefined) return a === b;
	return a.current === b.current && a.total === b.total && a.chapter_done === b.chapter_done && a.chapter_total === b.chapter_total && a.encode_progress === b.encode_progress;
}

// Subscribes to the generation manager for a single audiobook. Returns its live
// generation state (or undefined when nothing is generating for that uuid).
// Because the state lives outside this component, it survives navigating away
// from the audiobook details screen and back.
export default function useAudiobookGeneration(uuid: string): AudiobookGeneration.GenState | undefined {
	const [state, set_state] = useState<AudiobookGeneration.GenState | undefined>(() => AudiobookGeneration.get_state(uuid));
	useEffect(() => {
		const sync = () => {
			const next = AudiobookGeneration.get_state(uuid);
			set_state((prev) => (same(prev, next) ? prev : next));
		};
		sync();
		return AudiobookGeneration.subscribe(sync);
	}, [uuid]);
	return state;
}
