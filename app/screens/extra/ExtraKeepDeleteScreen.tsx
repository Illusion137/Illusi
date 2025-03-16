import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';

export default function ExtraKeepDeleteScreen() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
            <Text style={styles.header_text}>Under Construction...</Text>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	thick_line_long:{
		width: "90%",
		height: 0.4,
		opacity: 1,
		backgroundColor: colors.text,
	},
	line_long:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: colors.text,
	},
	line_short:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: colors.text,
		marginLeft: 42
	},
    description_text: {
        color: colors.subtext,
        marginLeft: 10,
        marginTop: 5,
        marginBottom: 10,
        fontSize: 16
    },
	header_text: {
		paddingTop: 16,
		paddingBottom: 5,
		marginLeft: 10,
		color: colors.text,
		fontSize: 24,
		fontWeight: 'bold',
		backgroundColor: colors.background + 'f0'
	}
});