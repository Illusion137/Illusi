import React from 'react';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableHighlight } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';

function ExtrasSectionButton(props: {
		onPress: () => void,
		show_arrow: true | boolean, 
		text: string,
        icon: keyof (typeof Ionicons)["glyphMap"]
	}) {	
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

	return(
		<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={props.onPress}>
			<View style={styles.sectionContainer}>
				<Ionicons name={props.icon as any} size={25} color={colors.primary} style={{left: 10}}/>
				<Text style={styles.btnsectionText}>{props.text}</Text>
				{ props.show_arrow && <AntDesign name="right" size={22} color={colors.primary} style={{position: 'absolute', left: 340}}/>}
			</View>
		</TouchableHighlight>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
	sectionContainer:{
		width: '100%', 
		height: 50, 
		backgroundColor: colors.track, 
		flexDirection: 'row', 
		alignItems: 'center'
	},
	btnsectionText:{
		color: '#FFFFFF',
		fontSize: 16,
		left:20
	}
});
export default ExtrasSectionButton;