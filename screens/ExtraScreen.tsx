import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, Linking} from 'react-native';
import ExtrasSectionButton from '@components/ExtrasSectionButton';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import appConfig from '../../app.config';
import * as Battery from 'expo-battery';
import { GLOBALS } from '@illusive/globals';
import { Prefs } from '@illusive/prefs';
import SegmentedControl, { NativeSegmentedControlIOSChangeEvent } from '@react-native-segmented-control/segmented-control';
import { single_case } from '@illusive/illusive_utilts';

function ExtraScreen() {
	const navigation: NavigationProp<any, any> = useNavigation();

    const { colors } = usePTheme();
	const styles = theme_styles(colors);
	
    async function change_theme(event: NativeSyntheticEvent<NativeSegmentedControlIOSChangeEvent>){
        const theme_key = event.nativeEvent.value.toLowerCase() as Prefs.PossibleThemes;
        await Prefs.save_pref('theme', theme_key);
        Prefs.pref_set_theme(GLOBALS.global_var.set_theme);
    }

	const [battery, set_battery] = React.useState(0.0);

	useEffect(() => {
		const interval_id = setInterval(async() => {  //assign interval to a variable to clear it.
			set_battery(await Battery.getBatteryLevelAsync());
		}, 2000);
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
					<ExtrasSectionButton indev={true} show_arrow={true} text='Keep Delete' icon='heart-outline' onPress={async () => navigation.navigate('Keep Delete')}/>
				<View style={styles.line_long}/>
				<Text style={styles.description_txt}>The Tinder of your Music; Swipe left to delete tracks or swipe right to keep</Text>

				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Settings' icon='settings-outline' onPress={async () => navigation.navigate('Settings') }/>
					<View style={styles.line_short}/>	
					<ExtrasSectionButton indev={true} show_arrow={true} text='Sleep Timer' icon='timer-outline' onPress={async () => navigation.navigate('Sleep Timer')}/>
					<View style={styles.line_short}/>
					<ExtrasSectionButton show_arrow={true} text='Discord Integration' icon='logo-discord' onPress={async () => navigation.navigate('Discord Integration')}/>
					<View style={styles.line_short}/>
					<ExtrasSectionButton show_arrow={true} text='External Services' icon='cog-outline' onPress={async () => navigation.navigate('External Services')}/>
				<View style={styles.line_long}/>

				<Text style={styles.description_txt}>Sign into external Music Services services such as YouTube, YouTube Music, Spotify and Amazon Music for extra features.</Text>

				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Batch Downloader' icon='file-tray-stacked-outline' onPress={async () => navigation.navigate('Batch Downloader')}/>
					<ExtrasSectionButton show_arrow={true} text='Batch Un-Downloader' icon='arrow-undo-outline' onPress={async () => navigation.navigate('Batch Un-Downloader')}/>
					<ExtrasSectionButton indev={true} show_arrow={true} text='Playlist Converter' icon='list-circle-outline' onPress={async () => navigation.navigate('Playlist Converter')}/>
					<View style={styles.line_short}/>
					<ExtrasSectionButton indev={true} show_arrow={true} text='Linker' icon='link-outline' onPress={async () => navigation.navigate('Linker')}/>
				<View style={styles.line_long}/>

				<Text style={styles.description_txt}>Hard Link playlist and other data from other Music Services. Automatically fetched on app startup.</Text>

				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Backpack' icon='bag-outline' onPress={async () => navigation.navigate('Backpack')}/>
				<View style={styles.line_long}/>
				
				<Text style={styles.description_txt}>Restore unavailable videos from Backpack</Text>

				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Themes' icon='brush-outline' onPress={async () => navigation.navigate('Themes')}/>
					<View style={styles.line_short}/>
					<SegmentedControl
						values={Prefs.all_themes().map(val => single_case(val))}
						selectedIndex={Prefs.all_themes().findIndex(item => item === Prefs.get_pref('theme'))}
						onChange={async(event) => await change_theme(event)}
						style={{backgroundColor: colors.background}}
						fontStyle={{color: colors.text}}
					/>
				<Text style={styles.description_txt}>Customize the look of Illusi</Text>

				<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='GitHub' icon='logo-github' onPress={async () => {
						await Linking.openURL('https://github.com/Illusion137')
					}}/>
					<View style={styles.line_short}/>
					<ExtrasSectionButton show_arrow={true} text='Statistics' icon='stats-chart-outline' onPress={async () => navigation.navigate('Statistics')}/>
					<ExtrasSectionButton show_arrow={true} text='Changelog' icon='list-outline' onPress={async () => navigation.navigate('Changelog')}/>
					<ExtrasSectionButton indev={true} show_arrow={true} text='Help' icon='help-outline' onPress={async () => navigation.navigate('Help')}/>
					<View style={styles.line_short}/>
				<View style={styles.line_long}/>
				<Text style={styles.description_txt}>Get to know Illusi</Text>

				{ Prefs.get_pref('dev_mode') ?
					<>
					<View style={styles.line_long}/>
					<ExtrasSectionButton show_arrow={true} text='Developer' icon='hammer-outline' onPress={async () => navigation.navigate('Developer')}/>
					<ExtrasSectionButton show_arrow={true} text='Developer Test Screen' icon='ticket-sharp' onPress={async () => navigation.navigate('Developer Test')}/>
					<View style={styles.line_long}/>
					<Text style={styles.description_txt}>Developer Options :3</Text>
					</> : null
				}
				
				<Text style={styles.description_txt}>Illusi Version: {appConfig.version}</Text>
				<Text style={styles.description_txt}>Last Synced: {Prefs.get_pref('last_synced').toLocaleString()}</Text>
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