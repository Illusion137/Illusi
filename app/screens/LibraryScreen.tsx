import React, {useState, useEffect, useRef, MutableRefObject} from 'react';
import TrackComponent from '../components/TrackComponent';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, GestureResponderEvent, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused, useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import {GenerateNewUID} from '../Illusive/IllusiveSearch'
import * as DocumentPicker from 'react-native-document-picker'
import BigList from 'react-native-big-list';
import * as SQLActions from '../../SQLActions';
import * as GLOBALS from '../../globals';
import * as Prefs from '../../Preferences';
import { EditMode, Track } from '../../types';

let search_query = "";
export default function LibraryScreen() {
	const [allData, setAllData] = useState({char_data: [] as string[], track_mask: [] as Track[][], num_tracks: 0, edit_mode: "NONE" as EditMode})

	const alphabet_scroll = {
		all_alphabet_fast_scroll_locations: [] as number[],
		current_position: 0,
		top_scroll: 0
	};
	
	const { colors } = useTheme() as typeof Prefs.darkThemeDefault;
	const styles = themeStyles(colors);

	const scroll_bar_animated = useRef(new Animated.Value(93)).current;
	const biglist_ref = useRef<BigList>();
    const is_focused = useIsFocused();

	useEffect( () => {
		if(is_focused){
			refreshData();
		}
	}, [is_focused]);
		
	async function refreshData(query: (string|undefined) = undefined){
		search_query = query ?? "";
		await SQLActions.fetchTrackData();
		
		let tracks = [...GLOBALS.global_var.SQLTracks];
		
		if(search_query){
			tracks = tracks.filter(track => (track.video_creator.toUpperCase().includes(search_query.toUpperCase()) || track.video_name.toUpperCase().includes(search_query.toUpperCase())))
		}

		const sections_map = new Map();
		for(const track of tracks){
			let char = track.video_name[0].toUpperCase();
			if(!(/[A-Z]/).test(char)){ char = '#' }
			if( !sections_map.has(char) ){
				sections_map.set(char, [track])
			}
			else{
				let new_tracks = sections_map.get(char)
				new_tracks.push(track)
				sections_map.set(char, new_tracks)
			}
		}
		const sections = []
		const section_chars = []
		const sorted_sections_map = [...sections_map].sort()
		for(const value of sorted_sections_map){ 
			sections.push( value[1] )
			section_chars.push(value[0])
		}
		setAllData({char_data: section_chars, track_mask: [...sections], num_tracks: tracks.length, edit_mode: allData.edit_mode ?? "NONE"});
	}

	function setEditMode(mode: EditMode){
		setAllData(
			{
				char_data: allData.char_data, 
				track_mask: allData.track_mask, 
				num_tracks: allData.num_tracks, 
				edit_mode: mode
			});
	}
	function cycleEditMode(){
		let current_edit_mode = allData.edit_mode;
		switch(current_edit_mode){
			case "NONE": current_edit_mode = "DOWNLOAD"; break;
			case "DOWNLOAD": current_edit_mode = "DELETE"; break;
			case "DELETE": current_edit_mode = "EDIT"; break;
			case "EDIT": current_edit_mode = "NONE"; break;
			default: console.error("Unable to switch Edit Mode");
		}
		setEditMode(current_edit_mode);
		if(current_edit_mode === "NONE") {
			Animated.timing(scroll_bar_animated, {
				'useNativeDriver': false,
				'toValue': 93,
				'duration': 300
			}).start();
		}
		else {
			Animated.timing(scroll_bar_animated, {
				'useNativeDriver': false,
				'toValue': 100,
				'duration': 300
			}).start();
		}
	}
	function handleError(error: unknown) {
		if (DocumentPicker.isCancel(error)){} // User cancelled the picker, exit any dialogs or menus and move on
		else if (DocumentPicker.isInProgress(error)){}
		else throw error;
	}
	async function playShuffle(){
		await SQLActions.fetchTrackData();
		let tracks = [...GLOBALS.global_var.SQLTracks];
		if(Prefs.prefs.settings.only_play_downloaded)
			tracks = tracks.filter(item => item.downloaded || item.imported);
		if (tracks.length == 0){ return; }
		let current_index = tracks.length, random_index: number;
		while (current_index != 0) {
			random_index = Math.floor(Math.random() * current_index);
			current_index--;
			[tracks[current_index], tracks[random_index]] = [
				tracks[random_index], tracks[current_index]];
		}
		GLOBALS.global_var.playTracks(tracks[0], tracks, 'My Library');
	}
	async function uploadFiles() {
		try {
			const audio_files = await DocumentPicker.pickMultiple({type: [DocumentPicker.types.audio, DocumentPicker.types.video], copyTo: 'documentDirectory'});

			const all_promise_tracks = [];
			const all_file_copy_tracks = [];

			for(const audio_file of audio_files){
				try {
					if(audio_file.copyError !== undefined) throw audio_file.copyError;
					if(typeof(audio_file.name) !== "string") throw "Audio-file name is undefined";
					if(typeof(audio_file.fileCopyUri) !== "string") throw "Audio-file copy-uri is undefined";
	
					all_file_copy_tracks.push(audio_file.fileCopyUri);
					const file_name = audio_file.name.replace(/\..+/, ''); // FILE NAME WITHOUT EXTENSION
					const uid = GenerateNewUID(file_name);
					const file_extension_matches = audio_file.fileCopyUri.match(/\..+/);
					if(file_extension_matches === null) throw "No file extensions found";
					const new_file_uri = encodeURI(uid + file_extension_matches[0]);
					const new_file_uri_full_path = FileSystem.documentDirectory + new_file_uri;
					await FileSystem.moveAsync({from: audio_file.fileCopyUri, to: new_file_uri_full_path})
	
					const sound_temp = new Audio.Sound();
					await sound_temp.loadAsync({uri: new_file_uri_full_path});
					const meta_data = await sound_temp.getStatusAsync();
					await sound_temp.unloadAsync();
	
					if(meta_data.isLoaded === false) throw "Unable to load audio metadata";
					if(meta_data.durationMillis === undefined) throw "Unable to access audio metadata duration";
	
					all_promise_tracks.push(SQLActions.insertTrackData(new Track({
						"uid": uid,
						"video_name": file_name,
						"video_creator": "Sudo",
						"video_duration": Math.round(meta_data.durationMillis/1000) ?? 0,
						"media_uri": new_file_uri,
						"imported": true,
						"saved": true,
					})));
				} catch (error) { Alert.alert("Document Error", String(error)); }
			}
			await Promise.all(all_promise_tracks);
			await SQLActions.fetchTrackData();
			await refreshData();
			
			for(const file of await FileSystem.readDirectoryAsync(FileSystem.documentDirectory ?? "")){
				try {
					if(!(file == 'CachedThumbnails' || file == 'RCTAsyncLocalStorage' || file == 'SQLite') && (await FileSystem.getInfoAsync(FileSystem.documentDirectory + file)).isDirectory){
						await FileSystem.deleteAsync(FileSystem.documentDirectory+file, { idempotent: true });
					}
				} catch (error) { Alert.alert("Document Reset Error", String(error)); }
			}
		} catch (error) { handleError(error); }
	}
	function onAlphabetScrollBarUpdate(event: GestureResponderEvent) {
		if(allData.char_data.length === 0){ return; }
		if(!(allData.char_data.length === alphabet_scroll.all_alphabet_fast_scroll_locations.length)){						
			alphabet_scroll.all_alphabet_fast_scroll_locations = [];
			for(let i = 0; i < allData.char_data.length; i++){
				alphabet_scroll.all_alphabet_fast_scroll_locations.push((17*i) + alphabet_scroll.top_scroll);
			}
		}
		let target = Math.floor(event.nativeEvent.pageY);
		var closest = alphabet_scroll.all_alphabet_fast_scroll_locations.reduce(function(prev, curr) {
			return (Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev);
		});
		if(alphabet_scroll.current_position == closest){ return; }
		alphabet_scroll.current_position = closest;
		(biglist_ref.current as any)?.scrollToLocation({ animated: false, itemIndex: 0, sectionIndex: alphabet_scroll.all_alphabet_fast_scroll_locations.indexOf(closest) }); 
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	} 

	const renderTrack = (item: {item: Track}) => <TrackComponent track_data={ item.item } from={"My Library"} edit_mode={allData.edit_mode} refreshData={refreshData}/>;
	const headerComponent = () => <TouchableOpacity onPress={playShuffle} style={{backgroundColor: colors.primary, width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', bottom: 20, marginTop: 40}}><Ionicons name="shuffle" size={25} color='#000000' style={{}}/>
	<Text style={{fontWeight: '500', fontSize: 18}}>Shuffle Play</Text></TouchableOpacity>;

	const sectionHeader = (index: number) => <View style={styles.sectionHeader}><Text style={styles.sectionText}>{allData.char_data[index]}</Text></View>
	const sectionFooter = () => <View style={{alignItems: 'center',marginVertical: 24}}><Text style={{color: colors.subtext, fontSize: 25}}>{allData.num_tracks} Tracks</Text></View>

	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<Text style={styles.toptext}>My Library</Text>
				<View style={styles.searchcontainer}>
					<TouchableOpacity style={{bottom: 6, left: 6}} onPress={cycleEditMode}>
						<MaterialCommunityIcons name="pencil" size={25} color={allData.edit_mode === "NONE"  ? colors.inactive : (allData.edit_mode === "DOWNLOAD" ? colors.primary : colors.red) }/>
					</TouchableOpacity>
					<Ionicons name="search" size={22} color={colors.searchPlaceholder} style={styles.icon}/>
					<TextInput autoCorrect={false} placeholder='Search My Library' placeholderTextColor={colors.searchPlaceholder} style={styles.searchinput} onChangeText={async(query) => refreshData(query)}></TextInput>
					<TouchableOpacity style={{bottom: 6, left: 7}} onPress={uploadFiles}>
						<Ionicons name="cloud-upload" size={25} color={colors.inactive}/>
					</TouchableOpacity>
				</View>
			</View>
			
			<BigList style={{height: '71%'}} 
				sections={allData.track_mask}
				renderItem={renderTrack}
				keyExtractor={(item, index) => item.uid}
				renderFooter={sectionFooter}
				renderHeader={headerComponent}
				renderSectionHeader={sectionHeader}
				sectionHeaderHeight={30}
				headerHeight={90}
				footerHeight={100}
				ref={biglist_ref as MutableRefObject<BigList>}
				itemHeight={61}
				stickySectionHeadersEnabled={false}
			/>
			<Animated.View style={{backgroundColor: colors.background,
					position: 'absolute',
					left: scroll_bar_animated.interpolate({
						'inputRange': [0, 100],
						'outputRange': ["0%", "100%"],
					}),
					top: 380-(7*allData.char_data.length),
					justifyContent: 'center',
					alignItems: 'center',
					borderRadius: 10,
					width: 25
				}}
				hitSlop={{left: allData.edit_mode === "NONE" ? 20 : 0, right: 20}}
				onStartShouldSetResponder={(ev) => true}
				onTouchStart={(e) => { alphabet_scroll.top_scroll = 380-(7*allData.char_data.length); }}
				onResponderMove={onAlphabetScrollBarUpdate}
				>
				{allData.char_data.map((element, i) => (
					<View key={i} style={{justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, height:17, width: 25}} >
						<Text style={{color: colors.primary, fontSize: 14}}>{element}</Text>
					</View>
				))}
			</Animated.View>
		</View>
	);
}

const themeStyles = (colors: typeof Prefs.darkThemeDefault.colors) => StyleSheet.create({
	topcontainer:{
		backgroundColor: colors.background,
		flex: 1,
		justifyContent: 'flex-start'
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
		paddingLeft: 10,
		fontSize: 15,
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