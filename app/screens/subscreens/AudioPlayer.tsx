import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Modal, Image, ImageSourcePropType, PanResponder, Dimensions, Keyboard, TouchableHighlight } from 'react-native';
import { Ionicons, Fontisto, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { useNavigationState, useTheme } from '@react-navigation/native';
import { Slider } from '@miblanchard/react-native-slider';
import * as FileSystem from 'expo-file-system';
import TrackPlayer, { State, Track } from 'react-native-track-player';
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
import * as IllusiveType from '../../../types';
import { darkThemeDefault } from "../../../Preferences";

interface PlayerStateType {
	title?: string,
	artist?: string,
	artwork?: IllusiveType.Artwork,
	duration?: number,
	elapsed_time?: number,
	duration_remaining?: number,
	volume?: number,
	rate?: number,
	is_playing?: boolean,
	is_visible?: boolean,
	is_ready?: boolean,
	loop_track?: boolean,
	queue_data?: IllusiveType.Track[],
	now_playing_visible?: boolean,
	settings_visible?: boolean
};

function AudioPlayer (props: {
		tracks: IllusiveType.Track[], 
		playing_from: string
	}) {
    const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);
	const panel_ref = useRef<SlidingUpPanel>();

	const [panelAnimatedValue, setPanelAnimatedValue] = useState(0);
	const [playerState, setPlayerState] = useState({
		title: props.tracks[0]?.video_name,
		artist: props.tracks[0]?.video_creator,
		artwork: props.tracks[0]?.artwork,
		duration: props.tracks[0]?.video_duration ?? 0,
		elapsed_time: 0,
		duration_remaining: props.tracks[0]?.video_duration ?? 0,
		volume: 1,
		rate: 1,
		is_playing: false,
		is_visible: true,
		is_ready: false,
		loop_track: false,
		queue_data: props.tracks as IllusiveType.Track[],
		now_playing_visible: false,
		settings_visible: false,
	});

	const panel_max_height = Dimensions.get('screen').height;
	const panel_animated = new Animated.Value(180);
	const arrow_rotation_animated = useRef(new Animated.Value(0)).current;
	const opacity_animated = useRef(new Animated.Value(1)).current;
	panel_animated.addListener(({value}) => setPanelAnimatedValue(value));

	function updatePlayerState(updated_state: PlayerStateType){
		const player_state_copy = playerState;
		setPlayerState({
			title:               updated_state.title               ?? player_state_copy.title,
			artist:              updated_state.artist              ?? player_state_copy.artist,
			artwork:             updated_state.artwork             ?? player_state_copy.artwork,
			duration:            updated_state.duration            ?? player_state_copy.duration,
			elapsed_time:        updated_state.elapsed_time        ?? player_state_copy.elapsed_time,
			duration_remaining:  updated_state.duration_remaining  ?? player_state_copy.duration_remaining,
			volume:              updated_state.volume              ?? player_state_copy.volume,
			rate:                updated_state.rate                ?? player_state_copy.rate,
			is_playing:          updated_state.is_playing          ?? player_state_copy.is_playing,
			is_visible:          updated_state.is_visible          ?? player_state_copy.is_visible,
			is_ready:            updated_state.is_ready            ?? player_state_copy.is_ready,
			loop_track:          updated_state.loop_track          ?? player_state_copy.loop_track,
			queue_data:          updated_state.queue_data          ?? player_state_copy.queue_data,
			now_playing_visible: updated_state.now_playing_visible ?? player_state_copy.now_playing_visible,
			settings_visible:    updated_state.settings_visible    ?? player_state_copy.settings_visible,
		});
	}
	function getPanelPosition(){}
	function interpolatePanelPosition(output_range: any[]){
		return panel_animated.interpolate({'inputRange': [180, panel_max_height], 'outputRange': output_range, 'extrapolate': 'clamp'});
	}
	async function setPanelState(show: boolean, dragging: boolean = false){
		// updatePlayerState({'is_visible': show});
		if(show) {
			panel_ref.current?.show();
			Animated.parallel([
				Animated.timing(arrow_rotation_animated, {
					useNativeDriver: true,
					toValue: 0,
					duration: 200
				}),
				Animated.timing(opacity_animated, {
					useNativeDriver: true,
					toValue: 1,
					duration: 150
				})
			]).start();
		}
		else {
			panel_ref.current?.hide();
			Animated.parallel([
				Animated.timing(arrow_rotation_animated, {
					useNativeDriver: true,
					toValue: 180,
					duration: 200
				}),
				Animated.timing(opacity_animated, {
					useNativeDriver: true,
					toValue: 0,
					duration: 150
				})
			]).start();
		}
	}
	async function shareTrack(){}

	useEffect(() => {
		async function setup() {
			setPanelState(true);
			const is_setup = await setupPlayer();
			await TrackPlayer.reset();
			const queue = await TrackPlayer.getQueue();
			if(is_setup && queue.length <= 0) {
				globals.global_var.playingTracksIndex = 0; 
				globals.global_var.playingTracks = props.tracks;
				for(let i = 0; i < props.tracks.length; i++){
					globals.global_var.playingTracks[i]['successful'] = false;
					globals.global_var.playingTracks[i]['added'] = false;
				}
				globals.global_var.initialPlaybackTrackChangedMutex = true;
				globals.global_var.playingTracks[0]['added'] = true;
				let track_misses = 0;
				let track = await globals.playingTrackToRNTrack(globals.global_var.playingTracks[0]);
				while((track == null || track == 'skip' ) && track_misses < 10){
					globals.global_var.playingTracks = globals.global_var.playingTracks.slice(1)
					track = await globals.playingTrackToRNTrack(globals.global_var.playingTracks[0])
					track_misses++;
				}
				if(track != 'skip'){
					await TrackPlayer.add(track);
				}
			}
			updatePlayerState({is_ready: is_setup});
			await TrackPlayer.play();
	  	}
	  setup();
	}, []);

	const togglePlaying = useCallback(async() => {
		const player_state = await TrackPlayer.getState();
		const player_state_copy = playerState;
		updatePlayerState({is_playing: !player_state_copy.is_playing});

		if(player_state == State.Playing) await TrackPlayer.pause();
		else await TrackPlayer.play();
	}, []);

	function timeToTimestamp(time_seconds: number): string{
		const time_ms = Math.floor(time_seconds * 1000);
		const time_min = Math.floor(time_ms / 60000);
		const time_sec = Math.floor((time_ms - time_min * 60000) / 1000);
		
		return String(time_min).padStart(2, '0') + ':' + String(time_sec).padStart(2, '0');
	}

	useEffect(() => {
		let ticks = 0;
		const interval = setInterval(async () => {
			if(panelAnimatedValue !== 0){
				
				// Animated.parallel([
				// 	Animated.timing(opacity_animated, {
				// 		useNativeDriver: true,
				// 		toValue: panel_animated.interpolate({'inputRange': [180, 812], 'outputRange': [0, 1], 'extrapolate': 'clamp'}),
				// 		duration: 1
				// 	})
				// ]).start();
				// console.log(panelAnimatedValue)
			}
			if(playerState.is_ready){
				let buffered_position = await TrackPlayer.getBufferedPosition();
				if(ticks >= 64){
					await TrackPlayerNext();
					ticks = 0;
				}
				else if(buffered_position <= 0) ticks++;

				try {
					const current_track_index = await TrackPlayer.getCurrentTrack();
					const current_track = await TrackPlayer.getTrack(current_track_index);
					const current_duration = (current_track.duration ?? 1) <= 0 ? 60 : (current_track.duration ?? 1)
					const elapsed_sec = await TrackPlayer.getPosition();
					const player_state = await TrackPlayer.getState();
					updatePlayerState({
						title: current_track.title, 
						artist: current_track.artist,
						duration: current_duration,
						artwork: SQLActions.getTrackArtwork(globals.global_var.playingTracks[current_track_index]),
						elapsed_time: elapsed_sec,
						duration_remaining: current_duration - elapsed_sec,
						is_playing: player_state === State.Playing,
						volume: await TrackPlayer.getVolume(),
						rate: await TrackPlayer.getRate(),
						is_visible: panelAnimatedValue > 190
					})
				} catch (error) {
					console.log(error);
				}
			}
		}, 100);

		return () => {
			clearInterval(interval);
		};
	}, );


	return (
		<View style={{ left: 0, right: 0, display: 'flex', zIndex: 10, top: '100%' }}>
			<SlidingUpPanel 
							onMomentumDragEnd={async (position) => {
								if(position >= 600) { setPanelState(true, true); }
								else { setPanelState(false, true); }
							}}
							ref={panel_ref} 
							showBackdrop={true} 
							animatedValue={panel_animated}
							friction={1}
							draggableRange={{'bottom': 180, 'top': panel_max_height }} 
							snappingPoints={[180, panel_max_height ]}
							>
				<>
				<Animated.View pointerEvents={playerState.is_visible ? 'auto' : 'none'} style={{backgroundColor: colors.playScreen, height: 45,  opacity: panel_animated.interpolate({'inputRange': [180, 812], 'outputRange': [0, 1], 'extrapolate': 'clamp'})}}/>
				{/* HEADER ---------------------------------------------------- */}
				<View style={styles.header}>
					<Animated.View style={{
							left: 25,
							transform: [
								{ rotate: arrow_rotation_animated.interpolate({'inputRange': [0, 180], 'outputRange': ['0deg', '180deg'], 'extrapolate': 'clamp' }) },
							] }}>
						<TouchableOpacity hitSlop={{'left': 20, 'top': 20, 'bottom': 20, 'right': 20}} onPress={async() => setPanelState(!playerState.is_visible)}>
							<Ionicons name="chevron-down-sharp" size={20} color='#808080'/>
						</TouchableOpacity>
					</Animated.View>
					<View style={{alignItems: 'center'}}>
						<Text style={{ color: '#808080', fontSize: 12, top: playerState.is_visible ? -4 : 19 }}>PLAYING FROM {props.playing_from}</Text>
						<Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: 'bold', top: playerState.is_visible ? -2 : -15, width: 250 }}>{playerState.title}</Text>
					</View>
					{playerState.is_visible ? 
						<TouchableOpacity hitSlop={{'left': 20, 'top': 20, 'bottom': 20, 'right': 20}} style={{top:0, right: 20}} onPress={ async() => {} }>
							<Fontisto name="play-list" size={15} color={colors.primary}/>
						</TouchableOpacity> : null
					}
					{!playerState.is_visible ? 
						<TouchableOpacity hitSlop={{'left': 20, 'top': 20, 'bottom': 20, 'right': 20}} style={{top:0, right: 20}} onPress={togglePlaying}>
							<Ionicons name={playerState.is_playing ? "pause-circle-sharp" : "play-circle-sharp"} size={30} color={colors.primary}/>
						</TouchableOpacity> : null
					}
				</View>
				<Animated.View pointerEvents={playerState.is_visible ? 'auto' : 'none'} style={{ flex: 1, backgroundColor: colors.playScreen, opacity: panel_animated.interpolate({'inputRange': [180, 812], 'outputRange': [0, 2], 'extrapolate': 'clamp'}) } }>
					{/* <View style={{height: 220, width: 'auto'}}/> */}
					<Image source={playerState.artwork as number} height={220} style={{width: "auto", opacity: 0.5}}/>
					{/* <Image source={playerState.artwork as ImageSourcePropType} height={220} style={{width: "auto", opacity: 0.5}}/> */}
					{/* TIMESTAMPS & TIME----------------------------------------------------*/}
					<View style={styles.timestampslidercontainer}>
						<Slider 
								value={playerState.elapsed_time}
								onValueChange={async(val) => { await TrackPlayer.seekTo(val[0]); }}
								thumbTintColor={colors.primary}
								minimumTrackTintColor={colors.primary}
								maximumTrackTintColor='#DADADAA0'
								thumbStyle={{width: 8, height: 8}}
								thumbTouchSize={{width: 40, height: 40}}
								minimumValue={0}
								maximumValue={playerState.duration}
						/>
					</View>
					<View style={{flexDirection: 'row', justifyContent: 'space-between', marginLeft: 10, marginRight: 10, bottom: 30}}>
						<Text style={{color: '#808080', fontSize: 12}}>{timeToTimestamp(playerState.elapsed_time)}</Text>
						<Text style={{color: '#808080', fontSize: 12}}>-{timeToTimestamp(playerState.duration_remaining)}</Text>
					</View>
					{/* TITLE & ARTIST ----------------------------------------------------*/}
					<View style={styles.textcontainer}>
						<TextTicker style={ styles.title } scroll={false} duration={12000} bounce={false} easing={Easing.linear}>{playerState.title}</TextTicker>
						<Text style={styles.artist} numberOfLines={1}>{playerState.artist}</Text>
					</View>
					{/* PLAY CONTROLS ----------------------------------------------------*/}
					<View style={{bottom: 40}}>
						<View style={styles.playbackcontainer}>
							<TouchableOpacity onPress={() => {}}>
								<Ionicons name="shuffle-sharp" size={35} color={colors.primary}/>
							</TouchableOpacity>
							<TouchableOpacity onPress={TrackPlayerPrev}>
								<Ionicons name="play-back-sharp" size={35} color={colors.primary}/>
							</TouchableOpacity>
							<TouchableOpacity onPress={togglePlaying}>
								<Ionicons name={playerState.is_playing ? "pause-circle-sharp" : "play-circle-sharp"} size={90} color={colors.primary}/>
							</TouchableOpacity>
							<TouchableOpacity onPress={TrackPlayerNext}>
								<Ionicons name="play-forward-sharp" size={35} color={colors.primary}/>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => {}}>
								<Ionicons name="repeat-sharp" size={35} color={colors.primary}/>
							</TouchableOpacity>
						</View>
					{/* VOLUME CONTROLS ----------------------------------------------------*/}
						<View>
							<Ionicons name="volume-off-sharp" size={20} color='#656565' style={{top:30, left:15}}/>
							<View style={styles.volumeslidercontainer}>
								<Slider 
										value={playerState.volume}
										onValueChange={async(value) => { await TrackPlayer.setVolume(value[0]/1); }}
										thumbTintColor={colors.primary}
										thumbStyle={{width: 15, height: 15}}
										thumbTouchSize={{width: 40, height: 40}}
										minimumTrackTintColor={colors.primary}
										maximumTrackTintColor='#DADADA40'
										maximumValue={1}
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
							<TouchableOpacity onPress={() => {}}>
								<SimpleLineIcons name="equalizer" size={28} color={colors.primary}/>
							</TouchableOpacity>
							<TouchableOpacity onPress={async() => {
								// await getLyrics(title);
							}}>
								<Ionicons name="mic-outline" size={28} color={colors.primary}/>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => {}}>
								<Ionicons name="share-outline" size={28} color={colors.primary}/>
							</TouchableOpacity>
						</View>
					</View>
				</Animated.View>
				</>
			</SlidingUpPanel>
		</View>
	)
}
const themeStyles = (colors) => StyleSheet.create({
	topcontainer:{
		flex: 1,
		backgroundColor: colors.playScreen
	},
	header:{
		backgroundColor: colors.playScreen,
		height: 45,
		alignItems: 'center',
		justifyContent: 'space-between',
		flexDirection: 'row'
	},
	topfrom:{
		color: '#808080',
		fontSize: 12,
		top: -4
	},
	toptitle:{
		color: '#FFFFFF',
		fontWeight: 'bold',
		top: -2
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
export default AudioPlayer;