import React from 'react';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button } from 'react-native';

function ProgressBar(props) {
	return(
		<View style={styles.sectionContainer}>
			<View style={{ backgroundColor: '#FFA2B1', width: props.progressPercent+'%', height: '90%', borderRadius:10}}>
			</View>
		</View>
	);
}
const styles = StyleSheet.create({
	sectionContainer:{
		width: '100%', 
		height: 30, 
		backgroundColor: 'black', 
		alignItems: 'flex-start',
        justifyContent: 'center',
        borderRadius:10,
        top: 10
	},
});
export default ProgressBar;