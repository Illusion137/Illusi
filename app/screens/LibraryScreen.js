import React, {useState, useEffect, useRef} from 'react';
import SongComponent from '../components/SongComponent';
import { StyleSheet, Text, View, TextInput, SectionList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

function Search(){
	// console.log('press');
}
const LibraryScreen = ({ navigation, route }) => {	
	const [charData, setCharData] = useState([])
	const [numofTracks, setNumOfTracks] = useState(0);
	const [dataMask,setDataMask] = useState([]);
	const [baseData,setBaseData] = useState([]);

	const listRef = useRef();

	useEffect( () => {
		(async function() {
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
	const { colors } = useTheme();
	const styles = themeStyles(colors);
	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<Text style={styles.toptext}>My Library</Text>
				<View style={styles.searchcontainer}>
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
								key: value[0],
								data: value[1]
							})
							sectionChars.push(value[0])
						})
						setCharData(sectionChars)
						setDataMask(sections);
					}}></TextInput>
				</View>
			</View>
			<SectionList style={{height: '71%'}} sections={dataMask} 
				renderItem={({ item }) => <SongComponent key={item.video_id} video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} setPlaying={route.params.setPlaying} from={"My Library"}/>}
				renderSectionHeader={({ section: { title  } }) => (<View style={styles.sectionHeader}><Text style={styles.sectionText}>{title }</Text></View>)}
				ListFooterComponent={<View style={{alignItems: 'center',marginVertical: 24}}><Text style={{color: '#808080', fontSize: 25}}>{numofTracks} Tracks</Text></View>}
				ref={listRef}
				getItemLayout={(data, index) => ({length: 60, offset: 60 * index, index })}
			/>
			<View onStartShouldSetResponder={(ev) => true} onResponderMove={(e) => console.log(e.nativeEvent, "onResponderMove")} style={{backgroundColor: '#121212',
					position: 'absolute',
					left: '93%',
					top: 600-(17*numofTracks),
					justifyContent: 'center',
					alignItems: 'center',
					borderRadius: 10
				}}
				>
				{charData.map((element, i) => (
					<View key={i} style={{justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, height:17}}  onTouchStart={e => { console.log('touchMove',e.nativeEvent); listRef.current?.scrollToLocation({ animated: false, itemIndex: Array.from(charData).indexOf(element) === 0 ? 0 : -1, sectionIndex: Array.from(charData).indexOf(element) }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}}>
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