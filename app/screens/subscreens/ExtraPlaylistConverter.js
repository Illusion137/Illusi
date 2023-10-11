import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView , Alert, BackHandler, Modal, Pressable, FlatList} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import * as SQLActions from '../../../SQLActions';
import * as GLOBALS from '../../../globals';
import { useNavigation, useTheme } from '@react-navigation/native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as Prefs from '../../../Preferences'
import { getAllAmazonMusicPlaylistsFromAccount, getAllYoutubePlaylistsFromAccount } from '../../Illusive/IllusiveAccountPlaylistFinder';
import { getYTPlaylistIdFromURL, insertIntoAmazonMusicPlaylist, insertIntoYouTubePlaylist } from '../../Illusive/IllusiveInsertIntoPlaylist';
import axios from 'axios';
// import * as AVExpo from 'expo-av'

function ExtraPlaylistConverter({route}) {
	const { colors } = useTheme();
	const styles = themeStyles(colors);
	
	let cachedData = {};

	const confirmConvertPlaylistAlert = () =>
    Alert.alert(
		"Download All Tracks in Playlist",
		"Are you sure?",
		[ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			try {
				let tracks = [];
				if(selectedIllusiPlaylist == 'Library'){
					tracks = [...GLOBALS.SQLTracks]
				}else{
					tracks = await SQLActions.getPlaylistTracks(selectedIllusiPlaylist.replaceAll(' ','_'));
				}
				tracks = tracks.filter(item => item.youtube)

				let playlistURL = data.get(selectedServicePlaylist)
				
				if(selectedSegmentedServiceValue == "YouTube"){
					let playlistId = getYTPlaylistIdFromURL(playlistURL);
					await insertIntoYouTubePlaylist(selectedServicePlaylist, tracks);
				} else if(selectedSegmentedServiceValue == "Spotify"){

				}
				else if(selectedSegmentedServiceValue == "Amazon"){
					
				}


				// await insertIntoAmazonMusicPlaylist(playlistURL, selectedServicePlaylist, [...GLOBALS.SQLTracks]);
				// let playlistId = getYTPlaylistIdFromURL(playlistURL)
				// await insertIntoYouTubePlaylist(playlistId, [...GLOBALS.SQLTracks].map(({video_id}) => (video_id)));
			} catch (error) {
				console.log(error)
			}
		} } ]
	);
	useEffect(() => {
		(async function() {
			let playlists_names = await SQLActions.getAllPlaylists();
			let pushData = []
			pushData.push({key: '0', value: 'Library'})
			for (let i = 0; i < playlists_names.length; i++) {
				pushData.push({key: (i+1).toString(), value: playlists_names[i].playlist_name})
			}
			setIllusiPlaylistData(pushData)
			let segmentedServiceValuesData = [];
			if(Prefs.hasYouTubeCookies()) segmentedServiceValuesData.push("YouTube");
			// if(Prefs.hasSpotifyCookies()) segmentedServiceValuesData.push("Spotify");
			if(Prefs.hasAmazonCookies()) segmentedServiceValuesData.push("Amazon");
			setSegmentedServiceValues(segmentedServiceValuesData);
		})()
	}, []);

	async function getServicePlaylistData(val){
		switch(val){
			case("YouTube"):
				let youtubedata = await getAllYoutubePlaylistsFromAccount();
				setServicePlaylistData([...youtubedata.keys()].map((el, idx) => {return {'key':String(idx), 'value': el}}))
				setData(youtubedata)
				break;
			case("Spotify"):
				break;
			case("Amazon"):
				let amazondata = await getAllAmazonMusicPlaylistsFromAccount();
				setServicePlaylistData([...amazondata.keys()].map((el, idx) => {return {'key':String(idx), 'value': el}}))
				setData(amazondata)
				break;
		}
	}

	const [data,setData] = useState([]);

	const [selectedIllusiPlaylist, setSelectedIllusiPlaylist] = React.useState("");
	const [illusiPlaylistData, setIllusiPlaylistData] = React.useState("");

	const [segmentedServiceValues, setSegmentedServiceValues] = React.useState([]);
	const [selectedSegmentedServiceValue, setSelectedSegmentedServiceValue] = React.useState("");

	const [selectedServicePlaylist, setSelectedServicePlaylist] = React.useState("");
	const [servicePlaylistData, setServicePlaylistData] = React.useState("");

	return(
		<View style={{backgroundColor: colors.backgroundColor, width: '100%', flex: 1,}}>
				<SelectList 
					setSelected={(val) => setSelectedIllusiPlaylist(val)}
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
						onChange={async(event) => {setSelectedSegmentedServiceValue(event.nativeEvent.value); await getServicePlaylistData(event.nativeEvent.value)}}
					/>
					<View style={{height: 15}}/>
					<SelectList 
						setSelected={(val) => {setSelectedServicePlaylist(val)}}
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
					{selectedServicePlaylist != undefined && selectedServicePlaylist != "" && <ExtrasSectionButton showArrow={false} text='Convert Playlist' icon='swap-horizontal' onPress={confirmConvertPlaylistAlert}/>}
				</>}
				
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
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