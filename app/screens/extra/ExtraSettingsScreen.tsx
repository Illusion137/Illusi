import React,  { useState } from 'react';
import { View, StyleSheet, Text, SectionList } from 'react-native';
import * as SQLTracks from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import SettingsMultiButton from '../../components/SettingsMultiButton';
import ExtrasSectionButton from '../../components/ExtrasSectionButton'
import { PrefEntry } from '../../../lib-origin/Illusive/src/types';
import { prefs_settings_groupby_filter } from '../../../lib-origin/Illusive/src/illusive_utilts';
import { presentShortcut, ShortcutOptions } from 'react-native-siri-shortcut';
import { Constants } from '../../../lib-origin/Illusive/src/constants';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import { speed_sample_unavailable_tracks } from '../../../lib-origin/Illusive/src/illusi/src/sampler';

function ExtraSettingsScreen() {
	const navigation: NavigationProp<any, any> = useNavigation();

	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
	
	const [settings_data, _] = useState(prefs_settings_groupby_filter(undefined));
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
	</>	);

	function getShortcut():ShortcutOptions{
		return {
			activityType: 'com.illusion137.Illusi.ShuffleMusic',
			persistentIdentifier: 'com.illusion137.Illusi.ShuffleMusic',
			title: "Shuffle Shortcut " + "Library", 
			isEligibleForHandoff: true,
			isEligibleForPrediction: true,
			isEligibleForPublicIndexing: true,
			isEligibleForSearch: true,
			keywords: ["Shuffle", "Music", 'Illusi'],
			requiredUserInfoKeys: [Constants.library_write_playlist],
			userInfo: {uuid: Constants.library_write_playlist},
			description: 'Shuffles Playlist',
		}
	}

	async function zip_data(){
		const UTI = 'public.item';
		await Sharing.shareAsync(FileSystem.documentDirectory ?? "", { UTI });
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<SectionList sections={settings_data} renderItem={render_item} renderSectionHeader={render_section_header} ListHeaderComponent={<View style={styles.line_long}/>} ListFooterComponent={
				<>
					<View style={styles.line_long}/>
					<View style={{height: 30}}/>
					<ExtrasSectionButton show_arrow={true} text='Miscellaneous Settings' icon='settings-outline' onPress={() => navigation.navigate("Miscellaneous Settings")}/>
					<Text style={styles.description_text}>Usually one-time settings that you'd forget about</Text>
					<ExtrasSectionButton show_arrow={true} text='Experimental Settings' icon='settings-outline' onPress={() => navigation.navigate("Experimental Settings")}/>
					<Text style={styles.description_text}>Settings that have a chance of breaking things; use with caution; all disabled by default</Text>
					<View style={{height: 30}}/>
					<ExtrasSectionButton show_arrow={true} text='Danger Zone' icon='warning-sharp' onPress={() => navigation.navigate("Danger Zone")}/>
					<View style={styles.line_long}/>
					<Text style={styles.description_text}>Where all the destructive actions to Illusi happen</Text>
					<ExtrasSectionButton show_arrow={false} text='Shuffle Library Shortcut' icon='library-outline' onPress={() => presentShortcut(getShortcut(), (data) => data)}/>
					<ExtrasSectionButton show_arrow={false} text='Reinstate Thumbnail Cache' icon='download' onPress={SQLTracks.restore_thumbnail_cache}/>
					<ExtrasSectionButton show_arrow={false} text='Speed Sample Library' icon='search-circle' onPress={async() => {
						await speed_sample_unavailable_tracks(GLOBALS.global_var.sql_tracks, Prefs.get_pref('speed_sample_super_speed'));
						GLOBALS.global_var.bottom_alert?.("FINISHED SPEED SAMPLING", "INFO");
					}}/>
					<ExtrasSectionButton show_arrow={false} text='Zip All Data' icon='file-tray-full-outline' onPress={async () => await zip_data()}/>
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
export default ExtraSettingsScreen;