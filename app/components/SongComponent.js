import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ytdl from "react-native-ytdl"
import * as FileSystem from 'expo-file-system';
import * as GLOBALS from '../../globals';
import * as Haptics from 'expo-haptics';
import TrackPlayer from 'react-native-track-player';
import { Queue } from '../Illusive/Queue';
import * as SQLActions from '../../SQLActions';
import * as Prefs from '../../Preferences';

function SongComponent(props) {
	const id = props.video_id;
	const [downloading, setDownloading] = useState( GLOBALS.DOWNLOADING.findIndex((item) => item.uid == props.uid) != -1)
	const [downloaded, setDownloaded] = useState(props.downloaded || false)
	const [pSaved, setPSaved] = useState(props.saved || false)
	const [dProgress, setDProgress] = useState(0)
	
	const { colors } = useTheme();
	const styles = themeStyles(colors);
	
	function durationToString(){
		let duration = props.duration;
		let subLength = 50;
		let stringDuration = '';
		if(duration/3600 >= 1){
			let hours = Math.floor(duration / 3600);
			let minutes = Math.floor(duration % 3600 / 60);
			let seconds = Math.floor(duration % 3600 % 60);
			
			stringDuration = String(hours) + ':' + String(minutes).padStart(2,'0') + ':' + String(seconds).padStart(2,'0')
			subLength -= stringDuration.length == 8 ? 19 : 15;
		}else if(duration/60 >= 1){
			let minutes = Math.floor(duration / 60);
			let seconds = Math.floor(duration % 60);
			stringDuration = String(minutes) + ':' + String(seconds).padStart(2,'0')
			subLength -= stringDuration.length == 5 ? 8 : 0
		}else{
			stringDuration = String(duration).padStart(2,'0')
			subLength += 8
		}
		return [subLength, stringDuration]
	}
	function playOrder(data){
		Array.prototype.swapItems = function(a, b){
			this[a] = this.splice(b, 1, this[a])[0];
			return this;
		}
		let dataIndex = data.findIndex((item) => item.uid == props.uid);
		if(dataIndex != 0){
			data.swapItems(0, dataIndex);
		}
		props.setPlaying(data, props.from);
		return
	}
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
		let dataIndex = data.findIndex((item) => item.uid == props.uid);
		if(dataIndex != 0){
			data.swapItems(0, dataIndex);
		}
		props.setPlaying(data, props.from);
		return
	}
	function play(data){
		if(Prefs.prefs.settings.only_play_downloaded){
			data = data.filter((item) => item.downloaded || item.imported)
		}
		if(data.length !== 0)
			if(Prefs.prefs.settings.always_shuffle)
				playShuffle(data)
			else
				playOrder(data)
	}
	let interval;
	useEffect(() => {
		let index = -1;
		let depth = Prefs.prefs?.settings?.download_queue_max_length || 1;
		for(let i = 0; i < depth; i++){
			if(GLOBALS?.DOWNLOADING[i]?.uid === props.uid)
				index = i;
		}
		let isCurrentlyDownloading = index !== -1
		if(isCurrentlyDownloading){
			setDownloading(true)
			setDProgress(GLOBALS?.DOWNLOADING[index]?.progress)
			interval = setInterval(() => {
				let in_index = -1;
				let in_depth = Prefs.prefs?.settings?.download_queue_max_length || 1;
				for(let i = 0; i < in_depth; i++){
					if(GLOBALS?.DOWNLOADING[i]?.uid === props.uid)
					in_index = i;
				}
				if(in_index === -1){
					setDownloading(false)
					clearInterval(interval)
					let idx = GLOBALS.SQLTracks.findIndex(item => item.uid === props.uid);
					if(idx !== -1 && GLOBALS.SQLTracks[idx].downloaded){
						setDownloaded(true)
					}
					return
				}
				setDProgress(GLOBALS?.DOWNLOADING[index]?.progress)
			},2000)
		}
		return () => clearInterval(interval);
	}, []);
	return (
		<TouchableOpacity disabled={props.disabled || false} style={{backgroundColor: colors.track}} onLongPress={async() => {
			if(GLOBALS.IsPlaying){
				
				let trackIndex = await TrackPlayer.getCurrentTrack();
				let track = new SQLActions.Track({
					'imported': props.imported || false,
					'thumbnail_URI': props.thumbnail_URI || "",
					'media_URI': props.media_URI || "",
					'downloaded': props.downloaded || false,
					'youtube': props.youtube || false,
					'video_name': props.video_name || "", 
					'video_creator': props.video_creator || "", 
					'video_duration':props.duration || 0, 
					'video_id':props.video_id || "", 
					'uid': props.uid || "",
				});
				track['successful'] = false
				track['added'] = false

				GLOBALS.playingTracks.splice(trackIndex + 1 + GLOBALS.pQueue.length,0,track)
				GLOBALS.pQueue.enqueue(track);
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
			}
		}} 
		onPress={ async ()=>{
			if(props.setPlaying == undefined){
				return
			}
			else if(props.from == 'Downloads'){
				let tracks = [...GLOBALS.SQLTracks];

				tracks = tracks.filter(item=>item.downloaded || item.imported).slice(0,Prefs.prefs.settings.default_playlists_size)
				if(tracks != []) 
					play(tracks)
				return
			}
			else if(props.from == 'Recently Added'){
				let tracks = [...GLOBALS.SQLTracks];
				tracks.reverse()
				tracks = tracks.slice(0,Prefs.prefs.settings.default_playlists_size)
				if(tracks != [])
					play(tracks)
				return
			}
			else if(props.from == 'Recently Played'){
				let tracks = await SQLActions.getRecentlyPlayedData();
				tracks.reverse()
				tracks = tracks.slice(0,Prefs.prefs.settings.default_playlists_size)
				if(tracks != [])
					play(tracks)
				return
			}
			else if(props.from != 'My Library'){ //From Playlist
				try {
					let playlistTracks = await SQLActions.getPlaylistTracks(props.from.replaceAll(' ', '_'));
					// playlistTracks = playlistTracks.filter(item=>item.downloaded || item.imported)
					play(playlistTracks)
				} catch (error) {
					Alert.alert("Error", error)
				}
				return
			}
			let tracks = [...GLOBALS.SQLTracks];
			play(tracks)
		} } >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={props.artwork || {uri:undefined} } style={styles.image}></Image>
					{Prefs.prefs.settings.show_track_duration && props.duration !== undefined && <View style={{position: 'absolute', left: durationToString()[0], bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
						<Text style={{color:'white', fontSize:10}}>{durationToString()[1]}</Text>
					</View>}
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.video_creator}</Text>
					<View style={{flexDirection: 'row'}}>
						{(props.youtube || false) && <Ionicons name="logo-youtube" size={15} color={colors.primary} style={styles.icon}/>}
						{(props.imported || false) && <Ionicons name="cloud-upload" size={15} color={colors.primary} style={styles.icon}/>}
						{(props.amazonmusic || false) && <Ionicons name="logo-amazon" size={15} color={colors.secondary} style={styles.icon}/>}
						{(props.spotify || false) && <MaterialCommunityIcons name="spotify" size={15} color={colors.secondary} style={styles.icon}/>}
						{(props.soundcloud || false) && <MaterialCommunityIcons name="soundcloud" size={15} color={colors.secondary} style={styles.icon}/>}
						{(props.applemusic || false) && <MaterialCommunityIcons name="apple" size={15} color={colors.secondary} style={styles.icon}/>}
						{(downloaded) && <Ionicons name="save-outline" size={15} color={colors.primary} style={styles.icon}/>}
						{(downloading) && <Ionicons name="download" size={15} color={colors.secondary} style={styles.icon}/>}
						{((props.thumbnail_URI || "") !== "") && <Ionicons name="image-outline" size={15} color={colors.secondary} style={styles.icon}/>}
					</View>
				</View>
				{props.writePlaylist != undefined && <TouchableOpacity disabled={pSaved} style={{justifyContent: 'center'}} onPress={ async() => {
					await SQLActions.insertTrackIntoPlaylist({'uid': props.uid}, props.writePlaylist);
					setPSaved(true)
					}}>
				<Ionicons name={!pSaved ? "add" : "checkmark"} size={30} color={colors.primary} style={{left: 10}}/>
				</TouchableOpacity>}
				{props.editMode == 1 && !downloaded && !props.imported && !downloading && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
							let track = await SQLActions.fetchTrackDataFromUID(props.uid);
							setDownloading(true)
							if(!downloading && !track.downloaded && GLOBALS.DOWNLOADING.findIndex((item) => item.uid == props.uid) == -1){
								let result = await props.downloadVideo(props.uid,props.video_id, props.duration, setDProgress, setDownloading, setDownloaded)
								// if(result === 0){
								// 	setDownloaded(false)
								// }
							}
						}}>
					<Ionicons name="download-outline" size={30} color={colors.primary} style={{left: 10}}/>
				</TouchableOpacity>}
				{downloading && <Text style={{color: 'white', alignSelf: 'flex-end', right: 10, bottom: 10}}>{dProgress}%</Text>}
				{props.editMode == 2 && !downloading && <TouchableOpacity style={{justifyContent: 'center'}} onPress={ async() => {
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
							await props.refreshData();
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