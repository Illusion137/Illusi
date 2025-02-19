import React,  { useState } from 'react';
import { View, StyleSheet, Text, SectionList } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import SettingsMultiButton from '../../components/SettingsMultiButton';
import { prefs_settings_groupby_filter } from '../../../lib-origin/Illusive/src/illusive_utilts';

export default function ExtraExperimentalSettingsScreen() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
	
    type PrefEntry = [Prefs.PrefOptions, Prefs.Pref<unknown>]

	const [settings_data, _] = useState(prefs_settings_groupby_filter("EXPERIMENTAL")); 
	const render_item = (item: {item: PrefEntry, index: number}) => 
	<>
		<SettingsMultiButton settings_key={item.item[0]} settings_pref={item.item[1]}/>
		{item.index !== settings_data.length-1 && <View style={styles.line_short}/>}
		{item.item[1]?.description !== undefined ? <Text style={styles.description_text}>{item.item[1].description}</Text>: null }
	</>;
	const render_section_header = (section: {section: {title: string}}) => (
	<>
		<Text style={styles.header_text}>{section.section.title}</Text>
		<View style={styles.thick_line_long}/>
	</>);
	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<SectionList sections={settings_data} renderItem={render_item} renderSectionHeader={render_section_header} ListHeaderComponent={<View style={styles.line_long}/>} ListFooterComponent={
				<>
					<View style={styles.line_long}/>
					<View style={{height: 30}}/>
					<View style={{height: 200}}/>
				</>
			}/>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	thick_line_long:{
		width: "90%",
		height: 0.4,
		opacity: 1,
		backgroundColor: colors.text,
	},
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
    },
	header_text: {
		paddingTop: 16,
		paddingBottom: 5,
		marginLeft: 10,
		color: colors.text,
		fontSize: 24,
		fontWeight: 'bold',
		backgroundColor: colors.background + 'f0'
	}
});