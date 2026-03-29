import React, { useState } from "react";
import { View, FlatList, Text } from "react-native";
import Link from "@components/Link";
import { Prefs } from "@illusive/prefs";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import usePTheme from "@hooks/usePTheme";
import { router, useFocusEffect } from "expo-router";
import type { LinkerLink } from "@illusive/types";

function LinkListEmpty() {
	const { colors } = usePTheme();
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 }}>
			<Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginTop: 20, textAlign: "center" }}>You have no links</Text>
			<Text style={{ color: colors.subtext, fontSize: 15, marginTop: 12, textAlign: "center", lineHeight: 22 }}>Press 'Create New Link' to begin adding links to your other music services.</Text>
		</View>
	);
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
			<FlatList renderItem={render_link} data={links} ListEmptyComponent={LinkListEmpty} />
		</View>
	);
}
