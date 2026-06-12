import { Text, View } from "react-native";
import type { FullPlaylist } from "@illusive/types";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import { FlashList } from "@shopify/flash-list";
import FullPlaylistComponent from "./FullPlaylistComponent";
import { useMemo } from "react";

export default function FullPlaylistList(props: { title: string; playlists: FullPlaylist[] }) {
	const { colors } = usePTheme();
	const { width } = useDimensions();
	const list_height = useMemo(() => width * 0.4 + 50, [width]);

	const render_playlist = (item: { item: FullPlaylist }) => <FullPlaylistComponent playlist_data={item.item} />;

	return (
		<View style={{ paddingVertical: 10 }}>
			<View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
				<Text style={{ color: colors.text, fontSize: 25, fontWeight: "bold", left: 15 }}>{props.title}</Text>
			</View>
			<View style={{ paddingHorizontal: 10, height: list_height, justifyContent: "center" }}>
				<FlashList data={props.playlists} renderItem={render_playlist} horizontal={true} />
			</View>
		</View>
	);
}
