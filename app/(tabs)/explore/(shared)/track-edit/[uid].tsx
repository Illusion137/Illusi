import { reinterpret_cast } from "@common/cast";
import IImage from "@components/IImage";
import ModalHeader from "@components/ModalHeader";
import ScaledImage from "@components/ScaledImage";
import { IoniconsTouchableOpacity } from "@components/TouchableIconOpacity";
import { Ionicons } from "@expo/vector-icons";
import usePTheme from "@hooks/usePTheme";
import useTrackColors from "@hooks/useTrackColors";
import { ExampleObj } from "@illusive/example_objs";
import { GLOBALS } from "@illusive/globals";
import { Illusive } from "@illusive/illusive";
import { get_unique_album_names_with_uris, get_unique_artists } from "@illusive/illusive_utils";
import type { Prefs } from "@illusive/prefs";
import { SQLArtists } from "@illusive/sql/sql_artists";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { IllusiveURI, LoadingState, NamedUUID, Track } from "@illusive/types";
import { TrackContextMenu } from "@utils/context_menu";
import { ContextResolver } from "@utils/context_resolver";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ContextMenuButton, ContextMenuView } from "react-native-ios-context-menu";

interface TrackEditables {track: Track, title: string, album: NamedUUID, artists: NamedUUID[]};

async function save_track(editables: TrackEditables){
    await SQLTracks.update_track(editables.track.uid, {
        ...editables.track,
        title: editables.title,
        album: editables.album,
        artists: editables.artists
    });
}

type SetArtistsState = (args: (prev: NamedUUID[]) => NamedUUID[]) => any;
function EditArtistPreview(props: {track: Track, artist: NamedUUID, index: number, set_artists_state: SetArtistsState }){
    const { colors } = usePTheme();
    const styles = theme_styles(colors);
    
    const all_artists_ref = useRef(get_unique_artists(GLOBALS.global_var.sql_tracks));
    const artist_name_ref = useRef("");
    const [close_artists, set_close_artists] = useState(all_artists_ref.current);
    const [input_focused, set_input_focused] = useState(false);

    function on_name_change(name: string){
        artist_name_ref.current = name;
        set_close_artists(all_artists_ref.current.filter(artist => artist.name.toLowerCase().includes(name.toLowerCase())));
    }
    function on_name_submit(){
        props.set_artists_state(prev_artists_state => {
            // prev_artists_state[props.index] = 0;
            return prev_artists_state;
        });
    }

    function delete_artist(){
        props.set_artists_state(prev_artists_state => prev_artists_state.filter((_, i) => i !== props.index));
    }

    return (
        <View style={{margin: 20, height: 200}}>
            <IImage style={{width: 100, height: 100, borderRadius: 50}} source={SQLArtists.artists_artwork_memo[props.artist.uri ?? ""] ?? SQLArtists.default_profile_picture_url}/>
            <TextInput defaultValue={props.artist.name}
                autoCorrect={false}
                placeholder='Enter Artist Name'
                placeholderTextColor={colors.searchPlaceholder}
                style={styles.search_input}
                onFocus={() => set_input_focused(true)}
                onBlur={() => set_input_focused(false)}
                onChangeText={on_name_change}
                onEndEditing={on_name_submit}
                onSubmitEditing={on_name_submit}/>
            <View style={{marginLeft: 30, height: 0.5, backgroundColor: colors.text, width: '85%'}}/>
            {input_focused ? (
                <ScrollView style={{ width: "103%", maxHeight: 400, backgroundColor: "#00000070", top: -20, zIndex: 5, paddingHorizontal: 10 }}>
                    {close_artists.map((artist_name, i) => (
                        <View key={artist_name.name + String(i)} style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 1 }}>
                            <Text style={{ color: colors.text }}>{artist_name.name}</Text>
                        </View>
                    ))}
                </ScrollView>
            ) : null}
        </View>
    );
}

function EditArtist(props: {track: Track, artist: NamedUUID, index: number, set_artists_state: SetArtistsState}){
    const { colors } = usePTheme();
    return (
        <ContextMenuView previewConfig={{
            previewType: 'CUSTOM',
            previewSize: 'INHERIT',
            backgroundColor: colors.background,
            preferredCommitStyle: 'pop',
        }} renderPreview={() => <EditArtistPreview artist={props.artist} index={props.index} track={props.track} set_artists_state={props.set_artists_state}/>}>
            <View style={{justifyContent: 'center', alignItems: 'center', width: 60, marginRight: 10, marginTop: 10}}>
                <IImage style={{width: 55, height: 55, borderRadius: 50}} source={SQLArtists.artists_artwork_memo[props.artist.uri ?? ""] ?? SQLArtists.default_profile_picture_url}/>
                <Text numberOfLines={1} style={{color: colors.text}}>{props.artist.name}</Text>
            </View>
        </ContextMenuView>
    );
}

export default function EditTrackModal(){
    const { uid } = useLocalSearchParams<{uid: string}>();
    const track_ref = useRef(GLOBALS.global_var.sql_tracks.find(track => track.uid === uid));
    const all_albums_ref = useRef(get_unique_album_names_with_uris(GLOBALS.global_var.sql_tracks));

    const { colors } = usePTheme();
    const { track_colors } = useTrackColors(track_ref.current);
    const styles = theme_styles(colors);

    const title_ref = useRef<string>(track_ref.current?.title ?? "");
    const [editing_title_state, set_editing_title_state] = useState<LoadingState>("NONE");

    const [artists_state, set_artists_state] = useState(track_ref.current?.artists ?? []);

    const album_ref = useRef<NamedUUID>(track_ref.current?.album ? {...track_ref.current?.album} : null);
    const album_artwork = useMemo(
        () => album_ref?.current?.uri ? GLOBALS.global_var.sql_tracks.find(track => track.album?.uri === album_ref.current?.uri)?.playback?.artwork ?? Illusive.illusi_dark_icon_index : Illusive.illusi_dark_icon_index,
        [album_ref.current?.uri]
    );
    const [close_album_names, set_close_album_names] = useState<string[]>([]);
    useEffect(
        () => set_close_album_names(all_albums_ref.current?.filter(album_name => album_name.toLowerCase().includes(album_ref.current?.name.toLowerCase() ?? ""))),
        [album_ref.current?.name]
    );
	const [album_name_input_focused, set_album_name_input_focused] = useState<boolean>(false);
    const [editing_album_name_state, set_editing_album_name_state] = useState<LoadingState>("NONE");

    function on_title_change(new_title: string){ title_ref.current = new_title; set_editing_title_state("LOADING"); }
    function on_title_submit(){
        if(track_ref.current && track_ref.current.title !== title_ref.current) {
            track_ref.current.title = title_ref.current;
            // SQLTracks.update_track(track_ref.current.uid, {...track_ref.current, title: title_ref.current});
            set_editing_title_state("COMPLETE");
        }
        else set_editing_title_state("NONE");
    }

    function append_empty_artist(){
        set_artists_state(prev_artists_state => {
            prev_artists_state.push({name: "", uri: null});
            return prev_artists_state;
        });
    }
    function save_artists(){
        return;
    }

    function on_album_name_change(new_album_name: string){
        if(album_ref.current?.name === undefined) return;
        album_ref.current.name = new_album_name; 
        set_editing_album_name_state("LOADING"); 
        set_close_album_names(all_albums_ref.current?.filter(album_name => album_name.toLowerCase().includes(album_ref.current?.name.toLowerCase() ?? "")));
    }
    function on_album_name_submit(){
        if(album_ref.current && track_ref.current) {
            const other_album_uri: IllusiveURI|null = album_ref.current?.name ? 
                GLOBALS.global_var.sql_tracks.find(track => 
                    track.album?.uri && track.album?.name 
                    && track.album.name === album_ref.current?.name)?.album?.uri
                        ?? null : null;
            if(album_ref.current && !album_ref.current?.uri || other_album_uri !== null){
                album_ref.current.uri = other_album_uri;
            }
            save_track({track: track_ref.current, title: title_ref.current ?? track_ref.current.title, album: album_ref.current ?? track_ref.current.album, artists: track_ref.current.artists});
            // SQLTracks.update_track(track_ref.current.uid, {...track_ref.current, title: title_ref.current ?? track_ref.current.title, album: album_ref.current});
            set_editing_album_name_state("COMPLETE");
        }
        else set_editing_album_name_state("NONE");
    }

    // function edit_media_file(){}
    // function upload_media_file(){}

    // function edit_track_lyrics_file(){}
    // function upload_lyrics_file(){}

    return (
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <ModalHeader title={"Edit Track"} background_color={track_colors?.secondary} text_color={track_colors?.background} close_color={track_colors?.background}/>
            <ScrollView scrollToOverflowEnabled={false}>
                {track_colors ? <LinearGradient
                        colors={[track_colors.primary, track_colors.background, 'transparent']}
                        style={{
                            position: 'absolute',
                            top: 0,
                            height: Dimensions.get('screen').height * .8,
                            width: '100%',
                        }}/> : null}
                <ContextMenuButton
                    menuConfig={{menuTitle: "", menuItems: TrackContextMenu.track_artwork_folder(track_ref.current ?? ExampleObj.track_example0, "")}} 
                    onPressMenuItem={async({nativeEvent}) => {
                        ContextResolver.resolve_track_context(track_ref.current, undefined, reinterpret_cast<ContextResolver.TrackContextKeys>(nativeEvent.actionKey));
                    }}>
                    <TouchableOpacity style={{width: '100%', alignItems: 'center', maxHeight: 450, minHeight: 350, overflow: 'hidden', marginTop: 30}}>
                        <ScaledImage tint={{color: "#000000", opacity: 0.30}} artwork={track_ref.current?.playback?.artwork} width={Dimensions.get('screen').width * .85} style={{borderRadius: 10}}/>
                        <Ionicons name="pencil-sharp" size={65} color={"white"} style={{position: 'absolute', left: '42%', top: '42%', zIndex: 10}}/>
                    </TouchableOpacity>
                </ContextMenuButton>
                <Text style={styles.text}>Title:</Text>
                    <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                        <TextInput defaultValue={track_ref.current?.title} autoCorrect={false} placeholder='Enter Title' placeholderTextColor={colors.searchPlaceholder} style={styles.search_input} onChangeText={on_title_change} onEndEditing={on_title_submit} onSubmitEditing={on_title_submit}/>
                        {editing_title_state === "LOADING" ? <ActivityIndicator size={30}/> :
                            editing_title_state === "COMPLETE" ? <Ionicons name="checkmark" size={30} color={colors.green}/>
                                : null}
                    </View>
                    <View style={{marginLeft: 30, height: 0.5, backgroundColor: colors.text, width: '85%'}}/>
                <Text style={{...styles.text, marginTop: 20}}>Artists:</Text>
                    <ScrollView horizontal contentContainerStyle={{alignItems: 'center', height: 80, marginTop: 5, marginLeft: 30}}>
                        {artists_state.map((artist, i) => (
                            <EditArtist key={i + artist.name} artist={artist} index={i} track={track_ref.current!} set_artists_state={set_artists_state}/>
                        ))}
                        <IoniconsTouchableOpacity icon_name="add-circle-sharp" icon_color={colors.primary} icon_size={60} on_press={append_empty_artist}/>
                    </ScrollView>
                <Text style={{...styles.text, marginTop: 20}}>Album:</Text>
                    <View style={{flexDirection: 'row', marginTop: 10}}>
                        <IImage source={album_artwork} style={{height: 65, width: 65, marginLeft: 20, borderRadius: 3}}/>
                        <View style={{width: '75%', right: 10, marginTop: 10}}>
                            <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                                <TextInput defaultValue={track_ref.current?.album?.name}
                                    autoCorrect={false}
                                    placeholder='Enter Album Name'
                                    placeholderTextColor={colors.searchPlaceholder}
                                    style={styles.search_input}
                                    onChangeText={on_album_name_change}
                                    onEndEditing={on_album_name_submit}
                                    onSubmitEditing={on_album_name_submit}
                                    onBlur={() => set_album_name_input_focused(false)}
					                onFocus={() => set_album_name_input_focused(true)}/>
                                {editing_album_name_state === "LOADING" ? <ActivityIndicator size={30}/> : 
                                    editing_album_name_state === "COMPLETE" ? <Ionicons name="checkmark" size={30} color={colors.green}/>
                                        : null}
                            </View>
                            <View style={{marginLeft: 30, height: 1, backgroundColor: colors.text, width: '85%'}}/>
                        </View>
                    </View>
                {album_name_input_focused ? (
                    <ScrollView style={{ width: "103%", maxHeight: 400, backgroundColor: "#00000070", top: -20, zIndex: 5, paddingHorizontal: 10 }}>
                        {close_album_names.map((album_name, i) => (
                            <View key={album_name + String(i)} style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 1 }}>
                                <Text style={{ color: colors.text }}>{album_name}</Text>
                            </View>
                        ))}
                    </ScrollView>
			    ) : null}
                <Text style={{...styles.text, marginTop: 20}}>Media:</Text>
                <View style={{height: 100}}>

                </View>
                <Text style={{...styles.text, marginTop: 20}}>Lyrics:</Text>
                <View style={{height: 100}}>
                    
                </View>
                <View style={{height: 300}}/>
            </ScrollView>
        </View>
    );
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    text: {
        color: colors.text,
        marginHorizontal: 25,
        marginTop: 10,
        fontWeight: '900',
        fontSize: 18
    },
    search_input:{
        color: colors.text,
        fontSize: 25,
        fontWeight: '600',
        marginLeft: 30,
        marginTop: 5,
        width: '85%',
        borderRadius: 10,// Top Right Corner
    },
});