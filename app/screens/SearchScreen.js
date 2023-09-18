import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ScrollView, TouchableHighlight } from 'react-native';
import SongComponentSearch from '../components/SongComponentSearch';
import { useTheme } from '@react-navigation/native';
// import searchVideo from '../usetube';
// import SearchYouTube, { ContinueYouTubeSearch } from '../Illusive/IllusiveSearch';
import { useNavigation } from '@react-navigation/native';
import SearchYouTube from '../Illusive/IllusiveSearch';
import * as SQLActions from '../../SQLActions'

const SearchScreen = (props) => {

	const [data, setData] = useState('');
	const [searchingData, setSearchingData] = useState();
	const [searchingMode, setSearchingMode] = useState(true);
	const [recentData, setRecentData] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	
	const [continueData, setContinueData] = useState();
	const navigation = useNavigation()

	const inputRef = useRef();

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	useEffect( () => {
		inputRef.current?.focus();
	}, []);

	const renderSongSearchComponents = ({ item }) => (
		<SongComponentSearch video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} video_duration={item.video_duration} saved={item.saved} downloaded={item.downloaded} uid={item.uid}/>
	);
	const renderQueryItems = ({ item }) => (
		<>
			<TouchableHighlight style={styles.queryItems} onPress={async () => {setSearchQuery(item); setSearchingMode(false); await Search(item)}}>
					<Text style={styles.queryItemsText}>{item}</Text>
			</TouchableHighlight>
			<View style={{width: '93%', height: 1, backgroundColor: colors.line, left: 10}}/>
		</>
	);
		
	return (
		<View style={styles.topcontainer}>
			<View style={styles.wrapper}>
				<TextInput ref={inputRef} value={searchQuery} autoCorrect={false} placeholder='Search' placeholderTextColor={colors.subtext} style={styles.searchinput} 
					onFocus={GetPreviousSearches} onChangeText={async (query) => {setSearchQuery(query); await GetSuggestions(query);}} onSubmitEditing={async() => {await Search(searchQuery); setSearchingMode(false)}}/>
			</View>
			<View style={styles.searchview}>
				{searchingMode && <FlatList style={styles.searchinglist} data={searchingData} renderItem={renderQueryItems}/>}
				{!searchingMode && <FlatList style={styles.searchlist} data={data} renderItem={renderSongSearchComponents} /* onEndReached={async() => await ContinueSearch()} *//>}
			</View>
		</View>
	);
	async function GetPreviousSearches(){
		try {
			// setSearchingMode(true)
			// const previousSearches = AsyncStorage.getItem();
			// const json = await response.json();
			// setSearchingData(json[1]);
		} catch (error) {
			console.log(error);
		}
	}
	async function Search(query) {
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
		} catch (error) {console.log(error);}
		if(data == null){
			console.log('Error in search');
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
					}
				}
				let temp = data;
				setData(temp.concat(search.data));
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
		marginLeft: 50,
	},
	queryItems:{
		height: 50,
		width: '100%',
		justifyContent: 'center',
	}
});
export default SearchScreen;