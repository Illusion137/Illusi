import { useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import SlidingUpPanel, { type SlidingUpPanelHandle } from "rn-sliding-up-panel-reanimated";
import usePTheme from "@hooks/usePTheme";
import IImage from "@components/IImage";
import AudiobookControls, { type AudiobookPlayerMode } from "./AudiobookControls";
import AudiobookPlayer1 from "./AudiobookPlayer1";
import AudiobookPlayer2 from "./AudiobookPlayer2";
import AudiobookPlayer3 from "./AudiobookPlayer3";
import useAudiobookPlayer from "./useAudiobookPlayer";

const screen_h = Dimensions.get("screen").height;
const top_padding = screen_h * 0.08;
const mini_bar_height = 56;
const panel_min_height = top_padding + 80 + mini_bar_height;
const panel_max_height = screen_h;

export default function AudiobookSlidingPlayer(props: { uuid: string; on_dismiss: () => void }) {
	const { colors } = usePTheme();
	const player = useAudiobookPlayer(props.uuid);
	const [mode, set_mode] = useState<AudiobookPlayerMode>(1);
	const tint = colors.primary;

	const bottom_sheet_ref = useRef<SlidingUpPanelHandle>(null);
	const panel_animated = useSharedValue(panel_min_height);
	const [panel_state_visible, set_panel_state_visible] = useState(false);
	const opened_ref = useRef(false);

	useAnimatedReaction(
		() => panel_animated.value > panel_min_height + 1,
		(is_visible, was_visible) => {
			if (was_visible !== null && is_visible !== was_visible) {
				// eslint-disable-next-line @typescript-eslint/no-deprecated
				runOnJS(set_panel_state_visible)(is_visible);
			}
		}
	);

	function hide_sheet() {
		bottom_sheet_ref.current?.hide();
	}
	function show_sheet() {
		bottom_sheet_ref.current?.show();
	}

	// Once the book is loaded: auto-expand if it has audio, otherwise dismiss the
	// whole overlay (nothing to play). Dismiss also covers a load error.
	useEffect(() => {
		if (player.loading) return;
		if (player.error !== null || !player.has_audio) {
			props.on_dismiss();
			return;
		}
		if (!opened_ref.current) {
			opened_ref.current = true;
			show_sheet();
		}
	}, [player.loading, player.error, player.has_audio]);

	const content_style = useAnimatedStyle(() => ({ opacity: interpolate(panel_animated.value, [panel_min_height, panel_max_height], [0, 1], Extrapolation.CLAMP) }));
	const mini_style = useAnimatedStyle(() => ({ opacity: interpolate(panel_animated.value, [panel_min_height, panel_min_height + 110], [1, 0], Extrapolation.CLAMP) }));

	const styles = useMemo(() => theme_styles(colors), [colors]);

	return (
		<SlidingUpPanel
			ref={bottom_sheet_ref}
			allowDragging
			showBackdrop
			animatedValue={panel_animated}
			height={panel_max_height}
			friction={1}
			minimumDistanceThreshold={8}
			draggableRange={{ bottom: panel_min_height, top: panel_max_height }}
			snappingPoints={[panel_min_height, panel_max_height]}
			containerStyle={{ left: 0, right: 0, display: "flex", zIndex: 10, top: "100%" }}>
			<>
				{/* FULL-SCREEN PLAYER (fades out as the panel collapses) */}
				<Animated.View pointerEvents={panel_state_visible ? "auto" : "none"} style={[StyleSheet.absoluteFill, content_style]}>
					{mode === 1 ? <AudiobookPlayer1 player={player} /> : mode === 2 ? <AudiobookPlayer2 player={player} /> : <AudiobookPlayer3 player={player} />}
					<AudiobookControls player={player} mode={mode} set_mode={set_mode} tint={tint} on_collapse={hide_sheet} />
				</Animated.View>

				{/* Push the mini-bar down to its resting position when collapsed. */}
				<View style={{ height: top_padding }} pointerEvents="none" />

				{/* MINI BAR (fades out as the panel expands) */}
				<Animated.View pointerEvents={panel_state_visible ? "none" : "auto"} style={[styles.mini_bar, mini_style]}>
					<TouchableOpacity activeOpacity={0.9} style={styles.mini_inner} onPress={show_sheet}>
						<IImage source={player.meta?.cover || null} style={styles.mini_cover} resizeMode="cover" />
						<View style={styles.mini_text}>
							<Text numberOfLines={1} style={styles.mini_title}>
								{player.meta?.title || "Audiobook"}
							</Text>
							<Text numberOfLines={1} style={styles.mini_sub}>
								{player.chapter_title || `Chapter ${player.chapter_index + 1}`}
							</Text>
						</View>
						<TouchableOpacity hitSlop={12} onPress={player.toggle}>
							<Ionicons name={player.is_playing ? "pause-circle-sharp" : "play-circle-sharp"} size={34} color={colors.primary} />
						</TouchableOpacity>
						<TouchableOpacity hitSlop={12} style={{ marginLeft: 14 }} onPress={player.next}>
							<Ionicons name="play-skip-forward" size={24} color={colors.primary} />
						</TouchableOpacity>
					</TouchableOpacity>
				</Animated.View>
			</>
		</SlidingUpPanel>
	);
}

const theme_styles = (colors: ReturnType<typeof usePTheme>["colors"]) =>
	StyleSheet.create({
		mini_bar: { height: mini_bar_height, backgroundColor: colors.playScreen, justifyContent: "center" },
		mini_inner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
		mini_cover: { width: 40, height: 40, borderRadius: 6, backgroundColor: "#222" },
		mini_text: { flex: 1, marginLeft: 12, marginRight: 10 },
		mini_title: { color: colors.text, fontSize: 14, fontWeight: "700" },
		mini_sub: { color: colors.subtext, fontSize: 12, marginTop: 1 }
	});
