import React from 'react';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button } from 'react-native';
import { useTheme } from '@react-navigation/native';

function ExtrasSectionButton({showArrow = true, ...props}) {	
	const { colors } = useTheme();
	const styles = themeStyles(colors);

	return(
		<TouchableHighlight activeOpacity={0.6} underlayColor={colors.highlightPressColor} onPress={props.onPress}>
			<View style={styles.sectionContainer}>
				<Ionicons name={props.icon} size={25} color={colors.primary} style={{left: 10}}/>
				<Text style={styles.btnsectionText}>{props.text}</Text>
				{ showArrow && <AntDesign name="right" size={22} color={colors.primary} style={{position: 'absolute', left: 340}}/>}
			</View>
		</TouchableHighlight>
	);
}
const themeStyles = (colors) => StyleSheet.create({
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