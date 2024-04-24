import React,  { useState, useRef, useEffect } from 'react';
import { View, Animated, Text, StyleSheet, Image, TouchableOpacity, TextInput, TouchableHighlight, FlatList, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import SlidingUpPanel, { SlidingUpPanelProps } from 'rn-sliding-up-panel';
import NewPlaylist from './subscreens/NewPlaylist';
import PlaylistComponent from '../components/PlaylistComponent';
import * as SQLActions from '../../SQLActions';
import * as GLOBALS from '../../globals';

import { useIsFocused } from '@react-navigation/native';
import DefaultPlaylistComponent from '../components/DefaultPlaylistComponent';
import { darkThemeDefault } from '../../Preferences';
import { Playlist, Track } from '../../types';

let search_query = "";
function PlaylistScreen() {

	const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);

	const navigation: NavigationProp<any, any> = useNavigation();
    const is_focused = useIsFocused();

	const [playlists, setPlaylists] = useState([] as Playlist[]);
	const [recentAddData, setRecentAddData] = useState([] as Track[]);
	const [downloadData, setDownloadData] = useState([] as Track[]);
	const [recentPlayedData, setRecentPlayedData] = useState([] as Track[]);
	
	const panel_ref = useRef<SlidingUpPanel>();
	const new_playlist_ref = useRef<{ focusInput: () => void }>();

	useEffect( () => {
		if(is_focused){
			refreshData();
		}
	}, [is_focused]);

	async function refreshData(query: (string|undefined) = undefined){
		search_query = query ?? "";
		let playlists = await SQLActions.getAllPlaylists();

		if(search_query)
			playlists = playlists.filter(item => item.playlist_name.toLowerCase().includes(search_query.toLowerCase()));

		for(let i = 0; i < playlists.length; i++){
			const playlistTracks = await SQLActions.getPlaylistTracks(playlists[i].playlist_name.replaceAll(' ', '_'));
			
			playlists[i]['track_count'] = playlistTracks.length;
			playlists[i]['four_track'] = playlistTracks.slice(0,4);
			playlists[i]['pinned'] = await SQLActions.getIsPlaylistsPinned(playlists[i].playlist_name);
		}
		const ordered_playlists = []
		for(let i = 0; i < playlists.length; i++){
			if(playlists[i].pinned)
				ordered_playlists.unshift(playlists[i]);
			else
				ordered_playlists.push(playlists[i]);
		}
		setPlaylists([])
		setPlaylists(ordered_playlists)

		const t = [...GLOBALS.global_var.SQLTracks].reverse()
		setRecentAddData(t.slice(0,4))
		setDownloadData(t.filter(item=>item.downloaded || item.imported).slice(0,4));
		setRecentPlayedData( (await SQLActions.getRecentlyPlayedData()).reverse() );
	}

	function showNewPlaylistPanel() { 
		panel_ref.current?.show();
		InteractionManager.runAfterInteractions(() => {
			new_playlist_ref.current?.focusInput(); 
		});
	 }

	const renderItem = (item: {item: Playlist}) => (
		<PlaylistComponent playlist_data={item.item} refreshData={refreshData}/>
	);

	function hide(){ panel_ref.current?.hide(); }
	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<TouchableOpacity>
						<Ionicons name="swap-vertical-sharp" size={25} color={colors.primary} style={{right:110}}/>
					</TouchableOpacity>
					<Text style={styles.toptext}>Playlists</Text>
					<TouchableOpacity onPress={showNewPlaylistPanel}>
						<Ionicons name="add" size={25} color={colors.primary} style={{left: 110}}/>
					</TouchableOpacity>
				</View>
				<View style={styles.searchcontainer}>
					<Ionicons name="search" size={22} color='#808080' style={styles.icon}/>
					<TextInput placeholder='Search Playlists' placeholderTextColor='#808080' style={styles.searchinput} onChangeText={(val) => {refreshData(val)}}></TextInput>
				</View>
			</View>
			<View style={styles.defaultContainer}>
				<DefaultPlaylistComponent title="Recently Added" four_track={recentAddData} navigation={navigation}/>
				<DefaultPlaylistComponent title="Downloads" four_track={downloadData} navigation={navigation}/>
				<DefaultPlaylistComponent title="Recently Played" four_track={recentPlayedData} navigation={navigation}/>
			</View>
			<View style={{width: '100%', height: 1, backgroundColor: '#808080', marginLeft: 30, marginRight: 30}}/>
			<FlatList style={{height: '71%'}} data={playlists} renderItem={renderItem} ListFooterComponent={(<View style={{height:100}}></View>)}/>
			<SlidingUpPanel allowDragging={false} draggableRange={{top:660, bottom: 0}} ref={panel_ref as any} animatedValue={new Animated.Value(0)}>
				<NewPlaylist ref={new_playlist_ref as any} close_panel={hide} refresh_playlists_data={refreshData}/>
			</SlidingUpPanel>
		</View>
	);
}
const themeStyles = (colors: typeof darkThemeDefault.colors) => StyleSheet.create({
	topcontainer:{
		backgroundColor: colors.background,
		flex: 1,
	},
	header:{
		backgroundColor: colors.shelf,
		width: '100%',
		height: '18%',
		top: 0,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	toptext:{
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '500'
	},
	searchinput:{
		backgroundColor: colors.searchInput,
		color: 'white',
		width: '90%',
		bottom: 10,
		padding: 10,
		borderTopRightRadius: 10,// Top Right Corner
		borderBottomRightRadius: 10, // Bottom Right Corner
	},
	searchcontainer:{
		justifyContent: 'center',
		height: '24%',
		left:-5,
		width: '100%',
		flexDirection: 'row'
	},
	icon:{
		overflow: 'hidden',
		backgroundColor: colors.searchInput,
		paddingTop: 5,
		paddingLeft: 5,
		paddingRight: 5,
		bottom: 10,
		left: 10,
		borderRadius:10,
		zIndex: 1
	},
	defaultPlaylistText:{
		color:'#FFFFFF', 
		fontSize: 18, 
		fontWeight: 'bold', 
		textAlign:'center',
		position: 'absolute',
		zIndex: 1
	},
	defaultPlaylistButton:{
		backgroundColor: '#121212', 
		height: 110, 
		width: 110,
		borderRadius: 5,
		margin: 5,
		justifyContent: 'center'
	},
	defaultContainer:{
		margin: 5,
		flexDirection: 'row'
	},
	images:{
		width: 55, 
		height: 55, 
		aspectRatio:1, 
		resizeMode: 'cover',
	},
	notfound:{
		width:110,
		height:110,
		borderRadius: 5,
	},
});
export default PlaylistScreen;