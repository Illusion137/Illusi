import React, {useState, useEffect, useRef} from 'react';
import SongComponent from '../components/SongComponent';
import { StyleSheet, Text, View, TextInput, SectionList, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import {GenerateNewUUID} from '../Illusive/IllusiveSearch'
import * as DocumentPicker from 'expo-document-picker';

const LibraryScreen = ({ navigation, route }) => {	
	
	const [charData, setCharData] = useState([])
	const [numofTracks, setNumOfTracks] = useState(0);
	const [dataMask, setDataMask] = useState([]);
	const [baseData, setBaseData] = useState([]);
	const [editMode, setEditMode] = useState(0)

	let writePlaylist = route?.params?.writePlaylist;

	let allAlphabetFastScrollLocations = [];
	let currentPosition = 0;

	const listRef = useRef();

	useEffect( () => {
		(async function() {
			// AsyncStorage.removeItem('DownloadQueue').then(() => {console.log('f')})
			// console.log(await AsyncStorage.getItem('DownloadQueue'))

			let storage = await AsyncStorage.getItem('Library');
			if (storage == null){
				setDataMask([]);
				return;
			}
			let tracks = JSON.parse(storage);


			setBaseData(tracks)
			setNumOfTracks(tracks.length)
			
			let sectionsMap = new Map();
			tracks.forEach(track => {
				let char = track.video_name[0].toUpperCase()
				if(!(/[A-Z]/).test(char)){ char = '#' }
				if( !sectionsMap.has(char) ){
					sectionsMap.set(char, [track])
				}
				else{
					let newTracks = sectionsMap.get(char)
					newTracks.push(track)
					sectionsMap.set(char, newTracks)
				}
			})
			let sections = []
			let sectionChars = []
			let sortedSectionsMap = [...sectionsMap].sort()
			sortedSectionsMap.forEach((value) => { 
				sections.push({
					title: value[0],
					data: value[1]
				})
				sectionChars.push(value[0])
			})
			setCharData(sectionChars);
			setDataMask(sections);
		})();
	}, []);

	async function refreshData(dat){
		if(dat == undefined){return}
		setBaseData(dat)
		setNumOfTracks(dat.length)
		
		let sectionsMap = new Map();
		dat.forEach(track => {
			let char = track.video_name[0].toUpperCase()
			if(!(/[A-Z]/).test(char)){ char = '#' }
			if( !sectionsMap.has(char) ){
				sectionsMap.set(char, [track])
			}
			else{
				let newTracks = sectionsMap.get(char)
				newTracks.push(track)
				sectionsMap.set(char, newTracks)
			}
		})
		let sections = []
		let sectionChars = []
		let sortedSectionsMap = [...sectionsMap].sort()
		sortedSectionsMap.forEach((value) => { 
			sections.push({
				title: value[0],
				data: value[1]
			})
			sectionChars.push(value[0])
		})
		setCharData(sectionChars);
		setDataMask(sections);
	}

	const { colors } = useTheme();
	const styles = themeStyles(colors);
	const renderItem = ({ item }) => (<SongComponent key={item.video_id} uri={item.uri} video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} downloaded={item.downloaded} imported={item.imported} uuid={item.uuid} setPlaying={route?.params?.setPlaying} from={"My Library"} editMode={editMode} 
	refreshData={refreshData.bind(this)}/>);

	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<Text style={styles.toptext}>My Library</Text>
				<View style={styles.searchcontainer}>
					<TouchableOpacity style={{bottom: 6, left: 6}} onPress={() => {
						let eM = editMode + 1; 
						if(eM > 2){
							setEditMode(0)
						}else{
							setEditMode(eM)
						}
					}
					}>
						<MaterialCommunityIcons name="pencil" size={25} color={editMode == 0 ? '#808080' : (editMode == 1 ? colors.primary : '#FF0000') }/>
					</TouchableOpacity>
					<Ionicons name="search" size={22} color='#808080' style={styles.icon}/>
					<TextInput placeholder='Search My Library' placeholderTextColor='#808080' style={styles.searchinput} onChangeText={query => {
						let newTracks = baseData;
						
						let filteredTracks = newTracks.filter(track => 
							(track.video_creator.toUpperCase().includes(query.toUpperCase()) || track.video_name.toUpperCase().includes(query.toUpperCase()))
						)
						
						let sectionsMap = new Map();
						filteredTracks.forEach(track => {
							let char = track.video_name[0].toUpperCase()
							if( !sectionsMap.has(char) ){
								sectionsMap.set(char, [track])
							}
							else{
								let newNewTracks = sectionsMap.get(char)
								newNewTracks.push(track)
								sectionsMap.set(char, newNewTracks)
							}
						})
						setNumOfTracks(filteredTracks.length)
						let sections = []
						let sectionChars = []
						let sortedSectionsMap = [...sectionsMap].sort()
						sortedSectionsMap.forEach((value) => {
							sections.push({
								title: value[0],
								data: value[1]
							})
							sectionChars.push(value[0])
						})
						setCharData(sectionChars)
						setDataMask(sections);
					}}></TextInput>
					<TouchableOpacity style={{bottom: 6, left: 7}} onPress={async() => {
						let audioFile = await DocumentPicker.getDocumentAsync({type: 'audio/*', multiple: true, copyToCacheDirectory: true});
						if(audioFile.type == 'cancel'){
							return
						}
						let uuid = GenerateNewUUID()

						let newURI = FileSystem.documentDirectory + uuid + '.mp3'

						await FileSystem.moveAsync({from: audioFile.uri, to: newURI})

						let soundTemp = new Audio.Sound();
						await soundTemp.loadAsync({uri: newURI});
						let metaData = await soundTemp.getStatusAsync();

						await soundTemp.unloadAsync()

						let dat = {
							"video_duration": Math.round(metaData.durationMillis/1000) || 0,
							"video_name": audioFile.name.replace('.mp3', '') || "",
							"video_creator": "Illusion",
							"video_id": "0",
							"saved": false,
							"downloaded": false,
							"imported": true,
							"uuid": uuid,
							"uri": newURI
						}

						let storage = await AsyncStorage.getItem('Library')
						if(storage == null){
							await AsyncStorage.setItem('Library', JSON.stringify([dat]))
							await refreshData([dat])
						}
						else{
							let parsedStorage = JSON.parse(storage);
							parsedStorage.push(dat)
							await AsyncStorage.setItem('Library', JSON.stringify(parsedStorage))
							await refreshData(parsedStorage)
						}
					}
					}>
						<Ionicons name="cloud-upload" size={25} color={editMode == 0 ? '#808080' : (editMode == 1 ? colors.primary : '#FF0000') }/>
					</TouchableOpacity>
				</View>
			</View>
			<SectionList style={{height: '71%'}} sections={dataMask}
				disableVirtualization={true}
				initialNumToRender={10}
				windowSize={1}

				removeClippedSubviews={true}
				renderItem={renderItem }
				keyExtractor={item => item.uuid}
				renderSectionHeader={({ section: { title } }) => (<View style={styles.sectionHeader}><Text style={styles.sectionText}>{title}</Text></View>)}
				ListFooterComponent={<View style={{alignItems: 'center',marginVertical: 24}}><Text style={{color: '#808080', fontSize: 25}}>{numofTracks} Tracks</Text></View>}
				ListHeaderComponent={<TouchableOpacity onPress={async() => {
					if(route.params.setPlaying == undefined){
						return
					}
					let storage = await AsyncStorage.getItem('Library');
					if (storage == null){
						return;
					}
					let data = JSON.parse(storage);
					let currentIndex = data.length, randomIndex;

					while (currentIndex != 0) {

						randomIndex = Math.floor(Math.random() * currentIndex);
						currentIndex--;

						[data[currentIndex], data[randomIndex]] = [
						data[randomIndex], data[currentIndex]];
					}
					route.params.setPlaying(data, 'Library');

				}} style={{backgroundColor: colors.primary, width: '100%', height: 50, marginTop: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}><Ionicons name="shuffle" size={25} color='#000000' style={{}}/>
				<Text style={{fontWeight: '450', fontSize: 18}}>Shuffle Play</Text></TouchableOpacity>}
				ref={listRef}
				getItemLayout={(data, index) => ({length: 60, offset: 60 * index, index })}
			/>
			<View style={{backgroundColor: '#121212',
					position: 'absolute',
					left: '93%',
					top: 380-(7*charData.length),
					justifyContent: 'center',
					alignItems: 'center',
					borderRadius: 10,
					width: 25
				}}
				hitSlop={{left: editMode === 0 ? 30 : 0, right: 20}}
				onStartShouldSetResponder={(ev) => true}
				// onTouchStart={(e) => {
				// 	allAlphabetFastScrollLocations = [];
				// 	for(let i = 0; i < charData.length; i++){
				// 		allAlphabetFastScrollLocations.push(17*i)
				// 	}
				// 	// allAlphabetFastScrollLocations.sort(function(a, b) {
				// 		// 	return a - b;
				// 		// });
				// 		let target = Math.floor(e.nativeEvent.locationY);
				// 		var closest = allAlphabetFastScrollLocations.reduce(function(prev, curr) {
				// 		return (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev);
				// 	});
				// 	// console.log(closest)
				// 	if(currentPosition == closest){
				// 		return
				// 	}
				// 	currentPosition = closest;
				// 	listRef.current?.scrollToLocation({ animated: false, itemIndex: 0, sectionIndex: allAlphabetFastScrollLocations.indexOf(closest) }); 
				// 	Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
				// }}
				onResponderMove={(e) => {
					if(charData.length === 0){return}
					if(!(charData.length === allAlphabetFastScrollLocations.length)){						
						allAlphabetFastScrollLocations = [];
						for(let i = 0; i < charData.length; i++){
							allAlphabetFastScrollLocations.push(17*i)
						}
					}
					// allAlphabetFastScrollLocations.sort(function(a, b) {
						// 	return a - b;
						// });
						let target = Math.floor(e.nativeEvent.locationY);
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
				{charData.map((element, i) => (
					<View a={charData.length} key={i} style={{justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, height:17, width: 25}} >
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
		backgroundColor: colors.card,
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
		backgroundColor: '#303030',
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
		backgroundColor: '#303030',
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
		backgroundColor: '#121212',
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