import { useEffect, useState } from "react";
import { View, StyleSheet, Text, NativeSyntheticEvent, TextInput, ScrollView } from "react-native";
import { useTheme } from "@react-navigation/native";
import { InheritedPlaylist, InheritedSearch, Playlist, PlaylistInheritanceMode, Route, SortType } from "../../../lib-origin/Illusive/src/types";
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import SegmentedControl, { NativeSegmentedControlIOSChangeEvent } from "@react-native-segmented-control/segmented-control";
import { IoniconsTouchableOpacity } from "../../components/TouchableIconOpacity";
import ExtrasSectionButton from "../../components/ExtrasSectionButton";
import { SelectList } from "react-native-dropdown-select-list";

type KeyValue = {key: string, value: string};
type Action = "ADD"|"REMOVE";
export default function EditPlaylist(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{uuid: string}>;
    
    const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);
    
    const sort_modes: SortType[] = ["OLDEST", "NEWEST", "ALPHABETICAL"];
    const inheritance_modes: PlaylistInheritanceMode[] = ["INCLUDE", "EXCLUDE", "MASK"];

    const [playlist_data, set_playlist_data] = useState<Playlist>();
    const [playlist_title, set_playlist_title] = useState("");

    const [inherited_playlist_key_values, set_inherited_playlist_key_values] = useState<KeyValue[]>([]);
    const [inherited_playlist_selected_key, set_inherited_playlist_selected_key] = useState("");
    const [inherited_playlist_segment_mode, set_inherited_playlist_segment_mode] = useState<PlaylistInheritanceMode>("INCLUDE");
    
    const [inherited_search_query, set_inherited_search_query] = useState("");
    const [inherited_search_segment_mode, set_inherited_search_segment_mode] = useState<PlaylistInheritanceMode>("INCLUDE");
    
    useEffect(() => {
        (async() => {
            const pdata = await SQLPlaylists.playlist_data(ts_route.params.uuid, true);
            set_playlist_data(pdata);
            set_playlist_title(pdata.title);

            const playlists = await SQLPlaylists.all_playlists_data();
			const playlists_entries: {key: string, value: string}[] = [];
			for (let i = 0; i < playlists.length; i++)
				playlists_entries.push({key: playlists[i].uuid, value: playlists[i].title});
			set_inherited_playlist_key_values(playlists_entries);
        })();
    }, []);

    
    async function change_playlist_title(){
        await SQLPlaylists.update_playlist_title(ts_route.params.uuid, playlist_title);
    }
    async function change_sort_mode(event: NativeSyntheticEvent<NativeSegmentedControlIOSChangeEvent>){
        const new_sort_mode: SortType = event.nativeEvent.value.toUpperCase() as SortType;
        await SQLPlaylists.update_playlist_sort_mode(ts_route.params.uuid, new_sort_mode);
    }
    async function inherited_playlist_action(type: Action, item?: InheritedPlaylist){
        const inherited_playlist: InheritedPlaylist = item ?? {
            "mode": inherited_playlist_segment_mode,
            "uuid": inherited_playlist_selected_key
        };
        const new_iplaylists = SQLPlaylists.inherited_playlists_action(playlist_data!.inherited_playlists!, inherited_playlist, type);
        await SQLPlaylists.update_playlist_inherited_playlists(playlist_data!.uuid, new_iplaylists);
        set_playlist_data({...playlist_data!, "inherited_playlists": new_iplaylists});
    }
    async function inherited_search_action(type: Action, item?: InheritedSearch){
        const inherited_search: InheritedSearch = item ?? {
            "mode": inherited_search_segment_mode,
            "query": inherited_search_query
        };
        const new_isearches = SQLPlaylists.inherited_searches_action(playlist_data!.inherited_searchs!, inherited_search, type);
        await SQLPlaylists.update_playlist_inherited_searchs(playlist_data!.uuid, new_isearches);
        set_playlist_data({...playlist_data!, "inherited_searchs": new_isearches});
    }
    async function add_inherited_playlist(){ await inherited_playlist_action("ADD"); }
    async function remove_inherited_playlist(item: InheritedPlaylist){ await inherited_playlist_action("REMOVE", item); }
    async function add_inherited_search(){ await inherited_search_action("ADD"); }
    async function remove_inherited_search(item: InheritedSearch){ await inherited_search_action("REMOVE", item); }

    return (
        <ScrollView style={styles.top_container}>
            <Text style={styles.info_text}>{playlist_title}</Text>
            <TextInput value={playlist_title} autoCorrect={false} placeholder='Enter Title' placeholderTextColor={colors.searchPlaceholder} style={styles.search_input} onChangeText={(text) => {set_playlist_title(text)}}/>
            <ExtrasSectionButton show_arrow={false} text='Change Playlist Title' icon='pencil-sharp' onPress={change_playlist_title}/>
            <View style={{height: 30}}/>
            <Text style={styles.info_text}>Sort Mode</Text>
            <SegmentedControl
                values={sort_modes.map(mode => mode.toLowerCase())}
                selectedIndex={sort_modes.findIndex(item => item === playlist_data?.sort)}
                onChange={async(event) => await change_sort_mode(event)}
                style={{backgroundColor: colors.background}}/>
            <View style={{height: 30}}/>
            <View>
                <Text style={styles.info_text}>Inherited Playlists</Text>
                <SegmentedControl
                    values={inheritance_modes.map(mode => mode.toLowerCase())}
                    selectedIndex={inheritance_modes.findIndex(item => item === inherited_playlist_segment_mode)}
                    onChange={async(event) => set_inherited_playlist_segment_mode(event.nativeEvent.value.toUpperCase() as PlaylistInheritanceMode)}
                    style={{backgroundColor: colors.background}}/>
                <SelectList 
					setSelected={(key: string) => set_inherited_playlist_selected_key(key)}
					data={inherited_playlist_key_values}
					save="key"
					arrowicon={<></>}
					searchicon={<></>}
					searchPlaceholder={"Select Playlist"}
					placeholder='Select Playlist'
					inputStyles={{backgroundColor: colors.track, color: 'white'}}
					boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
					dropdownStyles={{backgroundColor: colors.track}}
					dropdownTextStyles={{color: 'white'}}
				/>
                <ExtrasSectionButton show_arrow={false} text='Create New Playlist Inheritance' icon='pencil-sharp' onPress={add_inherited_playlist}/>
                {
                    playlist_data?.inherited_playlists?.map((item, i) => {
                        const title = SQLPlaylists.playlist_name_sync(item.uuid);
                        return (
                            <View key={i}>
                                <View style={{flexDirection: "row", justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Text style={title ? styles.inherit_text : styles.unavailable_inherit_text} numberOfLines={1}>{title ?? item.uuid} - {item.mode}</Text>
                                    <IoniconsTouchableOpacity icon_name="close-outline" icon_color="red" icon_size={26} icon_style={{marginRight: 10}} on_press={() => remove_inherited_playlist(item)} hitslop={10}/>
                                </View>
                                <View style={styles.line}/>
                            </View>
                        )
                    })
                }
            </View>
            <View style={{height: 60}}/>
            <View>
                <Text style={styles.info_text}>Inherited Searchs</Text>
                <TextInput autoCorrect={false} placeholder='Enter Search Query' placeholderTextColor={colors.searchPlaceholder} style={styles.search_input} onChangeText={(text) => {set_inherited_search_query(text)}}/>
                <SegmentedControl
                    values={inheritance_modes.map(mode => mode.toLowerCase())}
                    selectedIndex={inheritance_modes.findIndex(item => item === inherited_search_segment_mode)}
                    onChange={async(event) => set_inherited_search_segment_mode(event.nativeEvent.value.toUpperCase() as PlaylistInheritanceMode)}
                    style={{backgroundColor: colors.background}}/>
                <ExtrasSectionButton show_arrow={false} text='Create New Search Inheritance' icon='pencil-sharp' onPress={add_inherited_search}/>
                {
                    playlist_data?.inherited_searchs?.map((item, i) => (
                        <View key={i}>
                            <View style={{flexDirection: "row", justifyContent: 'space-between', alignItems: 'center'}}>
                                <Text style={styles.inherit_text} numberOfLines={1}>{item.query} - {item.mode}</Text>
                                <IoniconsTouchableOpacity icon_name="close-outline" icon_color="red" icon_size={26} icon_style={{marginRight: 10}} on_press={() => remove_inherited_search(item)} hitslop={10}/>
                            </View>
                            <View style={styles.line}/>
                        </View>
                    ))
                }
            </View>
            <View style={{height: 500}}/>
        </ScrollView>
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
    line:{
		width: '100%',
		height: 0.8,
		backgroundColor: colors.line,
		marginHorizontal: 10,
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
    inherit_text: {
        marginLeft: 10,
        color: colors.text,
        fontSize: 16,
        paddingBottom: 10,
        width: "80%"
    },
    unavailable_inherit_text: {
        marginLeft: 10,
        color: colors.red,
        fontSize: 16,
        paddingBottom: 10,
        width: "80%"
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
        marginTop: 10,
        marginBottom: 5,
        marginLeft: 10,
        padding: 5,
		backgroundColor: colors.searchInput,
		color: colors.text,
		width: '90%',
		fontSize: 15,
		borderRadius: 10,// Top Right Corner
	},
});