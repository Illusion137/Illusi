
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

function AddPlaylistFrom({route}) {

	const inputRef = useRef()
	const navigation = useNavigation();

	const [isNextDisabled, setDisabled] = useState(true)

	useEffect(() => {
		function setHeader() {
			navigation.setOptions({title: route.params.title})
		}
	
		setHeader();
	}, []);
	
	const from = route.params.title.toString().split(' ')[1]
	function getLinkText(){
		switch(from){
			case('YouTube'):
				return 'https://www.youtube.com/playlist?list=...'
			case('Musi'):
				return 'https://feelthemusi.com/playlist/...'
			case('Spotify'):
				return 'https://open.spotify.com/playlist/... or  \n - https://open.spotify.com/album/...'
			case('Amazon'):
				return 'https://music.amazon.com/user-playlists/... or  \n - https://music.amazon.com/playlists/...'
			default:
				console.log('else')
		}
	}
	const defaultlink = getLinkText()
	function isValidInput(text){
		switch(from){
			case('YouTube'):
				if( RegExp(/(https?:\/\/)youtube\.com\/playlist\?list=.+/i).test(text)){ return true; } else{return false;}
			case('Musi'):
				if( RegExp(/(https?:\/\/)feelthemusi\.com\/playlist\/.+/i).test(text)){ return true; } else{return false;}
			case('Spotify'):
				if( RegExp(/(https?:\/\/)open\.spotify\.com\/(playlist|album)\/.+/i).test(text)){ return true; }else{return false;}
			case('Amazon'):
				if( RegExp(/(https?:\/\/)music\.amazon\.com\/(playlists|user-playlists)\/.+/i).test(text)){ return true; }else{return false;}
			default:
				console.log('else')
		}
	}

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1,}}>
			<TextInput autoCorrect={false} ref={inputRef} placeholder='Playlist Link' placeholderTextColor='#808080' style={styles.nameinput} onChangeText={text => { if(isValidInput(text)){ setDisabled(false) ; navigation.setOptions({ headerRight: () => (
								<Button
									color='blue'
									onPress={() => navigation.navigate('GetAddPlaylistFrom', {url: text, title: route.params.title})}
									title="Next"
								/>
								)}) } else if(!isNextDisabled){
									navigation.setOptions({ headerRight: () => (
										<Button
											onPress={() => {}}
											title="Next"
											color='#808080'			
										/>
										)})
								} }}></TextInput>
			<Text style={styles.enterittext}>Enter a link to a {from} Playlist to add it to your {from}.</Text>
			<Text style={styles.looksliketext}>A {from} playlist link usually looks like the following:</Text>
			<Text style={styles.exlinktext}> - {defaultlink}</Text>

		</View>
	);
}
const styles = StyleSheet.create({
	nameinput:{
		backgroundColor: '#121212',
		height: 60,
		color: 'white',
		width: '100%',
		padding: 10,
	},
	enterittext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 10
	},
	looksliketext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 15
	},
	exlinktext:{
		color: '#909090',
		marginHorizontal: 10
	}
});
export default AddPlaylistFrom;