
import React,  { useState, useRef,useImperativeHandle, forwardRef, Ref } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLActions from '../../../SQLActions';
import * as Prefs from '../../../Preferences';
import SlidingUpPanel from 'rn-sliding-up-panel';
import ImportServiceComponent from '../../components/ImportServiceComponent';
import { app_icons, notfoundIcon } from '../../../globals';

function NewPlaylist(props: {
		close_panel: () => void
		refresh_playlists_data: () => void
	}, ref: Ref<any>) {
	
	const navigation: NavigationProp<any, any> = useNavigation();
	
	const { colors } = useTheme();
	const styles = themeStyles(colors);
		
	const input_ref = useRef<TextInput>();

	const [playlistName, setPlaylistName] = useState("");
	const [isInvalidName, setIsInvalidName] = useState(true);

	useImperativeHandle(ref, () => ({
		focusInput: () => { input_ref.current?.focus() }
	}))

	function onCancel(){
		props.close_panel(); 
		input_ref.current?.blur();
	}
	async function onCreateValid(){
		setIsInvalidName(true);
		await SQLActions.createPlaylist(playlistName);
		await props.refresh_playlists_data();
		input_ref.current?.clear();
		input_ref.current?.blur();
		props.close_panel();
	}
	async function onNameUpdate(name: string){
		setPlaylistName(name);
		const lname = name.toLowerCase();
		if(!name || !name.trim() || lname == 'tracks' || lname == 'recently_played_tracks' || lname == 'backpack' || lname == 'playlists' || lname == 'audiobooks')
			 setIsInvalidName(true);
		else setIsInvalidName(false);
	}

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1, borderRadius: 15}}>
			<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 55, width: '100%', backgroundColor: '#252525', borderTopLeftRadius: 15, borderTopRightRadius: 15}}>
				<View style={{marginLeft:-50}}></View>
				<Button title='Cancel' color={colors.primary} onPress={onCancel}></Button>
				<Text style={{color: '#FFFFFF', fontWeight:'500', fontSize: 18}}>New Playlist</Text>
				{isInvalidName && <Button title='Create' color={'#808080'} ></Button>}
				{!isInvalidName && <Button title='Create' color={colors.primary} onPress={onCreateValid}></Button>}
				<View style={{marginRight:-50}}></View>
			</View>
			<TextInput maxLength={45} ref={input_ref} placeholder='Playlist name' placeholderTextColor='#808080' style={styles.nameinput} onChangeText={onNameUpdate}></TextInput>
			<View style={{height:40}}></View>
			{/* <TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Illusi Playlist'})}>
				<View style={styles.importfrom}>
					<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={require('../../../assets/icon.png')}/>
					<Text style={styles.importfromtext}>Import Playlist From Illusi</Text>
				</View>
			</TouchableHighlight>
			<View style={styles.line}/> */}
			<ImportServiceComponent service_name='Illusi' navigation={navigation} img_props={require("../../../assets/icon.png")}/>
			<ImportServiceComponent service_name='Musi' navigation={navigation} img_props={{uri: app_icons.musi, cache: 'force-cache'}}/>
			<ImportServiceComponent service_name='YouTube' navigation={navigation} img_props={{uri: app_icons.youtube, cache: 'force-cache'}}/>
			<ImportServiceComponent disabled={!Prefs.hasYouTubeMusicCookies()} service_name='YouTube Music' navigation={navigation} img_props={{uri: app_icons.youtube_music, cache: 'force-cache'}}/> 
			<ImportServiceComponent service_name='Spotify' navigation={navigation} img_props={{uri: app_icons.spotify, cache: 'force-cache'}}/>
			<ImportServiceComponent service_name='Amazon Music' navigation={navigation} img_props={{uri: app_icons.amazon_music, cache: 'force-cache'}}/>
			<ImportServiceComponent disabled={true} service_name='Apple Music' navigation={navigation} img_props={{uri: app_icons.apple_music, cache: 'force-cache'}}/>
			<ImportServiceComponent disabled={true} service_name='SoundCloud' navigation={navigation} img_props={{uri: app_icons.soundcloud, cache: 'force-cache'}}/>
			<ImportServiceComponent disabled={true} service_name='API' navigation={navigation} img_props={notfoundIcon}/>
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
	nameinput:{
		backgroundColor: '#121212',
		height: 60,
		color: 'white',
		width: '100%',
		padding: 10,
	},
	importfrom:{
		height: 45,
		width: '100%',
		backgroundColor: 'black',
		flexDirection: 'row',
		alignItems: 'center',
	},
	importfromtext:{
		color: '#FFFFFF',
		fontSize: 16
	},
	line:{
		width: '100%',
		height: 0.8,
		backgroundColor: '#202020',
		marginHorizontal: 10,
	}
});
export default forwardRef(NewPlaylist);