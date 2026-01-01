import { useEffect, useState } from "react";
import { View, StyleSheet, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import type { InheritedPlaylist, InheritedSearch, Playlist, PlaylistInheritanceMode } from "@illusive/types";
import { SQLPlaylists } from '@illusive/sql/sql_playlists';
import type { Prefs } from "@illusive/prefs";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import { IoniconsTouchableOpacity } from "@components/TouchableIconOpacity";
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { SelectList } from "react-native-dropdown-select-list";
import { ExampleObj } from "@illusive/example_objs";
import FourTrackArtwork from "@components/FourTrackArtwork";
import { Ionicons } from "@expo/vector-icons";
import { is_empty } from '@common/utils/util';
import { upload_playlist_thumbnail } from "@illusive/document_picker";
import { GLOBALS } from '@illusive/globals';
import { default_playlists } from "@illusive/default_playlists";
import { ContextMenuButton } from "react-native-ios-context-menu";
import usePTheme from "@hooks/usePTheme";
import { router, useLocalSearchParams } from "expo-router";

interface KeyValue {key: string, value: string}
type Action = "ADD"|"REMOVE";
export default function EditPlaylist(){
    const { uuid } = useLocalSearchParams<{uuid: string}>();
    
    const { colors } = usePTheme();
	const styles = theme_styles(colors);


    const inheritance_modes: PlaylistInheritanceMode[] = ["INCLUDE", "EXCLUDE", "MASK", "INTERSECTION"];

    const [playlist_data, set_playlist_data] = useState<Playlist>(ExampleObj.playlist_example0);
    const [playlist_title, set_playlist_title] = useState("");

    const [inherited_playlist_key_values, set_inherited_playlist_key_values] = useState<KeyValue[]>([]);
    const [inherited_playlist_selected_key, set_inherited_playlist_selected_key] = useState("");
    const [inherited_playlist_segment_mode, set_inherited_playlist_segment_mode] = useState<PlaylistInheritanceMode>("INCLUDE");
    
    const [inherited_search_query, set_inherited_search_query] = useState("");
    const [inherited_search_segment_mode, set_inherited_search_segment_mode] = useState<PlaylistInheritanceMode>("INCLUDE");
    
    useEffect(() => {
        (async() => {
            const pdata = await SQLPlaylists.playlist_data(uuid);
            if(pdata === undefined) return;
            set_playlist_data(pdata);
            set_playlist_title(pdata.title);

            const playlists = await SQLPlaylists.all_playlists_data();
			const playlists_entries: {key: string, value: string}[] = [];
			for (const playlist of playlists)
				playlists_entries.push({key: playlist.uuid, value: playlist.title});
            for(const default_playlist of default_playlists)
				playlists_entries.push({key: default_playlist.name, value: default_playlist.name});
            set_inherited_playlist_key_values(playlists_entries);
        })();
    }, []);

    async function change_playlist_title(){
        await SQLPlaylists.update_playlist_title(uuid, playlist_title);
        GLOBALS.global_var.bottom_alert?.("Updated Playlist Title", "INFO");
    }

    async function inherited_playlist_action(type: Action, item?: InheritedPlaylist){
        const inherited_playlist: InheritedPlaylist = item ?? {
            "mode": inherited_playlist_segment_mode,
            "uuid": inherited_playlist_selected_key
        };
        const new_iplaylists = SQLPlaylists.inherited_playlists_action(playlist_data?.inherited_playlists ?? [], inherited_playlist, type);
        await SQLPlaylists.update_playlist_inherited_playlists(playlist_data.uuid, new_iplaylists);
        set_playlist_data({...playlist_data, "inherited_playlists": new_iplaylists});
    }
    async function inherited_search_action(type: Action, item?: InheritedSearch){
        const inherited_search: InheritedSearch = item ?? {
            "mode": inherited_search_segment_mode,
            "query": inherited_search_query
        };
        const new_isearches = SQLPlaylists.inherited_searches_action(playlist_data.inherited_searchs!, inherited_search, type);
        await SQLPlaylists.update_playlist_inherited_searchs(playlist_data.uuid, new_isearches);
        set_playlist_data({...playlist_data, "inherited_searchs": new_isearches});
    }
    async function add_inherited_playlist(){ await inherited_playlist_action("ADD"); }
    async function remove_inherited_playlist(item: InheritedPlaylist){ await inherited_playlist_action("REMOVE", item); }
    async function add_inherited_search(){ await inherited_search_action("ADD"); }
    async function remove_inherited_search(item: InheritedSearch){ await inherited_search_action("REMOVE", item); }

    return (
        <ScrollView style={styles.top_container}>
            <ContextMenuButton
                menuConfig={{
                    menuTitle: "", 
                    menuItems: [
                        {
                            actionKey: "playlist-edit-upload-artwork",
                            actionTitle: "Upload New Artwork",
                            icon: {
                                type: 'IMAGE_SYSTEM',
                                imageValue: {
                                    systemName: 'photo.artframe',
                                },
                            },
                        },
                        {
                            actionKey: "playlist-edit-remove-artwork",
                            actionTitle: "Remove Artwork",
                            menuAttributes: is_empty(playlist_data.thumbnail_uri) ? ['hidden', 'destructive'] : ['destructive'],
                            icon: {
                                type: 'IMAGE_SYSTEM',
                                imageValue: {
                                    systemName: 'trash',
                                },
                            },
                        },
                    ]}} 
            onPressMenuItem={async({nativeEvent}) => {
                switch(nativeEvent.actionKey){
                    case "playlist-edit-upload-artwork":
                        await upload_playlist_thumbnail(playlist_data, async(updated_playlist) => {
                            set_playlist_data({...updated_playlist});
                            GLOBALS.global_var.bottom_alert?.("Updated Playlist Artwork", "INFO");
                        });
                        break;
                    case "playlist-edit-remove-artwork":
                        await SQLPlaylists.update_playlist(playlist_data.uuid, {...playlist_data, thumbnail_uri: ''}); 
                        set_playlist_data({...playlist_data, thumbnail_uri: ''});
                        GLOBALS.global_var.bottom_alert?.("Removed Playlist Artwork", "INFO");
                        break;
                    default: break;
                }
            }}>
                <TouchableOpacity style={{justifyContent: 'center', alignItems: 'center', paddingTop: 20}}>
                    <Ionicons style={{position: 'absolute', zIndex: 10, top: "45%"}} size={50} name='pencil' color={'white'}/>
                    <FourTrackArtwork size={100} thumbnail_uri={playlist_data.thumbnail_uri} four_track={playlist_data.visual_data?.four_track ?? []} dim={true} dim_amount={0.4}/>
                </TouchableOpacity>
            </ContextMenuButton>
            <TextInput value={playlist_title} autoCorrect={false} placeholder='Enter Title' placeholderTextColor={colors.searchPlaceholder} style={styles.search_input} onChangeText={(text) => {set_playlist_title(text)}} onEndEditing={change_playlist_title} onSubmitEditing={change_playlist_title}/>
            <View style={{alignSelf: 'center', height: 0.2, backgroundColor: colors.text, width: '70%'}}/>
            <View style={{height: 30}}/>
            {/* <Text style={styles.info_text}>Sort Mode</Text> */}
            <ExtrasSectionButton show_arrow={true} text="Edit Sort Mode" icon="NONE" onPress={() => router.push({pathname: "/playlists/edit-sort", params: { uuid }})}/>
            <View style={{height: 20}}/>
            {/* <SegmentedControl
                fontStyle={{color: colors.text}}
                values={sort_modes.map(mode => mode.toLowerCase())}
                selectedIndex={sort_modes.findIndex(item => item === playlist_data?.sort)}
                onChange={async(event) => await change_sort_mode(event)}
                style={{backgroundColor: colors.background}}/>
            <View style={{height: 30}}/> */}
            <View>
                <Text style={styles.info_text}>Inherited Playlists</Text>
                <View style={{borderColor: colors.text, borderWidth: 0.4, margin: 2}}>
                    <View style={{padding: 5}}>
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
                        <SegmentedControl
                            fontStyle={{color: colors.text}}
                            values={inheritance_modes.map(mode => mode.toLowerCase())}
                            selectedIndex={inheritance_modes.findIndex(item => item === inherited_playlist_segment_mode)}
                            onChange={async(event) => set_inherited_playlist_segment_mode(event.nativeEvent.value.toUpperCase() as PlaylistInheritanceMode)}
                            style={{backgroundColor: colors.background}}/>
                        <ExtrasSectionButton show_arrow={false} text='Create New Playlist Inheritance' icon='pencil-sharp' onPress={add_inherited_playlist}/>
                    </View>
                </View>
                {
                    (playlist_data?.inherited_playlists ?? [])?.map((item, i) => {
                        const title = SQLPlaylists.get_playlist_name_sync(item.uuid);
                        return (
                            <View key={i}>
                                <View style={{flexDirection: "row", justifyContent: 'space-between', alignItems: 'center', height: 40}}>
                                    <Text style={title ? styles.inherit_text : styles.unavailable_inherit_text} numberOfLines={1}>{title ?? item.uuid} - {item.mode}</Text>
                                    <IoniconsTouchableOpacity icon_name="close" icon_color="red" icon_size={26} icon_style={{marginRight: 10}} on_press={async () => remove_inherited_playlist(item)} hitslop={10}/>
                                </View>
                                <View style={styles.line}/>
                            </View>
                        )
                    })
                }
            </View>
            <View style={{height: 20}}/>
            <View>
                <Text style={styles.info_text}>Inherited Searchs</Text>
                <View style={{borderColor: colors.text, borderWidth: 0.4, margin: 2}}>
                    <View style={{padding: 5}}>
                        <TextInput autoCorrect={false} placeholder='Enter Search Query' placeholderTextColor={colors.searchPlaceholder} style={styles.search_input0} onChangeText={(text) => {set_inherited_search_query(text)}}/>
                        <SegmentedControl
                            fontStyle={{color: colors.text}}
                            values={inheritance_modes.map(mode => mode.toLowerCase())}
                            selectedIndex={inheritance_modes.findIndex(item => item === inherited_search_segment_mode)}
                            onChange={async(event) => set_inherited_search_segment_mode(event.nativeEvent.value.toUpperCase() as PlaylistInheritanceMode)}
                            style={{backgroundColor: colors.background}}/>
                        <ExtrasSectionButton show_arrow={false} text='Create New Search Inheritance' icon='pencil-sharp' onPress={add_inherited_search}/>
                    </View>
                </View>
                {
                    (playlist_data?.inherited_searchs ?? [])?.map((item, i) => (
                        <View key={i}>
                            <View style={{flexDirection: "row", justifyContent: 'space-between', alignItems: 'center', height: 50}}>
                                <Text style={styles.inherit_text} numberOfLines={1}>{item.query} - {item.mode}</Text>
                                <IoniconsTouchableOpacity icon_name="close" icon_color="red" icon_size={26} icon_style={{marginRight: 10}} on_press={async () => remove_inherited_search(item)} hitslop={10}/>
                            </View>
                            <View style={styles.line}/>
                        </View>
                    ))
                }
            </View>
            <View style={{height: 200}}/>
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
        width: "80%",
        top: 5
    },
    unavailable_inherit_text: {
        marginLeft: 10,
        color: colors.red,
        fontSize: 16,
        paddingBottom: 10,
        width: "80%",
        top: 5
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
        left: '10%',
        color: colors.text,
        fontSize: 25,
        fontWeight: 'bold',
        marginLeft: 30,
        marginTop: 10,
		width: '90%',
		borderRadius: 10,// Top Right Corner
	},
    search_input0:{
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
		width: '90%',
        height: 40,
		borderRadius: 10,// Top Right Corner
	},
});