import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";
import type { Track } from "@illusive/types";
import { is_empty } from "@common/utils/util";
import { SQLfs } from "@illusive/sql/sql_fs";
import IImage from "./IImage";
import usePTheme from "@hooks/usePTheme";

const border_radius = 2;
const border_width = 1;

export default function FourTrackArtwork(props: { four_track: Track[]; size: number; dim?: boolean; background?: boolean; dim_amount?: number; thumbnail_uri?: string; base_view_style?: StyleProp<ViewStyle> }) {
	const { colors } = usePTheme();
	const border_color = colors.line;

	const background = props.background ?? false;
	const thumbnail_uri = is_empty(props.thumbnail_uri) ? undefined : props.thumbnail_uri?.includes("https:") ? props.thumbnail_uri : SQLfs.custom_thumbnail_directory(props.thumbnail_uri!);
	const album_names = (props.four_track ?? []).map((track) => track.album?.name ?? "").filter((name) => !is_empty(name));
	const all_same_album = (new Set<string>(album_names).size === 1 && album_names.length >= 4) || (props.four_track.length >= 4 && props.four_track.slice(0, 4).every((track) => !is_empty(track.imported_id)));

	return (
		<View style={{ ...(props.base_view_style as object), backgroundColor: "black", borderRadius: border_radius, position: background ? "absolute" : undefined, zIndex: background ? -1 : undefined }}>
			{!is_empty(thumbnail_uri) && (
				<IImage source={thumbnail_uri} style={{ width: props.size * 2, height: props.size * 2, borderRadius: border_radius, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1, borderWidth: border_width, borderColor: border_color }} />
			)}
			{props.four_track.length == 0 && is_empty(thumbnail_uri) && (
				<IImage source={undefined} style={{ width: props.size * 2, height: props.size * 2, borderRadius: border_radius, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1, borderWidth: border_width, borderColor: border_color }} />
			)}
			{props.four_track.length !== 0 && is_empty(thumbnail_uri) && props.four_track.length < 4 && (
				<IImage
					source={props.four_track[0].playback?.artwork}
					style={{ width: props.size * 2, height: props.size * 2, borderRadius: border_radius, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1, borderWidth: border_width, borderColor: border_color }}
				/>
			)}
			{props.four_track.length >= 4 && is_empty(thumbnail_uri) && all_same_album && (
				<IImage
					source={props.four_track[0].playback?.artwork}
					style={{ width: props.size * 2, height: props.size * 2, borderRadius: border_radius, opacity: props.dim ? (props.dim_amount ?? 0.8) : 1, borderWidth: border_width, borderColor: border_color }}
				/>
			)}
			{props.four_track.length >= 4 && is_empty(thumbnail_uri) && !all_same_album && (
				<View>
					<View style={{ flexDirection: "row" }}>
						{props.four_track[0] != undefined && (
							<IImage
								source={props.four_track[0].playback?.artwork}
								style={{
									width: props.size,
									height: props.size,
									borderTopLeftRadius: border_radius,
									opacity: props.dim ? (props.dim_amount ?? 0.8) : 1,
									borderColor: border_color,
									borderTopWidth: border_width,
									borderLeftWidth: border_width
								}}
							/>
						)}
						{props.four_track[1] != undefined && (
							<IImage
								source={props.four_track[1].playback?.artwork}
								style={{
									width: props.size,
									height: props.size,
									borderTopRightRadius: border_radius,
									opacity: props.dim ? (props.dim_amount ?? 0.8) : 1,
									borderColor: border_color,
									borderTopWidth: border_width,
									borderRightWidth: border_width
								}}
							/>
						)}
					</View>
					<View style={{ flexDirection: "row" }}>
						{props.four_track[2] != undefined && (
							<IImage
								source={props.four_track[2].playback?.artwork}
								style={{
									width: props.size,
									height: props.size,
									borderBottomLeftRadius: border_radius,
									opacity: props.dim ? (props.dim_amount ?? 0.8) : 1,
									borderColor: border_color,
									borderBottomWidth: border_width,
									borderLeftWidth: border_width
								}}
							/>
						)}
						{props.four_track[3] != undefined && (
							<IImage
								source={props.four_track[3].playback?.artwork}
								style={{
									width: props.size,
									height: props.size,
									borderBottomRightRadius: border_radius,
									opacity: props.dim ? (props.dim_amount ?? 0.8) : 1,
									borderColor: border_color,
									borderBottomWidth: border_width,
									borderRightWidth: border_width
								}}
							/>
						)}
					</View>
				</View>
			)}
		</View>
	);
}
