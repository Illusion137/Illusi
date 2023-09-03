
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, FlatList, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponentSearch from '../../components/SongComponentSearch';
import ProgressBar from '../../components/ProgressBar';
import { GenerateNewUUID } from '../../Illusive/IllusiveSearch';
import * as SQLActions from '../../../SQLActions';

function GetAddPlaylistFrom({route}) {
	const inputRef = useRef()
	const navigation = useNavigation();
	
	const [progress, setProgress] = useState(0);
	const [isDoneSearching, setDoneSearching] = useState(false)
	const [data, setData] = useState([])
	let copyData = []
	const [title, setTitle] = useState('')
	const [badRequest, setBadRequest] = useState(false);
	
	const url = route.params.url;
	const service = route.params.title.toString().split(' ')[1]

	function setHeader(data, title) {
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
						let m_title = title;
						await SQLActions.createPlaylist(m_title);
						for(const track of data){
							let uuid = GenerateNewUUID(track.video_name)
							let t = new SQLActions.Track({
								"video_duration": track.video_duration,
								"video_name": track.video_name,
								"video_creator": track.video_creator,
								"video_id": track.video_id,
								"saved": true,
								"uuid": uuid,
							})
							if(!(await SQLActions.checkIfVideoIdExists(track.video_id)))
								await SQLActions.insertTrackData(t);
							await SQLActions.insertTrackIntoPlaylist(t, m_title);
						}
						navigation.navigate('Tabs')
						
				  } else if (buttonIndex === 2) { 
					for(const track of data){
						let uuid = GenerateNewUUID(track.video_name)
						if(!(await SQLActions.checkIfVideoIdExists(track.video_id))){
							await SQLActions.insertTrackData(new SQLActions.Track({
								"video_duration": track.video_duration,
								"video_name": track.video_name,
								"video_creator": track.video_creator,
								"video_id": track.video_id,
								"saved": true,
								"uuid": uuid,
							}))
						}
					}
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
							const playlistParam = url.replace('https://feelthemusi.com/playlist/','')
							const response = await fetch(`https://feelthemusi.com/api/v4/playlists/fetch/${playlistParam}`);
							if (!response.ok) {
								setBadRequest(true);
							}
							
							const json = await response.json();
							let parsed = JSON.parse(json.success.data)
							setTitle(parsed.title);
							
							for(let i = 0; i < parsed.data.length; i++){
								parsed.data[i]['saved'] = false;
								if(await SQLActions.checkIfVideoIdExists(parsed.data[i].video_id))
									parsed.data[i]['saved'] = true;
							}

							setData(parsed.data);
							setDoneSearching(true);
							setHeader(parsed.data, parsed.title)
					}
				}
				catch(error){
					console.log(error);
				}
			})();
	}, []);

	const renderItem = ({ item }) => (
		<SongComponentSearch video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} video_duration={item.video_duration} saved={item.saved} downloaded={item.downloaded}/>
	);

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1,}}>
			{badRequest && <Text style={styles.badRequestText}>Bad Request check the url again</Text>}
			{/* { !isDoneSearching && <ProgressBar progressPercent={progress}/>} */}
			{ isDoneSearching && <View style={styles.searchview}>
				<FlatList data={data} renderItem={renderItem} removeClippedSubviews={true} initialNumToRender={1}/>
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