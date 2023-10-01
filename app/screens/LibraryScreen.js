import React, {useState, useEffect, useRef} from 'react';
import SongComponent from '../components/SongComponent';
import { StyleSheet, Text, View, TextInput, SectionList, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import {GenerateNewUID, decodeHex} from '../Illusive/IllusiveSearch'
import * as DocumentPicker from 'react-native-document-picker'
import BigList from 'react-native-big-list';
import * as SQLActions from '../../SQLActions';
import * as GLOBALS from '../../globals';
import { getAllYoutubePlaylistsFromAccount } from '../Illusive/IllusiveAccountPlaylistFinder';
import axios from 'axios';
import { getYoutubeMusicPlaylist } from '../Illusive/IllusivePlaylistResolver';
import * as Prefs from '../../Preferences';

const LibraryScreen = ({ navigation, route }) => {
	const [allData, setAllData] = useState({charData: [], dataMask: [], numTracks: 0, editMode: 0})

	function setEditMode(mode){
		setAllData(
			{
				charData: allData.charData, 
				dataMask: allData.dataMask, 
				numTracks: allData.numTracks, 
				editMode: mode
			});
	}

	let allAlphabetFastScrollLocations = [];
	let currentPosition = 0;
	let topScroll = 0;
	
	const listRef = useRef();
	const handleError = (err) => {
		if (DocumentPicker.isCancel(err)) {
		  // User cancelled the picker, exit any dialogs or menus and move on
		} else if (DocumentPicker.isInProgress(err)) {
		} else {
		  throw err
		}
	}
	useEffect( () => {
		(async function() {
			await SQLActions.fetchTrackData();
			if (GLOBALS.SQLTracks == null || GLOBALS.SQLTracks == []){
				setAllData({charData: [], dataMask: [], numTracks: 0, editMode: allData.editMode || 0});
				return;
			}

			let sectionsMap = new Map();
			for(const track of GLOBALS.SQLTracks){
				let char = track.video_name[0].toUpperCase();
				if(!(/[A-Z]/).test(char)){ char = '#' }
				if( !sectionsMap.has(char) ){
					sectionsMap.set(char, [track])
				}
				else{
					let newTracks = sectionsMap.get(char)
					newTracks.push(track)
					sectionsMap.set(char, newTracks)
				}
			}
			let sections = []
			let sectionChars = []
			let sortedSectionsMap = [...sectionsMap].sort()
			for(const value of sortedSectionsMap){ 
				sections.push(
					value[1]
					)
					sectionChars.push(value[0])
				}
				setAllData({charData: sectionChars, dataMask: sections, numTracks: GLOBALS.SQLTracks.length, editMode: allData.editMode || 0 })
			})();
	}, []);
		
	async function refreshData(dat){
		if(dat == undefined){return}
		GLOBALS.SQLTracks = dat;
		
		let sectionsMap = new Map();
		for(const track of dat){
			let char = char = track.video_name[0].toUpperCase();
			if(!(/[A-Z]/).test(char)){ char = '#' }
			if( !sectionsMap.has(char) ){
				sectionsMap.set(char, [track])
			}
			else{
				let newTracks = sectionsMap.get(char)
				newTracks.push(track)
				sectionsMap.set(char, newTracks)
			}
		}
		let sections = []
		let sectionChars = []
		let sortedSectionsMap = [...sectionsMap].sort()
		for(const value of sortedSectionsMap){ 
			sections.push(
				value[1]
			)
			sectionChars.push(value[0])
		}
		setAllData({charData: sectionChars, dataMask: sections, numTracks: dat.length, editMode: allData.editMode || 0})
	}

	const { colors } = useTheme();
	const styles = themeStyles(colors);
	const renderItem = ({item}) => <SongComponent disabled={Prefs.prefs.settings.edit_mode_disables_playing && (allData.editMode !== 0)} artwork={item.artwork} media_URI={item.media_URI} video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} downloaded={item.downloaded} imported={item.imported} thumbnail_URI={item.thumbnail_URI} youtube={item.youtube} amazonmusic={item.amazonmusic} spotify={item.spotify} soundcloud={item.soundcloud} uid={item.uid} duration={item.video_duration} setPlaying={route.params?.setPlaying} from={"My Library"} editMode={allData.editMode} 
	refreshData={refreshData.bind(this)} downloadVideo={route.params?.downloadVideo}/>;
	// const renderItem = ({item}) => <Text style={{color: 'white'}}>{item.video_creator}</Text>;

	const headerComponent = () => <TouchableOpacity onPress={async() => {
		if(route.params.setPlaying == undefined){
			return
		}
		await SQLActions.fetchTrackData();
		let tracks = [...GLOBALS.SQLTracks]
		if(tracks.filter((item) => item.downloaded || item.imported).length === 0)
			return;
		if (tracks == []){
			return;
		}
		let currentIndex = tracks.length, randomIndex;
		while (currentIndex != 0) {

			randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			[tracks[currentIndex], tracks[randomIndex]] = [
				tracks[randomIndex], tracks[currentIndex]];
		}
		route.params.setPlaying(tracks, 'Library');

	}} style={{backgroundColor: colors.primary, width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', bottom: 20, marginTop: 40}}><Ionicons name="shuffle" size={25} color='#000000' style={{}}/>
	<Text style={{fontWeight: '500', fontSize: 18}}>Shuffle Play</Text></TouchableOpacity>;

	const sectionHeader = (num) => <View style={styles.sectionHeader}><Text style={styles.sectionText}>{allData.charData[num]}</Text></View>

	const sectionFooter = () => <View style={{alignItems: 'center',marginVertical: 24}}><Text style={{color: colors.subtext, fontSize: 25}}>{allData.numTracks} Tracks</Text></View>

	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<Text style={styles.toptext}>My Library</Text>
				<View style={styles.searchcontainer}>
					<TouchableOpacity style={{bottom: 6, left: 6}} onPress={() => {
						let eM = allData.editMode + 1; 
						if(eM > 2){
							setEditMode(0)
						}else{
							setEditMode(eM)
						}
					}
					}>
						<MaterialCommunityIcons name="pencil" size={25} color={allData.editMode == 0 ? colors.inactive : (allData.editMode == 1 ? colors.primary : colors.red) }/>
					</TouchableOpacity>
					<Ionicons name="search" size={22} color={colors.searchPlaceholder} style={styles.icon}/>
					<TextInput placeholder='Search My Library' placeholderTextColor={colors.searchPlaceholder} style={styles.searchinput} onChangeText={query => {
						let filteredTracks = GLOBALS.SQLTracks.filter(track => 
								(track.video_creator.toUpperCase().includes(query.toUpperCase()) || track.video_name.toUpperCase().includes(query.toUpperCase()))
						)
						let sectionsMap = new Map();
						for(const track of filteredTracks){
							let char = track.video_name[0].toUpperCase();
							if(!(/[A-Z]/).test(char)){ char = '#' }
							if( !sectionsMap.has(char) ){
								sectionsMap.set(char, [track])
							}
							else{
								let newNewTracks = sectionsMap.get(char)
								newNewTracks.push(track)
								sectionsMap.set(char, newNewTracks)
							}
						}
						let sections = []
						let sectionChars = []
						let sortedSectionsMap = [...sectionsMap].sort()
						for(const value of sortedSectionsMap){
							sections.push(
								value[1]
							)
							sectionChars.push(value[0])
						}
						setAllData({charData: sectionChars, dataMask: sections, numTracks: filteredTracks.length, editMode: allData.editMode || 0})
					}}></TextInput>
					<TouchableOpacity style={{bottom: 6, left: 7}} onPress={async() => {
						try {
							const audioFiles = await DocumentPicker.pickMultiple({type: DocumentPicker.types.audio, copyTo: 'documentDirectory'})

							let allPromiseTracks = []

							for(const audioFile of audioFiles){	
								let fileName = audioFile.name.replace(/\..+/, '') || ""						
								let uid = GenerateNewUID(fileName)
								let newFileURI = encodeURI(uid + audioFile.fileCopyUri.match(/\..+/)[0])
								await FileSystem.moveAsync({from: audioFile.fileCopyUri, to: FileSystem.documentDirectory + newFileURI})

								let soundTemp = new Audio.Sound();
								await soundTemp.loadAsync({uri: FileSystem.documentDirectory + newFileURI});
								let metaData = await soundTemp.getStatusAsync();
								await soundTemp.unloadAsync()

								allPromiseTracks.push(SQLActions.insertTrackData(new SQLActions.Track({
									"uid": uid,
									"video_id": "0",
									"video_name": fileName,
									"video_creator": "Sudo",
									"video_duration": Math.round(metaData.durationMillis/1000) || 0,
									"media_URI": newFileURI,
									"imported": true,
									"saved": true,
								})));
							}

							await Promise.all(allPromiseTracks);
							
							await refreshData(GLOBALS.SQLTracks)
							
							for(const file of await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)){
								try {
									if(file != 'RCTAsyncLocalStorage' && file != 'SQLite' && (await FileSystem.getInfoAsync(FileSystem.documentDirectory + file)).isDirectory){
										await FileSystem.deleteAsync(FileSystem.documentDirectory+file, {idempotent:true});
									}
								} catch (error) {
									
								}
							}
						} catch (e) {
							handleError(e)
						}
					}
					}>
						<Ionicons name="cloud-upload" size={25} color={colors.inactive}/>
					</TouchableOpacity>
				</View>
			</View>

			<BigList style={{height: '71%'}} sections={allData.dataMask}
				renderItem={renderItem}
				keyExtractor={(item, index) => index}
				renderFooter={sectionFooter}
				renderHeader={headerComponent}
				renderSectionHeader={sectionHeader}
				sectionHeaderHeight={30}
				headerHeight={90}
				footerHeight={100}
				ref={listRef}
				itemHeight={61}
				onScrollToIndexFailed={() => {}}
				stickySectionHeadersEnabled={false}
			/>
			<View style={{backgroundColor: colors.background,
					position: 'absolute',
					left: '93%',
					top: 380-(7*allData.charData.length),
					justifyContent: 'center',
					alignItems: 'center',
					borderRadius: 10,
					width: 25
				}}
				hitSlop={{left: allData.editMode === 0 ? 20 : 0, right: 20}}
				onStartShouldSetResponder={(ev) => true}
				onTouchStart={(e) => {
					topScroll = 380-(7*allData.charData.length);
				}}
				onResponderMove={(e) => {
					if(allData.charData.length === 0){return}
					if(!(allData.charData.length === allAlphabetFastScrollLocations.length)){						
						allAlphabetFastScrollLocations = [];
						for(let i = 0; i < allData.charData.length; i++){
							allAlphabetFastScrollLocations.push((17*i) + topScroll)
						}
					}
					let target = Math.floor(e.nativeEvent.pageY);
					var closest = allAlphabetFastScrollLocations.reduce(function(prev, curr) {
						return (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev);
					});
					if(currentPosition == closest){
						return
					}
					currentPosition = closest;
					listRef.current?.scrollToLocation({ animated: false, itemIndex: 0, sectionIndex: allAlphabetFastScrollLocations.indexOf(closest) }); 
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
				} }
				>
				{allData.charData.map((element, i) => (
					<View a={allData.charData.length} key={i} style={{justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, height:17, width: 25}} >
						<Text style={{color: colors.primary, fontSize: 14}}>{element}</Text>
					</View>
				))}
			</View>
		</View>
	);
}

const themeStyles = (colors) => StyleSheet.create({
	topcontainer:{
		backgroundColor: colors.background,
		flex: 1,
		justifyContent: 'flex-start'
	},
	header:{
		backgroundColor: colors.shelf,
		width: '100%',
		height: '18%',
		// position: 'absolute',
		top: 0,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	toptext:{
		bottom: 20,
		color: colors.text,
		fontSize: 18,
		fontWeight: '500'
	},
	searchinput:{
		backgroundColor: colors.searchInput,
		color: 'white',
		width: '75%',
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
	sectionHeader:{
		width: '100%',
		height: 30,
		backgroundColor: colors.background,
		justifyContent: 'center'
	},
	sectionText:{
		color: colors.text,
		fontSize: 18,
		fontWeight: 'bold',
		marginHorizontal: 10
	},
});

export default LibraryScreen;