import { useEffect, useState } from "react";
import { View, StyleSheet, Text, NativeSyntheticEvent } from "react-native";
import { useTheme } from "@react-navigation/native";
import { InheritedPlaylist, InheritedSearch, Playlist, Route, SortType } from "../../../lib-origin/Illusive/src/types";
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import SegmentedControl, { NativeSegmentedControlIOSChangeEvent } from "@react-native-segmented-control/segmented-control";
import { IoniconsTouchableOpacity } from "../../components/TouchableIconOpacity";
import ExtrasSectionButton from "../../components/ExtrasSectionButton";

type KeyValue = {key: string, value: string};
type Action = "ADD"|"REMOVE";
export default function EditPlaylist(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{uuid: string}>;
    
    const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    
    const sort_modes: SortType[] = ["OLDEST", "NEWEST", "ALPHABETICAL"];
    const inheritance_modes: PlaylistInheritanceMode[] = ["INCLUDE", "EXCLUDE", "MASK"];

    const [playlist_data, set_playlist_data] = useState<Playlist>();
    
    const [inherited_playlist_key_values, set_inherited_playlist_key_values] = useState<KeyValue[]>([]);
    const [inherited_playlist_selected_index, set_inherited_playlist_selected_index] = useState(0);
    const [inherited_playlist_segment_mode, set_inherited_playlist_segment_mode] = useState<PlaylistInheritanceMode>("INCLUDE");
    
    const [inherited_search_query, set_inherited_search_query] = useState("");
    const [inherited_search_segment_mode, set_inherited_search_segment_mode] = useState<PlaylistInheritanceMode>("INCLUDE");
    
    useEffect(() => {
        (async() => {
            set_playlist_data(await SQLPlaylists.playlist_data(ts_route.params.uuid, true));
        })();
    }, []);

    async function change_sort_mode(event: NativeSyntheticEvent<NativeSegmentedControlIOSChangeEvent>){
        const new_sort_mode: SortType = event.nativeEvent.value.toUpperCase() as SortType;
        await SQLPlaylists.update_playlist_sort_mode(ts_route.params.uuid, new_sort_mode);
    }
    async function inherited_playlist_action(type: Action){
        const inherited_playlist: InheritedPlaylist = {
            "mode": inherited_playlist_segment_mode,
            "uuid": inherited_playlist_key_values[inherited_playlist_selected_index].key
        };
        const new_iplaylists = SQLPlaylists.inherited_playlists_action(playlist_data.inherited_playlists, inherited_playlist, type);
        await SQLPlaylists.update_playlist_inherited_playlists(playlist_data.uuid, new_iplaylists);
    }
    async function inherited_search_action(type: Action){
        const inherited_search: InheritedSearch = {
            "mode": inherited_search_segment_mode,
            "query": inherited_search_query
        };
        const new_isearches = SQLPlaylists.inherited_searches_action(playlist_data.inherited_playlists, inherited_playlist, type);
        await SQLPlaylists.update_playlist_inherited_searchs(playlist_data.uuid, new_isearches);
    }
    async function add_inherited_playlist(){ await inherited_playlist_action("ADD"); }
    async function remove_inherited_playlist(){ await inherited_playlist_action("REMOVE"); }
    async function add_inherited_search(){ await inherited_search_action("ADD"); }
    async function remove_inherited_search(){ await inherited_search_action("REMOVE"); }

    return (
        <View style={styles.top_container}>
            <View style={{height: 80}}/>
            <Text style={styles.info_text}>{playlist_data?.title}</Text>
            <Text style={styles.info_text}>Sort Mode</Text>
            <SegmentedControl
                values={sort_modes.map(mode => mode.toLowerCase())}
                selectedIndex={sort_modes.findIndex(item => item === playlist_data?.sort)}
                onChange={async(event) => await change_sort_mode(event)}
                style={{backgroundColor: colors.background}}/>
            <View>
                <Text style={styles.info_text}>Inherited Playlists</Text>
                <SegmentedControl
                    values={inheritance_modes.map(mode => mode.toLowerCase())}
                    selectedIndex={inheritance_modes.findIndex(item => item === inherited_playlist_segment_mode)}
                    onChange={async(event) => set_inherited_playlist_segment_mode(event)}
                    style={{backgroundColor: colors.background}}/>
                <ExtrasSectionButton show_arrow={false} text='Create New Playlist Inheritance' icon='file-tray-full-outline' onPress={add_inherited_playlist}/>
                {
                    playlist_data?.inherited_playlists?.map((item, i) => (
                        <View key={i}>
                            <Text>{item.uuid}</Text>
                            <IoniconsTouchableOpacity icon_name="close-outline" icon_color="red" icon_size={10} icon_style={{}} on_press={() => remove_inherited_playlist(item)} hitslop={10}/>
                        </View>
                    ))
                }
            </View>
            <View>
                <Text style={styles.info_text}>Inherited Searchs</Text>
                <SegmentedControl
                    values={inheritance_modes.map(mode => mode.toLowerCase())}
                    selectedIndex={inheritance_modes.findIndex(item => item === inherited_search_segment_mode)}
                    onChange={async(event) => set_inherited_search_segment_mode(event)}
                    style={{backgroundColor: colors.background}}/>
                <ExtrasSectionButton show_arrow={false} text='Create New Search Inheritance' icon='file-tray-full-outline' onPress={add_inherited_search}/>
                {
                    playlist_data?.inherited_searchs?.map((item, i) => (
                        <View key={i}>
                            <Text>{item.query}</Text>
                            <IoniconsTouchableOpacity icon_name="close-outline" icon_color="red" icon_size={10} icon_style={{}} on_press={() => remove_inherited_search(item)} hitslop={10}/>
                        </View>
                    ))
                }
            </View>
        </View>
    )
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    top_container:{
        flex: 1,
        backgroundColor: colors.background,
    },
    header:{
        top: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 10,
        zIndex: 1
    },
    playlist_list_header:{
        top: 50,
        alignItems: 'center'
    },
    info_text:{
        color: colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 30,
        marginTop: 10,
        marginBottom: 5
    },
    playlist_buttons_container:{
        flexDirection: 'row',
        top: 28,
        marginBottom: 95
    },
    playlist_button:{
        borderRadius: 20, 
        backgroundColor: colors.primary_dark,
        marginHorizontal: 10,
        width: 40, height: 40, 
        justifyContent: 'center', 
        alignItems: 'center'
    },
    search_input:{
		backgroundColor: colors.primary_dark,
		color: colors.text,
		width: '75%',
        position: 'absolute',
        top: -40,
        left: 50,
		padding: 5,
		fontSize: 15,
		borderRadius: 10,
	},
});