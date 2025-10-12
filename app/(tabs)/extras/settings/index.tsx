import React,  { useState } from 'react';
import { View, StyleSheet, Text, SectionList } from 'react-native';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { Prefs } from '@illusive/prefs';
import SettingsMultiButton from '@components/SettingsMultiButton';
import ExtrasSectionButton from '@components/ExtrasSectionButton'
import { PrefEntry } from '@illusive/types';
import { prefs_settings_groupby_filter } from '@illusive/illusive_utils';
import { presentShortcut, ShortcutOptions } from 'react-native-siri-shortcut';
import { Constants } from '@illusive/constants';
import * as FileSystem from 'expo-file-system/legacy';
import { GLOBALS } from '@illusive/globals';
import { mass_sample_youtube_to_youtube_music, speed_sample_unavailable_tracks } from '@illusive/sampler';
import usePTheme from '@hooks/usePTheme';
import { share_item } from '@illusive/illusi/src/illusi_utils';
import { router } from 'expo-router';

export default function ExtraSettingsScreen() {
	const { colors } = usePTheme();
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
		await share_item({uri: FileSystem.documentDirectory ?? ""});
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<SectionList sections={settings_data} renderItem={render_item} renderSectionHeader={render_section_header} ListHeaderComponent={<View style={styles.line_long}/>} ListFooterComponent={
				<>
					<ExtrasSectionButton show_arrow={true} text='Experimental Settings' icon='settings-outline' onPress={() => router.push("/extras/settings/experimental")}/>
					<Text style={styles.description_text}>Settings that have a chance of breaking things; use with caution; all disabled by default</Text>
					<View style={{height: 30}}/>
					<ExtrasSectionButton show_arrow={true} text='Danger Zone' icon='warning-sharp' onPress={() => router.push("/extras/settings/danger")}/>
					<View style={styles.line_long}/>
					<Text style={styles.description_text}>Where all the destructive actions to Illusi happen</Text>
					<ExtrasSectionButton show_arrow={false} text='Shuffle Library Shortcut' icon='library-outline' onPress={() => presentShortcut(getShortcut(), (data) => data)}/>
					<ExtrasSectionButton show_arrow={false} text='Reinstate Thumbnail Cache' icon='download' onPress={() => SQLTracks.restore_thumbnail_cache()}/>
					<ExtrasSectionButton show_arrow={false} text='Speed Sample Library' icon='search-circle' onPress={async() => {
						await speed_sample_unavailable_tracks(GLOBALS.global_var.sql_tracks, true);
						GLOBALS.global_var.bottom_alert?.("FINISHED SPEED SAMPLING", "INFO");
					}}/>
					<ExtrasSectionButton show_arrow={false} text='Super Speed Sample Library' icon='search-circle' onPress={async() => {
						await speed_sample_unavailable_tracks(GLOBALS.global_var.sql_tracks, true);
						GLOBALS.global_var.bottom_alert?.("FINISHED SPEED SAMPLING", "INFO");
					}}/>
					<ExtrasSectionButton show_arrow={false} text='Convert all YouTube Tracks to YouTube Music' icon='construct-outline' onPress={async() => {
						await mass_sample_youtube_to_youtube_music();
						GLOBALS.global_var.bottom_alert?.("FINISHED CONVERTING TRACKS", "INFO");
					}}/>
					<ExtrasSectionButton show_arrow={false} text='Fix Tracks Added Metadata' icon='construct-outline' onPress={async() => {
						await SQLTracks.fix_track_added_metadata();
						GLOBALS.global_var.bottom_alert?.("FINISHED FIXING TRACKS METADATA", "INFO");
					}}/>
					<Text style={styles.description_text}>Useful for those who had Illusi pre-Illusi.14.0.0</Text>
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
        fontSize: 12
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