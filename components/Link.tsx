import React from "react";
import { View, StyleSheet, Image, Text } from "react-native";
import type { LinkerLink } from "@illusive/types";
import type { Prefs } from "@illusive/prefs";
import { Illusive } from "@illusive/illusive";
import { music_service_uri_to_music_service, split_uri } from "@illusive/illusive_utils";
import usePTheme from "@hooks/usePTheme";
import IImage from "./IImage";

export default function Link(props: {
	linker_link: LinkerLink
}) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const from_service = Illusive.music_service.get( 
		props.linker_link.uuid_uri.includes(':') ?
			music_service_uri_to_music_service(
				split_uri(props.linker_link.uuid_uri)[0]) :
		"Illusi"
	)!;
	const to_service = Illusive.music_service.get(props.linker_link.to_service)!;

	return (
		<>
			<View style={{
				backgroundColor: colors.track,
				width: "100%",
				height: 40,
				alignItems: "center",
				flexDirection: "row",
			}}>
				<IImage 
					source={from_service.app_icon}
					style={{ marginLeft: 5, width: 30, height: 30, borderRadius: 5}}
				/>
				<View style={{flexDirection: 'column', marginLeft: 8, width: '40%'}}>
					<Text numberOfLines={1} style={{color: colors.text}}>{props.linker_link.uuid_uri}</Text>
					<Text numberOfLines={1} style={{color: colors.text}}>Full Sample: {String(props.linker_link.full_sample)}</Text>
				</View>
				<IImage 
					source={to_service.app_icon}
					style={{ marginLeft: 5, width: 30, height: 30, borderRadius: 5}}
				/>
				<View style={{flexDirection: 'column', marginLeft: 8}}>
					<Text numberOfLines={1} style={{color: colors.text}}></Text>
					<Text numberOfLines={1} style={{color: colors.text}}></Text>
				</View>
			</View>
			<View style={styles.linelong}/>
		</>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	linelong: {
		width: "100%",
		height: 0.4,
		opacity: 0.2,
		backgroundColor: colors.line,
	},
});