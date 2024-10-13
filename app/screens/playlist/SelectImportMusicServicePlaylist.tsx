
import React,  { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TextInput } from 'react-native';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import { SelectList } from 'react-native-dropdown-select-list';
import { MusicService, MusicServiceType, Route } from '../../../lib-origin/Illusive/src/types';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { is_empty, remove, url_to_id } from '../../../lib-origin/origin/src/utils/util';
import { alert_errors } from '../../../lib-origin/Illusive/src/illusi/src/alert';
import { create_uri, music_service_to_music_service_uri } from '../../../lib-origin/Illusive/src/illusive_utilts';

export default function SelectImportMusicServicePlaylist( params: {route: any} ) {
	const ts_route = params.route as Route<{title: string}>;
	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

	const navigation: NavigationProp<any, any> = useNavigation();

	const [is_next_disabled, set_is_next_disabled] = useState(true)
	const [input_value, set_input_value] = React.useState("");

	const [_, set_selected] = React.useState("");
	const [title_data, set_title_data] = React.useState(new Map<string, string>());
	const [titles, set_titles] = React.useState([] as string[]);

	const music_service_from = ts_route.params.title.replace('Import ', '').replace(' Playlist', '') as MusicServiceType;
	const music_service: MusicService = Illusive.music_service.get(music_service_from)!;

	function set_header() {
		navigation.setOptions({title: ts_route.params.title})
	}
	useEffect(() => {
		(async function() {
			set_header();
			if(Prefs.get_pref('get_account_playlists_in_get_playlist') || true){
				if(music_service !== undefined){
                    if((music_service.has_credentials === undefined || music_service.has_credentials()) && music_service.get_user_playlists !== undefined){
                        const playlist_map = await music_service.user_playlists_map!();
						if("error" in playlist_map && playlist_map.error !== undefined) alert_errors(playlist_map.error);
                        set_title_data(playlist_map.map);
						set_titles([...playlist_map.map.keys()]);
					}
				}
			}
		})()
	}, []);
	
    function make_uri(url: string){
        if(music_service_from === "YouTube")
            return create_uri(music_service_to_music_service_uri(music_service_from), remove(url_to_id(url), /\&.+/ig))
        else
            return create_uri(music_service_to_music_service_uri(music_service_from), remove(url_to_id(url), /\?.+/ig))
    }
    function set_nav_disabled(){
        navigation.setOptions({ headerRight: () => (
            <Button onPress={() => {}} title="Next" color='#808080' />
        )})
    }
    function set_nav_enabled(url: string){
        navigation.setOptions({ headerRight: () => (
            <Button color='blue' onPress={() => navigation.navigate('Playlist', {'uri': make_uri(url)})} title="Next" />
        )}) 
    }
	function on_url_update(url: string){
		set_input_value(url); 
		if(!is_empty(url.trim())){ 
			set_is_next_disabled(false);
            set_nav_enabled(url);
		} 
		else if(!is_next_disabled){
            set_nav_disabled();
		}
	}
	function on_set_selected_url(selected_url: string){
		set_selected(selected_url); 
		set_input_value(title_data.get(selected_url) ?? ""); 
		set_is_next_disabled(false);
        set_nav_enabled(title_data.get(selected_url)!);
	}

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
			<TextInput autoCorrect={false} placeholder='Playlist Link' placeholderTextColor='#808080' style={styles.nameinput} 
				value={input_value}
				onChangeText={on_url_update}></TextInput>
			<Text style={styles.enterittext}>Enter a link to a {music_service_from} Playlist to add it to your {music_service_from}.</Text>
			<Text style={styles.looksliketext}>A {music_service_from} playlist link usually looks like the following:</Text>
			<Text style={styles.exlinktext}> - {music_service.link_text}</Text>
			<View style={{height: 20}}/>
			{titles.length > 0 && <SelectList 
					setSelected={on_set_selected_url}
					data={titles} 
					save="value"
					arrowicon={<></>}
					searchicon={<></>}
					searchPlaceholder={"Select Playlist"}
					placeholder="Select Playlist"
					inputStyles={{backgroundColor: colors.track, color: 'white'}}
					boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
					dropdownStyles={{backgroundColor: colors.track}}
					dropdownTextStyles={{color: 'white'}}
				/>}
		</View>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
	nameinput:{
		backgroundColor: colors.shelf,
		height: 60,
		color: 'white',
		width: '100%',
		padding: 10,
	},
	enterittext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 10
	},
	looksliketext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 15
	},
	exlinktext:{
		color: '#909090',
		marginHorizontal: 10
	}
});