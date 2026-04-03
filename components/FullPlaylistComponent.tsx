import { useState } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import type { FullPlaylist } from "@illusive/types";
import type { Track } from "@illusive/types";
import { Constants } from "@illusive/constants";
import usePTheme from "@hooks/usePTheme";
import { remove_topic } from "@common/utils/clean_util";
import { SharedRouter } from "@utils/shared_routes";
import IImage from "./IImage";
import type { Prefs } from "@illusive/prefs";

function get_playlist_artwork(playlist: FullPlaylist) {
	if (playlist.artwork_url) return playlist.artwork_url;
	if (playlist.artwork_index) return playlist.artwork_index;
	const best = [...(playlist.artwork_thumbnails ?? [])]?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))?.[0];
	return best?.url ?? 0;
}

export type SecondLineType = "YEAR" | "ARTIST";

export default function FullPlaylistComponent(props: { playlist_data: FullPlaylist; second_line_type?: SecondLineType; size?: number; other_tracks?: Track[] }) {
	const size = props.size ?? Dimensions.get("screen").width * 0.4;
	const { colors } = usePTheme();
	const [loading, set_loading] = useState(false);

	async function on_press() {
		if (loading) return;
		set_loading(true);
		try {
			const tracks = await props.playlist_data.tracks_callback();
			SharedRouter.goto_shared_track_list(props.playlist_data.title, tracks);
		} finally {
			set_loading(false);
		}
	}

	const year = new Date(props.playlist_data.date ?? 0).getFullYear();
	const artist_name = remove_topic(props.playlist_data.artist?.[0]?.name ?? "");
	const second_line = props.playlist_data.description ?? ((props.second_line_type ?? "YEAR") === "YEAR" ? (year > 1970 ? String(year) : artist_name) : artist_name ?? (year > 1970 ? String(year) : undefined));

	const artwork = get_playlist_artwork(props.playlist_data);
	const styles = make_styles(colors, size);

	return (
		<TouchableOpacity style={styles.container} onPress={on_press} delayLongPress={Constants.long_press_delay} activeOpacity={0.8}>
			<View>
				<IImage source={artwork} style={styles.artwork} />

				{props.playlist_data.explicit === "EXPLICIT" && (
					<View style={styles.explicit_badge}>
						<MaterialIcons name="explicit" size={13} color="#fff" />
					</View>
				)}

				<View style={styles.playlist_badge}>
					<Ionicons name="list" size={11} color="rgba(255,255,255,0.9)" />
				</View>

				{loading && (
					<View style={styles.loading_overlay}>
						<ActivityIndicator size="small" color="#fff" />
					</View>
				)}
			</View>

			<View style={styles.text_container}>
				<Text style={styles.title} numberOfLines={1}>
					{props.playlist_data.title}
				</Text>
				{!!second_line && (
					<Text style={styles.subtitle} numberOfLines={1}>
						{second_line}
					</Text>
				)}
			</View>
		</TouchableOpacity>
	);
}

const make_styles = (colors: Prefs.Theme["colors"], size: number) =>
	StyleSheet.create({
		container: {
			padding: 5
		},
		artwork: {
			width: size,
			height: size,
			borderRadius: 10
		},
		explicit_badge: {
			position: "absolute",
			bottom: 6,
			left: 6,
			backgroundColor: "rgba(0,0,0,0.6)",
			borderRadius: 4,
			paddingHorizontal: 4,
			paddingVertical: 2
		},
		playlist_badge: {
			position: "absolute",
			bottom: 6,
			right: 6,
			backgroundColor: "rgba(0,0,0,0.5)",
			borderRadius: 4,
			paddingHorizontal: 5,
			paddingVertical: 3
		},
		loading_overlay: {
			position: "absolute",
			top: 0,
			left: 0,
			width: size,
			height: size,
			borderRadius: 10,
			backgroundColor: "rgba(0,0,0,0.4)",
			alignItems: "center",
			justifyContent: "center"
		},
		text_container: {
			width: size,
			paddingTop: 6,
			gap: 2
		},
		title: {
			color: colors.text,
			fontWeight: "600",
			fontSize: 14
		},
		subtitle: {
			color: colors.subtext,
			fontSize: 13
		}
	});
