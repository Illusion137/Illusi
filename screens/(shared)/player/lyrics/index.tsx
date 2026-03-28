import { is_empty } from "@common/utils/util";
import ModalHeader from "@components/ModalHeader";
import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import { GLOBALS } from "@illusive/globals";
import { ExampleObj } from "@illusive/example_objs";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLfs } from "@illusive/sql/sql_fs";
import type { Track } from "@illusive/types";
import { useAudioPlayer } from "@simform_solutions/react-native-audio-waveform";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import TrackPlayer, { Event, useTrackPlayerEvents } from "react-native-track-player";
import { UITextView } from "react-native-uitextview";
import { SharedRouter } from "@utils/shared_routes";

interface LyricsSection {
	header: string | null;
	lines: string[];
}

// ─── Waveform analysis helpers ───────────────────────────────────────────────

function smooth(arr: number[], win: number): number[] {
	return arr.map((_, i) => {
		let sum = 0,
			count = 0;
		for (let k = i - win; k <= i + win; k++) {
			if (k >= 0 && k < arr.length) {
				sum += arr[k];
				count++;
			}
		}
		return sum / count;
	});
}

function cosine_sim(a: number[], b: number[]): number {
	let dot = 0,
		na = 0,
		nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	const denom = Math.sqrt(na) * Math.sqrt(nb);
	return denom > 0 ? dot / denom : 0;
}

/** F×F self-similarity matrix using cosine similarity between frame feature vectors. */
function compute_ssm(frames: number[][]): number[][] {
	const F = frames.length;
	return Array.from({ length: F }, (_, i) => Array.from({ length: F }, (__, j) => cosine_sim(frames[i], frames[j])));
}

/**
 * Checkerboard novelty: high where "before zone" and "after zone" differ.
 * Detects structural boundaries regardless of energy direction.
 */
function compute_novelty(ssm: number[][], ks: number): number[] {
	const F = ssm.length;
	return Array.from({ length: F }, (_, k) => {
		const before = Array.from({ length: Math.min(ks, k) }, (__, d) => k - ks + d).filter((i) => i >= 0);
		const after = Array.from({ length: Math.min(ks, F - k) }, (__, d) => k + d).filter((i) => i < F);
		if (before.length === 0 || after.length === 0) return 0;
		const mean = (pairs: [number, number][]) => {
			let s = 0;
			pairs.forEach(([i, j]) => {
				s += ssm[i][j];
			});
			return s / pairs.length;
		};
		const bb_pairs: [number, number][] = [];
		const aa_pairs: [number, number][] = [];
		const ba_pairs: [number, number][] = [];
		for (const i of before) for (const j of before) bb_pairs.push([i, j]);
		for (const i of after) for (const j of after) aa_pairs.push([i, j]);
		for (const i of before) for (const j of after) ba_pairs.push([i, j]);
		if (ba_pairs.length === 0) return 0;
		return (mean(bb_pairs) + mean(aa_pairs)) / 2 - mean(ba_pairs);
	});
}

/** Strip trailing numbers/spaces and lowercase for grouping repeated sections. */
function normalize_section_name(h: string | null): string {
	if (!h) return "\x00"; // unique key for null headers
	return h
		.toLowerCase()
		.replace(/\s*\d+\s*$/, "")
		.replace(/[^a-z\-]/g, "")
		.trim();
}

function find_best_in_range(arr: number[], from: number, to: number): number {
	let best = -Infinity,
		idx = Math.round((from + to) / 2);
	for (let i = Math.max(0, from); i <= Math.min(arr.length - 1, to); i++) {
		if (arr[i] > best) {
			best = arr[i];
			idx = i;
		}
	}
	return idx;
}

/**
 * Guarantee every section has a positive, reasonable timeslot.
 *
 * 1. Sort interior boundaries (second pass can make them non-monotonic).
 * 2. Forward pass: push each boundary right so the previous section
 *    meets its syllable-proportional minimum duration.
 * 3. Backward pass: pull each boundary left so all subsequent sections
 *    still have room before `duration`.
 * 4. Final forward pass to resolve any residual conflicts.
 *
 * Minimum per section = max(3 s, 40 % of its syllable-weighted share).
 * If total minimums exceed duration, falls back to pure syllable-proportional.
 */
function sanitize_section_times(times: number[], syl_weights: number[], duration: number): number[] {
	const n = times.length;
	if (n <= 1) return [0];

	const total_syl = syl_weights.reduce((a, b) => a + b, 0);
	const min_dur = (i: number) => Math.max(3, (syl_weights[i] / total_syl) * duration * 0.4);

	// If minimums alone exceed the track length, use pure syllable-proportional
	const total_min = syl_weights.reduce((s, _, i) => s + min_dur(i), 0);
	if (total_min >= duration) {
		let t = 0;
		return [
			0,
			...syl_weights.slice(0, -1).map((w) => {
				t += (w / total_syl) * duration;
				return t;
			})
		];
	}

	// Clamp raw boundaries, sort interior ones (second pass may have reordered them)
	const out = [
		0,
		...times
			.slice(1)
			.map((t) => Math.max(0, Math.min(t, duration - 1)))
			.sort((a, b) => a - b)
	];

	// Forward: each section i occupies [out[i], out[i+1]], needs at least min_dur(i)
	for (let i = 1; i < n; i++) {
		out[i] = Math.max(out[i], out[i - 1] + min_dur(i - 1));
	}

	// Suffix minimum space: how much room sections i…n-1 need collectively
	const suffix_min = new Array<number>(n + 1).fill(0);
	for (let i = n - 1; i >= 0; i--) suffix_min[i] = suffix_min[i + 1] + min_dur(i);

	// Backward: pull left so all remaining sections still fit before duration
	for (let i = n - 1; i >= 1; i--) {
		out[i] = Math.min(out[i], duration - suffix_min[i]);
	}

	// Final forward to resolve any residual conflicts introduced by backward pass
	for (let i = 1; i < n; i++) {
		out[i] = Math.max(out[i], out[i - 1] + min_dur(i - 1));
	}

	return out;
}

// ─── Syllable helpers ─────────────────────────────────────────────────────────

function count_syllables_word(word: string): number {
	const w = word.toLowerCase().replace(/[^a-z]/g, "");
	if (!w) return 0;
	const groups = w.match(/[aeiouy]+/g);
	let n = groups ? groups.length : 1;
	if (w.length > 2 && w.endsWith("e") && !/[aeiouy]e$/.test(w)) n = Math.max(1, n - 1);
	if (w.length > 2 && w.endsWith("le") && !/[aeiouy]le$/.test(w)) n++;
	return Math.max(1, n);
}

function count_syllables(text: string): number {
	return text
		.split(/\s+/)
		.filter(Boolean)
		.reduce((sum, w) => sum + count_syllables_word(w), 0);
}

function section_syllable_weights(sections: LyricsSection[]): number[] {
	return sections.map((s) => {
		const text = s.lines.filter((l) => l.trim()).join(" ");
		return Math.max(1, count_syllables(text));
	});
}

function parse_sections(raw: string): LyricsSection[] {
	const sections: LyricsSection[] = [];
	let current: LyricsSection = { header: null, lines: [] };
	for (const line of raw.split("\n")) {
		if (/^\[.+?\]$/.test(line)) {
			if (current.lines.some((l) => l.trim())) sections.push(current);
			current = { header: line.slice(1, -1), lines: [] };
		} else {
			current.lines.push(line);
		}
	}
	if (current.lines.some((l) => l.trim())) sections.push(current);
	return sections;
}

export default function AudioPlayerLyrics() {
	const { lyrics_uri } = useLocalSearchParams<{ lyrics_uri: string }>();

	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [track, set_track] = useState<Track | null>(null);
	const [sections, set_sections] = useState<LyricsSection[]>([]);
	const [section_times, set_section_times] = useState<number[]>([]);
	const [current_section_idx, set_current_section_idx] = useState(0);
	const [progress_ratio, set_progress_ratio] = useState(0);
	const [content_height, set_content_height] = useState(0);
	const [scrollview_height, set_scrollview_height] = useState(0);
	const scrollview_ref = useRef<ScrollView>(null);
	const section_y_positions = useRef<number[]>([]);

	// Refs so event handlers always see current values (avoid stale closure)
	const track_ref = useRef<Track | null>(null);
	const section_times_ref = useRef<number[]>([]);
	const current_section_idx_ref = useRef(0);

	const { track_colors } = useTrackColors(track ?? undefined);
	const { extractWaveformData, onCurrentExtractedWaveformData } = useAudioPlayer();

	// Register a persistent listener to suppress the "no listeners" warning
	useEffect(() => {
		const sub = onCurrentExtractedWaveformData(() => {});
		return () => sub.remove();
	}, []);

	async function get_trackplayer_progress() {
		const progress_info = await TrackPlayer.getProgress();
		return progress_info.position / progress_info.duration;
	}

	// Ratio-based initial scroll — only used for non-downloaded tracks
	useEffect(() => {
		(async () => {
			if (is_empty(track_ref.current?.media_uri) && content_height > 0 && scrollview_height > 0) {
				const max_scrollable = content_height - scrollview_height;
				const ratio = await get_trackplayer_progress();
				set_progress_ratio(isNaN(ratio) ? 0 : ratio);
				scrollview_ref.current?.scrollTo({ y: max_scrollable * ratio, animated: true });
			}
		})();
	}, [content_height, scrollview_height]);

	async function analyze_waveform(parsed_sections: LyricsSection[], t: Track) {
		if (parsed_sections.length <= 1) {
			section_times_ref.current = [0];
			set_section_times([0]);
			return;
		}
		const progress_info = await TrackPlayer.getProgress();
		const duration = progress_info.duration;
		try {
			const raw = await extractWaveformData({
				playerKey: `lyrics-${t.uid}`,
				path: SQLfs.media_directory(t.media_uri!),
				noOfSamples: 500
			});
			// Average channels (raw may be [[L...], [R...]] for stereo)
			const n_channels = raw.length;
			const N = raw[0]?.length ?? 0;
			if (N === 0) throw new Error("empty waveform");
			const amps: number[] = Array.from({ length: N }, (_, i) => raw.reduce((sum, ch) => sum + (ch[i] ?? 0), 0) / n_channels);

			// Light smooth to reduce noise, then group into F frames
			const smoothed = smooth(amps, Math.max(2, Math.floor(N / 80)));
			const F = 80;
			const frame_size = Math.max(1, Math.floor(N / F));
			const frames: number[][] = Array.from({ length: F }, (_, fi) => smoothed.slice(fi * frame_size, fi * frame_size + frame_size));

			// Augment each frame with a scaled energy component before SSM.
			// Pure cosine similarity ignores magnitude: a near-silence frame and a
			// talking frame with the same relative shape score as identical.
			// By prepending mean_energy * sqrt(frame_len) as an extra dimension,
			// silence (low energy) and talking (moderate energy) produce genuinely
			// different feature directions, so their cross-similarity stays low
			// and the checkerboard novelty fires correctly at that boundary.
			const global_max = Math.max(...frames.map((f) => Math.max(...f)), 1e-9);
			const energy_frames = frames.map((f) => {
				const mean_e = f.reduce((s, v) => s + v, 0) / (f.length || 1) / global_max;
				return [mean_e * Math.sqrt(f.length), ...f];
			});

			// Self-Similarity Matrix: sim[i][j] = cosine similarity of energy-augmented frame i and j.
			// High off-diagonal similarity = repeated sections (e.g. two choruses).
			const ssm = compute_ssm(energy_frames);

			// Checkerboard novelty: high where the "before zone" and "after zone"
			// are internally similar but differ from each other — i.e., a boundary.
			// Works for both energy-up (verse→chorus) and energy-down (chorus→verse).
			const ks = Math.max(2, Math.floor(F / (parsed_sections.length * 2)));
			const novelty = compute_novelty(ssm, ks);

			// Syllable-weighted cumulative priors
			const syl_weights = section_syllable_weights(parsed_sections);
			const total_syl = syl_weights.reduce((a, b) => a + b, 0);
			const cum_ratios: number[] = [0];
			for (let i = 0; i < syl_weights.length - 1; i++) {
				cum_ratios.push(cum_ratios[i] + syl_weights[i] / total_syl);
			}

			// First pass: pick the highest novelty peak near each prior
			const min_gap_f = Math.max(1, Math.floor(F / (parsed_sections.length * 2)));
			const boundary_frames: number[] = [];
			const boundary_scores: number[] = [];
			let prev_f = 0;
			for (let i = 1; i < parsed_sections.length; i++) {
				const center = cum_ratios[i] * F;
				const from = Math.max(prev_f + min_gap_f, Math.floor(center - 0.3 * F));
				const to = Math.min(F - 1, Math.floor(center + 0.3 * F));
				const best_f = find_best_in_range(novelty, from, to);
				boundary_frames.push(best_f);
				boundary_scores.push(novelty[best_f]);
				prev_f = best_f;
			}

			const times: number[] = [0, ...boundary_frames.map((f) => (f / F) * duration)];

			// Second pass: repeated section duration constraint.
			// Group sections by normalized name ("Chorus 2" → "chorus").
			// The most confidently-placed instance becomes the anchor; others'
			// end boundaries are re-searched near anchor_start + anchor_duration.
			const name_groups = new Map<string, number[]>();
			parsed_sections.forEach((s, idx) => {
				const key = normalize_section_name(s.header);
				if (!name_groups.has(key)) name_groups.set(key, []);
				name_groups.get(key)!.push(idx);
			});

			for (const indices of name_groups.values()) {
				if (indices.length < 2) continue;
				const anchor_idx = indices.reduce((best, idx) => {
					const s = idx === 0 ? 0 : boundary_scores[idx - 1] ?? 0;
					const b = best === 0 ? 0 : boundary_scores[best - 1] ?? 0;
					return s > b ? idx : best;
				});
				const anchor_dur = (anchor_idx < times.length - 1 ? times[anchor_idx + 1] : duration) - times[anchor_idx];
				for (const idx of indices) {
					if (idx === anchor_idx || idx >= parsed_sections.length - 1) continue;
					const expected_end = times[idx] + anchor_dur;
					const fp = (expected_end / duration) * F;
					const win_f = Math.round(0.12 * F);
					const best_f = find_best_in_range(novelty, fp - win_f, fp + win_f);
					times[idx + 1] = (best_f / F) * duration;
				}
			}

			// Sanitize: sort, enforce min durations, clamp to track length
			const final_times = sanitize_section_times(times, syl_weights, duration);
			section_times_ref.current = final_times;
			set_section_times(final_times);
			// Scroll to current section based on initial position
			const pos = progress_info.position;
			let start_idx = 0;
			for (let i = final_times.length - 1; i >= 0; i--) {
				if (pos >= final_times[i]) {
					start_idx = i;
					break;
				}
			}
			current_section_idx_ref.current = start_idx;
			set_current_section_idx(start_idx);
			const y = section_y_positions.current[start_idx];
			if (y !== undefined) scrollview_ref.current?.scrollTo({ y, animated: true });
		} catch {
			// fallback: syllable-proportional division (guaranteed valid)
			const sw = section_syllable_weights(parsed_sections);
			const total = sw.reduce((a, b) => a + b, 0);
			const fallback = sanitize_section_times(
				[
					0,
					...sw.slice(0, -1).map(
						((t) => (w: number) => {
							t += (w / total) * duration;
							return t;
						})(0)
					)
				],
				sw,
				duration
			);
			section_times_ref.current = fallback;
			set_section_times(fallback);
		}
	}

	async function load_track_and_lyrics(track_lyrics_uri: string) {
		const index = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
		const resolved = GLOBALS.global_var.playing_tracks[index] ?? null;
		track_ref.current = resolved;
		set_track(resolved);

		const read_lyrics = await SQLTracks.read_track_lyrics({ ...ExampleObj.track_example0, lyrics_uri: track_lyrics_uri });
		if (read_lyrics === undefined || typeof read_lyrics === "object") {
			close();
			return;
		}

		const parsed = parse_sections(read_lyrics);
		set_sections(parsed);
		section_y_positions.current = [];
		section_times_ref.current = [];
		set_section_times([]);
		current_section_idx_ref.current = 0;
		set_current_section_idx(0);

		if (resolved && !is_empty(resolved.media_uri)) {
			await analyze_waveform(parsed, resolved);
		} else {
			const ratio = await get_trackplayer_progress();
			set_progress_ratio(isNaN(ratio) ? 0 : ratio);
		}
	}

	useEffect(() => {
		(async () => {
			await load_track_and_lyrics(lyrics_uri);
		})();
	}, [lyrics_uri]);

	function close() {
		if (!router.canDismiss()) return;
		router.dismiss();
	}

	useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async () => {
		const current_track_index = (await TrackPlayer.getActiveTrackIndex()) ?? 0;
		const new_track = GLOBALS.global_var.playing_tracks[current_track_index];
		track_ref.current = new_track;
		set_track(new_track);
		if (is_empty(new_track.lyrics_uri)) {
			close();
		} else {
			await load_track_and_lyrics(new_track.lyrics_uri!);
		}
	});

	useTrackPlayerEvents([Event.PlaybackProgressUpdated], (event) => {
		if (!is_empty(track_ref.current?.media_uri) && section_times_ref.current.length > 0) {
			const pos = event.position;
			let idx = 0;
			for (let i = section_times_ref.current.length - 1; i >= 0; i--) {
				if (pos >= section_times_ref.current[i]) {
					idx = i;
					break;
				}
			}
			if (idx !== current_section_idx_ref.current) {
				current_section_idx_ref.current = idx;
				set_current_section_idx(idx);
				const y = section_y_positions.current[idx];
				if (y !== undefined) scrollview_ref.current?.scrollTo({ y, animated: true });
			}
		} else {
			const ratio = event.position / event.duration;
			set_progress_ratio(isNaN(ratio) ? 0 : ratio);
		}
	});

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title="Lyrics" background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background} right_icon={{ icon_name: "pencil-outline", icon_color: track_colors?.background ?? colors.primary, icon_size: 20, on_press: () => SharedRouter.goto_shared_player_lyrics_edit(lyrics_uri) }} />
			<View style={{ height: 3, backgroundColor: colors.shelf }}>
				<View style={{ height: 3, width: `${progress_ratio * 100}%`, backgroundColor: track_colors?.primary ?? colors.primary }} />
			</View>
			{track_colors ? <LinearGradient colors={[track_colors.primary, track_colors.background, "transparent"]} style={{ position: "absolute", top: 0, height: Dimensions.get("screen").height * 0.4, width: "100%", zIndex: -1 }} /> : null}
			<ScrollView ref={scrollview_ref} onLayout={(e: LayoutChangeEvent) => set_scrollview_height(e.nativeEvent.layout.height)} onContentSizeChange={(_, h) => set_content_height(h)} style={{ flex: 1 }}>
				{sections.length === 0 ? (
					<UITextView uiTextView={true} style={styles.lyrics_text}>
						Unable to find lyrics for this song
					</UITextView>
				) : (
					sections.map((section, i) => {
						const is_active = section_times.length === 0 || i === current_section_idx;
						const opacity = is_active ? 1 : 0.35;
						return (
							<View
								key={i}
								onLayout={(e) => {
									section_y_positions.current[i] = e.nativeEvent.layout.y;
								}}>
								{section.header ? <Text style={[styles.section_header, { opacity }]}>{section.header}</Text> : null}
								<UITextView uiTextView={true} selectable={true} selectionColor={colors.primary} style={{ opacity, marginHorizontal: 20 }}>
									{section.lines.map((line, j) => (
										<UITextView uiTextView={true} selectable={true} selectionColor={colors.primary} key={j} style={styles.lyrics_text}>
											{line + "\n\n"}
										</UITextView>
									))}
								</UITextView>
							</View>
						);
					})
				)}
			</ScrollView>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		lyrics_text: {
			color: colors.text,
			fontWeight: "bold",
			width: "85%",
			fontSize: 24,
			margin: 15,
			marginVertical: 5
		},
		section_header: {
			color: colors.primary,
			fontWeight: "800",
			fontSize: 11,
			letterSpacing: 1.2,
			textTransform: "uppercase",
			marginTop: 16,
			marginBottom: 2,
			marginHorizontal: 15
		}
	});
