import React from 'react';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button } from 'react-native';

function MoreSectionButton(props) {
	return(
		<TouchableHighlight activeOpacity={0.6} underlayColor="#808080" onPress={props.onPress}>
			<View style={styles.sectionContainer}>
				<Ionicons name={props.icon} size={25} color='#424ed4' style={{left: 10}}/>
				<Text style={styles.btnsectionText}>{props.text}</Text>
				<AntDesign name="right" size={22} color='#424ed4' style={{position: 'absolute', left: 340}}/>
			</View>
		</TouchableHighlight>
	);
}
const styles = StyleSheet.create({
	sectionContainer:{
		width: '100%', 
		height: 50, 
		backgroundColor: 'black', 
		flexDirection: 'row', 
		alignItems: 'center'
	},
	btnsectionText:{
		color: '#FFFFFF',
		fontSize: 16,
		left:20
	}
});
export default MoreSectionButton;