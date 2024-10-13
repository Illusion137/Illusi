import React,  { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import SettingsMultiButton from '../../components/SettingsMultiButton';
import ExtrasSectionButton from '../../components/ExtrasSectionButton'

function ExtraSettingsScreen() {
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);
	
    type PrefEntry = [Prefs.PrefOptions, Prefs.Pref<unknown>]

	const [settings_data, _] = useState((Object.entries(Prefs.prefs) as PrefEntry[]).filter(item => item[1].show_in_settings ?? false)); 
	const render_item = (item: {item: PrefEntry, index: number}) => 
	<>
		<SettingsMultiButton settings_key={item.item[0]} settings_pref={item.item[1]}/>
		{item.index !== settings_data.length-1 && <View style={styles.line_short}/>}
	</>;
	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<FlatList data={settings_data} renderItem={render_item} ListHeaderComponent={<View style={styles.line_long}/>} ListFooterComponent={
				<>
					<View style={styles.line_long}/>
					<View style={{height: 30}}/>
					<ExtrasSectionButton show_arrow={false} text='Reinstate Cache' icon='download' onPress={SQLActions.restore_thumbnail_cache}/>
					<ExtrasSectionButton show_arrow={false} text='Clear Cache' icon='trash-outline' onPress={SQLActions.clean_thumbnail_cache}/>
					<View style={{height: 100}}/>
				</>
			}/>
		</View>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
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
	}
});
export default ExtraSettingsScreen;