import { LyricsAlign } from '@illusive/lyrics_align';
import type { LyricsLine, LyricsSegment, ParsedLyrics } from '@origin/illusi/types';
import { FontWeight, Skia, TextAlign, type LineMetrics, type SkParagraph } from '@shopify/react-native-skia';

/** A held syllable this long gets the glow + swell emphasis */
const LONG_WORD_MS = 1000;
const LONG_WORD_MAX_CHARS = 12;
/** An instrumental gap this long gets the breathing dots */
const GAP_MIN_MS = 5000;
const BACKGROUND_SCALE = 0.62;
/** Singers that sing together rather than as a duet partner */
const GROUP_AGENTS = new Set(['v1000']);
const STATIC_OPACITY = 0.85;
const CREDITS_OPACITY = 0.45;

export interface LyricsStyle {
	color: string;
	font_size: number;
	font_weight: FontWeight;
	font_families: string[];
	line_height: number;
	padding_horizontal: number;
	/** Where the active line rests, as a fraction of the viewport height */
	anchor: number;
}

export interface MaskRect {
	x: number;
	y: number;
	w: number;
	h: number;
}
export interface LyricWord {
	begin_ms: number;
	end_ms: number;
	/** Glyph extent on its row, relative to the vocals origin */
	glyph_x: number;
	glyph_w: number;
	/** Non-overlapping region the sweep mask is drawn into */
	mask: MaskRect;
	/** Standalone paragraph so the word can lift and swell on its own; null when it wraps across rows */
	paragraph: SkParagraph | null;
	x: number;
	y: number;
	long: boolean;
}
export interface LyricVocals {
	paragraph: SkParagraph;
	/** Offset within the item's text block */
	y: number;
	height: number;
	font_size: number;
	/** Empty when line synced */
	words: LyricWord[];
	/** Every word has its own paragraph */
	split: boolean;
}
export type LyricAlign = 'left' | 'right' | 'center';

interface ItemBase {
	y: number;
	height: number;
	begin_ms: number;
	end_ms: number;
}
export interface LineItem extends ItemBase {
	kind: 'line';
	text: string;
	align: LyricAlign;
	main: LyricVocals;
	background: LyricVocals | null;
	text_height: number;
}
export interface GapItem extends ItemBase {
	kind: 'gap';
	align: LyricAlign;
}
export interface TextItem extends ItemBase {
	kind: 'static' | 'credits';
	paragraph: SkParagraph;
}
export type LyricItem = LineItem | GapItem | TextItem;

export interface LyricsLayout {
	items: LyricItem[];
	/** begin_ms of each item; Infinity for untimed ones */
	begins: number[];
	timed: boolean;
	content_height: number;
	top_inset: number;
	line_gap: number;
	padding_horizontal: number;
	width: number;
	font_size: number;
	color: string;
}

function make_paragraph(text: string, font_size: number, align: TextAlign, width: number, style: LyricsStyle, weight = style.font_weight, opacity = 1): SkParagraph {
	const color = Float32Array.from(Skia.Color(style.color));
	color[3] *= opacity;
	const paragraph = Skia.ParagraphBuilder.Make({ textAlign: align })
		.pushStyle({
			color,
			fontFamilies: style.font_families,
			fontSize: font_size,
			fontStyle: { weight },
			heightMultiplier: style.line_height,
			halfLeading: true
		})
		.addText(text)
		.pop()
		.build();
	paragraph.layout(width);
	return paragraph;
}

function text_align(align: LyricAlign): TextAlign {
	return align === 'right' ? TextAlign.Right : align === 'center' ? TextAlign.Center : TextAlign.Left;
}

function row_of(metrics: LineMetrics[], y: number): number {
	for (let i = 0; i < metrics.length; i++) if (y < metrics[i].baseline + metrics[i].descent) return i;
	return metrics.length - 1;
}

/** Row bands that tile the paragraph vertically, padded outward at the top and bottom so lifted glyphs stay inside the mask */
function row_bands(metrics: LineMetrics[], height: number, pad: number): { top: number; bottom: number }[] {
	return metrics.map((_, i) => ({
		top: i === 0 ? -pad : (metrics[i - 1].baseline + metrics[i - 1].descent + metrics[i].baseline - metrics[i].ascent) / 2,
		bottom: i === metrics.length - 1 ? height + pad : (metrics[i].baseline + metrics[i].descent + metrics[i + 1].baseline - metrics[i + 1].ascent) / 2
	}));
}

function layout_vocals(source: Pick<LyricsLine, 'text' | 'segments' | 'end_ms'>, font_size: number, align: LyricAlign, width: number, style: LyricsStyle, timed_words: boolean): LyricVocals {
	const segments: LyricsSegment[] = timed_words ? (source.segments ?? []).filter(segment => segment.text.length > 0) : [];
	const text = segments.length > 0 ? segments.map(segment => segment.text).join('').trimEnd() : source.text.trim();
	const paragraph = make_paragraph(text, font_size, text_align(align), width, style);
	const height = paragraph.getHeight();
	if (segments.length === 0) return { paragraph, y: 0, height, font_size, words: [], split: false };

	const metrics = paragraph.getLineMetrics();
	const bands = row_bands(metrics, height, font_size * 0.4);
	const pending: (Omit<LyricWord, 'mask'> & { row: number; next_x?: number })[] = [];
	let offset = 0;
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		const start = offset + segment.text.length - segment.text.trimStart().length;
		const end = Math.min(offset + segment.text.trimEnd().length, text.length);
		offset += segment.text.length;
		if (end <= start) continue;
		const rects = paragraph.getRectsForRange(start, end);
		if (rects.length === 0) continue;
		const first = rects[0];
		const row = row_of(metrics, first.y + first.height / 2);
		const end_ms = segment.end_ms ?? segments[i + 1]?.start_ms ?? source.end_ms ?? segment.start_ms + 300;
		let word_paragraph: SkParagraph | null = null;
		let x = 0;
		let y = 0;
		if (rects.length === 1) {
			word_paragraph = make_paragraph(text.slice(start, end), font_size, TextAlign.Left, 100_000, style);
			x = first.x;
			y = metrics[row].baseline - word_paragraph.getLineMetrics()[0].baseline;
		}
		pending.push({
			begin_ms: segment.start_ms,
			end_ms: Math.max(end_ms, segment.start_ms + 1),
			glyph_x: first.x,
			glyph_w: rects.reduce((right, rect) => Math.max(right, rect.x + rect.width), 0) - first.x,
			paragraph: word_paragraph,
			x,
			y,
			long: end_ms - segment.start_ms >= LONG_WORD_MS && end - start <= LONG_WORD_MAX_CHARS,
			row
		});
	}
	const pad = font_size * 0.5;
	const words: LyricWord[] = pending.map((word, i) => {
		const prev = pending[i - 1]?.row === word.row ? pending[i - 1] : undefined;
		const next = pending[i + 1]?.row === word.row ? pending[i + 1] : undefined;
		const left = prev === undefined ? word.glyph_x - pad : (prev.glyph_x + prev.glyph_w + word.glyph_x) / 2;
		const right = next === undefined ? word.glyph_x + word.glyph_w + pad : (word.glyph_x + word.glyph_w + next.glyph_x) / 2;
		const band = bands[word.row];
		return {
			begin_ms: word.begin_ms,
			end_ms: word.end_ms,
			glyph_x: word.glyph_x,
			glyph_w: word.glyph_w,
			mask: { x: left, y: band.top, w: right - left, h: band.bottom - band.top },
			paragraph: word.paragraph,
			x: word.x,
			y: word.y,
			long: word.long
		};
	});
	return { paragraph, y: 0, height, font_size, words, split: words.every(word => word.paragraph !== null) };
}

function line_align(agent: string | undefined, main_agent: string | undefined): LyricAlign {
	if (agent === undefined || main_agent === undefined || agent === main_agent) return 'left';
	return GROUP_AGENTS.has(agent) ? 'center' : 'right';
}

function line_end_ms(line: LyricsLine, next: LyricsLine | undefined): number {
	const start = line.start_ms ?? 0;
	return line.end_ms ?? line.segments?.at(-1)?.end_ms ?? next?.start_ms ?? start + 5000;
}

export function build_lyrics_layout(lyrics: ParsedLyrics, viewport_width: number, viewport_height: number, style: LyricsStyle): LyricsLayout {
	const width = Math.max(1, viewport_width - style.padding_horizontal * 2);
	const line_gap = style.font_size * 0.6;
	const top_inset = viewport_height * style.anchor;
	const timed = lyrics.sync_type !== 'NONE' && lyrics.lines.some(line => line.start_ms !== null);
	const timed_words = lyrics.sync_type === 'WORD' || lyrics.sync_type === 'SYLLABLE';
	const items: LyricItem[] = [];
	let y = top_inset;
	const push = (item: LyricItem) => {
		items.push(item);
		y += item.height;
	};

	if (!timed) {
		for (const line of lyrics.lines) {
			const text = line.text.trim();
			if (text === '') {
				y += line_gap;
				continue;
			}
			const header = LyricsAlign.is_header(text);
			const paragraph = make_paragraph(header ? text.slice(1, -1) : text, header ? style.font_size * 0.55 : style.font_size, TextAlign.Left, width, style, header ? FontWeight.SemiBold : style.font_weight, STATIC_OPACITY);
			push({ kind: 'static', y, height: paragraph.getHeight() + line_gap, begin_ms: Infinity, end_ms: Infinity, paragraph });
		}
	} else {
		const lines = lyrics.lines.filter(line => line.start_ms !== null && line.text.trim() !== '' && !LyricsAlign.is_header(line.text));
		const main_agent = lines.find(line => line.agent !== undefined)?.agent;
		let sung_until = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const begin_ms = line.start_ms!;
			const end_ms = Math.max(line_end_ms(line, lines[i + 1]), begin_ms + 1);
			const align = line_align(line.agent, main_agent);
			if (begin_ms - sung_until >= GAP_MIN_MS) {
				push({ kind: 'gap', y, height: style.font_size * 1.1 + line_gap, begin_ms: sung_until, end_ms: begin_ms, align });
			}
			const main = layout_vocals(line, style.font_size, align, width, style, timed_words);
			let background: LyricVocals | null = null;
			let text_height = main.height;
			let item_end = end_ms;
			if (line.background !== undefined && line.background.text.trim() !== '') {
				background = layout_vocals(line.background, style.font_size * BACKGROUND_SCALE, align, width, style, timed_words);
				background.y = main.height + style.font_size * 0.1;
				text_height = background.y + background.height;
				item_end = Math.max(item_end, line.background.end_ms ?? line.background.segments?.at(-1)?.end_ms ?? item_end);
			}
			push({ kind: 'line', y, height: text_height + line_gap, begin_ms, end_ms: item_end, text: line.text, align, main, background, text_height });
			sung_until = Math.max(sung_until, item_end);
		}
	}

	const songwriters = lyrics.songwriters?.filter(name => name.trim() !== '') ?? [];
	if (songwriters.length > 0) {
		const paragraph = make_paragraph(`Written by: ${songwriters.join(', ')}`, style.font_size * 0.42, TextAlign.Left, width, style, FontWeight.Medium, CREDITS_OPACITY);
		y += line_gap;
		push({ kind: 'credits', y, height: paragraph.getHeight() + line_gap, begin_ms: Infinity, end_ms: Infinity, paragraph });
	}

	return {
		items,
		begins: items.map(item => item.begin_ms),
		timed,
		content_height: y + viewport_height * (1 - style.anchor),
		top_inset,
		line_gap,
		padding_horizontal: style.padding_horizontal,
		width,
		font_size: style.font_size,
		color: style.color
	};
}

/** Index of the last timed item that has begun by `time_ms`, or 0 before the first */
export function item_at(layout: LyricsLayout, time_ms: number): number {
	'worklet';
	const begins = layout.begins;
	let lo = 0;
	let hi = begins.length - 1;
	let found = 0;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (begins[mid] <= time_ms) {
			found = mid;
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}
	return found;
}
