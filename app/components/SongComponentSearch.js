import React, {useState} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ytdl from "react-native-ytdl"
import * as FileSystem from 'expo-file-system';

function SongComponentSearch(props) {
		
	const [saved, isSaved] = useState(props.saved);
	// const [downloaded, isDownloaded] = useState(props.downloaded);
	return (
		<TouchableOpacity>
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={{uri:`https://img.youtube.com/vi/${props.video_id}/mqdefault.jpg`}} style={styles.image}></Image>
				</View>
				<View style={styles.text}>				
					<Text style={styles.title} numberOfLines={1} >{props.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.video_creator}</Text>
				</View>
				<TouchableOpacity disabled={saved} style={{justifyContent: 'center'}} onPress={async()=>{
						if(!saved){
							try{
								let storage = await AsyncStorage.getItem('Library');
								let data = {
									video_name: props.video_name || "",
									video_creator: props.video_creator || "",
									video_id: props.video_id || 0,
									video_duration: props.video_duration || 0,
									saved: true,
									downloaded: false,
									imported: false,
									uuid: props.uuid,
									uri: ""
								}
								if(storage == null){
									AsyncStorage.setItem('Library', JSON.stringify([data]));
								}else{
									let parsedStorage = JSON.parse(storage)
									if(parsedStorage === undefined){return;}
									parsedStorage.push(data)

									AsyncStorage.setItem('Library', JSON.stringify(parsedStorage));
								}
								isSaved(true)
							}catch(e){
								console.log(e);
								return;
							}
						}
						// else if(!downloaded){
						// 	let storage = await AsyncStorage.getItem('Library');

						// 	let allTracks = JSON.parse(storage);
						// 	let arraySearchNewTracks = allTracks.map(({video_id}) => video_id)
						// 	allTracks[arraySearchNewTracks.indexOf(props.video_id)]['downloaded'] = true;
							
						// 	AsyncStorage.setItem('Library', JSON.stringify(allTracks));

						// 	const youtubeURL = 'http://www.youtube.com/watch?v=' + props.video_id;
						// 	const urls = await ytdl(youtubeURL, { quality: 'lowestaudio' });
						// 	console.log(urls[0].url)

						// 	await FileSystem.downloadAsync(
						// 		urls[0].url,
						// 		FileSystem.documentDirectory + 'small.mp3'
						// 	  )
						// 		.then(({ uri }) => {
						// 		  console.log('Finished downloading to ', uri);
						// 		})
						// 		.catch(error => {
						// 		  console.error(error);
						// 		});

						// 	isDownloaded(true);
						// }
						else{
							return;
						}
					}}>
					<Ionicons name={!saved ? "add" : "checkmark"} size={30} color='#AA00FF' style={styles.icon}/>
				</TouchableOpacity>
			</View>
			<View style={styles.line}/>

		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	songbox:{
		width: '100%',
		height: 60,
		flexDirection: 'row',
	},
	image:{
		left: 10,
		height: '80%',
		width: 65,
		borderRadius: 5
	},
	text:{
		width: '65%',
		top: 5,
		left: 20
	},
	title:{
		color: '#D0D0D0',
		fontSize:15,
	},
	artist:{
		color: '#808080',
		fontSize:14
	},
	line:{
		height: 1,
		backgroundColor: '#202020',
		width: '90%',
		left: 85
	},
	icon:{
		// backgroundColor: 'rgba(255,255,255,0.4)',
		right: 10,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 30,
		paddingRight: 30
	}
});

export default SongComponentSearch;