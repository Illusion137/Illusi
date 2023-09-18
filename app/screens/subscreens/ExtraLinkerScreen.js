import React,  { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { useNavigation, useTheme } from '@react-navigation/native';

function ExtraLinkerScreen(props) {
	const { colors } = useTheme();
	const styles = themeStyles(colors);
	return(
		<View style={{backgroundColor: colors.backgroundColor, width: '100%', flex: 1,}}>

		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
    
});
export default ExtraLinkerScreen;