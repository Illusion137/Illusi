import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import * as SQLTracks from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks';
import * as SQLUtils from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_utils';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import ExtrasSectionButton from '../../components/ExtrasSectionButton'
import { if_confirm } from '../../../lib-origin/Illusive/src/illusi/src/illusi_utils';

export default function ExtraDangerScreen() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	return(
		<ScrollView style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
            <View style={styles.line_long}/>
            <View style={{height: 30}}/>
            <ExtrasSectionButton show_arrow={false} text='Clear Thumbnail Cache' icon='trash-outline' onPress={async() => if_confirm("Clear thumbnail cache?", "Are You Sure?", SQLTracks.clean_thumbnail_cache)}/>
            <ExtrasSectionButton show_arrow={false} text='Reset Settings' icon='sync' onPress={async() => if_confirm("Reset all settings to defaults?", "Are You Sure?", async () => {await Prefs.reset_prefs(); Prefs.pref_set_theme(GLOBALS.global_var.set_theme);})}/>
            <View style={styles.line_short}/>
            <View style={{height: 20}}/>
            <ExtrasSectionButton show_arrow={false} text='Clean Directories' icon='trash-outline' onPress={async() => if_confirm("Clean Directories", "Are You Sure?", SQLTracks.clean_directories)}/>
            <View style={{height: 20}}/>
			<ExtrasSectionButton show_arrow={false} text='Clear Playlist Data' icon='trash-outline' onPress={async() => if_confirm("Delete Playlist Data", "Are You Sure?", SQLPlaylists.delete_all_playlists)}/>
            <ExtrasSectionButton show_arrow={false} text='Clear All Data' icon='trash-outline' onPress={async() => if_confirm("Clear All Data", "Are You Sure?", SQLUtils.delete_all_data)}/>
            <View style={{height: 200}}/>
		</ScrollView>
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
});