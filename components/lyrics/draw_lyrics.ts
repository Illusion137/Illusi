import { BlendMode, Skia, TileMode, type SkCanvas, type SkColor, type SkPaint, type SkRect } from '@shopify/react-native-skia';
import type { GapItem, LineItem, LyricVocals, LyricWord, LyricsLayout } from './lyrics_layout';

export interface Cascade {
	index: number;
	delta: number;
	start: number;
}

export interface LyricsFrame {
	time_ms: number;
	now: number;
	scroll_y: number;
	/** Animated index of the line being sung */
	focus: number;
	/** 0 while following, 1 while the user browses */
	manual: number;
	cascades: Cascade[];
	viewport_height: number;
	blur: boolean;
}

export const CASCADE_LIFETIME_MS = 1600;
const INACTIVE_SCALE = 0.95;
const DIM_NEAR = 0.6;
const DIM_FAR = 0.3;
const DIM_STEP = 0.05;
const UNSUNG_ALPHA = 0.42;
const BACKGROUND_DIM = 0.8;
const MAX_BLUR = 3;
const LEAD_IN_MS = 150;
const FADE_OUT_MS = 450;
const LIFT = 0.06;
const FEATHER = 0.45;
const SWELL = 0.07;
const GLOW_ALPHA = 0.6;
const GLOW_SIGMA = 0.22;
const DOT_EXIT_MS = 400;
const DOT_BREATH_MS = 1250;

function clamp01(value: number): number {
	'worklet';
	return Math.min(Math.max(value, 0), 1);
}
function mix(from: number, to: number, amount: number): number {
	'worklet';
	return from + (to - from) * amount;
}
function white(alpha: number): SkColor {
	'worklet';
	return Float32Array.of(1, 1, 1, alpha);
}
function ease_out(t: number): number {
	'worklet';
	return 1 - (1 - t) * (1 - t) * (1 - t);
}
/** cubic-bezier(0.86, 0, 0.2, 1), solved by bisection on x */
function cascade_ease(t: number): number {
	'worklet';
	const curve = (s: number, a: number, b: number) => 3 * a * (1 - s) * (1 - s) * s + 3 * b * (1 - s) * s * s + s * s * s;
	let lo = 0;
	let hi = 1;
	let s = t;
	for (let i = 0; i < 14; i++) {
		s = (lo + hi) / 2;
		if (curve(s, 0.86, 0.2) < t) lo = s;
		else hi = s;
	}
	return curve(s, 0, 1);
}

/** Lines below the new active line settle later, which gives the scroll its trailing cascade */
export function cascade_offset(cascades: Cascade[], index: number, now: number): number {
	'worklet';
	let offset = 0;
	for (const cascade of cascades) {
		const n = index - cascade.index;
		const duration = n < 0 ? 750 + Math.log(1 - n) * 10 : 750 + Math.log(n + 1) * 80 + n * 20;
		offset += cascade.delta * (1 - cascade_ease(clamp01((now - cascade.start) / duration)));
	}
	return offset;
}

function activeness(begin_ms: number, end_ms: number, time_ms: number): number {
	'worklet';
	if (time_ms < end_ms) return clamp01((time_ms - begin_ms + LEAD_IN_MS) / LEAD_IN_MS);
	return clamp01(1 - (time_ms - end_ms) / FADE_OUT_MS);
}
function word_progress(word: LyricWord, time_ms: number): number {
	'worklet';
	return clamp01((time_ms - word.begin_ms) / (word.end_ms - word.begin_ms));
}

function layer_paint(alpha: number, blur: number): SkPaint {
	'worklet';
	const paint = Skia.Paint();
	paint.setAlphaf(alpha);
	if (blur > 0.05) paint.setImageFilter(Skia.ImageFilter.MakeBlur(blur, blur, TileMode.Decal, null));
	return paint;
}
function bounds(x: number, y: number, width: number, height: number, outset: number): SkRect {
	'worklet';
	return Skia.XYWHRect(x - outset, y - outset, width + outset * 2, height + outset * 2);
}

function word_swell(word: LyricWord, progress: number, active: number): number {
	'worklet';
	return word.long && progress > 0 && progress < 1 ? Math.sin(Math.PI * progress) * active : 0;
}

function draw_split_words(canvas: SkCanvas, vocals: LyricVocals, x: number, y: number, time_ms: number, active: number, glow_only: boolean) {
	'worklet';
	const lift_px = vocals.font_size * LIFT;
	for (const word of vocals.words) {
		const progress = word_progress(word, time_ms);
		const swell = word_swell(word, progress, active);
		if (glow_only && swell <= 0.01) continue;
		const paragraph = word.paragraph!;
		canvas.save();
		canvas.translate(x + word.x, y + word.y - lift_px * ease_out(progress) * active);
		if (swell > 0) {
			const cx = word.glyph_w / 2;
			const cy = paragraph.getHeight() / 2;
			const scale = 1 + SWELL * swell;
			canvas.translate(cx, cy);
			canvas.scale(scale, scale);
			canvas.translate(-cx, -cy);
		}
		if (glow_only) {
			const sigma = vocals.font_size * GLOW_SIGMA;
			canvas.saveLayer(layer_paint(GLOW_ALPHA * swell, sigma), bounds(0, 0, word.glyph_w, paragraph.getHeight(), sigma * 3));
			paragraph.paint(canvas, 0, 0);
			canvas.restore();
		} else {
			paragraph.paint(canvas, 0, 0);
		}
		canvas.restore();
	}
}

function draw_vocals(canvas: SkCanvas, vocals: LyricVocals, x: number, y: number, width: number, time_ms: number, dim: number, active: number, blur: number) {
	'worklet';
	const area = bounds(x, y, width, vocals.height, vocals.font_size * 0.6 + blur * 3);
	if (vocals.words.length === 0 || active <= 0) {
		canvas.saveLayer(layer_paint(mix(dim, 1, active), blur), area);
		vocals.paragraph.paint(canvas, x, y);
		canvas.restore();
		return;
	}

	const lit = mix(dim, 1, active);
	const unsung = mix(dim, UNSUNG_ALPHA, active);
	canvas.saveLayer(layer_paint(1, blur), area);
	if (vocals.split) draw_split_words(canvas, vocals, x, y, time_ms, active, false);
	else vocals.paragraph.paint(canvas, x, y);

	const mask_layer = Skia.Paint();
	mask_layer.setBlendMode(BlendMode.DstIn);
	canvas.saveLayer(mask_layer, area);
	const paint = Skia.Paint();
	const feather = vocals.font_size * FEATHER;
	for (const word of vocals.words) {
		const progress = word_progress(word, time_ms);
		paint.setShader(null);
		if (progress <= 0) {
			paint.setColor(white(unsung));
		} else if (progress >= 1) {
			paint.setColor(white(lit));
		} else {
			const edge = x + word.glyph_x - feather + progress * (word.glyph_w + feather);
			paint.setColor(white(1));
			paint.setShader(Skia.Shader.MakeLinearGradient({ x: edge, y: 0 }, { x: edge + feather, y: 0 }, [white(lit), white(unsung)], null, TileMode.Clamp));
		}
		canvas.drawRect(Skia.XYWHRect(x + word.mask.x, y + word.mask.y, word.mask.w, word.mask.h), paint);
	}
	canvas.restore();
	canvas.restore();

	if (vocals.split) draw_split_words(canvas, vocals, x, y, time_ms, active, true);
}

function draw_line(canvas: SkCanvas, layout: LyricsLayout, item: LineItem, index: number, y: number, frame: LyricsFrame) {
	'worklet';
	const active = activeness(item.begin_ms, item.end_ms, frame.time_ms);
	const distance = Math.abs(index - frame.focus);
	const dim = mix(Math.max(DIM_FAR, DIM_NEAR - Math.max(distance - 1, 0) * DIM_STEP), DIM_NEAR, frame.manual);
	const blur = frame.blur ? Math.min(Math.max(distance - 0.6, 0), MAX_BLUR) * (1 - frame.manual) * (1 - active) : 0;
	const scale = mix(INACTIVE_SCALE, 1, active);
	const left = layout.padding_horizontal;
	const origin_x = item.align === 'right' ? left + layout.width : item.align === 'center' ? left + layout.width / 2 : left;
	const origin_y = y + item.text_height / 2;

	canvas.save();
	canvas.translate(origin_x, origin_y);
	canvas.scale(scale, scale);
	canvas.translate(-origin_x, -origin_y);
	draw_vocals(canvas, item.main, left, y, layout.width, frame.time_ms, dim, active, blur);
	if (item.background !== null) draw_vocals(canvas, item.background, left, y + item.background.y, layout.width, frame.time_ms, dim * BACKGROUND_DIM, active * BACKGROUND_DIM, blur);
	canvas.restore();
}

function draw_gap(canvas: SkCanvas, layout: LyricsLayout, item: GapItem, y: number, time_ms: number) {
	'worklet';
	if (time_ms < item.begin_ms || time_ms >= item.end_ms) return;
	const enter = ease_out(clamp01((time_ms - item.begin_ms) / 300));
	const exit = ease_out(clamp01((item.end_ms - time_ms) / DOT_EXIT_MS));
	const breath = 1 + 0.12 * Math.sin((time_ms / DOT_BREATH_MS) * Math.PI * 2);
	const scale = enter * exit * breath;
	if (scale <= 0.01) return;
	const radius = layout.font_size * 0.13;
	const spacing = radius * 3.4;
	const start_x = item.align === 'right' ? layout.padding_horizontal + layout.width - radius - spacing * 2 : layout.padding_horizontal + radius;
	const center_y = y + (item.height - layout.line_gap) / 2;
	const fill = clamp01((time_ms - item.begin_ms) / (item.end_ms - item.begin_ms - DOT_EXIT_MS));
	const paint = Skia.Paint();
	const color = Skia.Color(layout.color);
	for (let i = 0; i < 3; i++) {
		paint.setColor(color);
		paint.setAlphaf(mix(0.35, 1, clamp01(fill * 3 - i)) * enter);
		canvas.drawCircle(start_x + spacing * i, center_y, radius * scale, paint);
	}
}

export function draw_lyrics(canvas: SkCanvas, layout: LyricsLayout, frame: LyricsFrame) {
	'worklet';
	const items = layout.items;
	if (items.length === 0) return;
	let max_shift = 0;
	for (const cascade of frame.cascades) max_shift += Math.abs(cascade.delta);
	const margin = frame.viewport_height * 0.25;
	const top = frame.scroll_y - margin - max_shift;
	const bottom = frame.scroll_y + frame.viewport_height + margin + max_shift;

	let lo = 0;
	let hi = items.length - 1;
	let first = items.length;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (items[mid].y + items[mid].height >= top) {
			first = mid;
			hi = mid - 1;
		} else {
			lo = mid + 1;
		}
	}

	for (let i = first; i < items.length && items[i].y <= bottom; i++) {
		const item = items[i];
		const y = item.y - frame.scroll_y + cascade_offset(frame.cascades, i, frame.now) + layout.line_gap / 2;
		if (y > frame.viewport_height + margin || y + item.height < -margin) continue;
		if (item.kind === 'line') draw_line(canvas, layout, item, i, y, frame);
		else if (item.kind === 'gap') draw_gap(canvas, layout, item, y, frame.time_ms);
		else item.paragraph.paint(canvas, layout.padding_horizontal, y);
	}
}
