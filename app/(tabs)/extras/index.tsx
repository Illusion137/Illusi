import React, { useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import * as Battery from "expo-battery";
import { Prefs } from "@illusive/prefs";
import usePTheme from "@hooks/usePTheme";
import appConfig from "app.config";
import ExtrasRenderer from "@components/ExtrasRenderer";
import { get_common_styles } from "@utils/common_styles";

export default function Extras() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);
	const common_styles = get_common_styles(colors);

	const [battery, set_battery] = React.useState(0.0);

	useEffect(() => {
		const interval_id = setInterval(async () => {
			//assign interval to a variable to clear it.
			set_battery(await Battery.getBatteryLevelAsync());
		}, 2000);
		return () => clearInterval(interval_id); //This is important
	}, []);

	return (
		<View style={styles.top_container}>
			<View style={styles.header}>
				<View style={{ flexDirection: "row", bottom: 20, alignItems: "center" }}>
					<Text style={styles.top_text}>Extras</Text>
				</View>
			</View>
			<ScrollView>
				<ExtrasRenderer/>

				<Text style={common_styles.description_txt}>Illusi Version: {appConfig({}).version}</Text>
				<Text style={common_styles.description_txt}>Last Synced: {Prefs.get_pref("last_synced").toLocaleString()}</Text>
				<Text style={common_styles.description_txt}>Battery Level: {battery}</Text>
			</ScrollView>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		top_container: {
			backgroundColor: colors.background,
			flex: 1
		},
		header: {
			backgroundColor: colors.shelf,
			width: "100%",
			height: "13%",
			top: 0,
			justifyContent: "flex-end",
			alignItems: "center"
		},
		top_text: {
			color: colors.text,
			fontSize: 18,
			top: 10,
			fontWeight: "500"
		},
		section_container: {
			width: "100%",
			height: 50,
			backgroundColor: colors.track,
			flexDirection: "row",
			alignItems: "center"
		},
		btn_section_text: {
			color: colors.text,
			fontSize: 16,
			left: 20
		}
});