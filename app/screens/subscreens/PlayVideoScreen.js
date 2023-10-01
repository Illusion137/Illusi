import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { Animated , View, Button, StyleSheet, Text, TouchableOpacity, Easing, Modal, Image } from "react-native";
import { useTheme } from '@react-navigation/native';
// import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons, Fontisto, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import * as FileSystem from 'expo-file-system';

import TrackPlayer, { RepeatMode, State } from 'react-native-track-player';
import { setupPlayer, addTracks, TrackPlayerNext, TrackPlayerPrev } from '../../../trackPlayerServices';
import ytdl from "react-native-ytdl";
import * as Sharing from 'expo-sharing';

import SongComponentQueue from '../../components/SongComponentQueue'
import SlidingUpPanel from 'rn-sliding-up-panel';
import BigList from 'react-native-big-list';
import * as globals from "../../../globals";

import TextTicker from 'react-native-text-ticker'
import YouTube from 'react-native-youtube';

import * as SQLActions from '../../../SQLActions'
import { getLyrics } from "../../Illusive/IllusiveLyrics";

// import MusicControl from 'react-native-music-control'
// import AsyncStorage from '@react-native-async-storage/async-storage';

// MusicControl.enableControl('play', true)
// MusicControl.enableControl('pause', true)

function PlayVideoScreen(props ,ref) {
    const { colors } = useTheme();
	const styles = themeStyles(colors);

	// const data = props.data.filter(item=>item.downloaded || item.imported);
	const data = props.data;
	const playlist = props.playlist;
	// const navigation = useNavigation();
	const [queueData, setQueueData] = useState([]);
	const [queueVisible, setQueueVisible] = useState(false);
	
	const [eqSettingsVisible, setEqSettingsVisible] = useState(false);

	const [playing, setPlaying] = useState(false);
	const [repeatModeTrack, setRepeatModeTrack] = useState(false);
	const [timeValue, setTimeValue] = useState(0.0);
	const [audioValue, setAudioValue] = useState(100);
	const [rateValue, setRateValue] = useState(50);
	const [elapsed, setElapsed] = useState('00:00');
	const [durationleft, setDurationLeft] = useState('00:00');
	
	const [artwork, setArtwork] = useState(SQLActions.getTrackArtwork(data[0]));
	const [title, setTitle] = useState(data[0]?.video_name);
	const [artist, setArtist] = useState(data[0]?.video_creator);
	const [maxDuration, setMaxDuration] = useState(data[0]?.video_duration);
	
	// const [title, setTitle] = useState("test");
	// const [artist, setArtist] = useState("testArtists");
	// const [maxDuration, setMaxDuration] = useState(148);
	
	const [isPlayerReady, setIsPlayerReady] = useState(false)

	const playVideoPanelRef = useRef()
	const [draggable, setDraggable] = useState(true);
	
	const renderItem = ({item, index}) => <SongComponentQueue video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator}/>;

	useImperativeHandle(ref, () => ({
		title: title,
		artist: artist,
		isPlaying: playing,
		setPlaying: togglePlaying,
		draggable: draggable,
	}))

	useEffect(() => {
		async function setup() {
			let isSetup = await setupPlayer();
			await TrackPlayer.reset();
			const queue = await TrackPlayer.getQueue();
			if(isSetup && queue.length <= 0) {
				globals.playingTracksIndex = 0; 
				globals.playingTracks = data
				for(let i = 0; i < data.length; i++){
					globals.playingTracks[i]['successful'] = false
					globals.playingTracks[i]['added'] = false
				}
				globals.initialPlaybackTrackChangedMutex = true
				globals.playingTracks[0]['added'] = true
				await TrackPlayer.add(await globals.playingTrackToRNTrack(globals.playingTracks[0]))
			}
			setIsPlayerReady(isSetup);
			TrackPlayer.play()
	  	}
  
	  setup();
	}, []);

	useEffect(() => {
		const interval = setInterval(async () => {
			if(isPlayerReady){
				let curTrack = await TrackPlayer.getCurrentTrack()
				setPlaying(await TrackPlayer.getState() == State.Playing ? true : false)
				// if(curTrack != curIndex){
					try {
						let trackData = await TrackPlayer.getTrack(curTrack)
						setTitle(trackData.title)
						setArtist(trackData.artist)
						trackData.duration = (trackData.duration || 1) <= 0 ? 60 : (trackData.duration || 1) 
						setMaxDuration(trackData.duration)
						setArtwork( {'uri': trackData.artwork})
					} catch (error) {
						
					}
				// }
				let elapsed_sec = 0;
	
				elapsed_sec = await TrackPlayer.getPosition()
	
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
			}
			}, 1000);

		return () => {
			clearInterval(interval);
		};
	}, );

	const togglePlaying = useCallback(async() => {
		let meta = await TrackPlayer.getState()
		setPlaying((prev) => !prev);
			if(meta == State.Playing){
				await TrackPlayer.pause()
			}
			else{
				await TrackPlayer.play()
			}
	}, []);
	
	async function onShare(){
		try {
			const UTI = 'public.item';
			await Sharing.shareAsync(FileSystem.documentDirectory + (await TrackPlayer.getTrack( await TrackPlayer.getCurrentTrack() )).id + '.mp4', {UTI});
		} catch (error) {
			alert(error.message);
		} 
	}
	return (
		<View style={styles.topcontainer}>
			{/* HEADER ---------------------------------------------------- */}
			<View style={styles.header}>
				<TouchableOpacity style={{top:28}} onPress={()=>{props.hide()}}>
					<Ionicons name="chevron-down-sharp" size={20} color='#808080'/>
				</TouchableOpacity>
				<View style={{alignItems: 'center'}}>
					<Text style={styles.topfrom}>PLAYING FROM</Text>
					<Text style={styles.toptitle}>{playlist}</Text>
				</View>
				<TouchableOpacity style={{top:28}} onPress={async() => {
										if(globals.IsPlaying){
											// setDraggable(false)
											let index = await TrackPlayer.getCurrentTrack();
											let queue = globals.playingTracks.slice(index);
											let mainQueue = []
											// console.log(mainQueue)
											try {
												for(let i = 0; i < queue.length; i++ ){
													mainQueue.push(
														{video_id: queue[i].video_id, 
														video_creator: queue[i].video_creator,
														video_name: queue[i].video_name
													})
												}
												// let index = await TrackPlayer.getCurrentTrack();
												// mainQueue = mainQueue.slice(index)
												setQueueData(mainQueue);
											} catch (error) {
												console.log(error)
											}
										} 
										setQueueVisible(true);
				}}>
					<Fontisto name="play-list" size={15} color={colors.primary}/>
				</TouchableOpacity>
			</View>
			<Image source={artwork} height={220} style={{width: "auto", opacity: 0.5}}/>
			{/* TIMESTAMPS & TIME----------------------------------------------------*/}
			<View style={styles.timestampslidercontainer}>
				<Slider value={timeValue}
						onValueChange={async(val) => {setTimeValue(val);
							await TrackPlayer.seekTo(val[0]);
						}}
						thumbTintColor={colors.primary}
						minimumTrackTintColor={colors.primary}
						maximumTrackTintColor='#DADADAA0'
						thumbStyle={{width: 8, height: 8}}
						thumbTouchSize={{width: 40, height: 40}}
						minimumValue={0}
						maximumValue={(maxDuration || 60) <= 0 ? 60 : maxDuration}
				/>
			</View>
			<View style={{flexDirection: 'row', justifyContent: 'space-between', marginLeft: 10, marginRight: 10, bottom: 30}}>
				<Text style={{color: '#808080', fontSize: 12}}>{elapsed}</Text>
				<Text style={{color: '#808080', fontSize: 12}}>{durationleft}</Text>
			</View>
			{/* TITLE & ARTIST ----------------------------------------------------*/}
			<View style={styles.textcontainer}>
				<TextTicker
					style={ styles.title }
					duration={12000}
					bounce={false}
					easing={Easing.linear}
				>
				{title}
				</TextTicker>
				{/* <Text style={styles.title} numberOfLines={1}>{title}</Text> */}
				<Text style={styles.artist} numberOfLines={1}>{artist}</Text>
			</View>
			<View style={styles.container}>
			{/* PLAY CONTROLS ----------------------------------------------------*/}
				<View style={styles.playbackcontainer}>
					<TouchableOpacity onPress={() => {
						//NOT IMPLEMENTED
					}}>
						<Ionicons name="shuffle-sharp" size={35} color={colors.primary}/>
					</TouchableOpacity>
					<TouchableOpacity onPress={async () => {
							await TrackPlayerPrev();
						}}>
						<Ionicons name="play-back-sharp" size={35} color={colors.primary}/>
					</TouchableOpacity>
					<TouchableOpacity onPress={togglePlaying}>
						<Ionicons name={playing ? "pause-circle-sharp" : "play-circle-sharp"} size={90} color={colors.primary}/>
					</TouchableOpacity>
					<TouchableOpacity onPress={async () => {
            			await TrackPlayerNext();
					}}>
						<Ionicons name="play-forward-sharp" size={35} color={colors.primary}/>
					</TouchableOpacity>
					<TouchableOpacity onPress={async () => {
						let prevModeisTrack = repeatModeTrack;
						let newModeisTrack = !prevModeisTrack;
						setRepeatModeTrack(newModeisTrack)
						if(newModeisTrack)
							await TrackPlayer.setRepeatMode(RepeatMode.Track)
						else
							await TrackPlayer.setRepeatMode(RepeatMode.Queue)
						}}>
						<Ionicons name="repeat-sharp" size={35} color={repeatModeTrack ? colors.primary : "#656565"}/>
					</TouchableOpacity>
				</View>
			{/* VOLUME CONTROLS ----------------------------------------------------*/}
				<View>
					<Ionicons name="volume-off-sharp" size={20} color='#656565' style={{top:30, left:15}}/>
					<View style={styles.volumeslidercontainer}>
						<Slider value={audioValue}
								onValueChange={async(value) => {setAudioValue(value[0].toFixed()); await TrackPlayer.setVolume(value[0]/100) }}
								thumbTintColor={colors.primary}
								thumbStyle={{width: 15, height: 15}}
								thumbTouchSize={{width: 40, height: 40}}
								minimumTrackTintColor={colors.primary}
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
				<View style={{flexDirection:'row', justifyContent: 'space-between', marginLeft: 15, marginRight: 15}}>
					<TouchableOpacity>
						<View style={{backgroundColor:colors.primary, height: 35, width: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center'}}>
							<Text>+ Add</Text>
						</View>
					</TouchableOpacity>
					<TouchableOpacity onPress={() => {setEqSettingsVisible(true)}}>
						<SimpleLineIcons name="equalizer" size={28} color={colors.primary}/>
					</TouchableOpacity>
					<TouchableOpacity onPress={async() => {
						// await getLyrics(title);
					}}>
						<Ionicons name="mic-outline" size={28} color={colors.primary}/>
					</TouchableOpacity>
					<TouchableOpacity onPress={onShare}>
						<Ionicons name="share-outline" size={28} color={colors.primary}/>
					</TouchableOpacity>
				</View>
			</View>
			<Modal animationType="slide"
					transparent={false}
					presentationStyle={'pageSheet'}
					visible={queueVisible}
					onRequestClose={() => {
					setQueueVisible(!queueVisible);}}>
						<View style={{width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row"}} >
							<View style={{marginLeft:10}}>
								<Button color={colors.primary} title='close' onPress={() => {setQueueVisible(false)}}/>
							</View>
							<Text style={{left: 85, color: "white", fontWeight: "bold", fontSize: 17}}>Up Next</Text>
						</View>
						<View style={{flex:1, backgroundColor: colors.background}}>

							<BigList style={{height: '71%'}} data={queueData}
								renderItem={renderItem}
								keyExtractor={(item, index) => index}
								itemHeight={61}
								onScrollToIndexFailed={() => {}}
							/>
						</View>
			</Modal>
			<Modal animationType="slide"
					transparent={false}
					presentationStyle={'pageSheet'}
					visible={eqSettingsVisible}
					onRequestClose={() => {
					setEqSettingsVisible(!eqSettingsVisible);}}>
					<View style={{width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row"}} >
						<View style={{marginLeft:10}}>
							<Button color={colors.primary} title='close' onPress={() => {setEqSettingsVisible(false);}}/>
						</View>
						<Text style={{left: 85, color: "white", fontWeight: "bold", fontSize: 17}}>Settings</Text>
					</View>
					<View style={{flex:1, backgroundColor: colors.background}}>
						<Text style={{left: 17, top: 18, color: "white", fontWeight: "300", fontSize: 15}}>Playback Speed</Text>
						<MaterialCommunityIcons name="play-speed" size={20} color='#656565' style={{top:30, left:15}}/>
						<View style={styles.volumeslidercontainer}>
							<Slider
									value={rateValue}
									onValueChange={async(value) => { setRateValue(value[0].toFixed()); await TrackPlayer.setRate((value[0].toFixed()/100) * 2) }}
									thumbTintColor={colors.primary}
									thumbStyle={{width: 15, height: 15}}
									thumbTouchSize={{width: 40, height: 40}}
									minimumTrackTintColor={colors.primary}
									maximumTrackTintColor='#DADADA40'
									maximumValue={100}
							/>
						</View>
						<Text style={{left: 300, bottom: 35, color: "white", fontWeight: "bold", fontSize: 17}}>{(rateValue * 2)/100}x</Text>
					</View>
			</Modal>
		</View>
	)
					
}

const themeStyles = (colors) => StyleSheet.create({
	topcontainer:{
		flex: 1,
		backgroundColor: colors.playScreen,
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
		bottom: 20
	},
	textcontainer:{
		justifyContent: 'flex-start',
		alignItems: 'center',
		bottom: 0,
		height: 100,
		marginLeft: 40,
		marginRight: 40
	},
	tsstyle:{
		color:'#808080'
	},
	title:{
		color: '#FFFFFF',
		fontSize: 20,
		fontWeight: 'bold',
		// marginLeft: 40,
		// marginRight: 40,
	},
	artist:{
		color: '#808080'
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