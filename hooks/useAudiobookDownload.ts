import { useEffect, useState } from "react";
import { AudiobookDownloads } from "@illusive/audiobook_downloads";

function same(a: AudiobookDownloads.DownloadState | undefined, b: AudiobookDownloads.DownloadState | undefined): boolean {
	if (a === undefined || b === undefined) return a === b;
	return a.status === b.status && a.bytes_written === b.bytes_written && a.bytes_total === b.bytes_total;
}

// Subscribes to the download manager for a single audiobook. Returns its live
// download state (or undefined when nothing is downloading for that uuid).
// Cards not tied to an active download never re-render on unrelated progress.
export default function useAudiobookDownload(uuid: string): AudiobookDownloads.DownloadState | undefined {
	const [state, set_state] = useState<AudiobookDownloads.DownloadState | undefined>(() => AudiobookDownloads.get_state(uuid));
	useEffect(() => {
		const sync = () => {
			const next = AudiobookDownloads.get_state(uuid);
			set_state((prev) => (same(prev, next) ? prev : next));
		};
		sync();
		return AudiobookDownloads.subscribe(sync);
	}, [uuid]);
	return state;
}

export function download_percent(state: AudiobookDownloads.DownloadState): number {
	if (state.bytes_total <= 0) return 0;
	return Math.min(1, Math.max(0, state.bytes_written / state.bytes_total));
}

export function download_label(state: AudiobookDownloads.DownloadState): string {
	if (state.status === "processing") return "Processing…";
	if (state.status === "error") return "Failed";
	if (state.status === "queued") return "Queued…";
	if (state.bytes_total <= 0) return "Downloading…";
	return `Downloading ${Math.round(download_percent(state) * 100)}%`;
}
