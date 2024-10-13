import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import { useTheme } from '@react-navigation/native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
// import * as AVExpo from 'expo-av'
import { MusicServiceType } from '../../../lib-origin/Illusive/src/types';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';


type KeyValue = {key: string, value: string};

function ExtraPlaylistConverter() {
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);
	
	// let cachedData = {};

	const confirmConvertPlaylistAlert = () =>
    Alert.alert(
		"Download All Tracks in Playlist",
		"Are you sure?",
		[ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			try {
				let tracks = [];
				if(selectedIllusiPlaylist == 'Library'){
					tracks = [...GLOBALS.global_var.sql_tracks]
				}else{
					tracks = await SQLActions.playlist_tracks(selectedIllusiPlaylist.replaceAll(' ','_'));
				}
				tracks = tracks.filter(item => item.youtube_id)

				const playlist_url = data.get(selectedServicePlaylist)
				
				if(selectedSegmentedServiceValue == "YouTube" && playlist_url !== undefined){
					// let playlistId = getYTPlaylistIdFromURL(playlist_url);
					// await insertIntoYouTubePlaylist(selectedServicePlaylist, tracks);
				} else if(selectedSegmentedServiceValue == "Spotify"){

				}
				else if(selectedSegmentedServiceValue == "Amazon"){
					
				}


				// await insertIntoAmazonMusicPlaylist(playlistURL, selectedServicePlaylist, [...GLOBALS.global_var.SQLTracks]);
				// let playlistId = getYTPlaylistIdFromURL(playlistURL)
				// await insertIntoYouTubePlaylist(playlistId, [...GLOBALS.global_var.SQLTracks].map(({video_id}) => (video_id)));
			} catch (error) {
				console.log(error)
			}
		} } ]
	);
	useEffect(() => {
		(async function() {
			// const playlists_names = await SQLActions.getAllPlaylists();
			// const push_data: KeyValue[] = []
			// push_data.push({key: '0', value: 'Library'})
			// for (let i = 0; i < playlists_names.length; i++) {
			// 	push_data.push({key: (i+1).toString(), value: playlists_names[i].title})
			// }
			// setIllusiPlaylistData(push_data)
			// let segmentedServiceValuesData: MusicServiceType[] = [];
			// if(Prefs.hasYouTubeCookies()) segmentedServiceValuesData.push("YouTube");
			// if(Prefs.hasSpotifyCookies()) segmentedServiceValuesData.push("Spotify");
			// if(Prefs.hasAmazonMusicCookies()) segmentedServiceValuesData.push("Amazon Music");
			// setSegmentedServiceValues(segmentedServiceValuesData);
		})()
	}, []);

	async function getServicePlaylistData(service_type: MusicServiceType){
		switch(service_type){
			// case("YouTube"):
			// 	let youtubedata = await getAllYoutubePlaylistsFromAccount();
			// 	if(youtubedata === undefined) break;
			// 	setServicePlaylistData([...youtubedata.keys()].map((el, idx) => {return {'key':String(idx), 'value': el}}))
			// 	setData(youtubedata)
			// 	break;
			// case("Spotify"):
			// 	break;
			// case("Amazon Music"):
			// 	let amazondata = await getAllAmazonMusicPlaylistsFromAccount();
			// 	setServicePlaylistData([...amazondata.keys()].map((el, idx) => {return {'key':String(idx), 'value': el}}))
			// 	setData(amazondata)
			// 	break;
		}
	}

	const [data, setData] = useState(new Map<string, string>());

	const [selectedIllusiPlaylist, setSelectedIllusiPlaylist] = React.useState("");
	const [illusiPlaylistData, setIllusiPlaylistData] = React.useState([] as KeyValue[]);

	const [segmentedServiceValues, setSegmentedServiceValues] = React.useState([] as MusicServiceType[]);
	const [selectedSegmentedServiceValue, setSelectedSegmentedServiceValue] = React.useState("");

	const [selectedServicePlaylist, setSelectedServicePlaylist] = React.useState("");
	const [servicePlaylistData, setServicePlaylistData] = React.useState([] as KeyValue[]);

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
				<SelectList 
					setSelected={(value: string) => setSelectedIllusiPlaylist(value)}
					data={illusiPlaylistData} 
					save="value"
					arrowicon={<></>}
					searchicon={<></>}
					searchPlaceholder={"Select Illusi Playlist"}
					placeholder='Select Illusi Playlist'
					inputStyles={{backgroundColor: colors.track, color: 'white'}}
					boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
					dropdownStyles={{backgroundColor: colors.track}}
					dropdownTextStyles={{color: 'white'}}
				/>
				{selectedIllusiPlaylist != undefined && selectedIllusiPlaylist !== "" && 
				<>
					<View style={{height: 15}}/>
					<Text style={styles.descriptiontxt}>Select service to convert playlist to</Text>
					<SegmentedControl 
						values={segmentedServiceValues}
						selectedIndex={undefined}
						onChange={async(event) => {setSelectedSegmentedServiceValue(event.nativeEvent.value); await getServicePlaylistData(event.nativeEvent.value as MusicServiceType)}}
					/>
					<View style={{height: 15}}/>
					<SelectList 
						setSelected={(value: string) => {setSelectedServicePlaylist(value)}}
						data={servicePlaylistData} 
						save="value"
						arrowicon={<></>}
						searchicon={<></>}
						searchPlaceholder={`Select ${selectedSegmentedServiceValue} Playlist`}
						placeholder={`Select ${selectedSegmentedServiceValue} Playlist`}
						inputStyles={{backgroundColor: colors.track, color: 'white'}}
						boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
						dropdownStyles={{backgroundColor: colors.track}}
						dropdownTextStyles={{color: 'white'}}
					/>
					<View style={{height: 15}}/>
					{selectedServicePlaylist != undefined && selectedServicePlaylist != "" && <ExtrasSectionButton show_arrow={false} text='Convert Playlist' icon='swap-horizontal' onPress={confirmConvertPlaylistAlert}/>}
				</>}
				
		</View>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
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