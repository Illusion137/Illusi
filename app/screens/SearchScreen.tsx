import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ScrollView, TouchableHighlight, TouchableOpacity, Modal, Button, ImageBackground, Easing, Image, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import SearchYouTube, { ContinueYouTubeSearch, GenerateNewUID } from '../Illusive/IllusiveSearch';
import * as SQLActions from '../../SQLActions'
import * as GLOBALS from '../../globals';
import * as Prefs from '../../Preferences'
import { Ionicons, Octicons } from '@expo/vector-icons';
import TextTicker from 'react-native-text-ticker';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import AddToPlaylistsModal from './subscreens/AddToPlaylistsModal';
import { darkThemeDefault } from '../../Preferences';
import TrackComponent from '../components/TrackComponent';
import { Track } from '../../types';

function SearchScreen() {
	const [tracks, setTracks] = useState([]);
	const [searchingData, setSearchingData] = useState([] as string[]);
	const [searchingMode, setSearchingMode] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	
	const [continueData, setContinueData] = useState();
	const navigation = useNavigation();

	const inputRef = useRef();

	const [isUsingRecentSearches, setIsUsingRecentSearches] = useState(true);
    const [modalData, setModalData] = useState({'show':false, 'track_data': null})

	const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);

	useEffect(() => {
		(async function() { 
			// inputRef.current?.focus();
		})()
	}, []);

	function addFrom(show: boolean, track: null){
		setModalData({'show':show, 'track_data': track})
	}
	function getPreviousSearches(){
		setSearchingData(Prefs.prefs.search.recent_searches);
	}
	async function Search(query: string) {
		setTracks([]);
		// setSearchingMode(false);

		if(query.replaceAll(/\s/g,'') == ''){
			return null;
		}

		let recentSearchIndex = Prefs.prefs.search.recent_searches.findIndex(item => item == query);

		if(recentSearchIndex !== -1){
			Prefs.prefs.search.recent_searches.splice(recentSearchIndex, 1);
		}
		Prefs.prefs.search.recent_searches.unshift(query);
		Prefs.prefs.search.recent_searches = Prefs.prefs.search.recent_searches.slice(0,20);
		await Prefs.savePrefs();

		const search = await SearchYouTube(query)
		if(search.data.length === 0) return;
		try {
			// setContinueData(search.continueData)
			for(let i = 0; i < search.data.length; i++){
				search.data[i]['artwork']
				if(await SQLActions.checkIfVideoIdExists(search.data[i].video_id)){
					search.data[i]['saved'] = true;
				}
				else{
					search.data[i]['saved'] = false;
				}
			}
			setTracks(search.data);
		} catch (error) {
			Alert.alert('Error', error)
		}
		if(tracks == null){
			return;
		}
		setSearchingMode(false)
  	}
	// async function ContinueSearch() {
	// 	let search = await ContinueYouTubeSearch(continueData)
	// 	try {
	// 		let tempcontinueData = continueData
	// 		tempcontinueData.token = search.token
	// 		setContinueData(tempcontinueData)

	// 		let allTrackData = await AsyncStorage.getItem('Library');
	// 		if(allTrackData == null){
	// 			let temp = tracks;
	// 			setTracks(temp.concat(search.data));
	// 			return
	// 		}
	// 		else{
	// 			let allTracks = [];
	// 			for(const d of allTrackData.toString().split('::')){
	// 				allTracks.push(JSON.parse(d));
	// 			}
	// 			for(const newVideo of search.data){
	// 				newVideo['saved'] = false;
	// 				newVideo['downloaded'] = false;
	// 				for(const video of allTracks){
	// 					if(video.id == newVideo.id){
	// 						if(video.saved){
	// 							newVideo['saved'] = true;
	// 						}
	// 						if(video.downloaded){
	// 							newVideo['downloaded'] = true;
	// 						} else{
	// 							newVideo['downloaded'] = false;
	// 						}
	// 					}
	// 				}
	// 			}
	// 			let temp = tracks;
	// 			setTracks(temp.concat(search.data));
	// 		}
	// 	} catch (error) {}
	// 	if(tracks == null){
	// 		return;
	// 	}
  	// }
	async function onEndEditing(){
		if(await Search(searchQuery) == null){return;} setSearchingMode(false)
	}
	async function onTextUpdate(search_query: string){
		setSearchQuery(search_query); 
		if(search_query.replaceAll(/\s/g,'') != '')
			setIsUsingRecentSearches(false);
		else setIsUsingRecentSearches(true);
	}
	async function getSuggestions(search_query: string){
		try {
			if(search_query != null && !search_query.trim()){
				setSearchingData(Prefs.prefs.search.recent_searches);
				return;
			}
			else if(search_query == null){
				setSearchingData(Prefs.prefs.search.recent_searches);
				return;
			}
			setSearchingMode(true)
			const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${search_query}`);
			const json: any[][] = await response.json();
			setSearchingData(json[1]);
		} catch (error) {
			console.log(error)
		}
	}
	useEffect(() => {
		getSuggestions(searchQuery);
	},[searchQuery]);



	const renderSongSearchComponents = (item: {item: Track}) => (
		<TrackComponent track_data={item.item} write_playlist='LIBRARY' from='YouTube Mix'/>
	);
	const renderQueryItems = (item: {item: string}) => (
		<>
			<TouchableHighlight style={styles.queryItems} onPress={async () => {setSearchQuery(item.item); setSearchingMode(false); await Search(item.item)}}>
				<>
					{isUsingRecentSearches && <Ionicons name={'time-outline'} color={'#808080'} size={24} style={{left: 20,}} />}
					<Text style={styles.queryItemsText} numberOfLines={1}>{item.item}</Text>
					<View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', right: 50}}>
					{isUsingRecentSearches &&< TouchableOpacity onPress={async () => {
						setSearchingMode(false)
						let recentSearchIndex = Prefs.prefs.search.recent_searches.findIndex(el => el == item.item);
						if(recentSearchIndex !== -1){
							Prefs.prefs.search.recent_searches.splice(recentSearchIndex, 1);
						}

						setSearchingData(Prefs.prefs.search.recent_searches);
						await Prefs.savePrefs();
						setSearchingMode(true);
					}}>
							<Octicons name={'x'} color={colors.red} size={24} style={{left: 50, padding: 10, paddingRight: 40}} />
						</TouchableOpacity> }
					</View>
				</>
			</TouchableHighlight>
			<View style={{width: '93%', height: 1, backgroundColor: colors.line, left: 10}}/>
		</>
	);
		
	return (
		<View style={styles.topcontainer}>
			<View style={styles.wrapper}>
				<TextInput ref={inputRef} value={searchQuery} autoCorrect={false} placeholder='Search' placeholderTextColor={colors.subtext} style={styles.searchinput} 
					onFocus={getPreviousSearches} 
					onChangeText={onTextUpdate} 
					onEndEditing={onEndEditing} 
					// onSubmitEditing={async() => {if(await Search(searchQuery) == null){return;} setSearchingMode(false)}}
					/>
			</View>
			<View style={styles.searchview}>
				{searchingMode ? <FlatList style={styles.searchlist} data={searchingData} renderItem={renderQueryItems}/> : null }
				{!searchingMode ? <FlatList style={styles.searchlist} data={tracks} renderItem={renderSongSearchComponents}/> : null }
			</View>
			<AddToPlaylistsModal modalData={modalData}/>
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
	topcontainer:{
		backgroundColor: colors.background,
		flex: 1,
		justifyContent: 'flex-start'
	},
	wrapper:{
		// justifyContent: 'center',
		alignItems: 'center'
	},
	searchinput:{
		color: '#F0F0F0',
		backgroundColor: colors.searchInput,
		padding: 15,
		top: 70,
		borderRadius: 30,
		width: '90%',
	},
	searchlist:{

	},searchview:{
		backgroundColor: colors.background,
		top: 80,
		height: '83%'
	},
	queryItemsText:{
		color: colors.text,
		fontSize: 17,
		marginLeft: 40,
		width: '70%'
	},
	queryItems:{
		height: 50,
		width: '100%',
		alignItems: 'center',
		flexDirection: 'row'
	}
});
export default SearchScreen;