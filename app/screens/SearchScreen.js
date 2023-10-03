import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ScrollView, TouchableHighlight, TouchableOpacity, Modal, Button, ImageBackground, Easing, Image } from 'react-native';
import SongComponentSearch from '../components/SongComponentSearch';
import { useTheme } from '@react-navigation/native';
// import searchVideo from '../usetube';
// import SearchYouTube, { ContinueYouTubeSearch } from '../Illusive/IllusiveSearch';
import { useNavigation } from '@react-navigation/native';
import SearchYouTube from '../Illusive/IllusiveSearch';
import * as SQLActions from '../../SQLActions'
import * as Prefs from '../../Preferences'
import { Ionicons, Octicons } from '@expo/vector-icons';
import TextTicker from 'react-native-text-ticker';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import SelectPlaylist from '../components/SelectPlaylist';

const SearchScreen = (props) => {
	const [data, setData] = useState('');
	const [searchingData, setSearchingData] = useState();
	const [searchingMode, setSearchingMode] = useState(true);
	const [recentData, setRecentData] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	
	const [continueData, setContinueData] = useState();
	const navigation = useNavigation()

	const [modalData, setModalData] = useState({'show':false, 'track_data': null})
	const [playlistsData, setPlaylistsData] = useState([])
	const inputRef = useRef();

	[isUsingRecentSearches, setIsUsingRecentSearches] = useState(true);

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	useEffect(() => {
		(async function() { 
			inputRef.current?.focus();
			let playlists = await SQLActions.getAllPlaylists();
	
			for(let i = 0; i < playlists.length; i++){
				let playlistTracks = await SQLActions.getPlaylistTracks(playlists[i].playlist_name.replaceAll(' ', '_'));
	
				playlists[i]['track_count'] = playlistTracks.length;
				playlists[i]['four_track'] = playlistTracks.slice(0,4);
				playlists[i]['pinned'] = await SQLActions.getIsPlaylistsPinned(playlists[i].playlist_name) == 0 ? false : true
			}
			let orderedPlaylists = []
			for(let i = 0; i < playlists.length; i++){
				if(playlists[i].pinned)
					orderedPlaylists.unshift(playlists[i])
				else
					orderedPlaylists.push(playlists[i])
			}
			setPlaylistsData(orderedPlaylists)
		})()
	}, []);

	function addFrom(track){
		setModalData({'show':true, 'track_data': track})
	}
	const renderPlaylistItem = ({item}) => (
		<SelectPlaylist title={item.playlist_name} pinned={item.pinned} four_track={item.four_track} track_count={item.track_count} />
	);

	const renderSongSearchComponents = ({ item }) => (
		<SongComponentSearch setPlaying={props.setPlaying} addFrom={addFrom.bind(this)} video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} video_duration={item.video_duration} saved={item.saved} downloaded={item.downloaded} uid={item.uid}/>
	);
	const renderQueryItems = ({ item }) => (
		<>
			<TouchableHighlight style={styles.queryItems} onPress={async () => {setSearchQuery(item); setSearchingMode(false); await Search(item)}}>
				<>
					{isUsingRecentSearches && <Ionicons name={'time-outline'} color={'#808080'} size={24} style={{left: 20,}} />}
					<Text style={styles.queryItemsText}>{item}</Text>
					<View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', right: 50}}>
					{isUsingRecentSearches &&< TouchableOpacity onPress={async () => {
						console.log('here')
						let recentSearchIndex = Prefs.prefs.search.recent_searches.findIndex(el => el == item);
						if(recentSearchIndex !== -1){
							Prefs.prefs.search.recent_searches = Prefs.prefs.search.recent_searches.splice(recentSearchIndex, 1);
						}
						setSearchingData(Prefs.prefs.search.recent_searches);
						await Prefs.savePrefs();
					}}>
							<Octicons name={'x'} color={colors.red} size={24} style={{left: 20,}} />
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
					onFocus={() => {getPreviousSearches()}} onChangeText={async (query) => {setSearchQuery(query); await GetSuggestions(query); if(query != ''){setIsUsingRecentSearches(false)} else{setIsUsingRecentSearches(true)} }} onSubmitEditing={async() => {await Search(searchQuery); setSearchingMode(false)}}/>
			</View>
			<View style={styles.searchview}>
				{searchingMode && <FlatList style={styles.searchinglist} data={searchingData} renderItem={renderQueryItems}/>}
				{!searchingMode && <FlatList style={styles.searchlist} data={data} renderItem={renderSongSearchComponents} /* onEndReached={async() => await ContinueSearch()} *//>}
			</View>
			<Modal
				animationType="slide"
				visible={modalData.show}
				presentationStyle={'pageSheet'}
				onRequestClose={() => {
				setModalData({'show':false, 'track_data': null});
				}}>
					<View style={{flex: 1, backgroundColor: colors.background}}>
						<View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
							<Button color={colors.primary} title={'Cancel'} onPress={() => {
								setModalData({'show':false, 'track_data': null});
							}}/>
							<Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 18}}>Add To Playlist</Text>
						</View>
						<Image source={modalData.track_data === null ? undefined : {uri: `https://img.youtube.com/vi/${modalData.track_data?.video_id}/mqdefault.jpg`}} resizeMode="cover" style={{
							width: '100%',
							height: '20%',
						}}/>
						<Text numberOfLines={1} style={{marginHorizontal: 20, bottom: 50, color: '#FFFFFF', fontWeight: 'bold', fontSize: 24}}>{modalData.track_data?.video_name || ""}</Text>
						<Text style={{marginHorizontal: 20, bottom: 50, color: '#FFFFFF', fontSize: 14}}>{modalData.track_data?.video_creator || ""}</Text>
						{/* <SegmentedControl /> */}
						<FlatList style={{bottom: 50}} data={playlistsData} renderItem={renderPlaylistItem}/>
					</View>
			</Modal>
		</View>
	);
	function getPreviousSearches(){
		setSearchingData(Prefs.prefs.search.recent_searches);
	}
	async function Search(query) {
		let recentSearchIndex = Prefs.prefs.search.recent_searches.findIndex(item => item == query);

		if(recentSearchIndex !== -1){
			Prefs.prefs.search.recent_searches.splice(recentSearchIndex, 1);
		}
		Prefs.prefs.search.recent_searches.unshift(query);
		Prefs.prefs.search.recent_searches = Prefs.prefs.search.recent_searches.slice(0,20);
		await Prefs.savePrefs();

		const search = await SearchYouTube(query)

		if(search === 0){return;}
		try {
			// setContinueData(search.continueData)
			for(let i = 0; i < search.data.length; i++){
				if(await SQLActions.checkIfVideoIdExists(search.data[i].video_id)){
					search.data[i]['saved'] = true;
				}
				else{
					search.data[i]['saved'] = false;
				}
			}
			setData(search.data);
		} catch (error) {}
		if(data == null){
			return;
		}
  	}
	async function ContinueSearch() {
		let search = await ContinueYouTubeSearch(continueData)
		try {
			let tempcontinueData = continueData
			tempcontinueData.token = search.token
			setContinueData(tempcontinueData)

			let allTrackData = await AsyncStorage.getItem('Library');
			if(allTrackData == null){
				let temp = data;
				setData(temp.concat(search.data));
				return
			}
			else{
				let allTracks = [];
				for(const d of allTrackData.toString().split('::')){
					allTracks.push(JSON.parse(d));
				}
				for(const newVideo of search.data){
					newVideo['saved'] = false;
					newVideo['downloaded'] = false;
					for(const video of allTracks){
						if(video.id == newVideo.id){
							if(video.saved){
								newVideo['saved'] = true;
							}
							if(video.downloaded){
								newVideo['downloaded'] = true;
							} else{
								newVideo['downloaded'] = false;
							}
						}
					}
				}
				let temp = data;
				setData(temp.concat(search.data));
			}
		} catch (error) {}
		if(data == null){
			return;
		}
  	}
	async function GetSuggestions(query){
		try {
			if(query == '' || query == null || query == undefined || query.replaceAll(' ', '') == ''){
				setSearchingData(Prefs.prefs.search.recent_searches);
				return;
			}
			setSearchingMode(true)
			const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${query}`);
			const json = await response.json();
			setSearchingData(json[1]);
		} catch (error) {
		}
	}
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
	},
	queryItems:{
		height: 50,
		width: '100%',
		alignItems: 'center',
		flexDirection: 'row'
	}
});
export default SearchScreen;