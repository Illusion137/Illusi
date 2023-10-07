import React,  { useState, useRef, useEffect } from 'react';
import { View, Animated, Text, StyleSheet, Image, TouchableOpacity, TextInput, TouchableHighlight, FlatList, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useTheme } from '@react-navigation/native';
import SlidingUpPanel from 'rn-sliding-up-panel';
import AddPlaylist from './subscreens/AddPlaylist';
import Playlist from '../components/Playlist';
import * as SQLActions from '../../SQLActions';
import * as GLOBALS from '../../globals';

import { useIsFocused } from '@react-navigation/native';

function PlaylistScreen({ route }) {

	const [data, setData] = useState([]);
	const [recentAddData, setRecentAddData] = useState([]);
	const [downloadData, setDownloadData] = useState([]);
	const [recentPlayedData, setRecentPlayedData] = useState([]);
	
	const addPlaylistPanelRef = useRef();
	const addPlaylistRef = useRef();

	const navigation = useNavigation();

	const { colors } = useTheme();
	const styles = themeStyles(colors);

    const isFocused = useIsFocused();

	useEffect( () => {
		(async function() {
            if(isFocused){
				let playlists = await SQLActions.getAllPlaylists();

				for(let i = 0; i < playlists.length; i++){
					let playlistTracks = await SQLActions.getPlaylistTracks(playlists[i].playlist_name.replaceAll(' ', '_'));

					playlists[i]['track_count'] = playlistTracks.length;
					playlists[i]['four_track'] = playlistTracks.slice(0,4);
					playlists[i]['pinned'] = await SQLActions.getIsPlaylistsPinned(playlists[i].playlist_name) == 0 ? false : true
				}
				let orderedPlaylists = []
				for(let i = 0; i < playlists.length; i++){
					if(playlists[i].pinned)
						orderedPlaylists.unshift(playlists[i])
					else
						orderedPlaylists.push(playlists[i])
				}
				setData([])
				setData(orderedPlaylists)

				let t = [...GLOBALS.SQLTracks].reverse()
				setRecentAddData(t.slice(0,4))
				setDownloadData(t.filter(item=>item.downloaded || item.imported).slice(0,4))

				setRecentPlayedData( (await SQLActions.getRecentlyPlayedData()).reverse() );
			}
		})();
	}, [isFocused]);

	async function refreshData(searchVal = undefined){
		let playlists = await SQLActions.getAllPlaylists();
		if(searchVal != '' && searchVal != null && searchVal != undefined)
			playlists = playlists.filter(item => item.playlist_name.toLowerCase().includes(searchVal.toLowerCase()))

		for(let i = 0; i < playlists.length; i++){
			let playlistTracks = await SQLActions.getPlaylistTracks(playlists[i].playlist_name.replaceAll(' ', '_'));
			
			playlists[i]['track_count'] = playlistTracks.length;
			playlists[i]['four_track'] = playlistTracks.slice(0,4);
			playlists[i]['pinned'] = await SQLActions.getIsPlaylistsPinned(playlists[i].playlist_name) == 0 ? false : true
		}
		let orderedPlaylists = []
		for(let i = 0; i < playlists.length; i++){
			if(playlists[i].pinned)
				orderedPlaylists.unshift(playlists[i])
			else
				orderedPlaylists.push(playlists[i])
		}
		setData([])
		setData(orderedPlaylists)

		let t = [...GLOBALS.SQLTracks].reverse()
		setRecentAddData(t.slice(0,4))
		setDownloadData(t.filter(item=>item.downloaded || item.imported).slice(0,4))

		setRecentPlayedData( (await SQLActions.getRecentlyPlayedData()).reverse() );
	}

	const renderItem = ({ item }) => (
		<Playlist title={item.playlist_name} pinned={item.pinned} four_track={item.four_track} track_count={item.track_count} setPlaying={route.params?.setPlaying} refreshData={refreshData.bind(this)}/>
	);

	function hide(){ addPlaylistPanelRef.current.hide(); }
	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<TouchableOpacity>
						<Ionicons name="swap-vertical-sharp" size={25} color={colors.primary} style={{right:110}}/>
					</TouchableOpacity>
					<Text style={styles.toptext}>Playlists</Text>
					<TouchableOpacity onPress={() => { 
							addPlaylistPanelRef.current.show();
							InteractionManager.runAfterInteractions(() => {
								addPlaylistRef.current.focusInput(); 
							});
						 }}>
						<Ionicons name="add" size={25} color={colors.primary} style={{left: 110}}/>
					</TouchableOpacity>
				</View>
				<View style={styles.searchcontainer}>
					<Ionicons name="search" size={22} color='#808080' style={styles.icon}/>
					<TextInput placeholder='Search Playlists' placeholderTextColor='#808080' style={styles.searchinput} onChangeText={(val) => {refreshData(val)}}></TextInput>
				</View>
			</View>
			<View style={styles.defaultContainer}>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={async() => navigation.navigate('PlaylistSubScreen', {'title': "Recently Added", setPlaying:route.params?.setPlaying})}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Recently Added</Text>
						{recentAddData.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
                        {recentAddData.length !== 0 && recentAddData.length < 4 && <Image source={recentAddData[0].artwork} style={styles.notfound}/>}
						{recentAddData.length >= 4 && <View>
                            <View style={{flexDirection: 'row'}}>
                                {recentAddData[0] != undefined && <Image source={recentAddData[0].artwork} style={{width: 55, height: 55, borderTopLeftRadius: 5,opacity: 0.8}}/>}
                                {recentAddData[1] != undefined && <Image source={recentAddData[1].artwork} style={{width: 55, height: 55, borderTopRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {recentAddData[2] != undefined && <Image source={recentAddData[2].artwork} style={{width: 55, height: 55, borderBottomLeftRadius: 5,opacity: 0.8}}/>}
                                {recentAddData[3] != undefined && <Image source={recentAddData[3].artwork} style={{width: 55, height: 55, borderBottomRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                        </View>}
					</View>
				</TouchableHighlight>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={async() => navigation.navigate('PlaylistSubScreen', {'title': "Downloads", setPlaying:route.params?.setPlaying})}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Downloads</Text>
						{downloadData.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
                        {downloadData.length !== 0 && downloadData.length < 4 && <Image source={downloadData[0].artwork} style={styles.notfound}/>}
						{downloadData.length >= 4 && 
						<View>
                            <View style={{flexDirection: 'row'}}>
                                {downloadData[0] != undefined && <Image source={downloadData[0].artwork} style={{width: 55, height: 55, borderTopLeftRadius: 5,opacity: 0.8}}/>}
                                {recentAddData[1] != undefined && <Image source={downloadData[1].artwork} style={{width: 55, height: 55, borderTopRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {downloadData[2] != undefined && <Image source={downloadData[2].artwork} style={{width: 55, height: 55, borderBottomLeftRadius: 5,opacity: 0.8}}/>}
                                {downloadData[3] != undefined && <Image source={downloadData[3].artwork} style={{width: 55, height: 55, borderBottomRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                        </View>}
					</View>
				</TouchableHighlight>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={async() => navigation.navigate('PlaylistSubScreen', {'title': "Recently Played", setPlaying:route.params?.setPlaying})}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Recently Played</Text>
						{recentPlayedData.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
                        {recentPlayedData.length !== 0 && recentPlayedData.length < 4 && <Image source={recentPlayedData[0].artwork} style={styles.notfound}/>}
						{recentPlayedData.length >= 4 && <View>
                            <View style={{flexDirection: 'row'}}>
                                {recentPlayedData[0] != undefined && <Image source={recentPlayedData[0].artwork} style={{width: 55, height: 55, borderTopLeftRadius: 5,opacity: 0.8}}/>}
                                {recentPlayedData[1] != undefined && <Image source={recentPlayedData[1].artwork} style={{width: 55, height: 55, borderTopRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {recentPlayedData[2] != undefined && <Image source={recentPlayedData[2].artwork} style={{width: 55, height: 55, borderBottomLeftRadius: 5,opacity: 0.8}}/>}
                                {recentPlayedData[3] != undefined && <Image source={recentPlayedData[3].artwork} style={{width: 55, height: 55, borderBottomRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                        </View>}
					</View>
				</TouchableHighlight>
			</View>
			<View style={{width: '100%', height: 1, backgroundColor: '#808080', marginLeft: 30, marginRight: 30}}/>
			<FlatList style={{height: '71%'}} data={data} renderItem={renderItem}/>

			{/* <Playlist title={'Bliss'} length={67} pinned={true}/> */}

			{/* <Playlist title={'Seycara'} length={80} pinned={false}/> */}
			{/* <Playlist title={'Songs'} length={200} pinned={true}/> */}

			<SlidingUpPanel allowDragging={false} draggableRange={{top:660, bottom: 0}} ref={addPlaylistPanelRef} animatedValue={new Animated.Value(0)}>
				<AddPlaylist ref={addPlaylistRef} panelref={hide.bind()} refreshData={refreshData.bind(this)}/>
			</SlidingUpPanel>
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
	topcontainer:{
		backgroundColor: colors.backgroundColor,
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