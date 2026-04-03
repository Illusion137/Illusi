import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { CompactPlaylist } from "@illusive/types";
import type { Prefs } from "@illusive/prefs";
import { empty_join_dot, is_empty, single_case } from "@common/utils/util";
import { MaterialIcons } from "@expo/vector-icons";
import { get_album_artwork } from "@illusive/illusive_utils";
import usePTheme from "@hooks/usePTheme";
import IImage from "./IImage";
import { remove_topic } from "@common/utils/clean_util";
import { SharedRouter } from "@utils/shared_routes";

export default function CompactPlaylistComponent(props: { playlist_data: CompactPlaylist; base_background?: boolean }) {
	const thumbnail_uri = get_album_artwork(props.playlist_data);

	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	async function navigate() {
		if (is_empty(props.playlist_data.title.uri)) return;
		SharedRouter.goto_shared_playlist(props.playlist_data.title.uri ?? "", "URI", { compact_playlist: props.playlist_data });
	}

	return (
		<>
			<TouchableOpacity style={[styles.button, { backgroundColor: props.base_background ? colors.background : colors.track }]} onPress={navigate}>
				<>
					<View style={{ width: 10 }} />
					<IImage source={thumbnail_uri} style={styles.image} />
					<View style={{ flexDirection: "column", left: 15 }}>
						<Text style={{ color: colors.text, fontSize: 15, fontWeight: "500" }}>{props.playlist_data.title.name}</Text>
						<View style={{ flexDirection: "row", top: 5 }}>
							{(props.playlist_data.explicit ?? "NONE") === "EXPLICIT" ? <MaterialIcons name="explicit" size={15} color={colors.secondary} style={styles.icon_thin} /> : null}
							<Text style={{ color: colors.subtext }}>
								{empty_join_dot([
									props.playlist_data.artist.map((artist) => remove_topic(artist.name)).join(", "),
									props.playlist_data?.date ? new Date(props.playlist_data?.date).getFullYear() : undefined,
									props.playlist_data.album_type ? single_case(props.playlist_data.album_type) : undefined
								])}
							</Text>
						</View>
					</View>
				</>
			</TouchableOpacity>
			<View style={{ width: "100%", height: 1, marginLeft: 90, backgroundColor: "#303030" }} />
		</>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		button: {
			width: "100%",
			height: 60,
			alignItems: "center",
			backgroundColor: colors.track,
			flexDirection: "row"
		},
		icon_thin: {
			marginRight: 5
		},
		notfound: {
			width: 70,
			height: 70,
			borderRadius: 5,
			left: 15
		},
		image: {
			left: 5,
			height: 52,
			width: 52,
			borderRadius: 5
		}
	});
