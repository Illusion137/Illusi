import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import SlidingUpPanel from 'rn-sliding-up-panel';
import PlayVideoScreen from '../screens/subscreens/PlayVideoScreen';

function PlayingSong (props) {
	const playVideoPanelRef = useRef()
	const playVideoRef = useRef()

	const [title, setTitle] = useState("");
	const [artist, setArtist] = useState("");
	const [playing, setPlaying] = useState(true);

	function hide(){
		setTitle(playVideoRef.current?.title)
		setArtist(playVideoRef.current?.artist)
		setPlaying(playVideoRef.current?.isPlaying)
		playVideoPanelRef.current.hide();
	}
	useEffect(() => {
		function onEffect() {
			playVideoPanelRef.current.show()
		}
	
		onEffect();
		
	}, []);
	// console.log(playVideoRef.current?.artist)
	// console.log(playVideoRef.current?.title)
	// console.log(playVideoRef.current?.isPlaying)
	return (
		<View style={styles.container} >			
			<View style={styles.audioPlayer}>
				<TouchableOpacity style={{left:15}} onPress={() => {playVideoPanelRef.current.show();}}>
					<Ionicons name="chevron-up-sharp" size={20} color='#808080'/>
				</TouchableOpacity>
				<TouchableOpacity style={{alignItems:'center', width: '70%'}} onPress={() => {playVideoPanelRef.current.show();}}>
						<Text style={{color: '#FFFFFF', fontWeight: 'bold'}} numberOfLines={1}>{title}</Text>
						<Text style={{color: '#808080', fontSize: 12}} numberOfLines={1}>{artist}</Text>
				</TouchableOpacity>
					<TouchableOpacity style={{right:15}} onPress={()=>{playVideoRef.current?.setPlaying(!playVideoRef.current?.isPlaying); setPlaying(!playVideoRef.current?.isPlaying)}}>
						<Ionicons name={playing ? "pause-circle-sharp" : "play-circle-sharp"} size={38} color='#424ed4'/>
					</TouchableOpacity>
			</View>
			<SlidingUpPanel ref={playVideoPanelRef} onBottomReached={()=>{setTitle(playVideoRef.current?.title);setArtist(playVideoRef.current?.artist);setPlaying(playVideoRef.current?.isPlaying); }}>
					<PlayVideoScreen data={props.data} playlist={props.playlist} ref={playVideoRef} style={styles.video} panelref={hide.bind()}/>
			</SlidingUpPanel>
		</View>
	)
}
const styles = StyleSheet.create({
	container: {
		left: 0,
		right: 0,
		// top: 0,
		// bottom: 0,
		display: 'flex',
		// position: 'absolute',
		zIndex: 10,
		top: '100%',
	},
	audioPlayer:{
		bottom: 90,
		backgroundColor: '#202020',
		width: '100%',
		height: 40,//40
		position: 'absolute',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	video:{
	
	}
});
export default PlayingSong;