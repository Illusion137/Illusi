
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, FlatList, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponentSearch from '../../components/SongComponentSearch';
import ProgressBar from '../../components/ProgressBar';
import { GenerateNewUUID } from '../../Illusive/IllusiveSearch';


function GetAddPlaylistFrom({route}) {

	const inputRef = useRef()
	const navigation = useNavigation();

	const [progress, setProgress] = useState(0);
	const [isDoneSearching, setDoneSearching] = useState(false)
	const [data, setData] = useState([])
	const [title, setTitle] = useState('')
	const [badRequest, setBadRequest] = useState(false);
	
	const url = route.params.url;
	const service = route.params.title.toString().split(' ')[1]

	useEffect(() => {
		function setHeader() {
			navigation.setOptions({title: route.params.title})
			navigation.setOptions({ headerRight: () => (
				<Button
				color='#1313ff'
				onPress={() => ActionSheetIOS.showActionSheetWithOptions(
					{
					  options: ['Cancel', 'Save Playlist', 'Add Tracks To Library'],
					  cancelButtonIndex: 0,
					  userInterfaceStyle: 'dark',
					  
					},
					async(buttonIndex) => {
					  if (buttonIndex === 0) {
					  } else if (buttonIndex === 1) {
							let storage = await AsyncStorage.getItem('Playlist')
							let pushData = []
							data.forEach((track) => {
								let uuid = GenerateNewUUID()
								let dat = {
									"video_duration": track.video_duration,
									"video_name": track.video_name,
									"video_creator": track.video_creator,
									"video_id": track.video_id,
									"saved": true,
									"downloaded": false,
									"imported": false,
									"uuid": uuid,
									"uri": ""
								}
								pushData.push(dat)
							})
							if(storage == null){
								await AsyncStorage.setItem('Library', JSON.stringify(pushData))
								let duration = pushData.map(({video_duration}) => video_duration).reduce(function(prev, cur) {
									return prev + cur;
								})
								let addPlay = (await AsyncStorage.getItem('Playlists') || [] )
								addPlay.push({ pinned: false, playlistInfo:{title: title, trackLength: pushData.length, trackDuration: duration, tracks: pushData}})
								await AsyncStorage.setItem('Playlists',JSON.stringify(addPlay))
							}
							else{
								let parsedStorage = JSON.parse(storage)
								let pSet = new Set (parsedStorage.map(({video_id}) => video_id) )
								pushData.filter(item => !pSet.has(item.video_id))
								await AsyncStorage.setItem('Library', JSON.stringify(parsedStorage.concat(pushData)))
								let duration = pushData.map(({video_duration}) => video_duration).reduce(function(prev, cur) {
									return prev + cur;
								})
								let addPlay = (await AsyncStorage.getItem('Playlists') || [] )
								addPlay.push({ pinned: false, playlistInfo:{title: title, trackLength: pushData.length, trackDuration: duration, tracks: pushData}})
								await AsyncStorage.setItem('Playlists', JSON.stringify(addPlay))
							}
							
					  } else if (buttonIndex === 2) {
						let storage = await AsyncStorage.getItem('Playlist')
						let pushData = []
						data.forEach((track) => {
							let uuid = GenerateNewUUID()
							let dat = {
								"video_duration": track.video_duration,
								"video_name": track.video_name,
								"video_creator": track.video_creator,
								"video_id": track.video_id,
								"saved": true,
								"downloaded": false,
								"imported": false,
								"uuid": uuid,
								"uri": ""
							}
							pushData.push(dat)
						})
						if(storage == null){
							await AsyncStorage.setItem('Library', JSON.stringify(pushData))
						}
						else{
							let parsedStorage = JSON.parse(storage)
							let pSet = new Set (parsedStorage.map(({video_id}) => video_id) )
							pushData.filter(item => !pSet.has(item.video_id))
							await AsyncStorage.setItem('Library', JSON.stringify(parsedStorage.concat(pushData)))
						}
					  }
					}
				  )
			  }
				title="Save"
			/>
			)})
		}
		const fetchPlaylist = async() => { 
				try {
					switch(service){
						case('Musi'):
							const playlistParam = url.replace('https://feelthemusi.com/playlist/','')
							const response = await fetch(`https://feelthemusi.com/api/v4/playlists/fetch/${playlistParam}`);
							if (!response.ok) {
								setBadRequest(true);
							}
							
							const json = await response.json();
							let parsed = JSON.parse(json.success.data)

							setTitle(parsed.title);
							
							let storage = await AsyncStorage.getItem('Library');
							if(storage == null){
								setData(parsed.data);
								return
							}
							else{
								let allTracks = JSON.parse(storage);
				
								let arraySearchNewTracks = parsed.data.map(({video_id}) => video_id)
								let setSearchNewTracks = new Set(arraySearchNewTracks)
				
								allTracks.forEach(video => {
									if(setSearchNewTracks.has(video.video_id)){
										if(video.saved){
											parsed.data[arraySearchNewTracks.indexOf(video.video_id)]['saved'] = true;
											
											if(video.downloaded){
												parsed.data[arraySearchNewTracks.indexOf(video.video_id)]['downloaded'] = true;
											}
										}
									}
								});
							}

							setData(parsed.data);
					}
					setDoneSearching(true);
					setHeader();
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
			{/* { !isDoneSearching && <ProgressBar progressPercent={progress}/>} */}
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