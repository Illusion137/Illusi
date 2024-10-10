import React, {useState, useEffect, useRef} from 'react';
import TrackComponent from '../../components/TrackComponent';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Button } from 'react-native';
import { useRoute, useTheme } from '@react-navigation/native';
import BigList from 'react-native-big-list';
import * as Haptics from 'expo-haptics';
import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { Track, Route, Playlist } from '../../../lib-origin/Illusive/src/types';
import { track_section_map } from '../../../lib-origin/Illusive/src/illusive_utilts';

function PlaylistAddSearch(){

	const [allData, setAllData] = useState({charData: [] as string[], dataMask: [] as Track[][], baseData: [] as Track[], numTracks: 0})

	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

	const route = useRoute() as Route<{write_playlist_uid: string}>;
    useEffect( () => {
		(async function() {
			await SQLActions.fetch_track_data();
			let tracks = GLOBALS.global_var.sql_tracks;
			if (tracks == null || tracks.length === 0){
				setAllData({charData: [], dataMask: [], baseData: [], numTracks: 0});
				return;
			}
			
			const write_playlist_tracks = await SQLActions.playlist_tracks(route.params.write_playlist_uid);
            const section_map = track_section_map(write_playlist_tracks);

			let sectionsMap = new Map();
			for(const track of tracks){
				let char = track.title[0].toUpperCase()

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

			if(write_playlist_tracks.length !== 0){
				for(let i = 0; i < sections.length; i++){
					for(let j = 0; j < sections[i].length; j++){
						sections[i][j].saved = write_playlist_tracks.findIndex((item) => item.uid == sections[i][j].uid) == -1 ? false : true;
					}
				}
			}
			setAllData({charData: section_map.char_data, dataMask: section_map.section_map, baseData: tracks, numTracks: tracks.length})
		})();
	}, []);
	const renderItem = (item: {item: Track}) => <TrackComponent track_data={item.item} write_playlist={route.params.write_playlist}/>

	const sectionHeader = (index: number) => <View style={styles.sectionHeader}><Text style={styles.sectionText}>{allData.charData[index]}</Text></View>

	const [nextPlaylist, setNextPlaylist] = useState("Recently Added");
	const [nextIndex, setNextIndex] = useState(0);
	const headerComponent = () => <TouchableOpacity onPress={async() => 
		{
			let next = nextPlaylist;
			let playlistTracks = await SQLActions.playlist_tracks(route.params.write_playlist);

			if(next == "Recently Added"){
				let t = [...GLOBALS.global_var.sql_tracks]
				let trackData = t.reverse();
				for(let i = 0; i< trackData.length; i++){
					trackData[i].downloading_data!.saved = playlistTracks.findIndex((item) => item.uid == trackData[i].uid) == -1 ? false : true;
				}
				setAllData({charData: [], dataMask: [], baseData: [], numTracks: 0})

				setAllData({charData: [], dataMask: [trackData], baseData: trackData, numTracks: trackData.length})
				let playlists = await SQLActions.all_playlists_data();
				setNextPlaylist(playlists[nextIndex].title)
			}else{
				let trackData = await SQLActions.playlist_tracks(nextPlaylist);
				for(let i = 0; i< trackData.length; i++){
					trackData[i].downloading_data!.saved = playlistTracks.findIndex((item) => item.uid == trackData[i].uid) == -1 ? false : true;
				}
				setAllData({charData: [], dataMask: [], baseData: [], numTracks: 0})
				setAllData({charData: [], dataMask: [trackData], baseData: trackData, numTracks: trackData.length})
				let playlists = await SQLActions.all_playlists_data();
				let i = nextIndex;
				i++;
				if(i < playlists.length){
					setNextIndex(i);
					setNextPlaylist(playlists[i].title);
				} else{
					setNextIndex(0);
					setNextPlaylist("Recently Added");
				}
			}
		}} style={{backgroundColor: colors.primary, width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', bottom: 20, marginTop: 40}}>
		<Text style={{fontWeight: '500', fontSize: 18}}>Goto {nextPlaylist}</Text>
		</TouchableOpacity>

    return(
        <View style={{backgroundColor: 'black', width: '100%', height: '100%'}}>
			<BigList 
				sections={allData.dataMask}
				renderItem={renderItem}
				keyExtractor={(item, index) => String(index)}
				renderSectionHeader={sectionHeader}
				sectionHeaderHeight={30}
				itemHeight={61}
				renderHeader={headerComponent}
				headerHeight={90}
				renderFooter={undefined}
			/>
        </View>
    );
}

const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
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