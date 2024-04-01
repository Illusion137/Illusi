import React, {useState} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ytdl from "react-native-ytdl"
import * as FileSystem from 'expo-file-system';
import * as GLOBALS from '../../globals';
import * as SQLActions from '../../SQLActions'
import axios from 'axios';
import TrackPlayer from 'react-native-track-player';
import * as Haptics from 'expo-haptics';
import * as Prefs from '../../Preferences'
import { GenerateNewUID, decodeHex, parseYTDuration } from '../Illusive/IllusiveSearch';
import { Track } from '../../types';

function SongComponentSearch(props: 
	{
		saved: boolean, 
		video_duration: number,
		disabled: boolean,
		video_name: string, 
		video_creator: string, 
		video_id: string, 
		uid: string, 
		addFrom: (show: boolean, track: Track) => void}) {
		
	const [saved, isSaved] = useState(props.saved);
	
	function setSaved(){
		isSaved(true)
		props.addFrom(false, null)
	}
	
	function durationToString(): (string|number)[]{
		let duration = props.video_duration;
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

	// const [downloaded, isDownloaded] = useState(props.downloaded);
	return (
		<TouchableOpacity disabled={props.disabled ?? false} onLongPress={async() => {
			if(GLOBALS.global_var.IsPlaying){
				let trackIndex = await TrackPlayer.getCurrentTrack();
				let track = new Track({
					'youtube': true,
					'video_name': props.video_name ?? "", 
					'video_creator': props.video_creator ?? "", 
					'video_duration':props.video_duration ?? 0, 
					'video_id':props.video_id ?? "", 
					'uid': props.uid ?? "",
				});
				track['successful'] = false
				track['added'] = false

				GLOBALS.global_var.playingTracks.splice(trackIndex + 1 + GLOBALS.global_var.playingQueue.length,0,track)
				GLOBALS.global_var.playingQueue.enqueue(track);
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
			}
		}} onPress={async() => {

		}}>
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={{uri:`https://img.youtube.com/vi/${props.video_id}/mqdefault.jpg`}} style={styles.image}></Image>
					{Prefs.prefs.settings.show_track_duration && props.video_duration !== undefined && <View style={{position: 'absolute', left: durationToString()[0] as number, bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
						<Text style={{color:'white', fontSize:10}}>{durationToString()[1] as string}</Text>
					</View>}
				</View>
				<View style={styles.text}>				
					<Text style={styles.title} numberOfLines={1} >{props.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.video_creator}</Text>
				</View>
				<TouchableOpacity disabled={saved} style={{justifyContent: 'center'}} onPress={async()=>{
						if(Prefs.prefs.settings.ask_where_to_save){
							if(props.addFrom !== undefined){
								props.addFrom( true,
									new Track({
										'video_name': props.video_name,
										'video_creator': props.video_creator,
										'video_id': props.video_id,
										'video_duration': props.video_duration,
										'uid': props.uid,
										'callback': setSaved.bind(this)
									}));
								return;
							} 
						}
						if(!saved){
							try{
								await SQLActions.insertTrackData(new Track({
									video_name: props.video_name ?? "-",
									video_creator: props.video_creator ?? "-",
									video_id: props.video_id ?? "0",
									video_duration: props.video_duration ?? 0,
									saved: true,
									youtube: true,
									uid: props.uid,
								}));
								isSaved(true)
							}catch(e){
								console.log(e)
								return;
							}
						}
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