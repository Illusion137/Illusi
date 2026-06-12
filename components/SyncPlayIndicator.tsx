import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { router } from "expo-router";
import { P2P, type P2PStatus } from "@illusive/p2p";
import usePTheme from "@hooks/usePTheme";

// Persistent floating chip that surfaces whenever a SyncPlay session is active
// (hosting OR connected as a guest). Stays mounted at the root layout so it
// survives across screen changes; tapping it deep-links into /extras/sync-play.
export default function SyncPlayIndicator() {
	const { colors } = usePTheme();
	const [status, set_status] = useState<P2PStatus>(P2P.get_status());

	useEffect(() => {
		const unsub = P2P.subscribe_status(set_status);
		return unsub;
	}, []);

	const pulse = useSharedValue(1);
	useEffect(() => {
		if (status.connected) {
			pulse.value = withRepeat(
				withSequence(
					withTiming(1.35, { duration: 700 }),
					withTiming(1.0, { duration: 700 })
				),
				-1,
				false
			);
		} else {
			pulse.value = withTiming(1, { duration: 200 });
		}
	}, [status.connected]);

	const dot_style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

	if (!status.connected) return null;

	const is_host = status.role === "host";
	const label = is_host
		? `${status.connected_peer_count} listener${status.connected_peer_count !== 1 ? "s" : ""}`
		: status.guest_can_control ? "Tuned in" : "Listening (locked)";
	// Loading state is shown for both roles; "waiting for guests" is the
	// host-specific label and only really makes sense to a hosting user.
	const sub = status.loading
		? (is_host ? "Waiting for guests…" : "Syncing…")
		: (is_host ? "Hosting" : "Guest");

	return (
		<View pointerEvents="box-none" style={styles.wrapper}>
			<TouchableOpacity
				activeOpacity={0.85}
				onPress={() => router.push("/extras/sync-play")}
				style={[styles.chip, { backgroundColor: colors.shelf + "C0", borderColor: colors.primary + "55" }]}
			>
				<Animated.View style={dot_style}>
					<View style={[styles.dot, { backgroundColor: status.loading ? colors.orange : colors.green }]} />
				</Animated.View>
				<Ionicons name="sync-circle" size={16} color={colors.primary} style={{ marginLeft: 6 }} />
				<View style={{ marginLeft: 6 }}>
					<Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>{label}</Text>
					<Text style={[styles.sub, { color: colors.subtext }]} numberOfLines={1}>{sub}</Text>
				</View>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		position: "absolute",
		top: 52,
		right: 10,
		zIndex: 999,
		// Low-opacity hover-style chip — meant to be unobtrusive
		opacity: 0.78,
	},
	chip: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 18,
		borderWidth: StyleSheet.hairlineWidth,
		maxWidth: 220,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	label: {
		fontSize: 11,
		fontWeight: "700",
	},
	sub: {
		fontSize: 9,
		fontWeight: "500",
		marginTop: 1,
	},
});
