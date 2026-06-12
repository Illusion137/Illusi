import type { AudiobookTableItem } from "@illusive/db/schema";

export type RozNovelsEntry =
	| { type: "novel"; key: string; novel: AudiobookTableItem }
	| { type: "series"; key: string; series_name: string; novels: AudiobookTableItem[] };

export interface RozNovelCallbacks {
	on_press_novel?: (novel: AudiobookTableItem) => void;
	on_press_series?: (series_name: string, novels: AudiobookTableItem[]) => void;
	on_group_novels?: (source: AudiobookTableItem, target: AudiobookTableItem) => void;
	on_add_to_series?: (novel: AudiobookTableItem, series_name: string) => void;
	on_reorder?: (ordered_uuids: string[]) => void | Promise<void>;
	on_refresh?: () => void | Promise<void>;
}

// Lexicographic title order, numeric-aware so "Book 2" sorts before "Book 10".
export function compare_by_title(a: AudiobookTableItem, b: AudiobookTableItem): number {
	return (a.title ?? "").localeCompare(b.title ?? "", undefined, { numeric: true, sensitivity: "base" });
}

function longest_common_prefix(strings: string[]): string {
	if (strings.length === 0) return "";
	let prefix = strings[0];
	for (let i = 1; i < strings.length; i++) {
		const s = strings[i];
		let j = 0;
		const max = Math.min(prefix.length, s.length);
		while (j < max && prefix[j] === s[j]) j++;
		prefix = prefix.slice(0, j);
		if (prefix.length === 0) break;
	}
	return prefix;
}

// The shared leading portion of a series' book titles (e.g. "Harry Potter and
// the …" for the Potter books), snapped to a word boundary so it never cuts a
// word in half, with trailing separators/whitespace trimmed off. Empty when the
// titles share no whole leading word.
export function series_title_prefix(novels: AudiobookTableItem[]): string {
	const titles = novels.map((n) => (n.title ?? "").trim()).filter((t) => t.length > 0);
	if (titles.length < 2) return "";
	let prefix = longest_common_prefix(titles);
	// Snap back to the last word boundary unless the prefix already ends a title
	// (e.g. "Dune" inside "Dune Messiah") or sits on whitespace.
	const ends_cleanly = titles.some((t) => t.length === prefix.length) || /\s$/u.test(prefix);
	if (!ends_cleanly) {
		const last_space = prefix.lastIndexOf(" ");
		prefix = last_space >= 0 ? prefix.slice(0, last_space) : "";
	}
	return prefix.replace(/[\s\-:#–—_.]+$/u, "").trim();
}

// Label for a grouped series tile: the shared title prefix, or the first book's
// title when the titles share no common beginning.
export function series_display_title(series_name: string, novels: AudiobookTableItem[]): string {
	const prefix = series_title_prefix(novels);
	if (prefix.length > 0) return prefix;
	const first = novels.map((n) => (n.title ?? "").trim()).find((t) => t.length > 0);
	return first ?? series_name ?? "Untitled";
}

// Strips the shared series prefix off a single book's title for the series
// details list. Falls back to the full title when nothing meaningful remains.
export function strip_series_prefix(title: string, prefix: string): string {
	const t = (title ?? "").trim();
	if (prefix.length === 0) return t;
	if (!t.toLowerCase().startsWith(prefix.toLowerCase())) return t;
	const rest = t.slice(prefix.length).replace(/^[\s\-:#–—_.]+/u, "").trim();
	return rest.length > 0 ? rest : t;
}

// Groups novels into standalone + series entries while preserving the incoming
// order (which is sort_index order from SQL). An entry's position is decided by
// the first novel of that group encountered, so drag-reorder stays meaningful.
export function group_audiobooks_into_entries(novels: AudiobookTableItem[]): RozNovelsEntry[] {
	interface PendingSeries { type: "series_pending"; series_name: string; novels: AudiobookTableItem[] }
	type Slot = { type: "novel"; novel: AudiobookTableItem } | PendingSeries;
	const slots: Slot[] = [];
	const series_slot_index = new Map<string, number>();
	for (const novel of novels) {
		const sn = novel.series_name?.trim() ?? "";
		if (sn.length === 0) {
			slots.push({ type: "novel", novel });
			continue;
		}
		const existing = series_slot_index.get(sn);
		if (existing === undefined) {
			series_slot_index.set(sn, slots.length);
			slots.push({ type: "series_pending", series_name: sn, novels: [novel] });
		} else {
			(slots[existing] as PendingSeries).novels.push(novel);
		}
	}
	const entries: RozNovelsEntry[] = [];
	for (const slot of slots) {
		if (slot.type === "novel") {
			entries.push({ type: "novel", key: `novel:${slot.novel.uuid}`, novel: slot.novel });
			continue;
		}
		const sorted = [...slot.novels].sort(compare_by_title);
		if (sorted.length === 1) {
			entries.push({ type: "novel", key: `novel:${sorted[0].uuid}`, novel: sorted[0] });
		} else {
			entries.push({ type: "series", key: `series:${slot.series_name}`, series_name: slot.series_name, novels: sorted });
		}
	}
	return entries;
}

// Flattens a (possibly reordered) entry list back into the full uuid order,
// expanding series in series_no order. Feed the result to reorder_audiobooks.
export function entries_to_ordered_uuids(entries: RozNovelsEntry[]): string[] {
	const uuids: string[] = [];
	for (const entry of entries) {
		if (entry.type === "novel") uuids.push(entry.novel.uuid);
		else for (const novel of entry.novels) uuids.push(novel.uuid);
	}
	return uuids;
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
