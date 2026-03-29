import React, { useState } from "react";
import { View, FlatList, Text } from "react-native";
import Link from "@components/Link";
import { Prefs } from "@illusive/prefs";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import usePTheme from "@hooks/usePTheme";
import { router, useFocusEffect } from "expo-router";
import type { LinkerLink } from "@illusive/types";
import { Ionicons } from "@expo/vector-icons";

function LinkListEmpty() {
	const { colors } = usePTheme();
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
			<Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 20, textAlign: "center" }}>You have no links</Text>
			<Text style={{ color: colors.subtext, fontSize: 15, marginTop: 12, textAlign: "center", lineHeight: 22 }}>Press 'Create New Link' to begin adding links to your other music services.</Text>
		</View>
	);
}

function LinkerFooter() {
	const { colors } = usePTheme();

	if (!Prefs.get_pref("enable_linker") && Prefs.get_pref("expensive_wifi_only")) {
		return (
			<View style={{ flex: 1, paddingHorizontal: 20 }}>
				<View style={{ width: "80%", flexDirection: "row", alignItems: "center" }}>
					<Ionicons name="warning" size={50} color={colors.red} style={{ top: 5 }} />
					<Text style={{ color: colors.red, fontSize: 15, marginTop: 12, lineHeight: 22 }}>Links won't be run on startup due to 'enable_linker' being disabled.</Text>
				</View>
				<Text style={{ color: colors.deeptext, fontSize: 15, lineHeight: 22 }}>Links will only run on startup if connected to WiFi.</Text>
			</View>
		);
	}

	if (!Prefs.get_pref("enable_linker")) {
		return (
			<View style={{ flex: 1, paddingHorizontal: 20 }}>
				<View style={{ width: "80%", flexDirection: "row", alignItems: "center" }}>
					<Ionicons name="warning" size={50} color={colors.red} style={{ top: 5 }} />
					<Text style={{ color: colors.red, fontSize: 15, marginTop: 12, lineHeight: 22 }}>Links won't be run on startup due to 'enable_linker' being disabled.</Text>
				</View>
			</View>
		);
	}
	if (Prefs.get_pref("expensive_wifi_only")) {
		return (
			<View style={{ flex: 1, paddingHorizontal: 20 }}>
				<Text style={{ color: colors.subtext, fontSize: 15, marginTop: 12, lineHeight: 22 }}>Links will only run on startup if connected to WiFi.</Text>
			</View>
		);
	}
	return null;
}

export default function ExtraLinkerScreen() {
	const { colors } = usePTheme();

	const [links, set_links] = useState(Prefs.get_pref("linker_links"));

	useFocusEffect(() => {
		set_links([...Prefs.get_pref("linker_links")]);
	});

	const render_link = (item: { item: LinkerLink }) => (
		<Link
			linker_link={item.item}
			on_delete={() => {
				set_links([...Prefs.get_pref("linker_links")]);
			}}
		/>
	);

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
			<FlatList renderItem={render_link} data={links} ListEmptyComponent={LinkListEmpty} ListFooterComponent={LinkerFooter} />
		</View>
	);
}
