import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ytdl from "react-native-ytdl"
import * as FileSystem from 'expo-file-system';
import GLOBALS from '../../globals';
import * as Haptics from 'expo-haptics';
import TrackPlayer from 'react-native-track-player';
import { Queue } from '../Illusive/Queue';

function SongComponent(props) {
	const id = props.video_id;
	
	const [downloaded, setDownloaded] = useState(props.downloaded)
	const [isDownloading, setIsDownloading] = useState(false)
	const [pSaved, setPSaved] = useState(props.saved)
	const [dProgress, setDProgress] = useState(0)
	
	const { colors } = useTheme();
	const styles = themeStyles(colors);
	function playShuffle(data){
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
				return
	}
	useEffect(() => {
		let interval;
		if(GLOBALS?.DOWNLOADING[0]?.uuid === props.uuid){
			setDownloaded(true)
			setIsDownloading(true)
			setDProgress(GLOBALS?.DOWNLOADING[0]?.progress)
			interval = setInterval(() => {
				if(GLOBALS?.DOWNLOADING[0]?.uuid !== props.uuid){
					return
				}
				setDProgress(GLOBALS.DOWNLOADING[0]?.progress)
			},2000)
		}
		return () => clearInterval(interval);
	}, []);
	return (
		<TouchableOpacity style={{backgroundColor: 'black'}} onLongPress={async() => {
			if(GLOBALS.IsPlaying){
				let track= {url: FileSystem.documentDirectory + props.uri, title: props.video_name, artist: props.video_creator, duration: props.duration, id: props.uuid, artwork: (id == "" ? null : `https://img.youtube.com/vi/${id}/mqdefault.jpg`)};
				TrackPlayer.add(track, (await TrackPlayer.getCurrentTrack())+1 + GLOBALS.pQueue.length);
				GLOBALS.pQueue.enqueue(track);
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
			}
		}} 
		onPress={ async ()=>{
			if(props.setPlaying == undefined){
				return
			}
			if(props.from == 'Downloaded'){
				let libStorage = await AsyncStorage.getItem('Library')
				let data = JSON.parse(libStorage)

				// let data = parsedStorage.filter(item=>item.downloaded || item.imported)
				playShuffle(data)
				return
			}
			if(props.from == 'Recently Added'){
				let libStorage = await AsyncStorage.getItem('Library')
				if(libStorage != null){
					let parsedStorage = JSON.parse(libStorage)
					
					parsedStorage.reverse()
					let data = parsedStorage.slice(0,200)
					playShuffle(data)
					return
				}
			}
			if(props.from != 'My Library'){ //From Playlist
				try {					
					let parsedStorage = JSON.parse(await AsyncStorage.getItem('Playlists'));
					let index = parsedStorage.findIndex((item, i) => {
						return item.playlistInfo.title == props.from
					})
					if(index == -1){return}
					let libStorage = await AsyncStorage.getItem('Library')
					let libMap; 
					if(libStorage != null){
						libMap = new Map(JSON.parse(libStorage).map((track) => [track.uuid, track]))
					}
					let newMappedTracks = []
					for(const trackUUID of parsedStorage[index].playlistInfo.tracks){
						newMappedTracks.push(libMap.get(trackUUID))
					}
					let data = newMappedTracks
					console.log(data)
					playShuffle(data)
				} catch (error) {
					Alert.alert(error)
				}
				return
			}
			let storage = await AsyncStorage.getItem('Library');
			if (storage == null){
				return;
			}
			let data = JSON.parse(storage);
			playShuffle(data)
		} } >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={{uri:`https://img.youtube.com/vi/${id}/mqdefault.jpg`, cache: 'force-cache'}} style={styles.image}></Image>
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
				{props.writePlaylist != undefined && <TouchableOpacity disabled={pSaved} style={{justifyContent: 'center'}} onPress={ async() => {
					let storage = await AsyncStorage.getItem('Playlists')
					let parsedStorage = JSON.parse(storage)
					let pIndex = parsedStorage.findIndex((item, i) => {return props.writePlaylist == item.playlistInfo.title})
					
					parsedStorage[pIndex].playlistInfo.tracks.push(props.uuid)
					
					await AsyncStorage.setItem('Playlists', JSON.stringify(parsedStorage))
					setPSaved(true)
						
					}}>
				<Ionicons name={!pSaved ? "add" : "checkmark"} size={30} color={colors.primary} style={{left: 0}}/>
				</TouchableOpacity>}
				{props.editMode == 1 && !downloaded && !props.imported && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
							let libStorage = await AsyncStorage.getItem('Library')
							let parsedStorage = JSON.parse(libStorage)
			
							let index = parsedStorage.findIndex((item, i) => {
								return props.uuid == item.uuid
							})
							if(!parsedStorage[index].downloaded && GLOBALS.DOWNLOADING.findIndex((item,i) => {return item.uuid == props.uuid}) == -1){
								setDownloaded(true)
								let result = await props.downloadVideo(props.uuid,props.video_id, props.duration, setDProgress, setIsDownloading)
								if(result === 0){
									setDownloaded(false)
								}
							}
						}}>
					<Ionicons name="download-outline" size={30} color={colors.primary} style={{left: 10}}/>
				</TouchableOpacity>}
				{isDownloading && <Text style={{color: 'white', alignSelf: 'flex-end', right: 10, bottom: 10}}>{dProgress}%</Text>}
				{props.editMode == 2 && !isDownloading && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
						let storage = await AsyncStorage.getItem('Library')
						let parsedStorage = JSON.parse(storage)

						if(props.uri != ""){
							await FileSystem.deleteAsync(FileSystem.documentDirectory + props.uri)
						}

						parsedStorage = parsedStorage.filter(item => item.uuid !== props.uuid)
						await AsyncStorage.setItem('Library', JSON.stringify(parsedStorage))
						props.refreshData(parsedStorage)

						let playlistStorage = await AsyncStorage.getItem('Playlists')
						if(playlistStorage != null){
							let parsedPStorage = JSON.parse(playlistStorage)
							
							let newPlaylists = []
							for(const playlist of parsedPStorage){
								let pIndex = playlist.playlistInfo.tracks.findIndex((item, i) => {
									return props.uuid == item
								})
								if(pIndex != -1){
									playlist.playlistInfo.tracks.splice(pIndex, 1)
								}
								newPlaylists.push(playlist)
							}
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