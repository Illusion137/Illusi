import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TextInput, Switch } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';

function SettingsMultiButton(props: {
	settings_key: Prefs.PrefOptions
	settings_pref: Prefs.Pref<unknown>
}) {
    const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

    const settings_key = Prefs.snake_case_to_plain_text(props.settings_key);
	const [boolean_settings_value, set_boolean_settings_value] = useState<boolean>(props.settings_pref.type === "BOOLEAN" ? props.settings_pref.current_value as boolean : false);
	const [number_settings_value, set_number_settings_value] = useState<string>(props.settings_pref.type === "NUMBER" ? String(props.settings_pref.current_value) : "")

    async function number_on_value_change(){
        let n = parseInt(number_settings_value) ?? 1; 
        set_number_settings_value(String(n));
        if(props.settings_pref.range !== undefined){
            if(n < props.settings_pref.range.start) n = props.settings_pref.range.start;
            else if(n > props.settings_pref.range.end) n = props.settings_pref.range.end;
        }
        await Prefs.set_settings_number(props.settings_key, n);
    }

    async function boolean_on_value_change(value: boolean){
        set_boolean_settings_value(value);
        await Prefs.set_settings_toggle(props.settings_key as Prefs.PrefOptions, value);
    }

	return(
		<View style={styles.sectionContainer}>
			<Ionicons name={'settings-outline'} size={25} color={colors.primary} style={{left: 10}}/>
			<Text style={styles.btnsectionText}>{settings_key}</Text>
			<View style={{flex: 1, alignItems: 'flex-end', right:10}}>
				{props.settings_pref.type === "NUMBER" ? 
					<TextInput maxLength={3} style={{color: 'white', fontSize: 18, width: 80, paddingRight: 20, paddingVertical: 5, backgroundColor: colors.shelf}} textAlign='right'  inputMode='numeric' placeholder='1' value={number_settings_value} onChangeText={(val) => { set_number_settings_value(val) } }
					onBlur={async() => await number_on_value_change}/> : null
				}
				{props.settings_pref.type === "BOOLEAN" ?
					<Switch value={boolean_settings_value} 
							onValueChange={boolean_on_value_change} 
							thumbColor={'#ffffff'} 
							trackColor={{false: '#ffffff', true: colors.primary}}
							ios_backgroundColor={'#ffffff'}/> : null
				}
			</View>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
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