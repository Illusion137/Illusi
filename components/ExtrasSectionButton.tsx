import React from "react";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableHighlight } from "react-native";
import type { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";

function ExtrasSectionButton(props: { onPress: () => void; transparent?: boolean; show_arrow: boolean; text: string; icon: keyof (typeof Ionicons)["glyphMap"] | "NONE"; indev?: boolean }) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	return (
		<TouchableHighlight disabled={props.indev} style={{ opacity: props.indev ? 0.5 : 1 }} activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={props.onPress}>
			<View style={props.transparent ?? false ? { ...styles.sectionContainer, backgroundColor: "#00000000" } : styles.sectionContainer}>
				{props.icon !== "NONE" ? <Ionicons name={props.indev ? "construct" : (props.icon as any)} size={25} color={colors.primary} style={{ left: 10 }} /> : null}
				<Text style={styles.btnsectionText}>{props.text}</Text>
				{props.show_arrow && <AntDesign name="right" size={22} color={colors.primary} style={{ position: "absolute", left: "90%" }} />}
			</View>
		</TouchableHighlight>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		sectionContainer: {
			width: "100%",
			height: 40,
			backgroundColor: colors.track,
			flexDirection: "row",
			alignItems: "center"
		},
		btnsectionText: {
			color: colors.text,
			fontSize: 16,
			left: 20
		}
	});
export default ExtrasSectionButton;
