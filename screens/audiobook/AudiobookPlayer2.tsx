import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import type { UseAudiobookPlayer } from "./useAudiobookPlayer";

// Player2: background is the timed image from the dynamic-video timeline (cover,
// then in-book images as they come up), with the currently-narrated paragraph
// shown as a subtitle.
export default function AudiobookPlayer2(props: { player: UseAudiobookPlayer }) {
	const { player } = props;
	const image = player.current_image;
	const uri = image ? image.image : player.meta?.cover && player.meta.cover.length > 0 ? player.meta.cover : undefined;
	const subtitle = player.current_content?.content.content ?? "";
	const subtitle_key = player.current_content?.content.uuid ?? "none";

	return (
		<View style={StyleSheet.absoluteFill}>
			{uri ? (
				<Animated.Image key={uri} source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" entering={FadeIn.duration(450)} />
			) : (
				<View style={[StyleSheet.absoluteFill, { backgroundColor: "#101013" }]} />
			)}
			<View style={[StyleSheet.absoluteFill, { backgroundColor: "#00000040" }]} />
			<LinearGradient colors={["rgba(0,0,0,0.55)", "transparent", "rgba(0,0,0,0.88)"]} locations={[0, 0.38, 1]} style={StyleSheet.absoluteFill} />
			<View style={styles.subtitle_wrap} pointerEvents="none">
				{subtitle.length > 0 ? (
					<Animated.Text key={subtitle_key} entering={FadeIn.duration(260)} style={styles.subtitle} numberOfLines={6}>
						{subtitle}
					</Animated.Text>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	subtitle_wrap: { position: "absolute", left: 0, right: 0, bottom: 250, paddingHorizontal: 28, alignItems: "center" },
	subtitle: {
		color: "#ffffff",
		fontSize: 19,
		lineHeight: 27,
		fontWeight: "600",
		textAlign: "center",
		textShadowColor: "#000000",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 6,
	},
});
