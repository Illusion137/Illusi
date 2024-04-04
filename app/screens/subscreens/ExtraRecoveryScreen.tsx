import React,  { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { useNavigation, useTheme } from '@react-navigation/native';
import { darkThemeDefault } from '../../../Preferences';

function ExtraRecoveryScreen(props) {
	const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);
	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>

		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
    
});
export default ExtraRecoveryScreen;