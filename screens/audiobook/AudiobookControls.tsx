/* eslint-disable @typescript-eslint/no-deprecated */
import { useState } from "react";
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useRouter } from "expo-router";
import usePTheme from "@hooks/usePTheme";
import type { UseAudiobookPlayer } from "./useAudiobookPlayer";

export type AudiobookPlayerMode = 1 | 2 | 3;

const screen_w = Dimensions.get("screen").width;
const seekbar_width = screen_w - 70;
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function mmss(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
	const total = Math.floor(seconds);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const mm = String(m).padStart(2, "0");
	const ss = String(s).padStart(2, "0");
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface Props {
	player: UseAudiobookPlayer;
	mode: AudiobookPlayerMode;
	set_mode: (mode: AudiobookPlayerMode) => void;
	tint: string;
	// When provided (overlay/sliding-panel mode), the down chevron collapses the
	// panel to the mini-bar instead of popping a navigation route.
	on_collapse?: () => void;
}

export default function AudiobookControls(props: Props) {
	const { player, mode, set_mode, tint, on_collapse } = props;
	const { colors } = usePTheme();
	const router = useRouter();
	const [chapters_open, set_chapters_open] = useState(false);

	const seek_progress = useSharedValue(0);
	const is_seeking = useSharedValue(false);
	const ratio = player.chapter_duration > 0 ? player.position / player.chapter_duration : 0;
	if (!is_seeking.value) seek_progress.value = Math.max(0, Math.min(1, ratio));

	function commit_seek(r: number) {
		player.seek_to(r * (player.chapter_duration || 0));
	}

	const pan_seek = Gesture.Pan()
		.activeOffsetX([-3, 3])
		.failOffsetY([-20, 20])
		.onStart((e) => {
			is_seeking.value = true;
			seek_progress.value = Math.max(0, Math.min(e.x / seekbar_width, 1));
		})
		.onUpdate((e) => {
			seek_progress.value = Math.max(0, Math.min(e.x / seekbar_width, 1));
		})
		.onEnd(() => {
			runOnJS(commit_seek)(seek_progress.value);
			is_seeking.value = false;
		})
		.onFinalize(() => {
			is_seeking.value = false;
		});

	const tap_seek = Gesture.Tap()
		.maxDuration(250)
		.onEnd((e) => {
			const r = Math.max(0, Math.min(e.x / seekbar_width, 1));
			seek_progress.value = r;
			runOnJS(commit_seek)(r);
		});

	const seek_gesture = Gesture.Race(pan_seek, tap_seek);
	const fill_style = useAnimatedStyle(() => ({ width: seek_progress.value * seekbar_width }));
	const thumb_style = useAnimatedStyle(() => ({ left: seek_progress.value * seekbar_width - 6 }));

	function cycle_speed() {
		const idx = SPEEDS.indexOf(player.rate);
		const next = SPEEDS[(idx + 1) % SPEEDS.length] ?? 1;
		player.set_rate(next);
	}

	return (
		<View style={styles.root} pointerEvents="box-none">
			{/* TOP BAR */}
			<View style={styles.top_bar} pointerEvents="box-none">
				<TouchableOpacity hitSlop={12} onPress={() => (on_collapse ? on_collapse() : router.back())} style={styles.icon_circle}>
					<Ionicons name="chevron-down" size={22} color="#ffffff" />
				</TouchableOpacity>
				<View style={styles.mode_switch}>
					{[1, 2, 3].map((m) => (
						<TouchableOpacity key={m} onPress={() => set_mode(m as AudiobookPlayerMode)} style={[styles.mode_pill, mode === m && { backgroundColor: tint }]}>
							<Text style={[styles.mode_pill_text, { color: mode === m ? "#ffffff" : "#ffffffaa" }]}>{m}</Text>
						</TouchableOpacity>
					))}
				</View>
				<TouchableOpacity hitSlop={12} onPress={cycle_speed} style={styles.icon_circle}>
					<Text style={styles.speed_text}>{player.rate}x</Text>
				</TouchableOpacity>
			</View>

			{/* BOTTOM CONTROLS */}
			<View style={styles.bottom} pointerEvents="box-none">
				<Text style={styles.book_title} numberOfLines={1}>
					{player.meta?.title || "Audiobook"}
				</Text>
				<View style={styles.chapter_row}>
					<Text style={styles.chapter_text} numberOfLines={1}>
						{player.chapter_title || `Chapter ${player.chapter_index + 1}`}
					</Text>
					<TouchableOpacity onPress={() => set_chapters_open(true)} hitSlop={10}>
						<Ionicons name="list" size={20} color="#ffffffcc" />
					</TouchableOpacity>
				</View>

				<GestureDetector gesture={seek_gesture}>
					<View style={styles.seek_hit}>
						<View style={styles.seek_track}>
							<Animated.View style={[styles.seek_fill, { backgroundColor: tint }, fill_style]} />
						</View>
						<Animated.View style={[styles.seek_thumb, { backgroundColor: tint }, thumb_style]} />
					</View>
				</GestureDetector>
				<View style={styles.time_row}>
					<Text style={styles.time_text}>{mmss(player.position)}</Text>
					<Text style={styles.time_text}>-{mmss(Math.max(0, player.chapter_duration - player.position))}</Text>
				</View>

				<View style={styles.controls_row}>
					<TouchableOpacity onPress={() => player.seek_by(-15)} hitSlop={8}>
						<MaterialCommunityIcons name="rewind-15" size={32} color="#ffffff" />
					</TouchableOpacity>
					<TouchableOpacity onPress={player.previous} hitSlop={8}>
						<Ionicons name="play-skip-back" size={28} color="#ffffff" />
					</TouchableOpacity>
					<TouchableOpacity onPress={player.toggle} hitSlop={8}>
						<Ionicons name={player.is_playing ? "pause" : "play"} size={72} color="#ffffff" />
					</TouchableOpacity>
					<TouchableOpacity onPress={player.next} hitSlop={8}>
						<Ionicons name="play-skip-forward" size={28} color="#ffffff" />
					</TouchableOpacity>
					<TouchableOpacity onPress={() => player.seek_by(15)} hitSlop={8}>
						<MaterialCommunityIcons name="fast-forward-15" size={32} color="#ffffff" />
					</TouchableOpacity>
				</View>
			</View>

			<ChaptersModal
				visible={chapters_open}
				player={player}
				tint={tint}
				background={colors.background}
				on_close={() => set_chapters_open(false)}
				on_select={(i) => {
					player.skip_to_chapter(i);
					set_chapters_open(false);
				}}
			/>
		</View>
	);
}

function ChaptersModal(props: { visible: boolean; player: UseAudiobookPlayer; tint: string; background: string; on_close: () => void; on_select: (i: number) => void }) {
	const { player } = props;
	const audio_chapter_indices = new Set(player.chapter_tracks.map((ct) => ct.index));
	return (
		<Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.on_close}>
			<View style={styles.modal_backdrop}>
				<View style={[styles.modal_sheet, { backgroundColor: props.background }]}>
					<View style={styles.modal_header}>
						<Text style={styles.modal_title}>Chapters</Text>
						<TouchableOpacity onPress={props.on_close} hitSlop={12}>
							<Ionicons name="close" size={24} color="#ffffff" />
						</TouchableOpacity>
					</View>
					<ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
						{(player.roz?.chapters ?? []).map((cc, i) => {
							const has_audio = audio_chapter_indices.has(i);
							const is_current = i === player.chapter_index;
							return (
								<TouchableOpacity key={cc.chapter.uuid ?? i} disabled={!has_audio} onPress={() => props.on_select(i)} style={[styles.modal_row, is_current && { backgroundColor: props.tint + "22" }]}>
									<Text style={[styles.modal_row_index, { color: has_audio ? props.tint : "#ffffff44" }]}>{i + 1}</Text>
									<Text style={[styles.modal_row_title, { color: has_audio ? "#ffffff" : "#ffffff55" }]} numberOfLines={1}>
										{cc.chapter.title || `Chapter ${i + 1}`}
									</Text>
									{is_current ? <Ionicons name="volume-medium" size={16} color={props.tint} /> : !has_audio ? <Ionicons name="lock-closed" size={13} color="#ffffff44" /> : null}
								</TouchableOpacity>
							);
						})}
					</ScrollView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	root: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },
	top_bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 54, paddingHorizontal: 18 },
	icon_circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#00000055", justifyContent: "center", alignItems: "center" },
	speed_text: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
	mode_switch: { flexDirection: "row", gap: 6, backgroundColor: "#00000055", borderRadius: 16, padding: 4 },
	mode_pill: { width: 28, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
	mode_pill_text: { fontSize: 12, fontWeight: "700" },
	bottom: { paddingHorizontal: 35, paddingBottom: 46 },
	book_title: { color: "#ffffffaa", fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 2 },
	chapter_row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 },
	chapter_text: { color: "#ffffff", fontSize: 17, fontWeight: "700", textAlign: "center", maxWidth: "80%" },
	seek_hit: { height: 30, justifyContent: "center" },
	seek_track: { height: 4, backgroundColor: "#ffffff44", borderRadius: 2 },
	seek_fill: { height: "100%", borderRadius: 2 },
	seek_thumb: { position: "absolute", top: 9, width: 12, height: 12, borderRadius: 6 },
	time_row: { flexDirection: "row", justifyContent: "space-between", marginTop: 2, marginBottom: 8 },
	time_text: { color: "#ffffffaa", fontSize: 12 },
	controls_row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
	modal_backdrop: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
	modal_sheet: { maxHeight: "70%", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingTop: 14 },
	modal_header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingBottom: 12 },
	modal_title: { color: "#ffffff", fontSize: 18, fontWeight: "700" },
	modal_row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 13 },
	modal_row_index: { fontSize: 13, fontWeight: "700", width: 26 },
	modal_row_title: { flex: 1, fontSize: 14 }
});
