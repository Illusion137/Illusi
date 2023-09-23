import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

import SlidingUpPanel from 'rn-sliding-up-panel';
import PlayVideoScreen from './PlayVideoScreen';

function PlayingSong (props) {
    const { colors } = useTheme();
	const styles = themeStyles(colors);

	const playVideoPanelRef = useRef()
	const playVideoRef = useRef()

	const [title, setTitle] = useState("");
	const [artist, setArtist] = useState("");
	const [playing, setPlaying] = useState(true);

	function hide(){
		setTitle(playVideoRef.current?.title)
		setArtist(playVideoRef.current?.artist)
		setPlaying(playVideoRef.current?.isPlaying)
		playVideoPanelRef.current?.hide();
	}
	function setStates(){
		setTitle(playVideoRef.current?.title);
		setArtist(playVideoRef.current?.artist);
		setPlaying(playVideoRef.current?.isPlaying); 
	}
	useEffect(() => {
		function onEffect() {
			playVideoPanelRef.current.show()
		}
	
		onEffect();
		
	}, []);

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
			<SlidingUpPanel friction={1} snappingPoints={[0,850]} animatedValue={new Animated.Value(0)} ref={playVideoPanelRef} onBottomReached={setStates} onDragEnd={setStates}>
					<PlayVideoScreen data={props.data} playlist={props.playlist} ref={playVideoRef} style={styles.video} hide={hide.bind(this)}/>
			</SlidingUpPanel>
		</View>
	)
}
const themeStyles = (colors) => StyleSheet.create({
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
		backgroundColor: colors.playingSong,
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