import React,  { useRef, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TextInput } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { is_empty } from '../../../lib-origin/origin/src/utils/util';
import { Ionicons } from '@expo/vector-icons';

export default function ExtraDiscordIntegrationScreen() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

    const [has_webhook, set_has_webhook] = useState<boolean>(!is_empty(Prefs.get_pref('discord_webhook_url')));
    const search_query = useRef<string>("");


    async function on_submit(){
        await Prefs.save_pref('discord_webhook_url', search_query.current.trim());
        set_has_webhook(!is_empty(Prefs.get_pref('discord_webhook_url')));
    }

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<ScrollView>
                <View>
                    <TextInput autoCapitalize={"none"} onSubmitEditing={on_submit} onEndEditing={on_submit} autoCorrect={false} placeholder='Enter Discord Webhook' placeholderTextColor={colors.searchPlaceholder} style={styles.search_input0} onChangeText={(text) => {search_query.current = text}}/>
                    {has_webhook ? <Ionicons style={{position: 'absolute', top: "15%", left: '85%'}} name='checkmark-circle' color={colors.green} size={25}/> : null}
                </View>
				<Text style={styles.descriptiontxt}>Enter the Webhook url of the Discord text-channel to send Illusno commands to.</Text>
				<Text style={{...styles.descriptiontxt, marginBottom: 0}}>Currently linked url: </Text>
				<Text style={{...styles.descriptiontxt, color: colors.text}}>{Prefs.get_pref('discord_webhook_url')}</Text>
                <View style={{height: 100}}/>
			</ScrollView>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	importfrom:{
		height: 45,
		width: '100%',
		backgroundColor: colors.track,
		flexDirection: 'row',
		alignItems: 'center',
	},
	importfromtext:{
		color: '#FFFFFF',
		fontSize: 16
	},
	line:{
		width: '100%',
		height: 0.8,
		backgroundColor: colors.line,
		marginHorizontal: 10,
	},
	descriptiontxt:{
		color: colors.subtext,
		marginTop: 10,
		marginBottom: 20,
		marginHorizontal: 12,
		textAlign: 'left'
	},
    search_input0:{
        color: colors.text,
        padding: 10,
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 10,
		width: '90%',
        height: 40,
		borderRadius: 10,// Top Right Corner
	},
});