import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { artist_string, duration_to_string } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import type { Track } from "@illusive/types";
import { Constants } from "@illusive/constants";
import { is_empty, large_number_string, round_decimal_place } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import { GLOBALS } from "@illusive/globals";
import { reinterpret_cast } from "../lib-origin/common/cast";
import IImage from "./IImage";
import TrackIconTags from "./TrackIconTags";

export const SMALL_WIDTH_PERCENT = "60%";
export const BASE_WIDTH_PERCENT = "65%";
export const BASE_WIDTH_FN = (value: unknown | undefined) => (value !== undefined ? SMALL_WIDTH_PERCENT : BASE_WIDTH_PERCENT);
export default function TrackComponentBase(props: {
	track_data: Track;
	is_downloading?: boolean;
	downloading_progress?: number;
	style?: StyleProp<ViewStyle>;
	active_opacity?: number;
	disabled?: boolean;
	on_press: (() => any) | undefined;
	on_long_press: () => any;
	children?: React.ReactNode;
	width_fn?: () => DimensionValue | undefined;
	replace_album_with?: keyof Track;
	base_background?: boolean;
	score?: number;
}) {
	const shimmer_position = useSharedValue(0);
	useEffect(() => {
		if (props.downloading_progress !== undefined) {
			shimmer_position.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
			return () => cancelAnimation(shimmer_position);
		}
	}, [props.downloading_progress !== undefined]);
	const shimmer_style = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(shimmer_position.value, [0, 1], [-200, 600]) }] }));

	const tint = GLOBALS.global_var.tint_table.get(props.track_data.uid);
	const bottom_line = props.replace_album_with
		? reinterpret_cast<string | number>(props.track_data.imported_id && props.replace_album_with === "plays" ? props.track_data.meta?.plays : props.track_data[props.replace_album_with])
		: (props.track_data.album?.name ?? "");
	const bottom_line_text = typeof bottom_line === "number" && String(bottom_line).length > 3 ? large_number_string(bottom_line) : bottom_line;

	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	return (
		<TouchableOpacity
			activeOpacity={props.active_opacity}
			disabled={props.disabled}
			onLongPress={props.on_long_press}
			delayLongPress={Constants.long_press_delay}
			style={{ ...reinterpret_cast<any>(props.style), backgroundColor: props.base_background ? colors.background : colors.track }}
			onPress={props.on_press}>
			<View style={styles.track_box}>
				{props.downloading_progress !== undefined && (
					<View style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${Math.round(props.downloading_progress * 100)}%`, overflow: "hidden" }}>
						<View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary + "22" }]} />
						<Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 200 }, shimmer_style]}>
							<LinearGradient colors={["transparent", colors.primary + "33", colors.primary + "99", colors.primary + "33", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
						</Animated.View>
					</View>
				)}
				<View style={styles.centered}>
					<IImage source={props.track_data.playback?.artwork} style={styles.image} tint={is_empty(tint) ? undefined : { color: tint!, opacity: Constants.tint_opacity }} />
					{!isNaN(props.track_data.duration) && !is_empty(props.track_data.duration) ? (
						<View style={{ position: "absolute", right: duration_to_string(props.track_data.duration).length * -1.5, bottom: 8, borderRadius: 4, backgroundColor: "#000000a0", padding: 1 }}>
							<Text style={{ color: "white", fontSize: 10 }}>{duration_to_string(props.track_data.duration)}</Text>
						</View>
					) : null}
				</View>
				<View style={{ width: props.width_fn ? (props.width_fn() !== undefined ? props.width_fn() : BASE_WIDTH_PERCENT) : BASE_WIDTH_PERCENT, left: 15, justifyContent: "center" }}>
					<Text style={styles.title} numberOfLines={1}>
						{props.track_data.title}
					</Text>
					<Text style={styles.artist} numberOfLines={1}>
						{artist_string(props.track_data)}
					</Text>
					<View style={{ flexDirection: "row" }}>
						{bottom_line_text ? (
							<Text style={styles.album} numberOfLines={1}>
								{bottom_line_text}
							</Text>
						) : null}
						<TrackIconTags track_data={props.track_data} is_downloading={props.is_downloading ?? false} size={15} />
					</View>
				</View>
				{props.children}
				{props.score !== undefined ? <Text style={{ position: "absolute", color: colors.text, alignSelf: "center", left: "80%" }}>{round_decimal_place(props.score, 2)}</Text> : null}
			</View>
			<View style={styles.line} />
		</TouchableOpacity>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		track_box: { width: "100%", height: 60, flexDirection: "row" },
		image: { left: 7, height: 52, width: 52, borderRadius: 2, resizeMode: "cover", borderWidth: 1, borderColor: colors.line },
		text: { width: "65%", top: 5, left: 10 },
		title: { color: colors.title, fontSize: 13, fontWeight: "bold" },
		artist: { color: colors.subtext, fontSize: 13 },
		album: { color: colors.deeptext, fontSize: 12, top: 1, marginRight: 5 },
		line: { height: 1, backgroundColor: colors.line, width: "90%", left: 85 },
		icon_thin: { marginRight: 5 },
		icon_thick: { marginRight: 3 },
		else_icon: { right: 10, paddingTop: 10, paddingBottom: 10, paddingLeft: 30, paddingRight: 30 },
		centered: { justifyContent: "center" }
	});
