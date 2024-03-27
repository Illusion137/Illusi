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
import { DownloadTrackResult, EditMode, SetState, Track } from '../../types';
import { darkThemeDefault } from '../../Preferences';
import { swapItems } from '../Illusive/Utils';

function TrackComponent(props: {
		track_data: Track
		write_playlist?: string,
		playlist_from?: string,
		from?: string,
		edit_mode?: EditMode,
		refreshData: () => void
	}) {
	const [isDownloading, setIsDownloading] = useState( GLOBALS.DOWNLOADING.findIndex((item) => item.uid == props.track_data.uid) != -1)
	const [isDownloaded, setIsDownloaded] = useState(props.track_data.downloaded || false)
	const [playlistSaved, setPlaylistSaved] = useState(props.track_data.saved || false)
	const [downloadingProgress, setDownloadingProgress] = useState(0)
	
	const { colors } = useTheme() as typeof Prefs.darkThemeDefault;
	const styles = themeStyles(colors);
	
	function durationToString(): {left: number, duration: string}{
		let left: number = 50;
		let duration: string = "";
		if(props.track_data.video_duration/3600 >= 1){
			let hours = Math.floor(props.track_data.video_duration / 3600);
			let minutes = Math.floor(props.track_data.video_duration % 3600 / 60);
			let seconds = Math.floor(props.track_data.video_duration % 3600 % 60);
			
			duration = String(hours) + ':' + String(minutes).padStart(2,'0') + ':' + String(seconds).padStart(2,'0')
			left -= duration.length == 8 ? 19 : 15;
		}else if(props.track_data.video_duration / 60 >= 1){
			let minutes = Math.floor(props.track_data.video_duration / 60);
			let seconds = Math.floor(props.track_data.video_duration % 60);
			duration = String(minutes) + ':' + String(seconds).padStart(2,'0')
			left -= duration.length == 5 ? 8 : 0
		}else{
			duration = String(props.track_data.video_duration).padStart(2,'0')
			left += 8
		}
		return {'left': left, 'duration': duration};
	}
	let interval;
	useEffect(() => {
		let index = -1;
		let depth = Prefs.prefs?.settings?.download_queue_max_length || 1;
		for(let i = 0; i < depth; i++){
			if(GLOBALS?.DOWNLOADING[i]?.uid === props.track_data.uid)
				index = i;
		}
		let is_currently_downloading = index !== -1
		if(is_currently_downloading){
			setIsDownloading(true)
			setDownloadingProgress(GLOBALS?.DOWNLOADING[index]?.progress)
			interval = setInterval(() => {
				let in_index = -1;
				let in_depth = Prefs.prefs?.settings?.download_queue_max_length || 1;
				for(let i = 0; i < in_depth; i++){
					if(GLOBALS?.DOWNLOADING[i]?.uid === props.track_data.uid)
					in_index = i;
				}
				if(in_index === -1){
					setIsDownloading(false)
					clearInterval(interval)
					let idx = GLOBALS.global_var.SQLTracks.findIndex(item => item.uid === props.track_data.uid);
					if(idx !== -1 && GLOBALS.global_var.SQLTracks[idx].downloaded){
						setIsDownloaded(true)
					}
					return
				}
				setDownloadingProgress(GLOBALS?.DOWNLOADING[index]?.progress)
			},2000)
		}
		return () => clearInterval(interval);
	}, []);

	async function pushThisToPlayingQueue() {
		if(GLOBALS.global_var.IsPlaying){
			const track_index = await TrackPlayer.getCurrentTrack();
			const track = props.track_data;
			track['successful'] = false;
			track['added'] = false;

			GLOBALS.global_var.playingTracks.splice(track_index + 1 + GLOBALS.global_var.playingQueue.length,0,track)
			GLOBALS.global_var.playingQueue.enqueue(track);
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
		}
	}
	async function play() {
		let tracks: Track[] = [];
		if(GLOBALS.global_var.playTracks == undefined){ return; }
		else if(props.from == 'Downloads'){
			tracks = [...GLOBALS.global_var.SQLTracks];
			tracks = tracks.filter(item=>item.downloaded || item.imported).slice(0, Prefs.prefs.settings.default_playlists_size);
		}
		else if(props.from == 'Recently Added'){
			tracks = [...GLOBALS.global_var.SQLTracks];
			tracks.reverse();
			tracks = tracks.slice(0,Prefs.prefs.settings.default_playlists_size);
		}
		else if(props.from == 'Recently Played'){
			tracks = await SQLActions.getRecentlyPlayedData();
			tracks.reverse();
			tracks = tracks.slice(0,Prefs.prefs.settings.default_playlists_size);
		}
		else if(props.from != 'My Library') tracks = await SQLActions.getPlaylistTracks(props.from); //From Playlist 
		else tracks = [...GLOBALS.global_var.SQLTracks];
		if(tracks.length > 0) GLOBALS.global_var.playTracks(props.track_data, tracks, props.from);
	}

	async function insertIntoWritePlaylist() {
		if(!playlistSaved){
			await SQLActions.insertTrackIntoPlaylist(props.track_data.uid, props.write_playlist);
			setPlaylistSaved(true);
		} else{
			await SQLActions.deleteTrackInPlaylist(props.write_playlist, props.track_data.uid);
			setPlaylistSaved(false);
		}
	}
	async function downloadTrack(){
		const track = await SQLActions.fetchTrackDataFromUID(props.track_data.uid);
		setIsDownloading(true);
		if(!isDownloading && !track.downloaded && GLOBALS.DOWNLOADING.findIndex((item) => item.uid == props.track_data.uid) == -1){
			const result = await GLOBALS.global_var.downloadTrack(props.track_data, setDownloadingProgress, setIsDownloading, setIsDownloaded);
			if(result === "ERROR"){
				setIsDownloaded(false);
			}
		}
	}
	async function deleteTrack(){
		if(props.playlist_from === undefined){
			if(props.track_data.media_uri != ""){
				await FileSystem.deleteAsync(FileSystem.documentDirectory + props.track_data.media_uri);
			}
			let playlists = await SQLActions.getAllPlaylists();
			for(let i = 0; i < playlists.length; i++){
				await SQLActions.deleteTrackInPlaylist(playlists[i].playlist_name, props.track_data.uid);
			}
			await SQLActions.deleteTrack(props.track_data.uid);
			await SQLActions.fetchTrackData(); 
			await props.refreshData();
		} else{
			await SQLActions.deleteTrackInPlaylist(props.playlist_from, props.track_data.uid);
			await props.refreshData();
		}
	}

	return (
		<TouchableOpacity 
			disabled={props.track_data.disabled || false || props.write_playlist != undefined} 
			style={{backgroundColor: colors.track, opacity: props.write_playlist != undefined && playlistSaved ? 0.5 : 1}} 
			onLongPress={pushThisToPlayingQueue} 
			onPress={play}>
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={props.track_data.artwork as {'uri': string}} style={styles.image}></Image>
					{Prefs.prefs.settings.show_track_duration && props.track_data.video_duration !== undefined && 
						<View style={{position: 'absolute', left: durationToString()[0], bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
							<Text style={{color:'white', fontSize:10}}>{durationToString()[1]}</Text>
						</View>
					}
				</View>
				<View style={{ width: props.write_playlist != undefined ? '60%' : '65%', top: 5, left: 20 }}>
					<Text style={styles.title} numberOfLines={1} >{props.track_data.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.track_data.video_creator}</Text>
					<View style={{flexDirection: 'row'}}>
						{(props.track_data.youtube || false) && <Ionicons name="logo-youtube" size={15} color={colors.primary} style={styles.icon}/>}
						{(props.track_data.imported || false) && <Ionicons name="cloud-upload" size={15} color={colors.primary} style={styles.icon}/>}
						{(props.track_data.amazonmusic || false) && <Ionicons name="logo-amazon" size={15} color={colors.secondary} style={styles.icon}/>}
						{(props.track_data.spotify || false) && <MaterialCommunityIcons name="spotify" size={15} color={colors.secondary} style={styles.icon}/>}
						{(props.track_data.soundcloud || false) && <MaterialCommunityIcons name="soundcloud" size={15} color={colors.secondary} style={styles.icon}/>}
						{(props.track_data.applemusic || false) && <MaterialCommunityIcons name="apple" size={15} color={colors.secondary} style={styles.icon}/>}
						{(isDownloaded) && <Ionicons name="save-outline" size={15} color={colors.primary} style={styles.icon}/>}
						{(isDownloading) && <Ionicons name="download" size={15} color={colors.secondary} style={styles.icon}/>}
						{((props.track_data.thumbnail_uri || "") !== "") && <Ionicons name="image-outline" size={15} color={colors.secondary} style={styles.icon}/>}
					</View>
				</View>
				{props.write_playlist != undefined && 
					<TouchableOpacity style={{justifyContent: 'center', paddingRight: 30}} onPress={insertIntoWritePlaylist}>
						<Ionicons name={!playlistSaved ? "add" : "checkmark"} size={30} color={colors.primary} style={{left: 15}}/>
					</TouchableOpacity>
				}
				{props.edit_mode == "DOWNLOAD" && !isDownloaded && !props.track_data.imported && !isDownloading && 
					<TouchableOpacity style={{justifyContent: 'center'}} onPress={downloadTrack}>
						<Ionicons name="download-outline" size={30} color={colors.primary} style={{left: 10}}/>
					</TouchableOpacity>
				}
				{isDownloading && 
					<Text style={{color: 'white', alignSelf: 'flex-end', right: 10, bottom: 10}}>{downloadingProgress}%</Text>
				}
				{props.edit_mode == "DELETE" && !isDownloading && 
					<TouchableOpacity style={{justifyContent: 'center'}} onPress={deleteTrack}>
						<Ionicons name="trash-outline" size={30} color={colors.red} style={styles.elseIcon}/>
					</TouchableOpacity>
				}
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

export default TrackComponent;