import ModalHeader from "@components/ModalHeader";
import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import { GLOBALS } from "@illusive/globals";
import { artist_string } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { LoadingState } from "@illusive/types";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function PlayerEditLyrics() {
	const { lyrics_uri } = useLocalSearchParams<{ lyrics_uri: string }>();

	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const track_ref = useRef(GLOBALS.global_var.sql_tracks.find((t) => t.lyrics_uri === lyrics_uri) ?? null);
	const track = track_ref.current;

	const { track_colors } = useTrackColors(track ?? undefined);

	const [lyrics, set_lyrics] = useState<string>("");
	const [save_state, set_save_state] = useState<LoadingState>("NONE");
	const lyrics_ref = useRef<string>("");

	useEffect(() => {
		if (!track) {
			GLOBALS.global_var.bottom_alert?.("Track not found", "WARN");
			router.back();
			return;
		}
		SQLTracks.read_track_lyrics(track).then((content) => {
			if (typeof content === "string") {
				set_lyrics(content);
				lyrics_ref.current = content;
			}
		});
	}, []);

	async function handle_save() {
		if (!track) return;
		set_save_state("LOADING");
		try {
			await SQLTracks.save_track_lyrics(track, { plain: lyrics_ref.current, synced: undefined });
			set_save_state("COMPLETE");
			setTimeout(() => set_save_state("NONE"), 2000);
		} catch {
			set_save_state("NONE");
			GLOBALS.global_var.bottom_alert?.("Failed to save lyrics", "WARN");
		}
	}

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<ModalHeader title="Edit Lyrics" background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background} />
			{track_colors ? <LinearGradient colors={[track_colors.primary, track_colors.background, "transparent"]} style={{ position: "absolute", top: 0, height: Dimensions.get("screen").height * 0.4, width: "100%", zIndex: -1 }} /> : null}
			<ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" scrollToOverflowEnabled={false} contentContainerStyle={{ paddingBottom: 20 }}>
				{/* Track identity */}
				<View style={{ marginHorizontal: 16, marginTop: 16 }}>
					<Text style={{ color: colors.text, fontWeight: "bold", fontSize: 20 }} numberOfLines={1}>
						{track?.title ?? ""}
					</Text>
					{track ? <Text style={{ color: colors.searchPlaceholder, fontSize: 14, marginTop: 2 }}>{artist_string(track)}</Text> : null}
				</View>

				{/* Editor card */}
				<View style={styles.section_card}>
					<Text style={styles.section_label}>Lyrics</Text>
					<View style={styles.field_divider} />
					<TextInput
						value={lyrics}
						onChangeText={(text) => {
							lyrics_ref.current = text;
							set_lyrics(text);
						}}
						multiline
						scrollEnabled={false}
						textAlignVertical="top"
						placeholder="Enter lyrics here..."
						placeholderTextColor={colors.searchPlaceholder}
						autoCorrect={false}
						autoCapitalize="sentences"
						keyboardAppearance="dark"
						style={{
							color: colors.text,
							fontSize: 16,
							lineHeight: 24,
							fontWeight: "500",
							paddingTop: 12,
							minHeight: 300
						}}
					/>
				</View>

				{/* Save button */}
				<TouchableOpacity
					style={{ width: "88%", alignSelf: "center", height: 55, backgroundColor: colors.primary, borderRadius: 50, alignItems: "center", justifyContent: "center", marginTop: 24 }}
					onPress={handle_save}
					disabled={save_state === "LOADING"}>
					{save_state === "LOADING" ? (
						<ActivityIndicator size={28} color="#fff" />
					) : save_state === "COMPLETE" ? (
						<Ionicons name="checkmark" size={28} color="#fff" />
					) : (
						<Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>Save Lyrics</Text>
					)}
				</TouchableOpacity>

				<View style={{ height: 80 }} />
			</ScrollView>
		</View>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		section_card: {
			marginHorizontal: 16,
			marginTop: 16,
			backgroundColor: "#ffffff06",
			borderRadius: 16,
			borderWidth: 0.5,
			borderColor: "#ffffff0f",
			padding: 16
		},
		section_label: {
			color: colors.text,
			fontWeight: "800",
			fontSize: 16,
			letterSpacing: 0.2
		},
		field_divider: {
			height: 0.5,
			backgroundColor: colors.text + "30",
			marginTop: 8
		}
	});
