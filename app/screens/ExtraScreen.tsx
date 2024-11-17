import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent} from 'react-native';
import ExtrasSectionButton from '../components/ExtrasSectionButton';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import appConfig from '../../app.config';
import * as Sharing from 'expo-sharing';
import * as Battery from 'expo-battery';
import * as SQLUtils from '../../lib-origin/Illusive/src/illusi/src/sql/sql_utils';
import * as SQLPlaylists from '../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import * as GLOBALS from '../../lib-origin/Illusive/src/illusi/src/globals';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { if_confirm } from '../../lib-origin/Illusive/src/illusi/src/illusi_utils';
import SegmentedControl, { NativeSegmentedControlIOSChangeEvent } from '@react-native-segmented-control/segmented-control';
import { upload_sqlite_db } from '../../lib-origin/Illusive/src/illusi/src/document_picker';
import { alert_error } from '../../lib-origin/Illusive/src/illusi/src/alert';
import { test_import_1307_sqldb } from '../../lib-origin/Illusive/src/illusi/src/sql/sql_test';
import { document_directory } from '../../lib-origin/Illusive/src/illusi/src/sql/sql_fs';
import path from 'path';

function ExtraScreen() {
	const navigation: NavigationProp<any, any> = useNavigation();

    const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
	
	async function zip_data(){
		const UTI = 'public.item';
		await Sharing.shareAsync(FileSystem.documentDirectory ?? "", { UTI });
	}
    async function change_theme(event: NativeSyntheticEvent<NativeSegmentedControlIOSChangeEvent>){
        const theme_key = event.nativeEvent.value as Prefs.PossibleThemes;
        await Prefs.save_pref('theme', theme_key);
        GLOBALS.global_var.set_theme(Prefs.get_theme(theme_key))
    }

	const [battery, set_battery] = React.useState(0.0);

	useEffect(() => {
		const interval_id = setInterval(async() => {  //assign interval to a variable to clear it.
			set_battery(await Battery.getBatteryLevelAsync());
		}, 2000)
		return () => clearInterval(interval_id); //This is important
	}, [])

	return (
		<View style={styles.top_container}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<Text style={styles.top_text}>More</Text>
				</View>
			</View>
			<ScrollView>
				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Backup, Recover, & Transfer' icon='sync-circle-outline' onPress={async () => navigation.navigate('Backup, Recover & Transfer')}/>
				<View style={styles.line_long}/>

				<Text style={styles.description_txt}>Backup your music, transfer your playlists to other devices, recover deleted music and more</Text>
				
				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Settings' icon='settings-outline' onPress={async () => navigation.navigate('Settings') }/>
					<View style={styles.line_short}/>	
					<ExtrasSectionButton show_arrow={true} text='Sleep Timer' icon='timer-outline' onPress={async () => navigation.navigate('Sleep Timer')}/>
					<View style={styles.line_short}/>
					<ExtrasSectionButton show_arrow={true} text='External Services' icon='cog-outline' onPress={async () => navigation.navigate('External Services')}/>
				<View style={styles.line_long}/>

				<Text style={styles.description_txt}>Sign into external Music Services services such as YouTube, YouTube Music, Spotify and Amazon Music for extra features.</Text>

				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Batch Downloader' icon='file-tray-stacked-outline' onPress={async () => navigation.navigate('Batch Downloader')}/>
					<ExtrasSectionButton show_arrow={true} text='Playlist Converter' icon='list-circle-outline' onPress={async () => navigation.navigate('Playlist Converter')}/>
					<View style={styles.line_short}/>
					<ExtrasSectionButton show_arrow={true} text='Linker' icon='link-outline' onPress={async () => navigation.navigate('Linker')}/>
				<View style={styles.line_long}/>

				<Text style={styles.description_txt}>Hard Link playlist and other data from other Music Services. Automatically fetched on app startup.</Text>

				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Backpack' icon='folder-open-outline' onPress={async () => navigation.navigate('Backpack')}/>
				<View style={styles.line_long}/>
				
				<Text style={styles.description_txt}>Restore unavailable videos from Backpack</Text>

                <SegmentedControl
                    values={Prefs.all_themes()}
                    selectedIndex={Prefs.all_themes().findIndex(item => item === Prefs.get_pref('theme'))}
                    onChange={async(event) => await change_theme(event)}
                    style={{backgroundColor: colors.background}}
                />

				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='GitHub' icon='logo-github' onPress={async () => {}}/>
					<View style={styles.line_short}/>
					<ExtrasSectionButton show_arrow={false} text='Zip All Data' icon='file-tray-full-outline' onPress={async () => await zip_data()}/>
					<View style={styles.line_short}/>
					<ExtrasSectionButton show_arrow={false} text='Reset Settings' icon='sync' onPress={async() => if_confirm("Reset all settings to defaults?", "Are You Sure?", Prefs.reset_prefs)}/>
					<View style={styles.line_short}/>	
					<ExtrasSectionButton show_arrow={false} text='Clear Playlist Data' icon='trash-outline' onPress={async() => if_confirm("Delete Playlist Data", "Are You Sure?", SQLPlaylists.delete_all_playlists)}/>
					<View style={styles.line_short}/>	
					<ExtrasSectionButton show_arrow={false} text='Clear All Data' icon='trash-outline' onPress={async() => if_confirm("Clear All Data", "Are You Sure?", SQLUtils.delete_all_data)}/>
				<View style={styles.line_long}/>
				<Text style={styles.description_txt}>Manage your data; clear your data or export it back to your files app</Text>

				{/* {Prefs.get_pref('dev_mode') ? */}
					<>
					<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Developer' icon='hammer-outline' onPress={async () => navigation.navigate('Developer')}/>
					<ExtrasSectionButton show_arrow={true} text='Upload 1307 SQLite-DB' icon='hammer-outline' onPress={async () => {
                        const db_path = await upload_sqlite_db();
                        if("error" in db_path) { alert_error(db_path); return; }
                        await FileSystem.copyAsync({"from": db_path.fileCopyUri!, to: document_directory("SQLite") + "/" + path.basename(db_path.fileCopyUri!).replace(".sqlite3", "101.sqlite3")});
                        await test_import_1307_sqldb(db_path.fileCopyUri!);
                    }}/>
					<View style={styles.line_long}/>
					<Text style={styles.description_txt}>Developer Options :3</Text>
					</>
					{/* : null */}
				{/* } */}
				
				<Text style={styles.description_txt}>Illusi Version: {appConfig.version} Beta</Text>
				<Text style={styles.description_txt}>Battery Level: {battery}</Text>
			</ScrollView>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	top_container:{
		backgroundColor: colors.background,
		flex: 1,
	},
	header:{
		backgroundColor: colors.shelf,
		width: '100%',
		height: '13%',
		top: 0,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	top_text:{
		color: colors.text,
		fontSize: 18,
		top:10,
		fontWeight: '500'
	},
	description_txt:{
		color: colors.subtext,
		marginTop: 10,
		marginBottom: 20,
		marginHorizontal: 12,
		textAlign: 'left'
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
	section_container:{
		width: '100%', 
		height: 50, 
		backgroundColor: colors.track, 
		flexDirection: 'row', 
		alignItems: 'center'
	},
	btn_section_text:{
		color: colors.text,
		fontSize: 16,
		left:20
	}
});
export default ExtraScreen;