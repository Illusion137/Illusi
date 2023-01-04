import React, {useState} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ytdl from "react-native-ytdl"
import * as FileSystem from 'expo-file-system';
import { GenerateNewUUID } from '../Illusive/IllusiveSearch';

function SongComponent(props) {
	const id = props.video_id;
	
	const [downloaded, setDownloaded] = useState(props.downloaded)
	const [isDownloading, setIsDownloading] = useState(false)
	const [pSaved, setPSaved] = useState(props.saved)
	const [dProgress, setDProgress] = useState(0)
	
	const { colors } = useTheme();
	const styles = themeStyles(colors);
	function callback(downloadProgress){
		const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
		// console.log(' : ', progress)
		
		if(dProgress < progress * 100 + 1){
			setDProgress(Math.floor(progress*100))
		}
	}
	return (
		<TouchableOpacity style={{backgroundColor: 'black'}} onPress={ async ()=>{
			if(props.setPlaying == undefined){
				return
			}
			let storage = await AsyncStorage.getItem('Library');
			if (storage == null){
				return;
			}
			let data = JSON.parse(storage);
			let currentIndex = data.length, randomIndex;

			while (currentIndex != 0) {

				randomIndex = Math.floor(Math.random() * currentIndex);
				currentIndex--;

				[data[currentIndex], data[randomIndex]] = [
				data[randomIndex], data[currentIndex]];
			}
			
			Array.prototype.swapItems = function(a, b){
				this[a] = this.splice(b, 1, this[a])[0];
				return this;
			}
			let dataIndex = data.findIndex((item, i) => {
				return item.uuid == props.uuid
			});
			if(dataIndex != 0){
				data.swapItems(0, dataIndex);
			}
			props.setPlaying(data, props.from);
		} } >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={{uri:`https://img.youtube.com/vi/${id}/mqdefault.jpg`}} style={styles.image}></Image>
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.video_creator}</Text>
					<View style={{flexDirection: 'row'}}>
						{!props.imported && <Ionicons name="logo-youtube" size={15} color={colors.primary} style={styles.icon}/>}
						{props.imported && <Ionicons name="cloud-upload" size={15} color={colors.primary} style={styles.icon}/>}
						{downloaded && <Ionicons name="save-outline" size={15} color={colors.primary} style={styles.icon}/>}
					</View>
				</View>
				{props.writePlaylist != undefined && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
					let storage = await AsyncStorage.getItem('Playlists')
					let dat = {
						video_name: props.video_name || "",
						video_creator: props.video_creator || "",
							video_id: props.video_id || 0,
							video_duration: props.video_duration || 0,
							saved: props.saved,
							downloaded: props.downloaded,
							imported: props.imported,
							uuid: props.uuid,
							uri: props.uri
						}
						let parsedStorage = JSON.parse(storage)
						let pIndex = parsedStorage.findIndex((item, i) => {return props.writePlaylist == item.playlistInfo.title})
						
						parsedStorage[pIndex].playlistInfo.tracks.push(dat)
						parsedStorage[pIndex].playlistInfo.trackLength = parsedStorage[pIndex].playlistInfo.tracks.length
						parsedStorage[pIndex].playlistInfo.trackDuration += parsedStorage[pIndex].playlistInfo.trackDuration
						
						await AsyncStorage.setItem('Playlists', JSON.stringify(parsedStorage))
						
					}}>
				<Ionicons name={!pSaved ? "add" : "checkmark"} size={30} color={colors.primary} style={styles.elseIcon}/>
				</TouchableOpacity>}
				{props.editMode == 1 && !downloaded && !props.imported && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
					setDownloaded(true)
					
					let storage = await AsyncStorage.getItem('Library');
					
					let allTracks = JSON.parse(storage);
					let arraySearchNewTracks = allTracks.map(({video_id}) => video_id)
					
					let returnuri;
					let dstorage = await AsyncStorage.getItem('DownloadQueue');
					
					if(dstorage == null || JSON.parse(dstorage) == []){
						const youtubeURL = 'http://www.youtube.com/watch?v=' + props.video_id;
						
						let downloadURI;
						//140
						try {
							downloadURI = await ytdl(youtubeURL, { quality: '140' });
									// console.log(downloadURI[0].url)
								} catch (error) {
									Alert.alert("This file doesn't exist in a m4a format you may try again but idk man")
									return
								}
								

								await AsyncStorage.setItem('DownloadQueue', JSON.stringify([props.uuid]))
								const downloadResumable = FileSystem.createDownloadResumable(downloadURI[0].url, FileSystem.documentDirectory + props.uuid + '.mp4', {}, callback);
								try {
									setIsDownloading(true)

									const { uri } = await downloadResumable.downloadAsync();
									console.log('Finished downloading to ', uri);
									let parsedStorage = JSON.parse(await AsyncStorage.getItem('DownloadQueue'))
									parsedStorage.shift()
									await AsyncStorage.setItem('DownloadQueue', JSON.stringify(parsedStorage))
									returnuri = uri
								} catch (e) {
									setIsDownloading(false)
									console.error(e);
									returnuri = 0;
								}
							}else{
								let parsedStorage = JSON.parse(dstorage);
								parsedStorage.push(props.uuid)
								await AsyncStorage.setItem('DownloadQueue', JSON.stringify(parsedStorage))
								returnuri = 0;
							}
							setIsDownloading(false)

							if(returnuri == 0){
								return
							}
							allTracks[arraySearchNewTracks.indexOf(props.video_id)]['downloaded'] = true;
							allTracks[arraySearchNewTracks.indexOf(props.video_id)]['uri'] = returnuri;
							await AsyncStorage.setItem('Library',JSON.stringify(allTracks))
							
						}}>
					<Ionicons name="download-outline" size={30} color={colors.primary} style={styles.elseIcon}/>
				</TouchableOpacity>}
				{isDownloading && <Text style={{color: 'white', alignSelf: 'flex-end', right: 10, bottom: 10}}>{dProgress}%</Text>}
				{props.editMode == 2 && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
						let storage = await AsyncStorage.getItem('Library')
						let parsedStorage = JSON.parse(storage)

						if(props.uri != ""){
							await FileSystem.deleteAsync(props.uri)
						}

						parsedStorage = parsedStorage.filter(item => item.uuid !== props.uuid)
						await AsyncStorage.setItem('Library', JSON.stringify(parsedStorage))
						props.refreshData(parsedStorage)

						let playlistStorage = await AsyncStorage.getItem('Playlists')
						if(playlistStorage != null){
							let parsedPStorage = JSON.parse(playlistStorage)
							
							let newPlaylists = []
							parsedPStorage.forEach((playlist) => {
								let pIndex = playlist.playlistInfo.tracks.findIndex((item, i) => {
									return props.uuid == item.uuid
								})
								if(pIndex != -1){
									playlist.playlistInfo.trackLength -= 1 
									playlist.playlistInfo.trackDuration -= playlist.playlistInfo.tracks[pIndex].video_duration
									playlist.playlistInfo.tracks.splice(pIndex, 1)
									newPlaylists.push(playlist)
								}
							});
							await AsyncStorage.setItem('Playlists', JSON.stringify(newPlaylists))
						}
					}}>
					<Ionicons name="trash-outline" size={30} color={'#FF0000'} style={styles.elseIcon}/>
				</TouchableOpacity>}
			</View>
			<View style={styles.line}/>
		</TouchableOpacity>
	);
}

const themeStyles = (colors) => StyleSheet.create({
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
		marginRight: 5
	},
	elseIcon:{
		right: 10,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 30,
		paddingRight: 30
	}
});

export default SongComponent;