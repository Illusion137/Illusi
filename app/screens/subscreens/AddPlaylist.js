
import React,  { useState, useRef,useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLActions from '../../../SQLActions';
import * as Prefs from '../../../Preferences';

function AddPlaylist(props, ref) {
	const inputRef = useRef();
	const navigation = useNavigation();

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const [playlistName, setPlaylistName] = useState("");
	const [isEmptyName, setIsEmpty] = useState(true)

	useImperativeHandle(ref, () => ({
		focusInput: () => { inputRef.current.focus() }
	}))

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1, borderRadius: 15}}>
			<View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 55, width: '100%', backgroundColor: '#252525', borderTopLeftRadius: 15, borderTopRightRadius: 15}}>
				<View style={{marginLeft:-50}}></View>
				<Button title='Cancel' color={colors.primary} style={{left: 20}} onPress={() => {props.panelref(); inputRef.current?.blur()}}></Button>
				<Text style={{color: '#FFFFFF', fontWeight:'500', fontSize: 18}}>New Playlist</Text>
				{isEmptyName && <Button title='Create' color={'#808080'} ></Button>}
				{!isEmptyName && <Button title='Create' color={colors.primary} onPress={async () => {
					setIsEmpty(true)
					await SQLActions.createPlaylist(playlistName)
					await props.refreshData()
					inputRef.current?.clear()
					inputRef.current?.blur()
					props.panelref();
				}}></Button>}
				<View style={{marginRight:-50}}></View>
			</View>
			<TextInput maxLength={45} ref={inputRef} placeholder='Playlist name' placeholderTextColor='#808080' style={styles.nameinput} onChangeText={async (text) => { setPlaylistName(text); if(text == '' || text == null || text == 'tracks'){
				setIsEmpty(true)
			}
			else{
				setIsEmpty(false)
			}
			}}></TextInput>
			<View style={{height:40}}></View>
			{/* <TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Illusi Playlist'})}>
				<View style={styles.importfrom}>
					<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={require('../../../assets/icon.png')}/>
					<Text style={styles.importfromtext}>Import Playlist From Illusi</Text>
				</View>
			</TouchableHighlight>
			<View style={styles.line}/> */}
			<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Musi Playlist'})}>
				<View style={styles.importfrom}>
					<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/7d/76/2f/7d762f0e-10ab-1ff2-baf7-84cdaca16219/Icon-1x_U007emarketing-0-6-0-85-220.png/350x350.png?'}}/>
					<Text style={styles.importfromtext}>Import Playlist From Musi</Text>
				</View>
			</TouchableHighlight>
			<View style={styles.line}/>
			<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import YouTube Playlist'})}>
				<View style={styles.importfrom}>
					<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is5-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/c7/18/fcc718a6-bd55-b1aa-93e4-4073a2ad3b13/logo_youtube_color-1x_U007emarketing-0-6-0-85-220.png/350x350.png?'}}/>
					<Text style={styles.importfromtext}>Import Playlist From YouTube</Text>
				</View>
			</TouchableHighlight>
			<View style={styles.line}/>
			{Prefs.hasYouTubeMusicCookies() && <>
				<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import YTMusic Playlist'})}>
					<View style={styles.importfrom}>
						<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/44/c6/3d/44c63da2-7a82-bd82-821d-1cd01f2b510f/AppIcon-0-1x_U007emarketing-0-0-0-7-0-0-0-85-220-0.png/350x350.png?'}}/>
						<Text style={styles.importfromtext}>Import Playlist From YouTube Music</Text>
					</View>
				</TouchableHighlight>
				<View style={styles.line}/>
			</>}
			<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Spotify Playlist'})}>
				<View style={styles.importfrom}>
					<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/63/64/fa/6364fa97-398a-46da-32ac-765e8f328548/AppIcon-0-1x_U007emarketing-0-6-0-0-0-85-220-0.png/350x350.png?'}}/>
					<Text style={styles.importfromtext}>Import Playlist From Spotify</Text>
				</View>
			</TouchableHighlight>
			<View style={styles.line}/>
			<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Amazon Playlist'})}>
				<View style={styles.importfrom}>
					<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={{uri: 'https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/b8/aa/fcb8aae7-180e-7b29-7c83-255f1c86eba8/AppIcon-1x_U007emarketing-0-10-0-85-220.png/350x350.png?'}}/>
					<Text style={styles.importfromtext}>Import Playlist From Amazon Music</Text>
				</View>
			</TouchableHighlight>
			<View style={styles.line}/>
			{/* <TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import Custom Service'})}>
				<View style={styles.importfrom}>
					<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={require("../../../assets/dark.png")}/>
					<Text style={styles.importfromtext}>Import From Custom Service</Text>
				</View>
			</TouchableHighlight>
			<View style={styles.line}/>
			<TouchableHighlight activeOpacity={0.6} underlayColor="#FFFFFF" onPress={() => navigation.navigate('AddPlaylistFrom' , {title: 'Import File'})}>
				<View style={styles.importfrom}>
					<Image style={{marginHorizontal: 12,height: 25, width: 25, borderRadius: 5}} source={require("../../../assets/notfound.png")}/>
					<Text style={styles.importfromtext}>Import From File</Text>
				</View>
			</TouchableHighlight> */}
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
export default forwardRef(AddPlaylist);