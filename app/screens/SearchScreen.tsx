import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ScrollView, TouchableHighlight, TouchableOpacity, Modal, Button, ImageBackground, Easing, Image, Alert } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import * as SQLActions from '../../lib-origin/Illusive/src/illusi/src/sql_actions'
import { Ionicons, Octicons } from '@expo/vector-icons';
import AddToPlaylistsModal from './other/AddToPlaylistsModal';
import TrackComponent from '../components/TrackComponent';
import { CompactArtist, CompactPlaylist, MusicSearchResponse, Track } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { Illusive } from '../../lib-origin/Illusive/src/illusive';
import { is_empty } from '../../lib-origin/origin/src/utils/util';
import CompactPlaylistComponent from '../components/CompactPlaylistComponent';
import CompactArtistComponent from '../components/CompactArtistComponent';

function SearchScreen() {
    const empty_search_result = {"tracks": [], "playlists": [], "artists": [], "albums": []};
    
    type SearchMode = "Tracks" | "Albums" | "Artists" | "Playlists";
    const search_modes: SearchMode[] = ["Tracks", "Albums", "Artists", "Playlists"];
    const [search_mode, set_search_mode] = useState<SearchMode>("Tracks");

    type SearchService = "YouTube" | "SoundCloud" | "Spotify";
    const [search_service, set_search_service] = useState<SearchService>("YouTube");
    const search_services: SearchService[] = ["YouTube", "SoundCloud", "Spotify"];

	const [search_result, set_search_result] = useState(empty_search_result as MusicSearchResponse);
	const [searching_data, set_searching_data] = useState([] as string[]);
	const [is_searching, set_is_searching] = useState(true);
	const [search_query_state, set_search_query_state] = useState('');
	
	const [continuation, set_continuation] = useState();
	const navigation = useNavigation();

	const [is_using_recent_searches, set_is_using_recent_searches] = useState(true);
    const [modal_data, set_modal_data] = useState({'show':false, 'track_data': null});

	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

	useEffect(() => {
		(async function() { 
			// inputRef.current?.focus();
		})()
	}, []);

	function add_from(show: boolean, track: null){
		set_modal_data({'show':show, 'track_data': track})
	}
	function get_previous_searches(){
		set_searching_data(Prefs.get_pref('recent_searches'));
	}
	async function search(query: string) {
        if(is_empty(query.trim())) return false;
		set_search_result(empty_search_result);

        await Prefs.add_to_recent_searches(query);

		const music_search_result = await Illusive.music_service.get(search_service)!.search!(query);
        music_search_result.tracks = await SQLActions.add_playback_saved_data_to_tracks(music_search_result.tracks);
        if(music_search_result.tracks.length === 0 && music_search_result.albums.length === 0 && music_search_result.artists.length === 0 && music_search_result.playlists.length === 0) return false;
        set_search_result(music_search_result);
		set_is_searching(false);
        return true;
  	}
	async function on_end_editing(){
		if(await search(search_query_state) === true) set_is_searching(false);
	}
	async function on_text_update(search_query: string){
		set_search_query_state(search_query); 
		if(!is_empty(search_query.trim()))
			set_is_using_recent_searches(false);
		else set_is_using_recent_searches(true);
	}
    function on_search_service_chip_press(service: SearchService){
        set_search_service(service);
    }
    function on_search_mode_chip_press(mode: SearchMode){
        set_search_mode(mode);
    }
	async function get_suggestions(search_query: string){
		try {
            const recent_searches: string[] = Prefs.get_pref('recent_searches');
			if(is_empty(search_query)){
				set_searching_data(recent_searches);
			    set_is_searching(true);
				return;
			}
			set_is_searching(true);
			set_searching_data(await Illusive.get_suggestions(search_query));
		} catch (error) { Alert.alert("Error", String(error)); }
	}
	useEffect(() => {
        if(!is_empty(search_query_state))
			set_is_using_recent_searches(false);
		else set_is_using_recent_searches(true);
		get_suggestions(search_query_state);
	},[search_query_state]);


	const render_chip_header_component = () => (
        <View style={{flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10}}>
            {is_searching ? search_services.map((service) => (
                <TouchableOpacity style={{backgroundColor: search_service === service ? colors.primary : "#121212", borderRadius: 20, padding: 10}} key={service} onPress={() => on_search_service_chip_press(service)}>
                    <Text style={{color: colors.text}}>{service}</Text>
                </TouchableOpacity>
            )) : 
            search_modes.map((mode) => (
                <TouchableOpacity style={{backgroundColor: search_mode === mode ? colors.primary : "#121212", borderRadius: 20, padding: 10}} key={mode} onPress={() => on_search_mode_chip_press(mode)}>
                    <Text style={{color: colors.text}}>{mode}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
    const render_misc_component = (item: {item: Track|CompactArtist|CompactPlaylist}) => { 
        return (
        "uid" in item.item ?
            <TrackComponent track_data={item.item} write_playlist='LIBRARY' from='Illusi Mix'/>
                : "artist" in item.item ? 
                    <CompactPlaylistComponent playlist_data={item.item}/>
                        : <CompactArtistComponent artist_data={item.item}/>
	)};
	const render_query_items = (item: {item: string}) => (
		<>
			<TouchableHighlight style={styles.queryItems} onPress={async () => {set_search_query_state(item.item); if(await search(item.item) === true) set_is_searching(false);}}>
				<>
					{is_using_recent_searches && <Ionicons name={'time-outline'} color={'#808080'} size={24} style={{left: 20,}} />}
					<Text style={styles.queryItemsText} numberOfLines={1}>{item.item}</Text>
					<View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', right: 50}}>
					{is_using_recent_searches &&< TouchableOpacity hitSlop={20} onPress={async () => {
				        set_searching_data(await Prefs.try_remove_from_recent_searches(item.item));
					}}>
							<Octicons name={'x'} color={colors.red} size={24} style={{left: 50, padding: 10, paddingRight: 40}} />
						</TouchableOpacity> }
					</View>
				</>
			</TouchableHighlight>
			<View style={{width: '93%', height: 1, backgroundColor: colors.line, left: 10}}/>
		</>
	);
		
	return (
		<View style={styles.topcontainer}>
			<View style={styles.wrapper}>
				<TextInput value={search_query_state} autoCorrect={false} placeholder='Search' placeholderTextColor={colors.subtext} style={styles.searchinput} 
					onFocus={get_previous_searches} 
					onChangeText={on_text_update} 
					onEndEditing={on_end_editing}
					// onSubmitEditing={async() => {if(await Search(searchQuery) == null){return;} setSearchingMode(false)}}
					/>
			</View>
			<View style={styles.searchview}>
                {render_chip_header_component()}
            	{is_searching ? <FlatList style={styles.searchlist} data={searching_data} renderItem={render_query_items}/> : null }
				{!is_searching ? 
                <FlatList 
                    style={styles.searchlist}
                    data={search_mode === "Tracks" ? search_result.tracks : search_mode === "Albums" ? search_result.albums : search_mode === "Artists" ? search_result.artists : search_result.playlists} 
                    renderItem={render_misc_component}
                /> : null }
			</View>
			<AddToPlaylistsModal modalData={modal_data}/>
		</View>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
	topcontainer:{
		backgroundColor: colors.background,
		flex: 1,
		justifyContent: 'flex-start'
	},
	wrapper:{
		// justifyContent: 'center',
		alignItems: 'center'
	},
	searchinput:{
		color: '#F0F0F0',
		backgroundColor: colors.searchInput,
		padding: 15,
		top: 70,
		borderRadius: 30,
		width: '90%',
	},
	searchlist:{

	},searchview:{
		backgroundColor: colors.background,
		top: 80,
		height: '83%'
	},
	queryItemsText:{
		color: colors.text,
		fontSize: 17,
		marginLeft: 40,
		width: '70%'
	},
	queryItems:{
		height: 50,
		width: '100%',
		alignItems: 'center',
		flexDirection: 'row'
	}
});
export default SearchScreen;