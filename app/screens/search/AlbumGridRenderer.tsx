import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { AlbumSortMode, CompactPlaylist, Route } from "../../../lib-origin/Illusive/src/types";
import Album from "../../components/Album";
import BigList from "react-native-big-list";
import SearchBarV1 from "../../components/SearchBarV1";
import { useState } from "react";
import { album_query_filter, single_case, sort_compact_playlists } from "../../../lib-origin/Illusive/src/illusive_utilts";
import { COMPACT_PLAYLIST_QUERY_FLAGS } from "../../../lib-origin/Illusive/src/query_flags";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import { useTheme } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ContextMenuButton, MenuConfig } from "react-native-ios-context-menu";
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals'

export default function AlbumGridRenderer(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{album_data: CompactPlaylist[]}>;
    const { colors } = useTheme() as Prefs.Theme;
    
    const album_size = Dimensions.get('screen').width * .3;
    const columns = 3;
    const [query, set_query] = useState<string>("");
    const [sort_mode, set_sort_mode] = useState<AlbumSortMode>("NEWEST");

    const albums = sort_compact_playlists(sort_mode, album_query_filter(ts_route.params.album_data ?? [], query), GLOBALS.global_var.sql_tracks);
    const split_albums: [CompactPlaylist, CompactPlaylist, CompactPlaylist][] = albums.reduce((result_array: any[], item, index) => { 
        const chunk_index = Math.floor(index / columns)
      
        if(!result_array[chunk_index]) {
          result_array[chunk_index] = [];
        }
      
        result_array[chunk_index].push(item)
      
        return result_array;
    }, []);

    const menuconfig_sort: MenuConfig = {
        menuTitle: "",
        menuItems: [
            {
                actionKey  : 'albums-sort-newest',
                actionTitle: 'Newest',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: sort_mode === "NEWEST" ? 'checkmark' : "",
                    },
                },
            },
            {
                actionKey  : 'albums-sort-oldest',
                actionTitle: 'Oldest',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: sort_mode === "OLDEST" ? 'checkmark' : "",
                    },
                },
            }, 
            {
                actionKey  : 'albums-sort-most-played-artists',
                actionTitle: 'Most Played Artists',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: sort_mode === "MOST_PLAYED_ARTISTS" ? 'checkmark' : "",
                    },
                },
            }, 
            {
                actionKey  : 'albums-sort-least-played-artists',
                actionTitle: 'Least Played Artists',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: sort_mode === "LEAST_PLAYED_ARTISTS" ? 'checkmark' : "",
                    },
                },
            }, 
        ]
    };

    const header = () => (
        <View style={{zIndex: 10, backgroundColor: colors.shelf, width: '100%', height: '18%', top: 0, justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={{height: 90}}/>
            <Text style={{bottom: 20, color: colors.text, fontSize: 18, fontWeight: '500'}}>New Releases</Text>
            <View style={{width: '95%', zIndex: 5, flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{width: '88%'}}>
                    <SearchBarV1 onChangeText={(query) => set_query(query)} query_flags={COMPACT_PLAYLIST_QUERY_FLAGS} placeholder="Search New Releases"/>
                </View>
                <TouchableOpacity style={{right: '7%', justifyContent: 'center', alignItems: 'center', borderRadius: 10, width: 60, marginHorizontal: 30}}>
                <ContextMenuButton menuConfig={menuconfig_sort}
                        onPressMenuItem={async({nativeEvent}) => {
                            set_sort_mode(nativeEvent.actionTitle.replace(/\s+/g, '_').toUpperCase() as AlbumSortMode);
                        }}>
                        <MaterialCommunityIcons name='sort' color={colors.primary} size={30}/>
                </ContextMenuButton>
                    </TouchableOpacity>
            </View>
            <View style={{height: 10}}/>
        </View>
    );

    const render_item = (item: {item: [CompactPlaylist, CompactPlaylist, CompactPlaylist]}) => (
        <View style={{flexDirection: 'row' }}>
            {item.item[0] ? <Album size={album_size} album_data={item.item[0]} second_line_type={"ARTIST"}/> : null}
            {item.item[1] ? <Album size={album_size} album_data={item.item[1]} second_line_type={"ARTIST"}/> : null}
            {item.item[2] ? <Album size={album_size} album_data={item.item[2]} second_line_type={"ARTIST"}/> : null}
        </View>
    );

    return (
        <>
            {header()}
            {/* <View style={{height: 100}}/> */}
            <BigList itemHeight={180} data={split_albums} renderItem={render_item} footerHeight={100} renderHeader={null} renderFooter={() => (<View style={{height: 100}}/>)}/>
        </>
    );
}