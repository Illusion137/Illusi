import { useEffect, useState } from "react";
import { View, StyleSheet, Text, NativeSyntheticEvent } from "react-native";
import { useTheme } from "@react-navigation/native";
import { InheritedPlaylist, InheritedSearch, Playlist, Route, SortType } from "../../../lib-origin/Illusive/src/types";
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import SegmentedControl, { NativeSegmentedControlIOSChangeEvent } from "@react-native-segmented-control/segmented-control";
import { IoniconsTouchableOpacity } from "../../components/TouchableIconOpacity";

export default function EditPlaylist(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{uuid: string}>;
    
    const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    
    const sort_modes: SortType[] = ["OLDEST", "NEWEST", "ALPHABETICAL"];

    const [playlist_data, set_playlist_data] = useState<Playlist>();
    
    useEffect(() => {
        (async() => {
            set_playlist_data(await SQLPlaylists.playlist_data(ts_route.params.uuid, true));
        })();
    }, []);

    async function change_sort_mode(event: NativeSyntheticEvent<NativeSegmentedControlIOSChangeEvent>){
        const new_sort_mode: SortType = event.nativeEvent.value.toUpperCase() as SortType;
        await SQLPlaylists.update_playlist_sort_mode(ts_route.params.uuid, new_sort_mode);
    }
    async function add_inherited_playlist(inherited_playlist: InheritedPlaylist){
        inherited_playlist;
    } add_inherited_playlist;
    async function remove_inherited_playlist(inherited_playlist: InheritedPlaylist){
        inherited_playlist;
    }
    async function add_inherited_search(inherited_search: InheritedSearch){
        inherited_search;
    } add_inherited_search;
    async function remove_inherited_search(inherited_search: InheritedSearch){
        inherited_search;
    }
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