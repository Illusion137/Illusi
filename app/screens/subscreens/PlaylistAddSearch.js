import React, {useState, useEffect, useRef} from 'react';
import SongComponent from '../../components/SongComponent';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Button } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useTheme } from '@react-navigation/native';
import BigList from 'react-native-big-list';
import * as Haptics from 'expo-haptics';


function PlaylistAddSearch(){

	const [allData, setAllData] = useState({charData: [], dataMask: [], baseData: [], numTracks: 0})
	const listRef = useRef();

	let allAlphabetFastScrollLocations = [];
	let currentPosition = 0;
	let topScroll = 0;

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const route = useRoute();
    useEffect( () => {
		(async function() {
			
			let storage = await AsyncStorage.getItem('Library');
			if (storage == null){
				setAllData({charData: [], dataMask: [], baseData: [], numTracks: 0});
				return;
			}
			let tracks = JSON.parse(storage);
			
			let pStorage = JSON.parse(await AsyncStorage.getItem('Playlists'))
			let pStorageSet = new Set(pStorage[pStorage.findIndex((item, i) => {return route.params.writePlaylist == item.playlistInfo.title})].playlistInfo.tracks)
			
			let sectionsMap = new Map();
			for(const track of tracks){
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
			}
			let sections = []
			let sectionChars = []
			let sortedSectionsMap = [...sectionsMap].sort()
			for(const value of sortedSectionsMap){
				sections.push(value[1])
				sectionChars.push(value[0])
			}

			for(let i = 0; i < sections.length; i++){
				for(let j = 0; j < sections[i].length; j++){
					sections[i][j].saved = pStorageSet.has(sections[i][j].uuid) }
			}
			setAllData({charData: sectionChars, dataMask: sections, baseData: tracks, numTracks: tracks.length})
		})();
	}, []);
	const renderItem = ({item}) =><SongComponent uri={item.uri} video_id={item.video_id} video_name={item.video_name} video_duration={item.video_duration} video_creator={item.video_creator} downloaded={item.downloaded} uuid={item.uuid} saved={item.saved} writePlaylist={route.params.writePlaylist}/>;

	const sectionHeader = (num) => <View style={styles.sectionHeader}><Text style={styles.sectionText}>{allData.charData[num]}</Text></View>

    return(
        <View style={{backgroundColor: 'black', width: '100%', height: '100%'}}>
			<BigList 
				sections={allData.dataMask}
				renderItem={renderItem}
				keyExtractor={(item, index) => index}
				renderSectionHeader={sectionHeader}
				sectionHeaderHeight={30}
				ref={listRef}
				itemHeight={61}
				onScrollToIndexFailed={() => {}}
			/>
			<View style={{backgroundColor: '#121212',
					position: 'absolute',
					left: '93%',
					top: 380-(7*allData.charData.length),
					justifyContent: 'center',
					alignItems: 'center',
					borderRadius: 10,
					width: 25
				}}
				hitSlop={{left: 20}}
				onStartShouldSetResponder={(ev) => true}
				onTouchStart={(e) => {
					topScroll = 500-(7*allData.charData.length);
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
		width: '80%',
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

export default PlaylistAddSearch;