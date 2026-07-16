import { track_store, type TrackStoreState } from "@illusive/stores/track_store";
import { useStore } from "zustand";

// Subscribe to a slice of the track library. Selectors keep re-renders granular —
// prefer selecting the narrowest value (a track, a length, a property) over the
// whole tracks array.
export default function useTrackStore<T>(selector: (state: TrackStoreState) => T): T {
	return useStore(track_store, selector);
}
