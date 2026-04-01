import { Prefs } from "@illusive/prefs";
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";

interface ThemeOption {
	name: string;
	primary_color: string;
	is_dark: boolean;
}

interface ThemeSelectorProps {
	themes: ThemeOption[];
	on_theme_press: (name: string) => void;
	initial_theme?: string;
}

export function ThemeSelector({ themes, on_theme_press, initial_theme }: ThemeSelectorProps) {
	const [selected, setSelected] = useState(initial_theme ?? themes[0]?.name);

	function handlePress(name: string) {
		setSelected(name);
		on_theme_press(name);
	}

	return (
		<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
			{themes.map((theme) => (
				<ThemeCard key={theme.name} theme={theme} is_selected={selected === theme.name} on_press={handlePress} />
			))}
		</ScrollView>
	);
}

interface ThemeCardProps {
	theme: ThemeOption;
	is_selected: boolean;
	on_press: (name: string) => void;
}

function ThemeCard({ theme, is_selected: isSelected, on_press: onPress }: ThemeCardProps) {
	const { name, primary_color, is_dark } = theme;

	const theme_obj = Prefs.get_theme(name as keyof typeof Prefs.all_themes);

	const bg = theme_obj.colors.background;
	const card_bg = theme_obj.colors.track;
	const text_bg = theme_obj.colors.text;
	const sub_bg = theme_obj.colors.subtext;
	const bar_bg = theme_obj.colors.playingSong;

	return (
		<TouchableOpacity
			activeOpacity={0.8}
			onPress={() => onPress(name)}
			style={[
				styles.card,
				isSelected && {
					borderColor: primary_color,
					borderWidth: 2
				}
			]}>
			{/* Mini preview */}
			<View style={[styles.preview, { backgroundColor: bg }]}>
				{/* Fake track row */}
				<View style={[styles.trackRow, { backgroundColor: card_bg }]}>
					<View style={[styles.dot, { backgroundColor: primary_color }]} />
					<View style={styles.trackText}>
						<View style={[styles.titleBar, { backgroundColor: text_bg }]} />
						<View style={[styles.subtitleBar, { backgroundColor: sub_bg }]} />
					</View>
				</View>
				{/* Fake progress bar */}
				<View style={[styles.progressTrack, { backgroundColor: bar_bg }]}>
					<View style={[styles.progressFill, { backgroundColor: primary_color, width: "40%" }]} />
				</View>
				{/* Color dots */}
				<View style={styles.dots}>
					{["#e0e0e0", "#aaaaaa", primary_color].map((c, i) => (
						<View key={i} style={[styles.colorDot, { backgroundColor: c }]} />
					))}
				</View>
			</View>

			{/* Label row */}
			<View style={styles.labelRow}>
				<View>
					<Text style={styles.name} numberOfLines={1}>
						{name.replace(/_/g, " ")}
					</Text>
					<Text style={styles.mode}>{is_dark ? "dark" : "light"}</Text>
				</View>
				{isSelected && (
					<View style={[styles.check, { backgroundColor: primary_color }]}>
						<Text style={styles.checkMark}>✓</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
		gap: 12,
		paddingHorizontal: 16,
		paddingVertical: 8
	},
	card: {
		width: 140,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#e0e0e0",
		overflow: "hidden",
		backgroundColor: "#ffffff"
	},
	preview: {
		padding: 10,
		gap: 6
	},
	trackRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		borderRadius: 6,
		padding: 8
	},
	dot: {
		width: 24,
		height: 24,
		borderRadius: 12
	},
	trackText: {
		flex: 1,
		gap: 4
	},
	titleBar: {
		height: 6,
		borderRadius: 3,
		width: "70%"
	},
	subtitleBar: {
		height: 4,
		borderRadius: 2,
		width: "45%"
	},
	progressTrack: {
		height: 4,
		borderRadius: 2,
		overflow: "hidden"
	},
	progressFill: {
		height: "100%",
		borderRadius: 2
	},
	dots: {
		flexDirection: "row",
		gap: 4
	},
	colorDot: {
		width: 10,
		height: 10,
		borderRadius: 5
	},
	labelRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 10,
		paddingVertical: 8
	},
	name: {
		fontSize: 12,
		fontWeight: "500",
		color: "#1a1a1a",
		textTransform: "capitalize"
	},
	mode: {
		fontSize: 11,
		color: "#888888",
		marginTop: 2
	},
	check: {
		width: 20,
		height: 20,
		borderRadius: 10,
		alignItems: "center",
		justifyContent: "center"
	},
	checkMark: {
		color: "#ffffff",
		fontSize: 11,
		fontWeight: "700",
		lineHeight: 14
	}
});
