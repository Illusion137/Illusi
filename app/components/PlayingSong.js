import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


import SlidingUpPanel from 'rn-sliding-up-panel';
import PlayVideoScreen from '../screens/subscreens/PlayVideoScreen';
import AddPlaylist from '../screens/subscreens/AddPlaylist';


function PlayingSong (props) {
	const playVideoPanelRef = useRef()
	const playVideoRef = useRef()
	function hide(){
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
				<TouchableOpacity onPress={() => {playVideoPanelRef.current.show();}}>
					<View style={{alignItems:'center'}}>
						<Text style={{color: '#FFFFFF', fontWeight: 'bold', width: 250}} numberOfLines={1}>{playVideoRef.current?.title}</Text>
						<Text style={{color: '#808080', fontSize: 12}} numberOfLines={1}>{playVideoRef.current?.artist}</Text>
					</View>
				</TouchableOpacity>
					<TouchableOpacity style={{right:15}} onPress={()=>{playVideoRef.current?.setPlaying(!playVideoRef.current?.isPlaying)}}>
						<Ionicons name={playVideoRef.current?.isPlaying ? "pause-circle-sharp" : "play-circle-sharp"} size={38} color='#424ed4'/>
					</TouchableOpacity>
			</View>
			<SlidingUpPanel ref={playVideoPanelRef} >
					<PlayVideoScreen ids={props.ids} playlist={props.playlist} ref={playVideoRef} style={styles.video} panelref={hide.bind()}/>
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
		height: 40,
		position: 'absolute',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	video:{
	
	}
});
export default PlayingSong;