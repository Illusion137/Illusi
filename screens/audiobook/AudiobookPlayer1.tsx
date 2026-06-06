import { Dimensions, Image, Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import type { UseAudiobookPlayer } from "./useAudiobookPlayer";

const screen_w = Dimensions.get("screen").width;
const cover_w = Math.min(screen_w - 110, 300);

// Player1: the cover art fills the screen (blurred) with a crisp centered cover.
export default function AudiobookPlayer1(props: { player: UseAudiobookPlayer }) {
	const cover = props.player.meta?.cover;
	const source = cover && cover.length > 0 ? { uri: cover } : undefined;
	return (
		<View style={StyleSheet.absoluteFill}>
			{source ? (
				<Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={Platform.OS === "android" ? 28 : 0} />
			) : (
				<View style={[StyleSheet.absoluteFill, { backgroundColor: "#15161a" }]} />
			)}
			<BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
			<View style={[StyleSheet.absoluteFill, { backgroundColor: "#00000055" }]} />
			<View style={styles.center}>
				{source ? (
					<Image source={source} style={styles.cover} resizeMode="cover" />
				) : (
					<View style={[styles.cover, styles.placeholder]}>
						<Ionicons name="book" size={72} color="#ffffff44" />
					</View>
				)}
			</View>
			<LinearGradient colors={["rgba(0,0,0,0.45)", "transparent"]} style={styles.top_fade} />
			<LinearGradient colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.94)"]} locations={[0, 0.5, 1]} style={styles.bottom_fade} />
		</View>
	);
}

const styles = StyleSheet.create({
	center: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", paddingBottom: 120 },
	cover: { width: cover_w, height: cover_w * 1.45, borderRadius: 10, backgroundColor: "#222" },
	placeholder: { justifyContent: "center", alignItems: "center" },
	top_fade: { position: "absolute", top: 0, left: 0, right: 0, height: 140 },
	bottom_fade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 360 },
});
