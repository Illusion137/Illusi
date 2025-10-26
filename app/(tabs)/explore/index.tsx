import React, { useState } from "react";
import { StyleSheet, View, TextInput } from "react-native";
import { Prefs } from "@illusive/prefs";
import { LinearGradient } from "expo-linear-gradient";
import usePTheme from "@hooks/usePTheme";
import IllusiExplore from "@screens/search/IllusiExplore";
import SearchScreen from "@screens/SearchScreen";
import { useFocusEffect } from "expo-router";
import { set_explore_tab_press_callback } from "@utils/tabpress";

export default function Explore() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	let toggle = true;
	const [search_screen_state, set_search_screen_state] = useState(true);

	useFocusEffect(() => {
		set_explore_tab_press_callback(() => {
			set_search_screen_state(true);
		});
	});

	return (
		<>
			{!search_screen_state ? (
				<SearchScreen />
			) : (
				<LinearGradient colors={[colors.primary, colors.background]} locations={[0, 0.2]} end={{ x: 1, y: 2 }} style={styles.topContainer}>
					<View style={styles.wrapper}>
						<TextInput
							onPressIn={() => {
								toggle = !toggle;
								set_search_screen_state(toggle);
							}}
							autoCorrect={false}
							placeholder="Search"
							placeholderTextColor={"#808080"}
							style={styles.searchinput}
						/>
					</View>
					<IllusiExplore />
					<LinearGradient
						colors={[colors.background, 'rgba(0,0,0,0.8)', 'transparent']}
						style={{
							position: 'absolute',
							top: 0,
							height: "20%", // adjust how much of the image fades
							width: '100%',
					}}/>
					<LinearGradient
						colors={[colors.background, 'rgba(0,0,0,1)', 'transparent']}
						style={{
							position: 'absolute',
							top: 0,
							height: "10%", // adjust how much of the image fades
							width: '100%',
					}}/>
				</LinearGradient>
			)}
		</>
	);
}
const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		topContainer: {
			flex: 1,
			backgroundColor: colors.background
		},
		line_long: {
			width: "100%",
			height: 0.8,
			opacity: 0.1,
			backgroundColor: colors.text
		},
		wrapper: {
			alignItems: "center",
			zIndex: 100
		},
		searchinput: {
			color: "#F0F0F0",
			backgroundColor: colors.searchInput,
			padding: 15,
			top: 70,
			borderRadius: 30,
			width: "90%"
		},
		headerText: {
			color: colors.text,
			fontSize: 24,
			fontWeight: "bold"
		},
		genres: {
			backgroundColor: colors.subtext,
			width: "100%",
			height: 50,
			justifyContent: "center"
		}
	});
