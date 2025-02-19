import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import { useTheme } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { if_confirm } from '../../../lib-origin/Illusive/src/illusi/src/illusi_utils';
import { batch_undownload } from '../../../lib-origin/Illusive/src/illusi/src/downloader';
import { is_empty } from '../../../lib-origin/origin/src/utils/util';
import { Constants } from '../../../lib-origin/Illusive/src/constants';
import * as Progress from 'react-native-progress';

export default function ExtraBatchUndownloaderScreen() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
	
	const [selected_key, set_selected_key] = React.useState<string>("");
	const [playlist_undownload_data, set_playlist_undownload_data] = React.useState<{key: string, value: string}[]>([]);
	const [progress, set_progress] = React.useState<number>(0);

	async function undownload_playlist(){
        if(is_empty(selected_key)){ return; }
        batch_undownload(selected_key, undefined, (updated_progress) => set_progress(updated_progress));
    }

	useEffect(() => {
		(async function() {
			const playlists = await SQLPlaylists.all_playlists_data();
			const playlists_entries: {key: string, value: string}[] = []
			playlists_entries.push({key: Constants.library_write_playlist, value: 'Library'});
			for (let i = 0; i < playlists.length; i++)
				playlists_entries.push({key: playlists[i].uuid, value: playlists[i].title});
			set_playlist_undownload_data(playlists_entries);
		})()
	}, []);

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
				<View style={{height: 15}}/>
				<Text style={styles.warntxt}>WARNING!!</Text>
				<Text style={styles.warntxt}>This page is destructive</Text>
				<Text style={styles.warntxt}>Use it carefully</Text>
				<View style={{height: 5}}/>
				<Text style={{...styles.warntxt, fontSize: 14, color: colors.text} }>You can hide this screen using the 'hide_batch_undownloader' preference</Text>
				<View style={{height: 15}}/>
				<SelectList 
					setSelected={(key: string) => {set_selected_key(key); set_progress(0)}}
					data={playlist_undownload_data}
					save="key"
					arrowicon={<></>}
					searchicon={<></>}
					searchPlaceholder={"Select Playlist"}
					placeholder='Select Playlist'
					inputStyles={{backgroundColor: colors.track, color: 'white'}}
					boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
					dropdownStyles={{backgroundColor: colors.track}}
					dropdownTextStyles={{color: 'white'}}
				/>
				<ExtrasSectionButton show_arrow={false} text='Undownload all From Playlist' icon='trash' onPress={async() => await if_confirm("Un-Download Tracks in Playlist", "Are You Sure?", undownload_playlist)}/>
				<View style={{height: 15}}/>
				{progress == 0 ? null : <Progress.Bar progress={progress} width={Dimensions.get('screen').width}/>}
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    descriptiontxt:{
		color: colors.subtext,
		marginTop: 10,
		marginBottom: 20,
		marginHorizontal: 12,
		textAlign: 'left'
	},
	warntxt: {
		color: colors.red, fontWeight: '800', fontSize: 30
	},
	linelong:{
		width: "100%",
		height: 0.4,
		opacity: 0.2,
		backgroundColor: colors.line,
	},
});