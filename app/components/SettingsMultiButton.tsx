import React, { useState } from 'react';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button,Switch } from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as Prefs from '../../Preferences'

function SettingsMultiButton(props: {
	settings_key: string
	settings_value: boolean
	pre_key: string
}) {
    const { colors } = useTheme() as typeof Prefs.darkThemeDefault;
	const styles = themeStyles(colors);

	const [settingsKey, setSettingsKey] = useState(Prefs.snakeCaseToPlainText(props.settings_key));
	const [settingsValue, setSettingsValue] = useState(props.settings_value)
	
	const [numSettingsValue, setNumSettingsValue] = useState(String(props.settings_value))

	return(
		<View style={styles.sectionContainer}>
			<Ionicons name={'settings-outline'} size={25} color={colors.primary} style={{left: 10}}/>
			<Text style={styles.btnsectionText}>{settingsKey}</Text>
			<View style={{flex: 1, alignItems: 'flex-end', right:10}}>
				{typeof(settingsValue) === 'number' && 
					<TextInput maxLength={3} style={{color: 'white', fontSize: 18, width: 80, paddingRight: 20, paddingVertical: 5, backgroundColor: colors.shelf}} textAlign='right'  inputMode='numeric' placeholder='1' value={numSettingsValue} onChangeText={(val) => { setNumSettingsValue(val) } }
					onBlur={async() => {let n = parseInt(numSettingsValue) || 1; setNumSettingsValue(String(n)); await Prefs.setSettingsNumber(settingsKey, n) }}/>
				}
				{typeof(settingsValue) === 'boolean' && 
					<Switch value={settingsValue} 
							onValueChange={(value: boolean) => {setSettingsValue(value); Prefs.setSettingsToggle(props.pre_key, settingsKey, value)}} 
							thumbColor={'#ffffff'} 
							trackColor={{false: '#ffffff', true: colors.primary}}
							ios_backgroundColor={'#ffffff'}/>
				}
			</View>
		</View>
	);
}
const themeStyles = (colors: typeof Prefs.darkThemeDefault.colors) => StyleSheet.create({
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
export default SettingsMultiButton;