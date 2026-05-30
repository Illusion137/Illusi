import type { AudiobookTableItem } from "@illusive/db/schema";

export type RozNovelsEntry =
	| { type: "novel"; key: string; novel: AudiobookTableItem }
	| { type: "series"; key: string; series_name: string; novels: AudiobookTableItem[] };

export interface RozNovelCallbacks {
	on_press_novel?: (novel: AudiobookTableItem) => void;
	on_press_series?: (series_name: string, novels: AudiobookTableItem[]) => void;
	on_group_novels?: (source: AudiobookTableItem, target: AudiobookTableItem) => void;
	on_add_to_series?: (novel: AudiobookTableItem, series_name: string) => void;
	on_reorder?: (from_index: number, to_index: number) => void;
	on_refresh?: () => void | Promise<void>;
}

export function group_audiobooks_into_entries(novels: AudiobookTableItem[]): RozNovelsEntry[] {
	const series_buckets = new Map<string, AudiobookTableItem[]>();
	const standalone: AudiobookTableItem[] = [];
	for (const novel of novels) {
		const sn = novel.series_name?.trim() ?? "";
		if (sn.length === 0) {
			standalone.push(novel);
			continue;
		}
		const bucket = series_buckets.get(sn);
		if (bucket === undefined) series_buckets.set(sn, [novel]);
		else bucket.push(novel);
	}
	const entries: RozNovelsEntry[] = [];
	for (const novel of standalone) {
		entries.push({ type: "novel", key: `novel:${novel.uuid}`, novel });
	}
	for (const [series_name, bucket] of series_buckets) {
		const sorted = [...bucket].sort((a, b) => a.series_no - b.series_no);
		if (sorted.length === 1) {
			entries.push({ type: "novel", key: `novel:${sorted[0].uuid}`, novel: sorted[0] });
		} else {
			entries.push({ type: "series", key: `series:${series_name}`, series_name, novels: sorted });
		}
	}
	return entries;
}

export function novel_progress_percent(novel: AudiobookTableItem): number {
	if (novel.total_duration_ms <= 0) return 0;
	return Math.min(1, Math.max(0, novel.total_listened_ms / novel.total_duration_ms));
}

export function format_progress_text(novel: AudiobookTableItem): string {
	const percent = novel_progress_percent(novel);
	if (percent <= 0) return "Not started";
	if (percent >= 0.999) return "Finished";
	return `${Math.round(percent * 100)}%`;
}
