import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import type { AlbumSortMode, CompactPlaylist} from "@illusive/types";
import type { Track } from "@illusive/types";
import Album from "@components/Album";
import BigList from "react-native-big-list";
import SearchBarV1 from "@components/SearchBarV1";
import { useState } from "react";
import { album_query_filter, sort_compact_playlists } from "@illusive/illusive_utils";
import { COMPACT_PLAYLIST_QUERY_FLAGS } from "@illusive/query_flags";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MenuConfig } from "react-native-ios-context-menu";
import { ContextMenuButton } from "react-native-ios-context-menu";
import { GLOBALS } from '@illusive/globals'
import usePTheme from "@hooks/usePTheme";
import { router } from "expo-router";
import { AntDesignTouchableOpacity } from "@components/TouchableIconOpacity";

export default function AlbumGridRenderer(props: {
    title: string;
    album_data: CompactPlaylist[];
}){
    const { colors } = usePTheme();
    
    const album_size = Dimensions.get('screen').width * .3;
    const columns = 3;
    const [query, set_query] = useState<string>("");
    const [sort_mode, set_sort_mode] = useState<AlbumSortMode>("NEWEST");

    const other_tracks = props.album_data.filter(album => album.song_track).map(album => album.song_track) as Track[];

    const albums = sort_compact_playlists(sort_mode, album_query_filter(props.album_data ?? [], query), GLOBALS.global_var.sql_tracks);
    const split_albums: [CompactPlaylist, CompactPlaylist, CompactPlaylist][] = albums.reduce((result_array: any[], item, index) => { 
        const chunk_index = Math.floor(index / columns)
      
        if(!result_array[chunk_index]) {
          result_array[chunk_index] = [];
        }
      
        result_array[chunk_index].push(item)
      
        return result_array;
    }, []);

    function close(){
        if(!router.canGoBack()) return;
        router.back();
    }

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
            <View style={{flexDirection: 'row', width: '100%', justifyContent: 'center'}}>
                <Text style={{bottom: 20, color: colors.text, fontSize: 18, fontWeight: '500'}}>{props.title}</Text>
                <AntDesignTouchableOpacity on_press={close} style={{position: 'absolute', left: 15, bottom: 15}} icon_name='left' icon_size={25} icon_color={colors.primary} icon_style={{}}/>
            </View>
            <View style={{width: '95%', zIndex: 5, flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{width: '88%'}}>
                    <SearchBarV1 onChangeText={(change_query) => set_query(change_query)} query_flags={COMPACT_PLAYLIST_QUERY_FLAGS} placeholder={`Search ${props.title}`}/>
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
            {item.item[0] ? <Album size={album_size} album_data={item.item[0]} second_line_type={"ARTIST"} other_tracks={other_tracks}/> : null}
            {item.item[1] ? <Album size={album_size} album_data={item.item[1]} second_line_type={"ARTIST"} other_tracks={other_tracks}/> : null}
            {item.item[2] ? <Album size={album_size} album_data={item.item[2]} second_line_type={"ARTIST"} other_tracks={other_tracks}/> : null}
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