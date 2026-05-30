import { is_empty } from "@common/utils/util";
import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import { artist_string } from "@illusive/illusive_utils";
import type { Track } from "@illusive/types";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import IImage from "@components/IImage";

interface NowPlayingContentProps {
	track: Track | undefined;
	width: number;
	height: number;
}

export default function NowPlayingContent({ track, width, height }: NowPlayingContentProps) {
	const { colors } = usePTheme();
	const { track_colors } = useTrackColors(track);

	const artwork_size = useMemo(() => Math.min(height * 0.5, width * 0.42), [width, height]);
	const album_name = track?.album?.name ?? "";

	if (!track) return null;

	return (
		<View style={{ alignItems: "center", width: artwork_size + 80 }}>
			<IImage
				source={track.playback?.artwork}
				style={[styles.artwork, { width: artwork_size, height: artwork_size, borderColor: colors.line, shadowColor: track_colors?.detail ?? "#000" }]}
			/>
			<Text numberOfLines={2} style={[styles.title, { color: colors.text, fontSize: artwork_size * 0.085 }]}>
				{track.title}
			</Text>
			<Text numberOfLines={1} style={[styles.artist, { color: colors.subtext, fontSize: artwork_size * 0.06 }]}>
				{artist_string(track)}
			</Text>
			{!is_empty(album_name) ? (
				<Text numberOfLines={1} style={[styles.album, { color: colors.deeptext, fontSize: artwork_size * 0.052 }]}>
					{album_name}
				</Text>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	artwork: {
		borderRadius: 10,
		resizeMode: "cover",
		borderWidth: 1,
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.55,
		shadowRadius: 28
	},
	title: { fontWeight: "bold", textAlign: "center", marginTop: 28 },
	artist: { fontWeight: "600", textAlign: "center", marginTop: 10 },
	album: { textAlign: "center", marginTop: 6 }
});
