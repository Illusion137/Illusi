import React, { useState } from 'react';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button,Switch } from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as Prefs from '../../Preferences'

function SettingsMultiButton(props) {
    const { colors } = useTheme();
	const styles = themeStyles(colors);

	const [settingsKey, setSettingsKey] = useState(Prefs.snakeCaseToPlainText(props.settingsKey));
	const [settingsValue, setSettingsValue] = useState(props.settingsValue)
	
	const [numSettingsValue, setNumSettingsValue] = useState(String(props.settingsValue))

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
							onValueChange={val => {setSettingsValue(val); Prefs.setSettingsToggle(props.preKey, settingsKey,val)}} 
							thumbColor={'#ffffff'} 
							trackColor={{false: '#ffffff', true: colors.primary}}
							ios_backgroundColor={'#ffffff'}/>
				}
			</View>
		</View>
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
export default SettingsMultiButton;