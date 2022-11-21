import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ScrollView, TouchableHighlight } from 'react-native';
import SongComponentSearch from '../components/SongComponentSearch';
// import searchVideo from '../usetube';
import SearchYouTubeVideos from '../Illusive/IllusiveSearch';

const SearchScreen = (props) => {

	const [data, setData] = useState('');
	const [searchingData, setSearchingData] = useState('');
	const [searchingMode, setSearchingMode] = useState(true);
	const [recentData, setRecentData] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	
	const renderSongSearchComponents = ({ item }) => (
		<SongComponentSearch id={item.video_id} imguri={`https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`} title={item.video_name} artist={item.video_creator} duration={item.video_duration} saved={item.saved} downloaded={item.downloaded}/>
	);
	const renderQueryItems = ({ item }) => (
		<>
			<TouchableHighlight style={styles.queryItems} onPress={async () => {setSearchQuery(item); setSearchingMode(false); await Search(searchQuery)}}>
					<Text style={styles.queryItemsText}>{item}</Text>
			</TouchableHighlight>
			<View style={{width: '93%', height: 1, backgroundColor: '#505050', left: 10}}/>
		</>
	);
		
	return (
		<View style={styles.topcontainer}>
			<View style={styles.wrapper}>
				<TextInput value={searchQuery} autoCorrect={false} placeholder='Search' placeholderTextColor={'#808080'} style={styles.searchinput} onChangeText={async (query) => {setSearchQuery(query); await GetSuggestions(query);}} onSubmitEditing={async() => {await Search(searchQuery); setSearchingMode(false)}}/>
			</View>
			<View style={styles.searchview}>
				{searchingMode && <FlatList style={styles.searchinglist} data={searchingData} renderItem={renderQueryItems}/>}
				{!searchingMode && <FlatList style={styles.searchlist} data={data} renderItem={renderSongSearchComponents}/>}
			</View>
		</View>
	);
	async function Search(query) {
		let search = await SearchYouTubeVideos(query)
		try {
			let allTrackData = await AsyncStorage.getItem('Library');
			if(allTrackData == null){
				setData(search);
				return
			}
			else{
				let allTracks = [];
				allTrackData.toString().split('::').forEach(d => {
					allTracks.push(JSON.parse(d));
				});
				search.forEach(newVideo => {
					newVideo['saved'] = false;
					newVideo['downloaded'] = false;
					allTracks.forEach(video => {
						// console.log(video.id + ':' + newVideo.id)
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
					})
				});
				setData(search);
			}
		} catch (error) {console.log(error);}
		if(data == null){
			console.log('Error in search');
			return;
		}
  	}
	async function GetSuggestions(query){
		try {
			setSearchingMode(true)
			const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${query}`);
			const json = await response.json();
			setSearchingData(json[1]);
		} catch (error) {
			console.log(error);
		}
	}
}
const styles = StyleSheet.create({
	topcontainer:{
		// backgroundColor: '#FF6000',
		backgroundColor: '#000000',
		flex: 1,
		justifyContent: 'flex-start'
	},
	wrapper:{
		// justifyContent: 'center',
		alignItems: 'center'
	},
	searchinput:{
		color: '#F0F0F0',
		backgroundColor: '#313131',
		padding: 15,
		top: 70,
		borderRadius: 30,
		width: '90%',
	},
	searchlist:{

	},searchview:{
		backgroundColor: '#000000',
		top: 80,
		height: '83%'
	},
	queryItemsText:{
		color: '#FFFFFF',
		fontSize: 17,
		marginLeft: 50,
	},
	queryItems:{
		height: 50,
		width: '100%',
		justifyContent: 'center',
	}
});
export default SearchScreen;