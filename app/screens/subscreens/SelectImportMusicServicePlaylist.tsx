
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import { SelectList } from 'react-native-dropdown-select-list';
import { getAllAmazonMusicPlaylistsFromAccount, getAllSpotifyPlaylistsFromAccount, getAllYTMusicPlaylistsFromAccount, getAllYoutubePlaylistsFromAccount } from '../../Illusive/IllusiveAccountPlaylistFinder';
import * as Prefs from '../../../Preferences';
import { MusicService, MusicServiceType, Route } from '../../../types';
import { MusicServices } from '../../../MusicServices';

export default function SelectImportMusicServicePlaylist( params: {route: any} ) {
	const ts_route = params.route as Route<{title: string}>;
	const { colors } = useTheme() as typeof Prefs.darkThemeDefault;
	const styles = themeStyles(colors);

	const inputRef = useRef()
	const navigation: NavigationProp<any, any> = useNavigation();

	const [isNextDisabled, setDisabled] = useState(true)
	const [inputValue, setInputValue] = React.useState("");

	const [selected, setSelected] = React.useState("");
	const [playlistNameData, setPlaylistNameData] = React.useState(new Map<string, string>());
	const [playlistNames, setPlaylistNames] = React.useState([] as string[]);

	const music_service_from = ts_route.params.title.replace('Import ', '').replace(' Playlist', '') as MusicServiceType;
	const music_service: MusicService = MusicServices.music_service.get(music_service_from) as MusicService;

	function setHeader() {
		navigation.setOptions({title: ts_route.params.title})
	}
	useEffect(() => {
		(async function() {
			setHeader();
			if(Prefs.getExperimentalFeatureEnabled('get_account_playlists_in_get_playlist')){
				if(music_service !== undefined){
					if((music_service.has_credentials === undefined || music_service.has_credentials()) && music_service.get_playlists_list !== undefined){
						const playlist_map = await music_service.get_playlists_list();
						setPlaylistNameData(playlist_map);
						setPlaylistNames([...playlist_map.keys()]);
					}
				}
			}
		})()
	}, []);
	

	function isValidImportURL(url: string){
		return music_service.valid_playlist_url_regex !== undefined && music_service.valid_playlist_url_regex.test(url);
	}

	function onURLUpdate(url: string){
		setInputValue(url); 
		if(isValidImportURL(url)){ 
			setDisabled(false); 
			navigation.setOptions({ headerRight: () => (
				<Button color='blue' onPress={() => navigation.navigate('ImportMusicServicePlaylist', {'url': url, 'title': ts_route.params.title})} title="Next" />
			)}) 
		} 
		else if(!isNextDisabled){
			navigation.setOptions({ headerRight: () => (
				<Button onPress={() => {}} title="Next" color='#808080' />
			)})
		}
	}
	function onSetSelectedURL(selected_url: string){
		setSelected(selected_url); 
		setInputValue(playlistNameData.get(selected_url) ?? ""); 
		setDisabled(false);
		navigation.setOptions({ headerRight: () => (
			<Button color='blue' onPress={() => navigation.navigate('ImportMusicServicePlaylist', {url: playlistNameData.get(selected_url), title: ts_route.params.title})} title="Next"
			/>
		)}) 
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<TextInput autoCorrect={false} ref={inputRef as any} placeholder='Playlist Link' placeholderTextColor='#808080' style={styles.nameinput} 
				value={inputValue}
				onChangeText={onURLUpdate}></TextInput>
			<Text style={styles.enterittext}>Enter a link to a {music_service_from} Playlist to add it to your {music_service_from}.</Text>
			<Text style={styles.looksliketext}>A {music_service_from} playlist link usually looks like the following:</Text>
			<Text style={styles.exlinktext}> - {music_service.link_text}</Text>
			<View style={{height: 20}}/>
			{playlistNames.length > 0 && <SelectList 
					setSelected={onSetSelectedURL}
					data={playlistNames} 
					save="value"
					arrowicon={<></>}
					searchicon={<></>}
					searchPlaceholder={"Select Playlist"}
					placeholder="Select Playlist"
					inputStyles={{backgroundColor: colors.track, color: 'white'}}
					boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
					dropdownStyles={{backgroundColor: colors.track}}
					dropdownTextStyles={{color: 'white'}}
				/>}
		</View>
	);
}
const themeStyles = (colors: typeof Prefs.darkThemeDefault.colors) => StyleSheet.create({
	nameinput:{
		backgroundColor: colors.shelf,
		height: 60,
		color: 'white',
		width: '100%',
		padding: 10,
	},
	enterittext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 10
	},
	looksliketext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 15
	},
	exlinktext:{
		color: '#909090',
		marginHorizontal: 10
	}
});