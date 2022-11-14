import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ScrollView } from 'react-native';
import SongComponentSearch from '../components/SongComponentSearch';
// import searchVideo from '../usetube';
import illusiveSearchVideo from '../Illusive/IllusiveSearch';

const SearchScreen = (props) => {

	const [data, setData] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	
	const renderItem = ({ item }) => (
		// data = await AsyncStorage.getItem('Library');
		<SongComponentSearch id={item.video_id} imguri={`https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`} title={item.video_name} artist={item.video_creator} duration={item.video_duration} saved={item.saved} downloaded={item.downloaded}/>
		);
		
		return (
			<View style={styles.topcontainer}>
			<View style={styles.wrapper}>
				<TextInput placeholder='Search' placeholderTextColor={'#808080'} style={styles.searchinput} onChangeText={query => setSearchQuery(query)} onSubmitEditing={() => search(searchQuery)}/>
			</View>
			<View style={styles.searchview}>
				<FlatList style={styles.searchlist} data={data} renderItem={renderItem}/>
			</View>

		</View>
	);
	async function search(query) {
		let search = await illusiveSearchVideo(query)
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
		} catch (error) {
			console.log(error);
		  }
		// console.log(data);
		
		if(data == null){
			console.log('Error in search');
			return;
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
	}
});
export default SearchScreen;