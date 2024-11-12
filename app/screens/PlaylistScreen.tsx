import React,  { useState, useRef, useEffect } from 'react';
import { View, Animated, Text, StyleSheet, TouchableOpacity, TextInput, InteractionManager, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation, useTheme } from '@react-navigation/native';
import SlidingUpPanel from 'rn-sliding-up-panel';
import PlaylistComponent from '../components/PlaylistComponent';
import * as SQLActions from '../../lib-origin/Illusive/src/illusi/src/sql_actions';

import { useIsFocused } from '@react-navigation/native';
import DefaultPlaylistComponent from '../components/DefaultPlaylistComponent';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { Playlist, ResolvedDefaultPlaylist } from '../../lib-origin/Illusive/src/types';
import { playlist_query_filter } from '../../lib-origin/Illusive/src/illusive_utilts';
import BigList from 'react-native-big-list';
import NewPlaylist from './playlist/NewPlaylist';
import { resolved_default_playlists, sort_playlists } from '../../lib-origin/Illusive/src/illusi/src/playlist';

let search_query = "";
function PlaylistScreen() {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	const navigation: NavigationProp<any, any> = useNavigation();
    const is_focused = useIsFocused();

	const [playlists_state, set_playlists] = useState([] as Playlist[]);
    const [default_playlists_state, set_default_playlists] = useState([] as ResolvedDefaultPlaylist[]);
	
	const panel_ref = useRef<SlidingUpPanel>();
	const new_playlist_ref = useRef<{ focusInput: () => void }>();

	useEffect( () => {
		if(is_focused){
			refresh_data(search_query);
		}
	}, [is_focused]);

	async function refresh_data(query?: string){
        try {
            search_query = query ?? "";
            const playlists = playlist_query_filter(await SQLActions.all_playlists_data(), search_query);
            const ordered_playlists: Playlist[] = sort_playlists(playlists);
            set_playlists([]);
            set_playlists(ordered_playlists)
            const rdefault_playlists = await resolved_default_playlists();
            set_default_playlists(rdefault_playlists);
        } catch (error) {
            console.log(error)
        }
	}

	function show_new_playlist_panel() { 
		panel_ref.current?.show();
		InteractionManager.runAfterInteractions(() => {
			new_playlist_ref.current?.focusInput(); 
		});
	 }

	const render_item = (item: {item: Playlist}) => (
		<PlaylistComponent playlist_data={item.item} refresh_data={refresh_data}/>
	);

	function hide(){ panel_ref.current?.hide(); }
	return (
		<View style={styles.top_container}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<TouchableOpacity>
						<Ionicons name="swap-vertical-sharp" size={25} color={colors.primary} style={{right:110}}/>
					</TouchableOpacity>
					<Text style={styles.top_text}>Playlists</Text>
					<TouchableOpacity onPress={show_new_playlist_panel}>
						<Ionicons name="add" size={25} color={colors.primary} style={{left: 110}}/>
					</TouchableOpacity>
				</View>
				<View style={styles.searchcontainer}>
					<Ionicons name="search" size={22} color={colors.searchPlaceholder} style={styles.icon}/>
					<TextInput placeholder='Search Playlists' placeholderTextColor={colors.searchPlaceholder} style={styles.search_input} onChangeText={(val) => {refresh_data(val)}}></TextInput>
				</View>
			</View>
            <View style={styles.default_container}>
                <ScrollView  horizontal={true}>
                    { default_playlists_state.map( (default_playlist, i) => (
                        <View key={i}>
                            <DefaultPlaylistComponent title={default_playlist.name} four_track={default_playlist.tracks.slice(0,4)} navigation={navigation}/>
                        </View>
                    ) ) }
                </ScrollView>
            </View>
			<View style={{width: '100%', height: 1, backgroundColor: colors.searchPlaceholder, marginLeft: 30, marginRight: 30}}/>
			<BigList style={{height: '71%'}} data={playlists_state} keyExtractor={(item, _) => String(item.uuid)} itemHeight={80} headerHeight={0} footerHeight={100} renderItem={render_item} renderHeader={() => (<></>)} renderFooter={() => (<View style={{height:100}}></View>)}/>
			<SlidingUpPanel allowDragging={false} draggableRange={{top:660, bottom: 0}} ref={panel_ref as any} animatedValue={new Animated.Value(0)}>
                {/* <CreatePlaylistStackScreen/> */}
                <NewPlaylist ref={new_playlist_ref as any} close_panel={hide} refresh_playlists_data={refresh_data}/>
			</SlidingUpPanel>
		</View>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	top_container:{
		backgroundColor: colors.background,
		flex: 1,
	},
	header:{
		backgroundColor: colors.shelf,
		width: '100%',
		height: '18%',
		top: 0,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	top_text:{
		color: colors.text,
		fontSize: 18,
		fontWeight: '500'
	},
	search_input:{
		backgroundColor: colors.searchInput,
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
		backgroundColor: colors.searchInput,
		paddingTop: 5,
		paddingLeft: 5,
		paddingRight: 5,
		bottom: 10,
		left: 10,
		borderRadius:10,
		zIndex: 1
	},
	default_playlist_text:{
		color: colors.text, 
		fontSize: 18, 
		fontWeight: 'bold', 
		textAlign:'center',
		position: 'absolute',
		zIndex: 1
	},
	default_playlist_button:{
		backgroundColor: colors.card, 
		height: 110, 
		width: 110,
		borderRadius: 5,
		margin: 5,
		justifyContent: 'center'
	},
	default_container:{
		margin: 5,
		flexDirection: 'row'
	},
	images:{
		width: 55, 
		height: 55, 
		aspectRatio:1, 
		resizeMode: 'cover',
	},
	not_found:{
		width:110,
		height:110,
		borderRadius: 5,
	},
});
export default PlaylistScreen;