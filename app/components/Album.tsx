import { useNavigation, useTheme } from "@react-navigation/native";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { Dimensions, Image, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { CompactPlaylist } from "../../lib-origin/Illusive/src/types";
import { best_thumbnail, empty_join_dot, single_case } from '../../lib-origin/Illusive/src/illusive_utilts';
import { Navigator } from "../../lib-origin/Illusive/src/illusi/src/types";
import { play } from "../../lib-origin/Illusive/src/illusi/src/play";
import { is_empty, remove_topic } from '../../lib-origin/origin/src/utils/util';
import { ContextMenuView } from "react-native-ios-context-menu";
import { useEffect, useState } from "react";
import * as Haptics from "expo-haptics";
import * as GLOBALS from '../../lib-origin/Illusive/src/illusi/src/globals';

export type SecondLineType = "YEAR"|"ARTIST";
export default function Album(props: {
    album_data: CompactPlaylist
    second_line_type?: SecondLineType
    size?: number
}){
    const size = props.size ?? Dimensions.get('screen').width * .40;
    const { colors } = useTheme() as Prefs.Theme;

    const navigation: Navigator = useNavigation();

    const [target_view_node, set_target_view_node] = useState();
    
    useEffect(() => {
        return () => {
            set_target_view_node(undefined);
        }
    }, []);

    function on_press(){
        if(props.album_data.album_type !== "SONG"){
            navigation.push("Playlist", {uri: props.album_data.title.uri, compact_playlist: props.album_data});;
        }
        else if(props.album_data.song_track) {
            play(props.album_data.song_track, "Artist Watch", () => [props.album_data.song_track!]);
        }
    }
    
    const year = new Date(props.album_data.date ?? 0).getFullYear();
    const artist_name = props.album_data.artist?.[0]?.name;
    const second_line = ((props.second_line_type ?? "YEAR") === "YEAR") ? (year ?? remove_topic(artist_name)) : (remove_topic(artist_name) ?? year);

    return (
        <ContextMenuView
            previewConfig={{
                targetViewNode: target_view_node,
            }}
            menuConfig={{
                menuTitle: ``,
                menuItems: [
                    {
                        actionKey: "album-song-enqueue",
                        actionTitle: "Enqueue Track",
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageValue: {
                                systemName: 'text.append',
                            },
                        },
                        menuAttributes: !GLOBALS.global_var.is_playing || props.album_data.album_type !== "SONG" ? ['hidden'] : undefined
                    },
                    {
                        actionKey: "album-song-play-next",
                        actionTitle: "Play Next",
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageValue: {
                                systemName: 'text.insert',
                            },
                        },
                        menuAttributes: !GLOBALS.global_var.is_playing || props.album_data.album_type !== "SONG" ? ['hidden'] : undefined
                    },
                    {
                        actionKey: "album-song-add-to-library",
                        actionTitle: "Add To Library",
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageValue: {
                                systemName: 'plus',
                            },
                        },
                        menuAttributes: props.album_data.album_type !== "SONG" ? ['hidden'] : undefined
                    },
                    {
                        menuTitle: "Push To Queue",
                        menuItems: [
                            {
                                actionKey: "album-push-to-queue-ordered",
                                actionTitle: "Ordered",
                                icon: {
                                    type: 'IMAGE_SYSTEM',
                                    imageValue: {
                                        systemName: 'music.note.list',
                                    },
                                },
                                menuAttributes: props.album_data.album_type === "SONG" ? ['hidden'] : undefined
                            },
                            {
                                actionKey: "album-push-to-queue-shuffled",
                                actionTitle: "Shuffled",
                                icon: {
                                    type: 'IMAGE_SYSTEM',
                                    imageValue: {
                                        systemName: 'shuffle',
                                    },
                                },
                                menuAttributes: props.album_data.album_type === "SONG" ? ['hidden'] : undefined
                            },
                        ],
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageValue: {
                                systemName: 'text.append',
                            },
                        },
                    },
                    {
                        actionKey: "album-view-artist",
                        actionTitle: "View Artist",
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageValue: {
                                systemName: 'music.mic',
                            },
                        }
                    },
                ],
            }}
            onMenuWillShow={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressMenuItem={({nativeEvent}) => {
                switch(nativeEvent.actionKey){
                    case "album-song-enqueue":
                        break;
                    case"album-song-play-next":
                        break;
                    case "album-song-add-to-library":
                        break;
                    case "album-push-to-queue-ordered":
                        break;
                    case "album-push-to-queue-shuffled":
                        break;
                    case "album-view-artist":
                        break;
                    default: break;
                }
                }}
        >
            <TouchableOpacity style={{padding: 5}} onPress={on_press}>
                <Image source={{uri: is_empty(props.album_data.artwork_url) ? best_thumbnail(props.album_data.artwork_thumbnails)?.url : props.album_data.artwork_url}} style={{width: size, height: size, borderRadius: 5}}/>
                <View style={{width: size}}>
                    <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 16, paddingTop: 5, width: size}} numberOfLines={1}>{props.album_data.title.name}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {props.album_data.explicit === "EXPLICIT" ? <MaterialIcons name="explicit" size={20} color={colors.secondary} style={{}}/> : null}
                        <Text numberOfLines={1} style={{color: colors.subtext, fontSize: 15, top: 0, width: size}}>{empty_join_dot([single_case(props.album_data.album_type ?? "..."), second_line])}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        </ContextMenuView>
    );
}