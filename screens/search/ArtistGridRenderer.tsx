import { Text, TouchableOpacity, View } from "react-native";
import type { ArtistSortMode, CompactArtist, NamedUUID } from "@illusive/types";
import BigList from "react-native-big-list";
import SearchBarV1 from "@components/SearchBarV1";
import { useState, useMemo } from "react";
import { artist_query_filter } from "@illusive/illusive_utils";
import { COMPACT_ARTIST_QUERY_FLAGS } from "@illusive/query_flags";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MenuConfig } from "@components/ContextMenu";
import { ContextMenuButton } from "@components/ContextMenu";
import { GLOBALS } from '@illusive/globals'
import RowArtist from "@components/RowArtist";
import usePTheme from "@hooks/usePTheme";
import { SQLArtists } from "@illusive/sql/sql_artists";
import { router } from "expo-router";
import { AntDesignTouchableOpacity } from "@components/TouchableIconOpacity";
import useDimensions from "@hooks/useDimensions";

export default function ArtistGridRenderer(props: {
    title: string;
    artist_data: NamedUUID[];
}){
    const { colors } = usePTheme();
    const { width } = useDimensions();

    const artist_size = useMemo(() => width * .28, [width]);
    const columns = 3;
    const [query, set_query] = useState<string>("");
    const [sort_mode, set_sort_mode] = useState<ArtistSortMode>("NEWEST");

    const artists = artist_query_filter(SQLArtists.sort_compact_artists(sort_mode, props.artist_data ?? [], GLOBALS.global_var.sql_tracks), query);
    const split_artists: [CompactArtist, CompactArtist, CompactArtist][] = artists.reduce((result_array: any[], item, index) => { 
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
                actionKey  : 'artists-sort-newest',
                actionTitle: 'Newest',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: sort_mode === "NEWEST" ? 'checkmark' : "",
                    },
                },
            },
            {
                actionKey  : 'artists-sort-oldest',
                actionTitle: 'Oldest',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: sort_mode === "OLDEST" ? 'checkmark' : "",
                    },
                },
            }, 
            {
                actionKey  : 'artists-sort-most-played',
                actionTitle: 'Most Played',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: sort_mode === "MOST_PLAYED" ? 'checkmark' : "",
                    },
                },
            }, 
            {
                actionKey  : 'artists-sort-least-played',
                actionTitle: 'Least Played',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: sort_mode === "LEAST_PLAYED" ? 'checkmark' : "",
                    },
                },
            }, 
        ]
    };

    function close(){
        if(!router.canGoBack()) return;
        router.back();
    }

    const header = () => (
        <View style={{zIndex: 10, backgroundColor: colors.shelf, width: '100%', height: '18%', top: 0, justifyContent: 'flex-end', alignItems: 'center' }}>
            <View style={{height: 90}}/>
            <View style={{flexDirection: 'row', width: '100%', justifyContent: 'center'}}>
                <Text style={{bottom: 20, color: colors.text, fontSize: 18, fontWeight: '500'}}>{props.title}</Text>
                <AntDesignTouchableOpacity on_press={close} style={{position: 'absolute', left: 15, bottom: 15}} icon_name='left' icon_size={25} icon_color={colors.primary} icon_style={{}}/>
            </View>
            <View style={{width: '95%', zIndex: 5, flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{width: '88%'}}>
                    <SearchBarV1 onChangeText={(query) => set_query(query)} query_flags={COMPACT_ARTIST_QUERY_FLAGS} placeholder="Search Artists"/>
                </View>
                <TouchableOpacity style={{right: '7%', justifyContent: 'center', alignItems: 'center', borderRadius: 10, width: 60, marginHorizontal: 30}}>
                <ContextMenuButton menuConfig={menuconfig_sort}
                        onPressMenuItem={async({nativeEvent}) => {
                            set_sort_mode(nativeEvent.actionTitle.replace(/\s+/g, '_').toUpperCase() as ArtistSortMode);
                        }}>
                        <MaterialCommunityIcons name='sort' color={colors.primary} size={30}/>
                </ContextMenuButton>
                    </TouchableOpacity>
            </View>
            <View style={{height: 10}}/>
        </View>
    );

    const render_item = (item: {item: [CompactArtist, CompactArtist, CompactArtist]}) => (
        <View style={{flexDirection: 'row' }}>
            {item.item[0] ? <RowArtist artist_data={item.item[0]} size={artist_size}/> : null}
            {item.item[1] ? <RowArtist artist_data={item.item[1]} size={artist_size}/> : null}
            {item.item[2] ? <RowArtist artist_data={item.item[2]} size={artist_size}/> : null}
        </View>
    );

    return (
        <>
            {header()}
            <BigList itemHeight={180} data={split_artists} renderItem={render_item} footerHeight={100} renderHeader={null} renderFooter={() => (<View style={{height: 100}}/>)}/>
        </>
    );
}