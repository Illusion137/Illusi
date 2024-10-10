import React,  { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { useNavigation, useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';

function ExtraRecoveryScreen(props: {}) {
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);
	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>

		</View>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
    
});
export default ExtraRecoveryScreen;