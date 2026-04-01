import React, { useRef, useState } from "react";
import { AntDesign, Ionicons, MaterialCommunityIcons, SimpleLineIcons } from "@expo/vector-icons";
import { Slider } from "@miblanchard/react-native-slider";
import { Prefs } from "@illusive/prefs";
import { Text, View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import ColorPicker from "react-native-wheel-color-picker";
import { GLOBALS } from "@illusive/globals";
import usePTheme from "@hooks/usePTheme";
import { ThemeSelector } from "@components/ThemeSelector";
import type { HexColor } from "@common/types";

let selected_color = "#ffffff";
export default function ExtraThemesScreen() {
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	type ThemeKey = keyof typeof Prefs.all_themes;

	async function change_theme(theme_key: ThemeKey) {
		await Prefs.save_pref("primary_color", Prefs.get_theme(theme_key).colors.default_primary_color as HexColor);
		await Prefs.save_pref("theme", theme_key);
		Prefs.pref_set_theme(GLOBALS.global_var.set_theme);
	}

	const MY_THEMES = Prefs.all_themes().map((theme_key) => ({
		name: theme_key,
		primary_color: Prefs.get_theme(theme_key as ThemeKey).colors.default_primary_color,
		is_dark: Prefs.get_theme(theme_key as ThemeKey).dark
	}));

	const color_picker_ref = useRef<ColorPicker>(null);
	const [selected_color_state, set_selected_color_state] = useState<string>(selected_color);
	const [show_color_selector, set_show_color_selector] = useState<boolean>(false);
	return (
		<ScrollView>
			<ThemeSelector themes={MY_THEMES} initial_theme={Prefs.get_pref("theme")} on_theme_press={async (name) => change_theme(name as ThemeKey)} />
			<View style={{ borderRadius: 30, backgroundColor: colors.shelf, margin: 10, padding: 20 }}>
				<View style={styles.textcontainer}>
					<Text style={styles.title}>Various Track Title</Text>
					<Text style={styles.artist}>Various Artists</Text>
				</View>
				<View style={{ bottom: 40 }}>
					<View style={styles.playbackcontainer}>
						<Ionicons name="shuffle-sharp" size={35} color={colors.primary} />
						<Ionicons name="play-back-sharp" size={35} color={colors.primary} />
						<Ionicons name={"play-circle-sharp"} size={90} color={colors.primary} />
						<Ionicons name="play-forward-sharp" size={35} color={colors.primary} />
						<Ionicons name="repeat-sharp" size={35} color={colors.primary} />
					</View>
					<View>
						<Ionicons name="volume-off-sharp" size={20} color="#656565" style={{ top: 30, left: 15 }} />
						<View style={styles.volumeslidercontainer}>
							<Slider
								value={0.5}
								thumbTintColor={colors.primary}
								thumbStyle={{ width: 15, height: 15 }}
								thumbTouchSize={{ width: 40, height: 40 }}
								minimumTrackTintColor={colors.primary}
								maximumTrackTintColor="#DADADA40"
								maximumValue={1}
							/>
						</View>
						<Ionicons name="volume-high-sharp" size={20} color="#656565" style={{ bottom: 30, alignSelf: "flex-end", right: 50 }} />
						<MaterialCommunityIcons name="cast-audio-variant" size={20} color="#656565" style={{ bottom: 50, alignSelf: "flex-end", right: 15 }} />
					</View>
					<View style={{ flexDirection: "row", justifyContent: "space-between", marginLeft: 15, marginRight: 15 }}>
						<View style={{ backgroundColor: colors.primary, height: 35, width: 65, borderRadius: 20, justifyContent: "center", alignItems: "center" }}>
							<Text>+ Add</Text>
						</View>
						<SimpleLineIcons name="equalizer" size={28} color={colors.primary} />
						<Ionicons name="mic-outline" size={28} color={colors.primary} />
						<Ionicons name="share-outline" size={28} color={colors.primary} />
					</View>
				</View>
			</View>

			<View style={styles.line_long}></View>
			{show_color_selector ? (
				<TouchableOpacity
					onPress={async () => {
						await Prefs.save_pref("primary_color", selected_color as `#${string}`);
						Prefs.pref_set_theme(GLOBALS.global_var.set_theme);
					}}>
					<View style={styles.sectionContainer}>
						<Text style={styles.btnsectionText}>{"🎨  "}</Text>
						<Text style={styles.btnsectionText}>Custom Color</Text>
						<AntDesign name="star" size={22} color={selected_color_state} style={{ position: "absolute", left: "90%" }} />
					</View>
				</TouchableOpacity>
			) : null}
			<TouchableOpacity
				style={styles.sectionContainer}
				onPress={async () => {
					color_picker_ref.current?.revert();
					set_show_color_selector(!show_color_selector);
				}}>
				<Text style={[styles.btnsectionText, { fontWeight: "600" }]}>{show_color_selector ? "Hide" : "Show"} Color Picker</Text>
			</TouchableOpacity>
			{show_color_selector ? (
				<ColorPicker
					ref={color_picker_ref as any}
					swatchesOnly={false}
					onColorChangeComplete={(color) => {
						selected_color = color;
						set_selected_color_state(color);
					}}
					thumbSize={40}
					sliderSize={40}
					noSnap={true}
					row={false}
					swatches={false}
					discrete={false}
					wheelLoadingIndicator={<ActivityIndicator size={40} />}
					sliderLoadingIndicator={<ActivityIndicator size={20} />}
					useNativeDriver={false}
					useNativeLayout={false}
				/>
			) : null}
			<View style={styles.line_long}></View>
			<View style={{ height: 10 }}></View>
			{Prefs.possible_primary_colors.map((color) => (
				<View key={color.color + color.name}>
					<TouchableOpacity
						onPress={async () => {
							await Prefs.save_pref("primary_color", color.color);
							Prefs.pref_set_theme(GLOBALS.global_var.set_theme);
						}}>
						<View style={styles.sectionContainer}>
							<Text style={styles.btnsectionText}>{`${color.icon}  `}</Text>
							<Text style={styles.btnsectionText}>{color.name}</Text>
							<AntDesign name="star" size={22} color={color.color} style={{ position: "absolute", left: "90%" }} />
						</View>
					</TouchableOpacity>
					<View style={styles.line_long}></View>
				</View>
			))}
			<View style={{ height: 100 }} />
		</ScrollView>
	);
}

const theme_styles = (colors: Prefs.Theme["colors"]) =>
	StyleSheet.create({
		sectionContainer: {
			width: "100%",
			height: 45,
			backgroundColor: colors.track,
			flexDirection: "row",
			alignItems: "center"
		},
		btnsectionText: {
			color: colors.text,
			fontSize: 16,
			left: 20
		},
		line_long: {
			width: "90%",
			height: 0.3,
			opacity: 0.3,
			backgroundColor: colors.text
		},
		topcontainer: {
			flex: 1,
			backgroundColor: colors.playScreen
		},
		header: {
			backgroundColor: colors.playScreen,
			height: 45,
			alignItems: "center",
			justifyContent: "space-between",
			flexDirection: "row"
		},
		topfrom: {
			color: colors.subtext,
			fontSize: 12,
			top: -4
		},
		toptitle: {
			color: colors.text,
			fontWeight: "bold",
			top: -2
		},
		timestampslidercontainer: {
			alignItems: "stretch",
			justifyContent: "center",
			bottom: 20
		},
		textcontainer: {
			justifyContent: "flex-start",
			alignItems: "center",
			bottom: 0,
			height: 100,
			marginLeft: 40,
			marginRight: 40
		},
		tsstyle: {
			color: colors.subtext
		},
		title: {
			color: colors.text,
			fontSize: 20,
			fontWeight: "bold"
		},
		artist: {
			color: colors.subtext
		},
		playbackcontainer: {
			justifyContent: "space-evenly",
			alignItems: "center",
			flexDirection: "row"
		},
		volumeslidercontainer: {
			marginLeft: 40,
			marginRight: 80
		},
		lyrics_text: {
			color: colors.text,
			fontWeight: "bold",
			fontSize: 24,
			margin: 15,
			marginVertical: 5
		}
	});
