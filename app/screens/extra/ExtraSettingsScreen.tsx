import React,  { useState } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import * as SQLTracks from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import SettingsMultiButton from '../../components/SettingsMultiButton';
import ExtrasSectionButton from '../../components/ExtrasSectionButton'

function ExtraSettingsScreen() {
	const navigation: NavigationProp<any, any> = useNavigation();

	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
	
    type PrefEntry = [Prefs.PrefOptions, Prefs.Pref<unknown>]

	const [settings_data, _] = useState((Object.entries(Prefs.prefs) as PrefEntry[]).filter(item => (item[1].show_in_settings ?? false) && (item[1].show_in_type === undefined))); 
	const render_item = (item: {item: PrefEntry, index: number}) => 
	<>
		<SettingsMultiButton settings_key={item.item[0]} settings_pref={item.item[1]}/>
		{item.index !== settings_data.length-1 && <View style={styles.line_short}/>}
		{item.item[1]?.description !== undefined ? <Text style={styles.description_text}>{item.item[1].description}</Text>: null }
	</>;
	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<FlatList data={settings_data} renderItem={render_item} ListHeaderComponent={<View style={styles.line_long}/>} ListFooterComponent={
				<>
					<View style={styles.line_long}/>
					<View style={{height: 30}}/>
					<ExtrasSectionButton show_arrow={true} text='Miscellaneous Settings' icon='settings-outline' onPress={() => navigation.navigate("Miscellaneous Settings")}/>
					<ExtrasSectionButton show_arrow={true} text='Experimental Settings' icon='settings-outline' onPress={() => navigation.navigate("Experimental Settings")}/>
					<View style={{height: 30}}/>
					<ExtrasSectionButton show_arrow={false} text='Reinstate Thumbnail Cache' icon='download' onPress={SQLTracks.restore_thumbnail_cache}/>
					<ExtrasSectionButton show_arrow={false} text='Clear Thumbnail Cache' icon='trash-outline' onPress={SQLTracks.clean_thumbnail_cache}/>
					<View style={{height: 200}}/>
				</>
			}/>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    line_long:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: colors.text,
	},
	line_short:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: colors.text,
		marginLeft: 42
	},
    description_text: {
        color: colors.subtext,
        marginLeft: 10,
        marginTop: 5,
        marginBottom: 10,
        fontSize: 16
    }
});
export default ExtraSettingsScreen;