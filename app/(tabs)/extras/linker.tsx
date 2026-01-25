import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import Link from "@components/Link";
import { Prefs } from "@illusive/prefs";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import usePTheme from "@hooks/usePTheme";
import { router, useFocusEffect } from "expo-router";
import { create_uri } from "@illusive/illusive_utils";

export default function ExtraLinkerScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const [links, set_links] = useState(Prefs.get_pref("linker_links"));

	useFocusEffect(() => {
		set_links(Prefs.get_pref("linker_links"));
	});

	return (
		<View style={{ backgroundColor: colors.background, width: "100%", flex: 1 }}>
			<ExtrasSectionButton
				text="Create New Link"
				icon="link-outline"
				show_arrow={true}
				onPress={() => {
					router.push("/extras/link");
				}}
			/>
			<View style={{ height: 15 }} />
			<ScrollView>
				<Link linker_link={{ link_uuid: "6890826096", illusi_uuid: "II-dfklgjkldfsg-89bnb657j", service_uri: create_uri("youtube", "hello"), type: "INCOMING", full_service_playlist: true, on_startup: false }} />
				<Link linker_link={{ link_uuid: "4875289345983", illusi_uuid: "II-hajkshglfdag-hjklhfgahh", service_uri: create_uri("youtube", "LL"), type: "OUTGOING", full_service_playlist: false, on_startup: true }} />
				<View style={{ height: 100 }} />
			</ScrollView>
		</View>
	);
}
const theme_styles = (_: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		centeredView: {
			flex: 1,
			justifyContent: "center",
			alignItems: "center",
			marginTop: 22
		},
		modalView: {
			margin: 20,
			backgroundColor: "white",
			borderRadius: 20,
			padding: 35,
			alignItems: "center",
			shadowColor: "#000",
			shadowOffset: {
				width: 0,
				height: 2
			},
			shadowOpacity: 0.25,
			shadowRadius: 4,
			elevation: 5
		},
		button: {
			borderRadius: 20,
			padding: 10,
			elevation: 2
		},
		buttonOpen: {
			backgroundColor: "#F194FF"
		},
		buttonClose: {
			backgroundColor: "#2196F3"
		},
		textStyle: {
			color: "white",
			fontWeight: "bold",
			textAlign: "center"
		},
		modalText: {
			marginBottom: 15,
			textAlign: "center"
		}
	});
