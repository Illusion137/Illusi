
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, FlatList, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponentSearch from '../../components/SongComponentSearch';
import ProgressBar from '../../components/ProgressBar';
import { GenerateNewUID } from '../../Illusive/IllusiveSearch';
import * as SQLActions from '../../../SQLActions';
import * as Illusive from '../../Illusive/IllusivePlaylistResolver';
import BigList from 'react-native-big-list';

function GetAddPlaylistFrom({route}) {
	const inputRef = useRef()
	const navigation = useNavigation();
	
	const [progress, setProgress] = useState(0);
	const [isDoneSearching, setDoneSearching] = useState(false)
	const [data, setData] = useState([])
	let serviceT = "";
	let serviceTEx = "";
	// const [title, setTitle] = useState('')
	const [badRequest, setBadRequest] = useState(false);
	
	const url = route.params.url;
	const service = route.params.title.toString().split(' ')[1]

	function setHeader(header_data, header_title) {
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
						let m_title = header_title;
						await SQLActions.createPlaylist(m_title);
						let allPromiseTracks = []
						for(const track of header_data){
							let uid = GenerateNewUID(track.video_name)
							let t = new SQLActions.Track({
								"video_duration": track.video_duration,
								"video_name": track.video_name,
								"video_creator": track.video_creator,
								"video_id": track.video_id,
								"saved": true,
								"uid": uid,
								"youtube": serviceT == "YouTube" ? true : false,
								"spotify": serviceTEx == "Spotify" ? true : false,
								"amazonmusic": serviceTEx == "Amazon" ? true : false,
							})
							if(!(await SQLActions.checkIfVideoIdExists(track.video_id))){
								allPromiseTracks.push(SQLActions.insertTrackData(t));
								allPromiseTracks.push(SQLActions.insertTrackIntoPlaylist(t, m_title));
							} else{
								let videoIDUIDTrack = await SQLActions.getExistingVideoIdUID(track.video_id);
								allPromiseTracks.push(SQLActions.insertTrackIntoPlaylist(videoIDUIDTrack, m_title));	
							}
						}
						await Promise.all(allPromiseTracks)
						navigation.navigate('Tabs')
						
				  } else if (buttonIndex === 2) {
					let allPromiseTracks = []
					for(const track of header_data){
						let uid = GenerateNewUID(track.video_name)
						if(!(await SQLActions.checkIfVideoIdExists(track.video_id))){
							allPromiseTracks.push(SQLActions.insertTrackData(new SQLActions.Track({
								"video_duration": track.video_duration,
								"video_name": track.video_name,
								"video_creator": track.video_creator,
								"video_id": track.video_id,
								"saved": true,
								"uid": uid,
								"youtube": serviceT == "YouTube" ? true : false,
								"spotify": serviceTEx == "Spotify" ? true : false,
								"amazonmusic": serviceTEx == "Amazon" ? true : false,
							})))
						}
					}
					await Promise.all(allPromiseTracks)
					navigation.navigate('Tabs')
				}
			}
			)
		}
		title="Save"
		/>
		)})
	}
	useEffect(() => {
		(async function() {
				try {
					switch(service){
						case('Musi'):
							let musiData = await Illusive.getMusiPlaylist(url);
							serviceT = 'YouTube'
							setData(musiData.data);
							setDoneSearching(true);
							setHeader(musiData.data, musiData.title)
							break;
						case('YouTube'):
							let youTubeData = await Illusive.getYoutubePlaylist(url);
							serviceT = 'YouTube'
							setData(youTubeData.data);
							setDoneSearching(true);
							setHeader(youTubeData.data, youTubeData.title)
							break;
						case('YTMusic'):
							let youTubeMusicData = await Illusive.getYoutubeMusicPlaylist(url);
							serviceT = 'YouTube'
							setData(youTubeMusicData.data);
							setDoneSearching(true);
							setHeader(youTubeMusicData.data, youTubeMusicData.title)
							break;
						case('Spotify'):
						 	let spotifyData = await Illusive.getSpotifyPlaylist(url);
							serviceT = 'YouTube'
							serviceTEx = 'Spotify'
							setData(spotifyData.data);
							setDoneSearching(true);
							setHeader(spotifyData.data, spotifyData.title)
							break;
						case('Amazon'):
							let amazonMusicData = await Illusive.getAmazonMusicPlaylist(url);
							serviceT = 'YouTube'
							serviceTEx = 'Amazon'
						   	setData(amazonMusicData.data);
						   	setDoneSearching(true);
						   	setHeader(amazonMusicData.data, amazonMusicData.title)
						   	break;
					}
				}
				catch(error){
					console.log(error)
				}
			})();
	}, []);

	const renderItem = ({ item }) => (
		<SongComponentSearch video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} video_duration={item.video_duration} saved={item.saved} downloaded={item.downloaded} uid={GenerateNewUID(item.video_name)}/>
	);

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1,}}>
			{badRequest && <Text style={styles.badRequestText}>Bad Request check the url again</Text>}
			{/* { !isDoneSearching && <ProgressBar progressPercent={progress}/>} */}
			{ isDoneSearching && <View style={styles.searchview}>
				<BigList data={data} renderItem={renderItem} itemHeight={61} removeClippedSubviews={true} initialNumToRender={1}/>
			</View>}
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