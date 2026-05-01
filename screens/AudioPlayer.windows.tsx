/**
 * Windows Desktop AudioPlayer - Persistent Bottom Bar
 * Replaces the mobile slide-up panel with a fixed bottom bar
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import TrackPlayer, { State } from "react-native-track-player";
import type * as IllusiveType from "@illusive/types";
import { artist_string } from "@illusive/illusive_utils";
import usePTheme from "@hooks/usePTheme";
import IImage from "@components/IImage";
import { remove_topic } from "@common/utils/clean_util";
import useDimensions from "@hooks/useDimensions";

export default function AudioPlayer(props: { tracks: IllusiveType.Track[]; playing_from: string }) {
	const { colors } = usePTheme();
	const { width } = useDimensions();
	const styles = theme_styles(colors);

	const [is_expanded, set_is_expanded] = useState(false);

	const track = props.tracks[0];
	const track_title = track?.title ?? "No Track";
	const track_artist = artist_string(track) ?? "Unknown Artist";
	const artwork = track?.playback?.artwork;

	const handlePlayPause = async () => {
		try {
			const { state } = await TrackPlayer.getPlaybackState();
			if (state === State.Playing) {
				await TrackPlayer.pause();
			} else {
				await TrackPlayer.play();
			}
		} catch (e) {
			console.error("Error toggling playback:", e);
		}
	};

	const handleNext = async () => {
		try {
			await TrackPlayer.skipToNext();
		} catch (e) {
			console.error("Error skipping:", e);
		}
	};

	const handlePrevious = async () => {
		try {
			await TrackPlayer.skipToPrevious();
		} catch (e) {
			console.error("Error skipping:", e);
		}
	};

	if (is_expanded) {
		// Expanded player view
		return (
			<View style={[styles.expandedContainer, { width }]}>
				<TouchableOpacity style={styles.collapseButton} onPress={() => set_is_expanded(false)}>
					<MaterialIcons name="expand-more" size={24} color={colors.primary} />
				</TouchableOpacity>

				<View style={styles.expandedContent}>
					{artwork && <IImage source={artwork} style={styles.expandedArtwork} />}

					<Text style={styles.expandedTitle}>{remove_topic(track_title)}</Text>
					<Text style={styles.expandedArtist}>{remove_topic(track_artist)}</Text>

					<View style={styles.expandedControls}>
						<TouchableOpacity onPress={handlePrevious}>
							<MaterialCommunityIcons name="skip-previous" size={32} color={colors.primary} />
						</TouchableOpacity>
						<TouchableOpacity onPress={handlePlayPause}>
							<MaterialCommunityIcons name="play" size={48} color={colors.primary} />
						</TouchableOpacity>
						<TouchableOpacity onPress={handleNext}>
							<MaterialCommunityIcons name="skip-next" size={32} color={colors.primary} />
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	}

	// Collapsed bottom bar
	return (
		<TouchableOpacity style={[styles.container, { width }]} onPress={() => set_is_expanded(true)} activeOpacity={0.8}>
			{artwork && <IImage source={artwork} style={styles.artwork} />}

			<View style={styles.trackInfo}>
				<Text style={styles.title} numberOfLines={1}>
					{remove_topic(track_title)}
				</Text>
				<Text style={styles.artist} numberOfLines={1}>
					{remove_topic(track_artist)}
				</Text>
			</View>

			<View style={styles.controls}>
				<TouchableOpacity onPress={handlePrevious} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
					<MaterialCommunityIcons name="skip-previous" size={20} color={colors.primary} />
				</TouchableOpacity>

				<TouchableOpacity onPress={handlePlayPause} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
					<MaterialCommunityIcons name="play" size={24} color={colors.primary} />
				</TouchableOpacity>

				<TouchableOpacity onPress={handleNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
					<MaterialCommunityIcons name="skip-next" size={20} color={colors.primary} />
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	);
}

const theme_styles = (colors: any) =>
	StyleSheet.create({
		container: { height: 80, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 12 },
		artwork: { width: 48, height: 48, borderRadius: 4, backgroundColor: colors.deeptext },
		trackInfo: { flex: 1, justifyContent: "center", minWidth: 0 },
		title: { color: colors.text, fontSize: 14, fontWeight: "600" },
		artist: { color: colors.subtext, fontSize: 12, marginTop: 4 },
		controls: { flexDirection: "row", gap: 16, alignItems: "center" },
		expandedContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, zIndex: 1000, justifyContent: "center", alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 },
		collapseButton: { position: "absolute", top: 20, right: 20, padding: 8 },
		expandedContent: { justifyContent: "center", alignItems: "center", gap: 24 },
		expandedArtwork: { width: 300, height: 300, borderRadius: 8 },
		expandedTitle: { color: colors.text, fontSize: 24, fontWeight: "700", textAlign: "center" },
		expandedArtist: { color: colors.subtext, fontSize: 18, textAlign: "center" },
		expandedControls: { flexDirection: "row", gap: 32, marginTop: 20 }
	});
