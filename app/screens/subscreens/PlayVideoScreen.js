import React, { useState, useCallback, useRef,useImperativeHandle, forwardRef, useEffect } from "react";
import { Share, Button, View, Alert, StyleSheet, Text, TouchableOpacity } from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons, Fontisto, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import {useNavigation, route } from '@react-navigation/native';
import { Audio } from 'expo-av';
// import MusicControl from 'react-native-music-control'
// import AsyncStorage from '@react-native-async-storage/async-storage';

// MusicControl.enableControl('play', true)
// MusicControl.enableControl('pause', true)

function PlayVideoScreen(props, ref) {
	const data = props.data;
	const ids = data.map(({video_id}) => video_id)
	const playlist = props.playlist;
	// const navigation = useNavigation();
	
	const [curIndex, setCurIndex] = useState(0);
	const [curID, setCurID] = useState(ids[curIndex]);
	const [playing, setPlaying] = useState(false);
	const [timeValue, setTimeValue] = useState(0.0);
	const [audioValue, setAudioValue] = useState(100);
	const [elapsed, setElapsed] = useState('00:00');
	const [durationleft, setDurationLeft] = useState('00:00');
	
	const [title, setTitle] = useState(data[curIndex].video_name);
	const [artist, setArtist] = useState(data[curIndex].video_creator);
	const [maxDuration, setMaxDuration] = useState(data[curIndex].video_duration);
	
	const [DIAudio, setDIAudio] = useState(new Audio.Sound())
	
	const playerRef = useRef();

	useEffect(() => {
		(async function() {
			setTitle(data[curIndex].video_name);
			setArtist(data[curIndex].video_creator);
			setMaxDuration(data[curIndex].video_duration)
			try {
				await DIAudio.stopAsync()
				await DIAudio.unloadAsync()
			} catch (error) {
				
			}
			
			if(!(data[curIndex].saved && !data[curIndex].downloaded)){
				await DIAudio.loadAsync({uri: data[curIndex].uri}, undefined, )
				await DIAudio.playAsync();

				setPlaying(true)
			}
		})();
	}, [curIndex]);

	useImperativeHandle(ref, () => ({
		title: title,
		artist: artist,
		isPlaying: playing,
		setPlaying: (play) => {setPlaying(play)}
	}))
	useEffect(() => {

		  const interval = setInterval(async () => {
			let elapsed_sec = 0;
			if(data[curIndex].saved && !data[curIndex].downloaded){
				try {
					elapsed_sec = Math.round(await playerRef.current.getCurrentTime()); // this is a promise. dont forget to await
				} catch (error) {
					console.log(error)
					return	
				}
			} else{
				try {
					let meta = await DIAudio.getStatusAsync()
					// console.log(meta)
					elapsed_sec = Math.round(meta.positionMillis/1000)
					if(elapsed_sec >= maxDuration){
						if(curIndex + 1 < ids.length){ //4    =/5
							let temp = curIndex + 1
							setCurIndex(temp);
							setCurID(ids[temp]);
						}
						else{
							setPlaying(false);
							Alert.alert("playlist ended has finished playing!");
						}
					}
				} catch (error) {
					console.log(error)
					return	
				}
			}
			setTimeValue(elapsed_sec)
			const elapsed_ms = Math.floor(elapsed_sec * 1000);
			const min = Math.floor(elapsed_ms / 60000);
			const seconds = Math.floor((elapsed_ms - min * 60000) / 1000);
			
			setElapsed(
				min.toString().padStart(2, '0') +
				':' +
				seconds.toString().padStart(2, '0')
			);
			const elapsed_ms_maxdur = Math.floor((maxDuration-elapsed_sec) * 1000);
			const min_maxdur = Math.floor(elapsed_ms_maxdur / 60000);
			const seconds_maxdur = Math.floor((elapsed_ms_maxdur - min_maxdur * 60000) / 1000);
	
				setDurationLeft(
				'-' + min_maxdur.toString().padStart(2, '0') +
				':' +
				seconds_maxdur.toString().padStart(2,'0')
				);
		  }, 1000);
		return () => {
			clearInterval(interval);
		};
	}, );


	const onStateChange = useCallback((state) => {

		if(state === "playing"){
			setPlaying(true);
		}
		if (state === "ended") {
			if(curIndex < ids.length){
				console.log('end')
				let temp = curIndex + 1
				setCurIndex(temp);
				setCurID(ids[temp]);
			}
			else{
				setPlaying(false);
				Alert.alert("playlist ended has finished playing!");
			}
		}
	}, []);
	const togglePlaying = useCallback(async() => {
		setPlaying((prev) => !prev);
		try {
			let meta = await DIAudio.getStatusAsync()
			if(meta.isPlaying){
				await DIAudio.pauseAsync()
			}
			else{
				await DIAudio.playAsync()
			}
		} catch (error) {
			
		}
	}, []);
	
	async function onShare(){
		try {
		const result = await Share.share({
			message: `https://youtube.com/watch?v=${curID}`,
		});
		} catch (error) {
			alert(error.message);
		} 
	}

	return (
		<View style={styles.topcontainer} >
			{/* HEADER ---------------------------------------------------- */}
			<View style={styles.header}>
				<TouchableOpacity style={{top:28}} onPress={()=>props.panelref()}>
					<Ionicons name="chevron-down-sharp" size={20} color='#808080'/>
				</TouchableOpacity>
				<View style={{alignItems: 'center'}}>
					<Text style={styles.topfrom}>PLAYING FROM</Text>
					<Text style={styles.toptitle}>{playlist}</Text>
				</View>
				<TouchableOpacity style={{top:28}}>
					<Fontisto name="play-list" size={15} color='#424ed4'/>
				</TouchableOpacity>
			</View>
			{/* YOUTUBE ----------------------------------------------------*/}
			{ data[curIndex].saved && !data[curIndex].downloaded && <View pointerEvents="none">
				<YoutubePlayer
					ref={playerRef}
					height={220}
					play={playing}
					videoId={curID}
					onChangeState={onStateChange}		
					volume={0.2} 
					initialPlayerParams={{preventFullScreen: true, controls: false}}
					onError={(error) => {						if(curIndex + 1 < ids.length){ //4    =/5
						let temp = curIndex + 1
						setCurIndex(temp);
						setCurID(ids[temp]);
					}}}
					onReady={() => {
							setPlaying(true);
						} }
					
				/>
			</View>}
			{!(data[curIndex].saved && !data[curIndex].downloaded) && <View style={{height: 220, backgroundColor: '#121212'}}/>}
			{/* TIMESTAMPS & TIME----------------------------------------------------*/}
			<View style={styles.timestampslidercontainer}>
				<Slider value={timeValue}
						onValueChange={val => {setTimeValue(val); 
							if(data[curIndex].saved && !data[curIndex].downloaded){
								playerRef.current?.seekTo(timeValue, true);
							}

						}}
						thumbTintColor='#424ed4'
						minimumTrackTintColor='#424ed4'
						maximumTrackTintColor='#DADADAA0'
						thumbStyle={{width: 8, height: 8}}
						thumbTouchSize={{width: 40, height: 40}}
						minimumValue={0}
						maximumValue={data[curIndex].video_duration}
						onSlidingComplete={async(val) => {
							if(!(data[curIndex].saved && !data[curIndex].downloaded)){
								try {
									await DIAudio.setPositionAsync(Math.round(timeValue*1000))
								} catch (error) {
									return
								}
							}
						}}
				/>
			</View>
			<View style={{flexDirection: 'row', justifyContent: 'space-between', marginLeft: 10, marginRight: 10, bottom: 30}}>
				<Text style={{color: '#808080', fontSize: 12}}>{elapsed}</Text>
				<Text style={{color: '#808080', fontSize: 12}}>{durationleft}</Text>
			</View>
			{/* TITLE & ARTIST ----------------------------------------------------*/}
			<View style={styles.textcontainer}>
				<Text style={styles.title} numberOfLines={1}>{data[curIndex].video_name}</Text>
				<Text style={styles.artist} numberOfLines={1}>{data[curIndex].video_creator}</Text>
			</View>
			<View style={styles.container}>
			{/* PLAY CONTROLS ----------------------------------------------------*/}
				<View style={styles.playbackcontainer}>
					<TouchableOpacity >
						<Ionicons name="shuffle-sharp" size={35} color='#424ed4'/>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => {
						if(curIndex > 0){
							let temp = curIndex - 1
							setCurIndex(temp);
							setCurID(ids[temp]); 
						}
						}}>
						<Ionicons name="play-back-sharp" size={35} color='#424ed4'/>
					</TouchableOpacity>
					<TouchableOpacity onPress={togglePlaying}>
						<Ionicons name={playing ? "pause-circle-sharp" : "play-circle-sharp"} size={90} color='#424ed4'/>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => {
						if(curIndex + 1 < ids.length){ //4    =/5
							let temp = curIndex + 1
							setCurIndex(temp);
							setCurID(ids[temp]);
						}
					}}>
						<Ionicons name="play-forward-sharp" size={35} color='#424ed4'/>
					</TouchableOpacity>
					<TouchableOpacity>
						<Ionicons name="repeat-sharp" size={35} color='#424ed4'/>
					</TouchableOpacity>
				</View>
			{/* VOLUME CONTROLS ----------------------------------------------------*/}
				<View>
					<Ionicons name="volume-off-sharp" size={20} color='#656565' style={{top:30, left:15}}/>
					<View style={styles.volumeslidercontainer}>
						<Slider value={audioValue}
								onValueChange={value => {setAudioValue(value[0].toFixed()); }}
								thumbTintColor='#424ed4'
								thumbStyle={{width: 15, height: 15}}
								thumbTouchSize={{width: 40, height: 40}}
								minimumTrackTintColor='#424ed4'
								maximumTrackTintColor='#DADADA40'
								maximumValue={100}
						/>
					</View>
					<Ionicons name="volume-high-sharp" size={20} color='#656565'style={{bottom:30, alignSelf:'flex-end', right: 50}}/>
					<TouchableOpacity>
						<MaterialCommunityIcons name="cast-audio-variant" size={20} color='#656565'style={{bottom:50, alignSelf:'flex-end', right: 15}}/>
					</TouchableOpacity>
					
				</View>
			{/* EXTRA CONTROLS ----------------------------------------------------*/}
				{/* <View style={{flexDirection:'row', justifyContent: 'space-between', marginLeft: 15, marginRight: 15}}>
					<TouchableOpacity>
						<View style={{backgroundColor:'#424ed4', height: 35, width: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center'}}>
							<Text>+ Add</Text>
						</View>
					</TouchableOpacity>
					<TouchableOpacity>
						<SimpleLineIcons name="equalizer" size={28} color='#424ed4'/>
					</TouchableOpacity>
					<TouchableOpacity>
						<Ionicons name="mic-outline" size={28} color='#424ed4'/>
					</TouchableOpacity>
					<TouchableOpacity onPress={onShare}>
						<Ionicons name="share-outline" size={28} color='#424ed4'/>
					</TouchableOpacity>
				</View> */}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	topcontainer:{
		flex: 1,
		backgroundColor: '#000000',
	},
	header:{
		height:90,
		alignItems: 'center',
		justifyContent: 'space-between',
		marginLeft: 25,
		marginRight: 25,
		flexDirection: 'row'
	},
	topfrom:{
		color: '#808080',
		fontSize: 12,
		top: 20
	},
	toptitle:{
		color: '#FFFFFF',
		fontWeight: 'bold',
		top: 22
	},
	timestampslidercontainer:{
        alignItems: 'stretch',
        justifyContent: 'center',
		bottom: 29
	},
	textcontainer:{
		justifyContent: 'flex-start',
		alignItems: 'center',
		bottom: 0,
		height: 100
	},
	tsstyle:{
		color:'#808080'
	},
	title:{
		color: '#FFFFFF',
		fontSize: 20,
		fontWeight: 'bold',
		marginLeft: 40,
		marginRight: 40,
	},
	artist:{
		color: '#808080'
	},
	container:{

	},
	playbackcontainer:{
		justifyContent: 'space-evenly',
		alignItems: 'center',
		flexDirection: 'row'
	},
	volumeslidercontainer:{
		marginLeft: 40,
		marginRight: 80,
	}
});

export default forwardRef(PlayVideoScreen);