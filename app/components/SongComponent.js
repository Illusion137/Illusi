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
import YTDL from '../Illusive/IllusiveYTDL';
import * as SQLActions from '../../SQLActions';

function SongComponent(props) {
	const id = props.video_id;
	
	const [downloaded, setDownloaded] = useState(props.downloaded)
	const [isDownloading, setIsDownloading] = useState(false)
	const [pSaved, setPSaved] = useState(props.saved || false)
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
					return item.uid == props.uid
				});
				if(dataIndex != 0){
					data.swapItems(0, dataIndex);
				}
				props.setPlaying(data, props.from);
				return
	}
	useEffect(() => {
		const depth = 3;
		let index = -1;
		for(let i = 0; i < depth; i++){
			if(GLOBALS?.DOWNLOADING[i]?.uid === props.uid)
				index = i;
		}
		let interval;
		if(index !== -1){
			// console.log(GLOBALS?.DOWNLOADING)
			setDownloaded(true)
			setIsDownloading(true)
			setDProgress(GLOBALS?.DOWNLOADING[index]?.progress)
			interval = setInterval(() => {
				const depth = 3;
				let index = -1;
				for(let i = 0; i < depth; i++){
					if(GLOBALS?.DOWNLOADING[i]?.uid === props.uid)
						index = i;
				}
				if(index === -1){
					return
				}
				setDProgress(GLOBALS?.DOWNLOADING[index]?.progress)
			},2000)
		}
		return () => clearInterval(interval);
	}, []);
	return (
		<TouchableOpacity style={{backgroundColor: colors.track}} onLongPress={async() => {
			if(GLOBALS.IsPlaying){
				let track= {url: FileSystem.documentDirectory + props.media_URI, title: props.video_name, artist: props.video_creator, duration: props.duration, id: props.uid, artwork: (id == "" ? null : `https://img.youtube.com/vi/${id}/mqdefault.jpg`)};
				TrackPlayer.add(track, (await TrackPlayer.getCurrentTrack())+1 + GLOBALS.pQueue.length);
				GLOBALS.pQueue.enqueue(track);
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
			}
		}} 
		onPress={ async ()=>{
			if(props.setPlaying == undefined){
				// console.log("shit went south")
				return
			}
			if(props.from == 'Downloaded'){
				let tracks = GLOBALS.SQLTracks;

				tracks = tracks.filter(item=>item.downloaded || item.imported)
				if(tracks != []) 
					playShuffle(data)
				return
			}
			if(props.from == 'Recently Added'){
				let tracks = GLOBALS.SQLTracks;
				tracks.reverse()
				tracks.slice(0,200)
				if(trackData != [])
					playShuffle(data)
				return
			}
			if(props.from != 'My Library'){ //From Playlist
				try {
					let playlistTracks = await SQLActions.getPlaylistTracks(props.from.replaceAll(' ', '_'));
					playlistTracks = playlistTracks.filter(item=>item.downloaded || item.imported)
					playShuffle(playlistTracks)
				} catch (error) {
					Alert.alert(error)
				}
				return
			}
			let tracks = GLOBALS.SQLTracks;

			playShuffle(tracks)
		} } >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					{(!props.imported || false) && <Image source={{uri:`https://img.youtube.com/vi/${id}/mqdefault.jpg`, cache: 'force-cache'}} style={styles.image}></Image>}
					{(props.imported || false) && <Image source={require("../../assets/notfound.png")} style={styles.image}></Image>}
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.video_creator}</Text>
					<View style={{flexDirection: 'row'}}>
						{(!props.imported || false) && <Ionicons name="logo-youtube" size={15} color={colors.primary} style={styles.icon}/>}
						{(props.imported || false) && <Ionicons name="cloud-upload" size={15} color={colors.primary} style={styles.icon}/>}
						{(downloaded || false) && <Ionicons name="save-outline" size={15} color={colors.primary} style={styles.icon}/>}
					</View>
				</View>
				{props.writePlaylist != undefined && <TouchableOpacity disabled={pSaved} style={{justifyContent: 'center'}} onPress={ async() => {
					await SQLActions.insertTrackIntoPlaylist({'uid': props.uid}, props.writePlaylist);
					setPSaved(true)
					}}>
				<Ionicons name={!pSaved ? "add" : "checkmark"} size={30} color={colors.primary} style={{left: 10}}/>
				</TouchableOpacity>}
				{props.editMode == 1 && !downloaded && !props.imported && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
							let track = await SQLActions.fetchTrackDataFromUID(props.uid);
			
							if(!track.downloaded && GLOBALS.DOWNLOADING.findIndex((item,i) => {return item.uid == props.uid}) == -1){
								setDownloaded(true)
								let result = await props.downloadVideo(props.uid,props.video_id, props.duration, setDProgress, setIsDownloading)
								if(result === 0){
									setDownloaded(false)
								}
							}
						}}>
					<Ionicons name="download-outline" size={30} color={colors.primary} style={{left: 10}}/>
				</TouchableOpacity>}
				{isDownloading && <Text style={{color: 'white', alignSelf: 'flex-end', right: 10, bottom: 10}}>{dProgress}%</Text>}
				{props.editMode == 2 && !isDownloading && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
						if(props.playlistFrom === undefined){
							if(props.media_URI != ""){
								await FileSystem.deleteAsync(FileSystem.documentDirectory + props.media_URI)
							}
							let playlists = await SQLActions.getAllPlaylists();
							for(let i = 0; i < playlists; i++){
								await SQLActions.deleteTrackInPlaylist(playlists[i].replaceAll(' ', '_'), props.uid)
							}
							await SQLActions.deleteTrack(props.uid);
							await SQLActions.fetchTrackData(); 
							await props.refreshData(GLOBALS.SQLTracks);
						} else{
							await SQLActions.deleteTrackInPlaylist(props.playlistFrom.replaceAll(' ', '_'), props.uid)
							await props.refreshData();
						}
					}}>
					<Ionicons name="trash-outline" size={30} color={colors.red} style={styles.elseIcon}/>
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