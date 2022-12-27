
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, FlatList, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponentSearch from '../../components/SongComponentSearch';
import ProgressBar from '../../components/ProgressBar';


function GetAddPlaylistFrom({route}) {

	const inputRef = useRef()
	const navigation = useNavigation();

	const [progress, setProgress] = useState(0);
	const [isDoneSearching, setDoneSearching] = useState(false)
	const [data, setData] = useState('')
	const [title, setTitle] = useState('')
	const [badRequest, setBadRequest] = useState(false);
	
	const url = route.params.url;
	const service = route.params.title.toString().split(' ')[1]

	useEffect(() => {
		function setHeader() {
			navigation.setOptions({title: route.params.title})
		}
		setHeader();
		const fetchPlaylist = async() => { 
			setData('');
				try {
					switch(service){
						case('Musi'):
							const playlistParam = url.replace('https://feelthemusi.com/playlist/','')
							const response = await fetch(`https://feelthemusi.com/api/v4/playlists/fetch/${playlistParam}`);
							setProgress(30);
							if (!response.ok) {
								setBadRequest(true);
							}
							
							const json = await response.json();
							setProgress(60);
							let parsed = JSON.parse(json.success.data)

							setTitle(parsed.title);

							let allTrackData = await AsyncStorage.getItem('Library');
							if(allTrackData == null){
								setData(parsed.data);
								return
							}
							else{
								let allTracks = JSON.parse(allTrackData)
								parsed.data.forEach(newVideo => {
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
							}

							setData(parsed);
							setProgress(100);
					}
					setDoneSearching(true);
				}
				catch(error){
					console.log(error);
				}
		}
		fetchPlaylist().catch(console.error);
	}, []);

	const renderItem = ({ item }) => (
		<SongComponentSearch video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} video_duration={item.video_duration} saved={item.saved} downloaded={item.downloaded}/>
	);

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1,}}>
			{badRequest && <Text style={styles.badRequestText}>Bad Request check the url again</Text>}
			{ !isDoneSearching && <ProgressBar progressPercent={progress}/>}
			{/* { isDoneSearching && <View style={styles.searchview}> */}
				<FlatList data={data} renderItem={renderItem}/>
			{/* </View>} */}
		</View>
	);
}
const styles = StyleSheet.create({
	nameinput:{
		backgroundColor: '#121212',
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
	},
	searchview:{
		backgroundColor: '#000000',
		top: 0,
		height: '100%'
	},
	badRequestText:{
		position: 'absolute',
		left: '50%',
		top: '50%',
		color: 'white',
		fontSize: 40
	}
});
export default GetAddPlaylistFrom;