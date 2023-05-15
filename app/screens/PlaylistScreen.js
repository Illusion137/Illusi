import React,  { useState, useRef, useEffect } from 'react';
import { View, Animated, Text, StyleSheet, Image, TouchableOpacity, TextInput, TouchableHighlight, FlatList, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import SlidingUpPanel from 'rn-sliding-up-panel';
import AddPlaylist from './subscreens/AddPlaylist';
import Playlist from '../components/Playlist';


function PlaylistScreen({ route }) {
	const [data, setData] = useState([]);
	const [recentAddData, setRecentAddData] = useState({title:'Recently Added', tracks: [], block: true});
	const [downloadData, setDownloadData] = useState({title:'Downloaded', tracks: [], block: true});
	const [recentPlayedData, setRecentPlayedData] = useState({title:'Recently Played', tracks: [], block: true});
	const [playlistNames, setPlaylistNames] = useState([]);

	const addPlaylistPanelRef = useRef();
	const addPlaylistRef = useRef();

	const navigation = useNavigation();

	useEffect( () => {
		(async function() {
			let storage = await AsyncStorage.getItem('Playlists');
			let libStorage = await AsyncStorage.getItem('Library')
			let libMap; 
			if(libStorage != null){
				libMap = new Map(JSON.parse(libStorage).map((track) => [track.uuid, track]))
			}
			if (storage == null){
				setData([]);
			}else{
				let playlists = JSON.parse(storage)
				let orderedPlaylists = [];
				let unorderedPlaylists = [];
				
				for(const playlist of playlists){
					let newPlaylist = playlist
					let newMappedTracks = []
					for(const trackUUID of playlist.playlistInfo.tracks){
						newMappedTracks.push(libMap.get(trackUUID))
					}
					newPlaylist.playlistInfo.tracks = newMappedTracks
					if(playlist.pinned){orderedPlaylists.push(newPlaylist)}
					else{unorderedPlaylists.push(newPlaylist)}
				}
				let names = []
				try {
					
					for(const playlist of playlists){
						names.push(playlist.playlistInfo.title)
					}
				} catch (error) {
					console.log(error)
				}
				// console.log(names)
				setPlaylistNames(names);
				setData(orderedPlaylists.concat(unorderedPlaylists));
			}
						
			if(libStorage != null){
				let parsedStorage = JSON.parse(libStorage)
				
				setDownloadData({title:'Downloaded', tracks: parsedStorage.filter(item=>item.downloaded || item.imported), block: true})
				
				parsedStorage.reverse()
				setRecentAddData({title:'Recently Added', tracks: parsedStorage.slice(0,200), block: true})
				
				let recentPlayed = await AsyncStorage.getItem('RecentPlayed')
				if(recentPlayed != null){
					let parsedPlayed = JSON.parse(recentPlayed)
					let newMappedTracks = []
					for(const trackUUID of parsedPlayed){
						newMappedTracks.push(libMap.get(trackUUID))
					}
					setRecentPlayedData({title:'Recently Played', tracks: newMappedTracks.slice(0,200), block: true});
				}
			}
		})();
	}, []);

	const renderItem = ({ item }) => (
		<Playlist title={item.playlistInfo.title} length={item.playlistInfo.tracks.length} pinned={item.pinned} image={item.image} playlistInfo={item.playlistInfo} setPlaying={route.params?.setPlaying}/>
	);

	function setDataOutside(dat){
		setData(dat)
	}

	function hide(){ addPlaylistPanelRef.current.hide(); }
	async function getPlaylistInfo(toGet){
		
	}
	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<TouchableOpacity>
						<Ionicons name="swap-vertical-sharp" size={25} color='#424ed4' style={{right:110}}/>
					</TouchableOpacity>
					<Text style={styles.toptext}>Playlists</Text>
					<TouchableOpacity onPress={() => { 
							addPlaylistPanelRef.current.show();
							InteractionManager.runAfterInteractions(() => {
								addPlaylistRef.current.focusInput(); 
							});
						 }}>
						<Ionicons name="add" size={25} color='#424ed4' style={{left: 110}}/>
					</TouchableOpacity>
				</View>
				<View style={styles.searchcontainer}>
					<Ionicons name="search" size={22} color='#808080' style={styles.icon}/>
					<TextInput placeholder='Search Playlists' placeholderTextColor='#808080' style={styles.searchinput} onChangeText={() => {}}></TextInput>
				</View>
			</View>
			<View style={styles.defaultContainer}>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={async() => navigation.navigate('PlaylistSubScreen', {playlistInfo: recentAddData, setPlaying:route.params?.setPlaying})}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Recently Added</Text>
						{recentAddData.tracks.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
						<View>
                            <View style={{flexDirection: 'row'}}>
                                {recentAddData.tracks[2]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${recentAddData.tracks[2].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderTopLeftRadius: 5,opacity: 0.8}}/>}
                                {recentAddData.tracks[3]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${recentAddData.tracks[3].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderTopRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {recentAddData.tracks[0]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${recentAddData.tracks[0].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderBottomLeftRadius: 5,opacity: 0.8}}/>}
                                {recentAddData.tracks[1]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${recentAddData.tracks[1].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderBottomRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                        </View>
					</View>
				</TouchableHighlight>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={async() => navigation.navigate('PlaylistSubScreen', {playlistInfo: downloadData, setPlaying:route.params?.setPlaying})}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Downloads</Text>
						{downloadData.tracks.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
						<View>
                            <View style={{flexDirection: 'row'}}>
                                {downloadData.tracks[2]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${downloadData.tracks[2].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderTopLeftRadius: 5,opacity: 0.8}}/>}
                                {downloadData.tracks[3]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${downloadData.tracks[3].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderTopRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {downloadData.tracks[0]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${downloadData.tracks[0].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderBottomLeftRadius: 5,opacity: 0.8}}/>}
                                {downloadData.tracks[1]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${downloadData.tracks[1].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderBottomRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                        </View>
					</View>
				</TouchableHighlight>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={async() => navigation.navigate('PlaylistSubScreen', {playlistInfo: recentPlayedData, setPlaying:route.params?.setPlaying})}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Recently Played</Text>
						{recentPlayedData.tracks.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
						<View>
                            <View style={{flexDirection: 'row'}}>
                                {recentPlayedData.tracks[2]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${recentPlayedData.tracks[2].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderTopLeftRadius: 5,opacity: 0.8}}/>}
                                {recentPlayedData.tracks[3]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${recentPlayedData.tracks[3].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderTopRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {recentPlayedData.tracks[0]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${recentPlayedData.tracks[0].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderBottomLeftRadius: 5,opacity: 0.8}}/>}
                                {recentPlayedData.tracks[1]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${recentPlayedData.tracks[1].video_id}/mqdefault.jpg`}} style={{width: 55, height: 55, borderBottomRightRadius: 5,opacity: 0.8}}/>}
                            </View>
                        </View>

					</View>
				</TouchableHighlight>
			</View>
			<View style={{width: '100%', height: 1, backgroundColor: '#808080', marginLeft: 30, marginRight: 30}}/>
			<FlatList style={{height: '71%'}} data={data} renderItem={renderItem}/>

			{/* <Playlist title={'Bliss'} length={67} pinned={true}/> */}

			{/* <Playlist title={'Seycara'} length={80} pinned={false}/> */}
			{/* <Playlist title={'Songs'} length={200} pinned={true}/> */}

			<SlidingUpPanel allowDragging={false} draggableRange={{top:660, bottom: 0}} ref={addPlaylistPanelRef} animatedValue={new Animated.Value(0)}>
				<AddPlaylist ref={addPlaylistRef} panelref={hide.bind()} refreshData={setDataOutside.bind()} allPlaylistNames={playlistNames}/>
			</SlidingUpPanel>
		</View>
	);
}
const styles = StyleSheet.create({
	topcontainer:{
		backgroundColor: '#000000',
		flex: 1,
	},
	header:{
		backgroundColor: '#121212',
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
		backgroundColor: '#303030',
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
		backgroundColor: '#303030',
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
		borderRadius: 5
	},

});
export default PlaylistScreen;