import React, {useState, useEffect, useRef} from 'react';
import SongComponent from '../../components/SongComponent';
import { StyleSheet, Text, View, TextInput, SectionList, Button } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useTheme } from '@react-navigation/native';


function PlaylistAddSearch(){

	const [charData, setCharData] = useState([])
	const [numofTracks, setNumOfTracks] = useState(0);
	const [dataMask, setDataMask] = useState([]);
	const [baseData, setBaseData] = useState([]);

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const route = useRoute();
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
    return(
        <View style={{backgroundColor: 'black', width: '100%', height: '100%'}}>
			<View style={{height: 50, backgroundColor: 'black', width: '100%'}}></View>
			<SectionList style={{height: '71%'}} sections={dataMask}
				renderItem={({ item }) => <SongComponent key={item.video_id} video_id={item.video_id} video_name={item.video_name} video_duration={item.video_duration} video_creator={item.video_creator} downloaded={item.downloaded} uuid={item.uuid} setPlaying={null} writePlaylist={route.params.writePlaylist} editMode={false} 
					addToPlaylistMode={true} /> }
				renderSectionHeader={({ section: { title } }) => (<View style={styles.sectionHeader}><Text style={styles.sectionText}>{title}</Text></View>)}
				ListFooterComponent={<View style={{alignItems: 'center',marginVertical: 24}}><Text style={{color: '#808080', fontSize: 25}}>{numofTracks} Tracks</Text></View>}
				getItemLayout={(data, index) => ({length: 60, offset: 60 * index, index })}
			/>
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