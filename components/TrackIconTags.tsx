import { is_empty } from "@common/utils/util";
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import type { Prefs } from "@illusive/prefs";
import type { Track } from "@illusive/types";
import { service_icon_map } from "@utils/service_icon_map";
import { StyleSheet } from "react-native";

export interface TrackIconTagsProps {
	track_data: Track;
	is_downloading: boolean;
	size: number;
	darken?: boolean;
}
export default function TrackIconTags(props: TrackIconTagsProps) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const glow_style = props.darken ? styles.darken : {};

	return (
		<>
			{(props.track_data.explicit ?? "NONE") === "EXPLICIT" ? <MaterialIcons name="explicit" size={props.size} color={colors.primary} style={[styles.icon_thin, glow_style]} /> : null}
			{(props.track_data.explicit ?? "NONE") === "CLEAN" ? <MaterialIcons name="clean-hands" size={props.size} color={colors.primary} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.media_uri) ? <FontAwesome5 name="file-audio" solid size={props.size} color={colors.primary} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.thumbnail_uri) ? <Ionicons name="image" size={props.size} color={colors.primary} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.lyrics_uri) ? <MaterialIcons name="closed-caption" size={props.size} color={colors.primary} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.synced_lyrics_uri) ? <MaterialIcons name="lyrics" size={props.size} color={colors.primary} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.imported_id) ? <Ionicons name="cloud-upload" size={props.size} color={colors.primary} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.youtube_id) ? <Ionicons name="logo-youtube" size={props.size} color={service_icon_map.YouTube.color} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.soundcloud_id) ? <MaterialCommunityIcons name="soundcloud" size={props.size} color={service_icon_map.SoundCloud.color} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.spotify_id) ? <MaterialCommunityIcons name="spotify" size={props.size} color={service_icon_map.Spotify.color} style={[styles.icon_thick, glow_style]} /> : null}
			{!is_empty(props.track_data.applemusic_id) ? <MaterialCommunityIcons name="apple" size={props.size} color={service_icon_map["Apple Music"].color} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.amazonmusic_id) ? <Ionicons name="logo-amazon" size={props.size} color={service_icon_map["Amazon Music"].color} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.bandlab_id) ? <Ionicons name="musical-note" size={props.size} color={service_icon_map.BandLab.color} style={[styles.icon_thin, glow_style]} /> : null}
			{props.is_downloading ? <MaterialIcons name="downloading" size={props.size} color={colors.secondary} style={[styles.icon_thin, glow_style]} /> : null}
			{!is_empty(props.track_data.meta?.begdur) || !is_empty(props.track_data.meta?.enddur) ? <Ionicons name="cut" size={props.size} color={colors.secondary} style={[styles.icon_thin, glow_style]} /> : null}
			{(props.track_data?.meta?.unavailable ?? false) ? <MaterialCommunityIcons name="file-hidden" size={props.size} color={colors.secondary} style={[styles.icon_thin, glow_style]} /> : null}
		</>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		track_box: { width: "100%", height: 60, flexDirection: "row" },
		image: { left: 10, height: 48, width: 52, borderRadius: 2, resizeMode: "cover" },
		text: { width: "65%", top: 5, left: 20 },
		title: { color: colors.title, fontSize: 15 },
		artist: { color: colors.subtext, fontSize: 14 },
		album: { color: colors.deeptext, fontSize: 12, top: 1, marginRight: 4 },
		line: { height: 1, backgroundColor: colors.line, width: "90%", left: 85 },
		icon_thin: { marginRight: 5, alignSelf: "center" },
		icon_thick: { marginRight: 3, alignSelf: "center" },
		else_icon: { right: 10, paddingTop: 10, paddingBottom: 10, paddingLeft: 30, paddingRight: 30 },
		centered: { justifyContent: "center" },
		darken: { textShadowColor: "#000000", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 }
	});
