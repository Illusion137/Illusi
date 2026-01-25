import React from "react";
import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import type { LinkerLink } from "@illusive/types";
import type { Prefs } from "@illusive/prefs";
import { Illusive } from "@illusive/illusive";
import { music_service_uri_to_music_service, split_uri } from "@illusive/illusive_utils";
import usePTheme from "@hooks/usePTheme";
import IImage from "./IImage";
import hexToRgba from "hex-to-rgba";
import { Entypo, FontAwesome, Fontisto } from "@expo/vector-icons";

export default function Link(props: { linker_link: LinkerLink }) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const illusi_service = Illusive.music_service.get("Illusi")!;

	const other_service_type = music_service_uri_to_music_service(split_uri(props.linker_link.service_uri)[0]);
	const other_service = Illusive.music_service.get(other_service_type)!;

	// const from_service = Illusive.music_service.get(
	// 	props.linker_link.uuid_uri.includes(':') ?
	// 		music_service_uri_to_music_service(
	// 			split_uri(props.linker_link.uuid_uri)[0]) :
	// 	"Illusi"
	// )!;
	// const to_service = Illusive.music_service.get(props.linker_link.to_service)!;

	return (
		<>
			<View
				style={{
					backgroundColor: colors.track,
					width: "100%",
					height: 90,
					alignItems: "center",
					flexDirection: "row",
					paddingHorizontal: 10
				}}>
				<View style={{ flexDirection: "column", marginLeft: 8, width: "30%" }}>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<IImage source={illusi_service.app_icon} style={{ marginLeft: 5, width: 50, height: 50, borderRadius: 5 }} />
						<FontAwesome name={props.linker_link.type === "OUTGOING" ? "long-arrow-right" : "long-arrow-left"} color={colors.text} size={50} style={{ left: "10%" }} />
					</View>
					<Text numberOfLines={1} style={{ color: colors.text, top: 4 }}>
						{props.linker_link.illusi_uuid}
					</Text>
				</View>
				<View style={{ flexDirection: "column", marginLeft: 8, width: "50%" }}>
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<IImage source={other_service.app_icon} style={{ marginLeft: 5, width: 50, height: 50, borderRadius: 5 }} />
						<Fontisto name="hourglass-half" color={props.linker_link.on_startup ? colors.green : colors.deeptext} size={30} style={{ marginHorizontal: "18%", top: 2 }} />
						<Entypo name="progress-full" color={props.linker_link.full_service_playlist ? colors.green : colors.deeptext} size={30} style={{ top: 2 }} />
					</View>
					<Text numberOfLines={1} style={{ color: colors.text, top: 4 }}>
						{props.linker_link.service_uri}
					</Text>
				</View>
				<View style={{ flexDirection: "column", marginLeft: 8 }}>
					<Text numberOfLines={1} style={{ color: colors.text }}></Text>
					<Text numberOfLines={1} style={{ color: colors.text }}></Text>
				</View>
				<TouchableOpacity style={{ backgroundColor: hexToRgba(colors.secondary, 0.8), padding: 10, borderRadius: 5 }}>
					<Text style={{ color: colors.text }}>Run</Text>
				</TouchableOpacity>
			</View>
			<View style={styles.linelong} />
		</>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		linelong: {
			width: "90%",
			height: 1,
			opacity: 1,
			backgroundColor: colors.line
		}
	});
