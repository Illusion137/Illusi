
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useTheme } from '@react-navigation/native';
import { SelectList } from 'react-native-dropdown-select-list';
import { getAllAmazonMusicPlaylistsFromAccount, getAllSpotifyPlaylistsFromAccount, getAllYTMusicPlaylistsFromAccount, getAllYoutubePlaylistsFromAccount } from '../../Illusive/IllusiveAccountPlaylistFinder';
import * as Prefs from '../../../Preferences';

function AddPlaylistFrom({route}) {
	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const inputRef = useRef()
	const navigation = useNavigation();

	const [isNextDisabled, setDisabled] = useState(true)
	const [inputValue, setInputValue] = React.useState("");

	const [selected, setSelected] = React.useState("");
	const [playlistNameData, setPlaylistNameData] = React.useState(undefined);
	const [playlistNames, setPlaylistNames] = React.useState(undefined);

	const from = route.params.title.toString().split(' ')[1]

	function setHeader() {
		navigation.setOptions({title: route.params.title})
	}
	useEffect(() => {
		(async function() {
			setHeader();
			if(Prefs.getExperimentalFeatureEnabled('get_account_playlists_in_get_playlist')){
				switch(from){
					case('YouTube'):
						if(Prefs.hasYouTubeCookies()){
							let ytdata = await getAllYoutubePlaylistsFromAccount()
							setPlaylistNameData(ytdata)
							setPlaylistNames([...ytdata.keys()]);
						}
						break;
					case('YTMusic'):
						if(Prefs.hasYouTubeCookies() && Prefs.hasYouTubeMusicCookies()){
							let ytmusicdata = await getAllYTMusicPlaylistsFromAccount()
							setPlaylistNameData(ytmusicdata)
							setPlaylistNames([...ytmusicdata.keys()]);
						}
						break;
					case('Musi'):
						break;
					case('Spotify'):
						if(Prefs.hasSpotifyCookies()){
							let spotifydata = await getAllSpotifyPlaylistsFromAccount();
							setPlaylistNameData(spotifydata)
							setPlaylistNames([...spotifydata.keys()]);
						}
						break;
					case('Amazon'):
						if(Prefs.hasAmazonCookies()){
							let amazondata = await getAllAmazonMusicPlaylistsFromAccount();
							setPlaylistNameData(amazondata)
							setPlaylistNames([...amazondata.keys()]);
						}
						break;
					default:
						break;
				}
			}
		})()
	}, []);
	
	function getLinkText(){
		switch(from){
			case('YouTube'):
				return 'https://www.youtube.com/playlist?list=...'
			case('YTMusic'):
				return 'https://music.youtube.com/playlist?list=...'
			case('Musi'):
				return 'https://feelthemusi.com/playlist/...'
			case('Spotify'):
				return 'https://open.spotify.com/playlist/... or  \n - https://open.spotify.com/album/...'
			case('Amazon'):
				return 'https://music.amazon.com/user-playlists/... or  \n - https://music.amazon.com/playlists/...'
			default:
				break;
		}
	}
	const defaultlink = getLinkText()
	function isValidInput(text){
		switch(from){
			case('YouTube'):
				if( RegExp(/(https?:\/\/)(www\.)?youtube\.com\/playlist\?list=.+/i).test(text)){ return true; } else{return false;}
			case('YTMusic'):
				if( RegExp(/(https?:\/\/)(www\.)?music\.youtube\.com\/playlist\?list=.+/i).test(text)){ return true; } else{return false;}
			case('Musi'):
				if( RegExp(/(https?:\/\/)feelthemusi\.com\/playlist\/.+/i).test(text)){ return true; } else{return false;}
			case('Spotify'):
				if( RegExp(/(https?:\/\/)open\.spotify\.com\/(playlist|album)\/.+/i).test(text)){ return true; }else{return false;}
			case('Amazon'):
				if( RegExp(/(https?:\/\/)music\.amazon\.com\/(playlists|user-playlists)\/.+/i).test(text)){ return true; }else{return false;}
			default:
				break;
		}
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<TextInput autoCorrect={false} ref={inputRef} placeholder='Playlist Link' placeholderTextColor='#808080' style={styles.nameinput} 
				value={inputValue}
				onChangeText={text => { setInputValue(text); if(isValidInput(text)){ setDisabled(false) ; navigation.setOptions({ headerRight: () => (
								<Button
									color='blue'
									onPress={() => navigation.navigate('GetAddPlaylistFrom', {url: text, title: route.params.title})}
									title="Next"
								/>
								)}) } else if(!isNextDisabled){
									navigation.setOptions({ headerRight: () => (
										<Button
											onPress={() => {}}
											title="Next"
											color='#808080'			
										/>
										)})
								} }}></TextInput>
			<Text style={styles.enterittext}>Enter a link to a {from} Playlist to add it to your {from}.</Text>
			<Text style={styles.looksliketext}>A {from} playlist link usually looks like the following:</Text>
			<Text style={styles.exlinktext}> - {defaultlink}</Text>
			<View style={{height: 20}}/>
			{playlistNames != undefined && <SelectList 
					setSelected={(val) => {setSelected(val); setInputValue(playlistNameData.get(val)); setDisabled(false);						navigation.setOptions({ headerRight: () => (
						<Button
							color='blue'
							onPress={() => navigation.navigate('GetAddPlaylistFrom', {url: playlistNameData.get(val), title: route.params.title})}
							title="Next"
						/>
					)}) }}
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
const themeStyles = (colors) => StyleSheet.create({
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
export default AddPlaylistFrom;