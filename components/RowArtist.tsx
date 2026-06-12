import { Text, TouchableOpacity, View } from "react-native";
import type { CompactArtist } from "@illusive/types";
import usePTheme from "@hooks/usePTheme";
import IImage from "./IImage";
import { remove_topic } from "@common/utils/clean_util";
import { SharedRouter } from "@utils/shared_routes";
import { music_service_uri_to_music_service, split_uri } from "@illusive/illusive_utils";
import { Fontisto } from "@expo/vector-icons";
import { service_icon_map } from "@utils/service_icon_map";

export default function RowArtist(props: { artist_data: CompactArtist; size?: number }) {
	const { colors } = usePTheme();

	function on_press() {
		SharedRouter.goto_shared_artist(props.artist_data.name.uri ?? "");
	}

	const size = props.size ?? 100;
	const service_uri = props.artist_data.name.uri ? music_service_uri_to_music_service(split_uri(props.artist_data.name.uri)[0]) : undefined;

	return (
		<TouchableOpacity onPress={on_press} style={{ padding: 10, paddingHorizontal: size * 0.08, alignItems: "center" }}>
			<View>
				<IImage source={props.artist_data.profile_artwork_url} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: colors.line }} />
				{service_uri ? (
					<Fontisto
						name={service_icon_map[service_uri].name}
						size={size * 0.2}
						color={service_icon_map[service_uri].color}
						style={{ position: "absolute", bottom: 5, right: 5, zIndex: 1, textShadowColor: "#000000", textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 }}
					/>
				) : null}
			</View>
			<Text numberOfLines={1} style={{ color: colors.text, top: 5, fontSize: 14, fontWeight: "600", maxWidth: size }}>
				{remove_topic(props.artist_data.name.name)} {""}
			</Text>
		</TouchableOpacity>
	);
}
