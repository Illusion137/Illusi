import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import { useTheme } from '@react-navigation/native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { MusicServiceMappedPlaylist, MusicServiceType } from '../../../lib-origin/Illusive/src/types';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { convert_playlist, loggedin_services } from '../../../lib-origin/Illusive/src/illusi/src/playlist_converter';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { alert_error } from '../../../lib-origin/Illusive/src/illusi/src/alert';
import { Constants } from '../../../lib-origin/Illusive/src/constants';
import { create_uri, music_service_to_music_service_uri } from '../../../lib-origin/Illusive/src/illusive_utilts';

type KeyValue = {key: string, value: string};
function ExtraPlaylistConverter() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
	
	const [data, set_data] = useState(new Map<string, MusicServiceMappedPlaylist>());

	const [selected_illusi_playlist_key, set_selected_illusi_playlist_key] = React.useState("");
	const [illusi_playlist_data, set_illusi_playlist_data] = React.useState<KeyValue[]>([]);

	const [segmented_service_values, set_segmented_service_values] = React.useState<MusicServiceType[]>([]);
	const [selected_segmented_service_value, set_selected_segmented_service_value] = React.useState<MusicServiceType>("YouTube");

	const [selected_service_playlist, set_selected_service_playlist] = React.useState("");
	const [service_playlist_data, set_service_playlist_data] = React.useState<KeyValue[]>([]);

	const confirm_convert_playlist_alert = () =>
    Alert.alert(
		"Download All Tracks in Playlist",
		"Are you sure?",
		[ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			try {
				const illusi_tracks = selected_illusi_playlist_key === Constants.library_write_playlist ? GLOBALS.global_var.sql_tracks.slice() : await SQLPlaylists.playlist_tracks(selected_illusi_playlist_key);
                const service_uri = music_service_to_music_service_uri(selected_segmented_service_value);
                const service_id = data.get("selected_service_playlist")!.url;
                await convert_playlist( illusi_tracks, selected_segmented_service_value, 
                    {
                        "to": { "uuid_uri": create_uri(service_uri, service_id) },
                        "full_sample": false
                    }
                );
			} catch (error) {
				alert_error({error: error as Error})
			}
		} } ]
	);
	useEffect(() => {
		(async function() {
			const playlists = await SQLPlaylists.all_playlists_data();
			const push_data: KeyValue[] = []
			push_data.push({key: Constants.library_write_playlist, value: 'Library'})
			for (let i = 0; i < playlists.length; i++)
				push_data.push({key: playlists[i].uuid, value: playlists[i].title})
			set_illusi_playlist_data(push_data)
			set_segmented_service_values(loggedin_services());
		})()
	}, []);

	async function get_service_playlist_data(service_type: MusicServiceType){
        const user_playlist_map = await Illusive.music_service.get(service_type)!.user_playlists_map();
		if("error" in user_playlist_map){
            alert_error(user_playlist_map.error![0]);
            return;
        }
        set_service_playlist_data([...user_playlist_map.map.keys()].map((el, idx) => {return {'key':String(idx), 'value': el}}));
        set_data(user_playlist_map.map);
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
				<SelectList 
					setSelected={(key: string) => set_selected_illusi_playlist_key(key)}
					data={illusi_playlist_data} 
					save="key"
					arrowicon={<></>}
					searchicon={<></>}
					searchPlaceholder={"Select Illusi Playlist"}
					placeholder='Select Illusi Playlist'
					inputStyles={{backgroundColor: colors.track, color: 'white'}}
					boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
					dropdownStyles={{backgroundColor: colors.track}}
					dropdownTextStyles={{color: 'white'}}
				/>
				{selected_illusi_playlist_key != undefined && selected_illusi_playlist_key !== "" && 
				<>
					<View style={{height: 15}}/>
					<Text style={styles.descriptiontxt}>Select service to convert playlist to</Text>
					<SegmentedControl 
						values={segmented_service_values}
						selectedIndex={undefined}
						fontStyle={{color: colors.text}}
						onChange={async(event) => {set_selected_segmented_service_value(event.nativeEvent.value as MusicServiceType); await get_service_playlist_data(event.nativeEvent.value as MusicServiceType)}}
					/>
					<View style={{height: 15}}/>
					<SelectList 
						setSelected={(value: string) => {set_selected_service_playlist(value)}}
						data={service_playlist_data} 
						save="value"
						arrowicon={<></>}
						searchicon={<></>}
						searchPlaceholder={`Select ${selected_segmented_service_value} Playlist`}
						placeholder={`Select ${selected_segmented_service_value} Playlist`}
						inputStyles={{backgroundColor: colors.track, color: 'white'}}
						boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
						dropdownStyles={{backgroundColor: colors.track}}
						dropdownTextStyles={{color: 'white'}}
					/>
					<View style={{height: 15}}/>
					{selected_service_playlist != undefined && selected_service_playlist != "" && <ExtrasSectionButton show_arrow={false} text='Convert Playlist' icon='swap-horizontal' onPress={confirm_convert_playlist_alert}/>}
				</>}
		</View>
	);
}
const theme_styles = (_: Prefs.Theme['colors']) => StyleSheet.create({
    descriptiontxt:{
		color: '#A0A0A0',
		marginHorizontal: 6,
		textAlign: 'left'
	},
	linelong:{
		width: "100%",
		height: 0.4,
		opacity: 0.2,
		backgroundColor: 'white',
	},
});
export default ExtraPlaylistConverter;