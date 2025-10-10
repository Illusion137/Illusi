import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableHighlight, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons, Octicons } from '@expo/vector-icons';
import { CompactArtist, CompactPlaylist, MusicSearchResponse, MusicServiceType, SearchSuggestion, StatefullMusicSearchResponse, Track } from '@illusive/types';
import { Prefs } from '@illusive/prefs';
import { Illusive } from '@illusive/illusive';
import { is_empty, json_catch } from '@common/utils/util';
import { Constants } from '@illusive/constants';
import TrackComponent from '@components/TrackComponent';
import CompactPlaylistComponent from '@components/CompactPlaylistComponent';
import CompactArtistComponent from '@components/CompactArtistComponent';
import { alert_error } from '@illusive/illusi/src/alert';
import { debounce } from "lodash";
import { IoniconsTouchableOpacity } from '@components/TouchableIconOpacity';
import usePTheme from '@hooks/usePTheme';
import { BASE_WIDTH_FN } from '@components/TrackComponentBase';
import type { ResponseError } from '@common/types';
import { SQLTracks } from '@illusive/sql/sql_tracks';

const empty_search_result = {"tracks": [] as Track[], "playlists": [] as CompactPlaylist[], "artists": [] as CompactArtist[], "albums": [] as CompactPlaylist[], "continuation": null};
const empty_statefull_search_result: StatefullMusicSearchResponse = {state: "NONE", search_data: empty_search_result};
function SearchScreen() {
    type SearchMode = "Smart" | "Tracks" | "Albums" | "Artists" | "Playlists";
    const search_modes: SearchMode[] = ["Tracks", "Albums", "Artists", "Playlists"];
    const [search_mode, set_search_mode] = useState<SearchMode>("Smart");

    type SearchService = "YouTube" | "SoundCloud" | "Spotify" | "YouTube Music";
    const search_services: SearchService[] = ["YouTube Music", "YouTube", "SoundCloud", "Spotify"];
    const [search_service, set_search_service] = useState<SearchService>(search_services[0]);

	const [search_result, set_search_result] = useState<StatefullMusicSearchResponse>(empty_statefull_search_result);
	const [searching_data, set_searching_data] = useState<SearchSuggestion[]>([]);
	const [search_query_state, set_search_query_state] = useState('');

    const [show_clear_button, set_show_clear_button] = useState<boolean>(false);
	
	const { colors } = usePTheme();
	const styles = theme_styles(colors);

	const input_ref = useRef<any>(null);

	useEffect(() => {
		(async function() { 
			input_ref.current?.focus();
		})()
	}, []);
	const on_debounce_search_suggestion = debounce((search_query: string) => {
		(async() => {
			set_searching_data(
				await Promise.all(
					(await Illusive.get_suggestions(search_query))
						.map(suggestion => typeof suggestion === "string" ? suggestion : SQLTracks.add_playback_saved_data_to_track(suggestion))));
		})()
	}, 500);
	
	function get_previous_searches(){
		set_search_result(empty_statefull_search_result);
		get_suggestions(search_query_state);
	}
	async function search(query: string, service?: MusicServiceType) {
        if(is_empty(query.trim())) return;
		set_search_result({state: "LOADING", search_data: empty_search_result});
        await Prefs.add_to_recent_searches(query);
		
		const music_search_result: ResponseError|MusicSearchResponse = await Illusive.music_service.get(service ?? search_service)!.search!(query).catch(json_catch);
		if("error" in music_search_result){
			alert_error(music_search_result.error as ResponseError);
			set_search_result({state: "NONE", search_data: empty_search_result});
			return;
		}
		music_search_result.tracks = await SQLTracks.add_playback_saved_data_to_tracks(music_search_result.tracks);
        if(music_search_result.tracks.length === 0 && music_search_result.albums.length === 0 && music_search_result.artists.length === 0 && music_search_result.playlists.length === 0) return false;
        set_search_result({state: "FUFILLED", search_data: music_search_result});
  	}
	async function on_end_editing(){
		await search(search_query_state);
	}
	async function on_text_update(search_query: string){
		set_search_query_state(search_query);
		if(search_query.length > 0) set_show_clear_button(true);
        else set_show_clear_button(false);
	}
    function on_search_service_chip_press(service: SearchService){
        set_search_service(service);
		if(search_result.state === "FUFILLED" || search_result.state === "LOADING"){
			search(search_query_state, service);
		}
    }
    function on_search_mode_chip_press(mode: SearchMode){
        set_search_mode(mode);
    }
	async function get_suggestions(search_query: string){
		try {
            const recent_searches: string[] = Prefs.get_pref('recent_searches');
			if(is_empty(search_query)){
				set_searching_data(recent_searches);
				return;
			}
			set_searching_data([]);
			on_debounce_search_suggestion(search_query);
		} catch (error) { Alert.alert("Error", String(error)); }
	}
	useEffect(() => {
		get_suggestions(search_query_state);
	},[search_query_state]);

	const suggestion_value = (suggestion: SearchSuggestion) => typeof suggestion === "string" ? 0 : 1;

	const render_chip_header_component = () => (
		<View>
			<ScrollView horizontal={true} contentContainerStyle={styles.chips_container}>
						{search_services.map((service) => (
							<TouchableOpacity style={{...styles.chip, backgroundColor: search_service === service ? colors.primary : "#121212"}} key={service} onPress={() => on_search_service_chip_press(service)}>
								<Text style={styles.chip_text}>{service}</Text>
							</TouchableOpacity>
						))}
			</ScrollView>
			{search_result.state === "FUFILLED" ? <ScrollView horizontal={true} contentContainerStyle={styles.chips_container}>
					{search_modes.map((mode) => (
						<TouchableOpacity style={{...styles.chip, backgroundColor: search_mode === mode ? colors.primary : "#121212"}} key={mode} onPress={() => mode === search_mode ? on_search_mode_chip_press("Smart") : on_search_mode_chip_press(mode)}>
							<Text style={styles.chip_text}>{mode}</Text>
						</TouchableOpacity>
					))}
			</ScrollView> : null}
		</View>
    );
    const render_misc_component = (item: {item: Track|CompactArtist|CompactPlaylist}) => { 
        return (
        "uid" in item.item ?
            <TrackComponent track_data={item.item} width_fn={() => BASE_WIDTH_FN(Constants.library_write_playlist)} write_playlist_uuid={Constants.library_write_playlist} from={Constants.illusi_mix_from} track_callback={() => []}/>
                : "artist" in item.item ? 
                    <CompactPlaylistComponent playlist_data={item.item}/>
                        : <CompactArtistComponent artist_data={item.item}/>
	)};
	const render_query_items = (item: {item: SearchSuggestion}) => (
		typeof item.item === "string" ? 
		(<>
			<TouchableHighlight style={styles.queryItems} onPress={async () => {set_search_query_state(item.item as string); search(item.item as string)}}>
				<>
					{is_empty(search_query_state) && <Ionicons name={'time'} color={'#808080'} size={24} style={{left: 20,}} />}
					<Text style={styles.queryItemsText} numberOfLines={1}>{item.item}</Text>
					<View style={{flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', right: 50}}>
					{is_empty(search_query_state) &&< TouchableOpacity hitSlop={20} onPress={async () => {
				        set_searching_data(await Prefs.try_remove_from_recent_searches(item.item as string));
					}}>
							<Octicons name={'x'} color={colors.red} size={24} style={{left: 50, padding: 10, paddingRight: 40}} />
						</TouchableOpacity> }
					</View>
				</>
			</TouchableHighlight>
			<View style={{width: '93%', height: 1, backgroundColor: colors.line, left: 10}}/>
		</>) : <TrackComponent track_data={item.item} width_fn={() => BASE_WIDTH_FN(Constants.library_write_playlist)} write_playlist_uuid={Constants.library_write_playlist} from={Constants.illusi_mix_from} track_callback={() => []}/>
	);
		
	return (
		<View style={styles.topcontainer}>
			<View style={{height: 70}}/>
			<View style={styles.wrapper}>
				<TextInput value={search_query_state} ref={input_ref} autoCorrect={false} placeholder='Search' placeholderTextColor={colors.subtext} style={styles.searchinput} 
					onFocus={get_previous_searches}
					onPress={get_previous_searches}
					onChangeText={on_text_update} 
					onSubmitEditing={on_end_editing}
					/>
				{show_clear_button ? <IoniconsTouchableOpacity icon_name="close-circle-outline" icon_color={colors.subtext} icon_size={25} icon_style={{}} on_press={() => {input_ref.current?.clear(); on_text_update("");}} hitslop={5} style={{position: 'absolute', left: '85%', top: '22%'}}/> : null}
			</View>
			<View style={styles.searchview}>
                {render_chip_header_component()}
            	{search_result.state === "NONE" ? <FlatList style={styles.searchlist} data={searching_data.sort((a, b) => suggestion_value(b) - suggestion_value(a))} renderItem={render_query_items}/> 
					: search_result.state === "LOADING" ? <ActivityIndicator size={25}/> 
					: <FlatList
                    	style={styles.searchlist}
                    	data={search_mode === "Smart" ? Illusive.smart_search(search_query_state, search_result.search_data) : search_mode === "Tracks" ? search_result.search_data.tracks : search_mode === "Albums" ? search_result.search_data.albums : search_mode === "Artists" ? search_result.search_data.artists : search_result.search_data.playlists} 
                    	renderItem={render_misc_component}/>
				}
			</View>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	topcontainer:{
		backgroundColor: colors.background,
		flex: 1,
		justifyContent: 'flex-start'
	},
	wrapper:{
		// justifyContent: 'center',
		alignItems: 'center',
	},
	searchinput:{
		color: '#F0F0F0',
		backgroundColor: colors.searchInput,
		padding: 15,
		borderRadius: 30,
		width: '90%',
	},
	searchlist:{

	},searchview:{
		backgroundColor: colors.background,
		top: 10,
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
	},
	chip: {
		borderRadius: 6, 
		padding: 10,
		borderColor: colors.secondary,
		borderWidth: 1,
	},
	chip_text: { 
		color: colors.text,
		fontSize: 12,
		fontWeight: 'bold'
	},
	chips_container: {
		flexDirection: 'row', 
		flexGrow: 1, 
		justifyContent: 'space-around', 
		marginBottom: 8
	}
});
export default SearchScreen;