import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Fontisto, Ionicons, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { useTheme } from '@react-navigation/native';
import { Animated, Button, Dimensions, Easing, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import TextTicker from 'react-native-text-ticker';
import TrackPlayer, { Event, RepeatMode, State, useTrackPlayerEvents } from 'react-native-track-player';
import SlidingUpPanel from 'rn-sliding-up-panel';
import NavLink from '../../components/NavLink';
import SongComponentQueue from '../../components/SongComponentQueue';

import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import * as IllusiveType from '../../../lib-origin/Illusive/src/types';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { is_empty, remove_topic } from '../../../lib-origin/origin/src/utils/util';
import { illusive_track_to_track_player_track, setup_track_player, track_player_next, track_player_previous } from '../../../lib-origin/Illusive/src/illusi/src/track_player_service';
import { catch_function_async } from '../../../lib-origin/Illusive/src/illusi/src/illusi_utils';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { alert_error } from '../../../lib-origin/Illusive/src/illusi/src/alert';
import { artist_string, recreate, shuffle_array } from '../../../lib-origin/Illusive/src/illusive_utilts';
import AddToPlaylistsModal from './AddToPlaylistsModal';
import AirPlayButton from "react-native-airplay-button";

const top_padding = Dimensions.get('screen').height * 0.08;
function AudioPlayer(props: {
    tracks: IllusiveType.Track[],
    playing_from: string
}) {
    const { colors } = useTheme() as Prefs.Theme;
    const styles = theme_styles(colors);
    const panel_ref = useRef<SlidingUpPanel>() as React.MutableRefObject<SlidingUpPanel>;

    const [panel_state, set_panel_state] = useState({
        is_visible: true,
    });
    const [now_playing_state, set_now_playing_state] = useState({
        now_playing_visible: false,
        queue_data: props.tracks as IllusiveType.QueueTrack[],
    });
    const [settings_state, set_settings_state] = useState({
        settings_visible: false,
    });
    const [lyrics_state, set_lyrics_state] = useState({
        lyrics_visible: false,
        lyrics: ''
    });
    const [add_to_playlist_state, set_add_to_playlist_state] = useState({show: false, track_data: null as IllusiveType.Track|null});

    const [artist_data, set_artist_data] = useState<IllusiveType.NamedUUID>();
    const [player_state_metadata, set_player_state_metadata] = useState({
        title: props.tracks[0]?.title,
        artist: artist_string(props.tracks[0]),
        artwork: props.tracks[0]?.playback!.artwork,
        album: props.tracks[0]?.album,
        duration: props.tracks[0]?.duration ?? 0,
    });
    const [player_state_trackplayer, set_player_state_trackplayer] = useState({
        elapsed_time: 0,
        duration_remaining: props.tracks[0]?.duration ?? 0,
        volume: 1,
        rate: 1,
        loop_track: false,
    });
    const [player_state_type, set_player_state_type] = useState<State>(State.None);
    // const [sample_artwork_color, _] = useState<string>(Prefs.dark_theme.colors.background);
    const panel_min_height = 135 + top_padding;
    const panel_max_height = Dimensions.get('screen').height;
    const panel_animated = new Animated.Value(panel_min_height);
    panel_animated.addListener(({ value }) => {
        const panel_transition_value = panel_min_height + 1;
        if(value > panel_transition_value && !panel_state.is_visible)
            set_panel_state({ 'is_visible': true });
        else if(value <= panel_transition_value && panel_state.is_visible)
            set_panel_state({ 'is_visible': false });
    });

    function interpolatePanelPosition(output_range: any[]) {
        return panel_animated.interpolate({ 'inputRange': [panel_min_height, panel_max_height], 'outputRange': output_range, 'extrapolate': 'clamp' });
    }

    async function share_track() {
        catch_function_async(async() => {
            const UTI = 'public.item';
            const current_track = await TrackPlayer.getActiveTrackIndex();
            if(current_track === undefined) return;
            const illusi_track = GLOBALS.global_var.playing_tracks[current_track];
            if (!is_empty(illusi_track.media_uri) && !Prefs.get_pref('share_as_original'))
                await Sharing.shareAsync(FileSystem.documentDirectory + Illusive.media_archive_path + illusi_track.media_uri, { UTI });
            else if (!is_empty(illusi_track.youtube_id))
                await Sharing.shareAsync(`https://www.youtube.com/watch?v=${illusi_track.youtube_id}`);
            else if (!is_empty(illusi_track.soundcloud_permalink))
                await Sharing.shareAsync(illusi_track.soundcloud_permalink!);
        });
    }

    async function reshuffle(){
        const reshuffled_tracks = shuffle_array([...props.tracks]);
        await setup(reshuffled_tracks);
        set_player_state_metadata({
            title: reshuffled_tracks[0]?.title,
            artist: artist_string(reshuffled_tracks[0]),
            artwork: reshuffled_tracks[0]?.playback!.artwork,
            album: reshuffled_tracks[0]?.album,
            duration: reshuffled_tracks[0]?.duration ?? 0,
        });
    }

    async function setup(reshuffled_tracks?: IllusiveType.Track[]) {
        if((!Prefs.get_pref('play_no_popup') || TrackPlayer.getActiveTrack().catch(e => e) instanceof Error)) 
            panel_ref.current?.show();
        const is_setup = await setup_track_player();
        await TrackPlayer.reset();
        const queue = await TrackPlayer.getQueue();
        if (is_setup && queue.length <= 0) {
            const tracks = reshuffled_tracks ?? props.tracks;
            GLOBALS.global_var.playing_track_index = 0;
            GLOBALS.global_var.playing_tracks = tracks.slice();
            for (let i = 0; i < tracks.length; i++) {
                GLOBALS.global_var.playing_tracks[i].playback!.successful = false;
                GLOBALS.global_var.playing_tracks[i].playback!.added = false;
            }
            GLOBALS.global_var.playing_tracks[0].playback!.added = true;
            let track_misses = 0;
            let track = await illusive_track_to_track_player_track(GLOBALS.global_var.playing_tracks[0]);

            while ((track == null || track == 'skip') && track_misses < 10) {
                GLOBALS.global_var.playing_tracks = GLOBALS.global_var.playing_tracks.slice(1);
                track = await illusive_track_to_track_player_track(GLOBALS.global_var.playing_tracks[0]);
                track_misses++;
            }
            if (track !== 'skip') {
                await TrackPlayer.add(track);
            }
        }
        await TrackPlayer.play();
    }

    useEffect(() => {
        setup();
    }, []);

    const toggle_playing = useCallback(async () => {
        const tp_state = await TrackPlayer.getPlaybackState();
        set_player_state_type(player_state_type === State.Playing ? State.Paused : State.Playing);

        if(tp_state.state === State.Playing) await TrackPlayer.pause();
        else await TrackPlayer.play();
    }, []);

    function toggle_panel() {
        if (panel_state.is_visible) panel_ref.current.hide();
        else panel_ref.current.show();
    }

    function time_to_timestamp(time_seconds: number): string {
        const time_ms = Math.floor(time_seconds * 1000);
        const time_min = Math.floor(time_ms / 60000);
        const time_sec = Math.floor((time_ms - time_min * 60000) / 1000);

        return String(time_min).padStart(2, '0') + ':' + String(time_sec).padStart(2, '0');
    }

    async function updated_queue_items() {
        const current_track_index = await TrackPlayer.getActiveTrackIndex();
        if(current_track_index === undefined) return [];
        const track_player_queue = GLOBALS.global_var.playing_tracks.slice(current_track_index!);
        const queue_items: IllusiveType.QueueTrack[] = []
        try {
            for (let i = 0; i < track_player_queue.length; i++) {
                queue_items.push(
                    {
                        'playback': track_player_queue[i].playback!,
                        'title': track_player_queue[i].title,
                        'artists': track_player_queue[i].artists,
                        'uid': track_player_queue[i].uid
                    })
            }
        } catch (error) { }
        return queue_items;
    }

    useTrackPlayerEvents([Event.PlaybackProgressUpdated, Event.PlaybackActiveTrackChanged, Event.PlaybackState], async(event) => {
        if(event.type === Event.PlaybackProgressUpdated){
            set_player_state_trackplayer({
                elapsed_time: event.position,
                duration_remaining: event.duration - event.position,
                volume: await TrackPlayer.getVolume(),
                rate: await TrackPlayer.getRate(),
                loop_track: await TrackPlayer.getRepeatMode() === RepeatMode.Track,
            });
        }
        else if(event.type === Event.PlaybackActiveTrackChanged){
            if(event.index === undefined) return;
            set_artist_data(GLOBALS.global_var.playing_tracks[event.index].artists[0]);
            set_player_state_metadata({
                title: GLOBALS.global_var.playing_tracks[event.index]?.title,
                artist: artist_string(GLOBALS.global_var.playing_tracks[event.index]),
                duration: event.track?.duration ?? 0,
                artwork: GLOBALS.global_var.playing_tracks[event.index]?.playback!.artwork,
                album: GLOBALS.global_var.playing_tracks[event.index]?.album,

            });
            if(now_playing_state.now_playing_visible) {
                set_now_playing_state({
                    now_playing_visible: true,
                    queue_data: await updated_queue_items()
                });
            }
            //     if(event.track?.artwork !== undefined){
            //         const colors = await getColors(event.track.artwork);
            //         if(colors.platform === "ios")
            //             set_sample_artwork_color(colors.primary);
            //     }
        }
        else if(event.type === Event.PlaybackState){
            set_player_state_type(event.state);
        }
    });

    async function remove_track_from_queue(item: IllusiveType.QueueTrack){
        const current_track_index = await TrackPlayer.getActiveTrackIndex();
        if(current_track_index === undefined) return;
        const global_index = GLOBALS.global_var.playing_tracks.slice(current_track_index).findIndex(track => track.uid === item.uid);
        if(global_index !== -1){
            GLOBALS.global_var.playing_tracks.splice(current_track_index + global_index, 1);
            const tp_queue = await TrackPlayer.getQueue();
            const tp_index = tp_queue.findIndex((track, i) => track.title === item.title && i >= current_track_index);
            if(tp_index !== -1) await TrackPlayer.remove([tp_index]);
        }
        set_now_playing_state({ 'now_playing_visible': true, 'queue_data': await updated_queue_items() });
    }

    const renderNowPlayingItem = (item: { item: IllusiveType.QueueTrack }) => <SongComponentQueue track_data={item.item} />;

    return (
        <SlidingUpPanel ref={panel_ref}
            allowDragging={!now_playing_state.now_playing_visible}
            showBackdrop={true}
            animatedValue={panel_animated}
            height={panel_max_height}
            friction={1}
            draggableRange={{ 'bottom': panel_min_height, 'top': panel_max_height }}
            snappingPoints={[panel_min_height, panel_max_height]}
            containerStyle={{ left: 0, right: 0, display: 'flex', zIndex: 10, top: '100%' }}
        // containerStyle={{ left: 0, right: 0, display: 'flex', zIndex: 10, top: '100%' }}
        >
            <>
                <Animated.View pointerEvents={panel_state.is_visible ? 'auto' : 'none'} style={{ backgroundColor: colors.playScreen, height: top_padding, opacity: interpolatePanelPosition([0, 1]) }} />
                {/* HEADER ---------------------------------------------------- */}
                <View style={styles.header}>
                    <Animated.View style={{
                        left: 25,
                        transform: [
                            { rotate: interpolatePanelPosition(['180deg', '0deg']) },
                        ]
                    }}>
                        <TouchableOpacity hitSlop={{ 'left': 20, 'top': 20, 'bottom': 20, 'right': 20 }} onPress={toggle_panel}>
                            <Ionicons name="chevron-down-sharp" size={20} color='#808080' />
                        </TouchableOpacity>
                    </Animated.View>
                    <TouchableOpacity style={{ alignItems: 'center', justifyContent: 'center', width: 250 }} disabled={panel_state.is_visible} onPress={() => panel_ref.current.show()}>
                        <Text style={{ color: '#808080', fontSize: 12, top: panel_state.is_visible ? -4 : 19 }} numberOfLines={1}>{panel_state.is_visible ? "PLAYING FROM" : remove_topic(player_state_metadata.artist)}</Text>
                        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: 'bold', top: panel_state.is_visible ? -2 : -15 }}> {panel_state.is_visible ? props.playing_from : player_state_metadata.title}</Text>
                    </TouchableOpacity>
                    {panel_state.is_visible ?
                        <TouchableOpacity hitSlop={{ 'left': 20, 'top': 20, 'bottom': 20, 'right': 20 }} style={{ top: 0, right: 20 }} onPress={async () => {
                            set_now_playing_state({ 'now_playing_visible': true, 'queue_data': await updated_queue_items() })
                        }}>
                            <Fontisto name="play-list" size={15} color={colors.primary} />
                        </TouchableOpacity> : null
                    }
                    {!panel_state.is_visible ?
                        <TouchableOpacity hitSlop={{ 'left': 20, 'top': 20, 'bottom': 20, 'right': 20 }} style={{ top: 0, right: 20 }} onPress={toggle_playing}>
                            <Ionicons name={player_state_type === State.Playing ? "pause-circle-sharp" : "play-circle-sharp"} size={30} color={colors.primary} />
                        </TouchableOpacity> : null
                    }
                </View>
                <Animated.View pointerEvents={panel_state.is_visible ? 'auto' : 'none'} style={{ flex: 1, backgroundColor: colors.playScreen, opacity: interpolatePanelPosition([0, 2]) }}>
                    {/* <Image source={player_state.artwork as number} height={220} style={{ backgroundColor: sample_artwork_color, width: "auto", opacity: 0.5, maxHeight: 220, minHeight: 220, resizeMode: "contain" }} /> */}
                    <Image source={player_state_metadata.artwork as number} height={220} style={{width: "auto", opacity: player_state_type === State.Buffering ? 0.7 : 0.8, maxHeight: 220, minHeight: 220,}}/>
                    {/* TIMESTAMPS & TIME----------------------------------------------------*/}
                    <View style={styles.timestampslidercontainer}>
                        <Slider
                            value={player_state_trackplayer.elapsed_time}
                            onValueChange={async (val) => { await TrackPlayer.seekTo(val[0]); }}
                            thumbTintColor={colors.primary}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor='#DADADAA0'
                            thumbStyle={{ width: 8, height: 8 }}
                            thumbTouchSize={{ width: 40, height: 40 }}
                            minimumValue={0}
                            maximumValue={player_state_metadata.duration}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 10, marginRight: 10, bottom: 30 }}>
                        <Text style={{ color: '#808080', fontSize: 12 }}>{time_to_timestamp(player_state_trackplayer.elapsed_time)}</Text>
                        <Text style={{ color: '#808080', fontSize: 12 }}>-{time_to_timestamp(player_state_trackplayer.duration_remaining)}</Text>
                    </View>
                    {/* TITLE & ARTIST ----------------------------------------------------*/}
                    <View style={styles.textcontainer}>
                        <TextTicker style={styles.title} scroll={false} duration={12000} bounce={false} easing={Easing.linear}>{player_state_metadata.title}</TextTicker>
                        <NavLink type='artist' text_style={styles.artist} text={remove_topic(player_state_metadata.artist)} uri={artist_data?.uri ?? ""} callforward={() => panel_ref.current.hide()}/>
                        <NavLink type='album' text_style={styles.artist} text={player_state_metadata.album?.name ?? ""} uri={player_state_metadata.album?.uri ?? ""} callforward={() => panel_ref.current.hide()}/>
                    </View>
                    {/* PLAY CONTROLS ----------------------------------------------------*/}
                    <View style={{ bottom: 20 }}>
                        <View style={styles.playbackcontainer}>
                            <TouchableOpacity onPress={reshuffle}>
                                <Ionicons name="shuffle-sharp" size={35} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={track_player_previous}>
                                <Ionicons name="play-back-sharp" size={35} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={toggle_playing}>
                                <Ionicons name={player_state_type === State.Playing ? "pause-circle-sharp" : "play-circle-sharp"} size={90} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={track_player_next}>
                                <Ionicons name="play-forward-sharp" size={35} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={async() => {await TrackPlayer.setRepeatMode(player_state_trackplayer.loop_track ? RepeatMode.Off : RepeatMode.Track)}}>
                                <Ionicons name="repeat-sharp" size={35} color={player_state_trackplayer.loop_track ? colors.primary : colors.inactive} />
                            </TouchableOpacity>
                        </View>
                        {/* VOLUME CONTROLS ----------------------------------------------------*/}
                        <View style={{top: 10}}>
                            <Ionicons name="volume-off-sharp" size={20} color='#656565' style={{ top: 30, left: 15 }} />
                            <View style={styles.volumeslidercontainer}>
                                <Slider
                                    value={player_state_trackplayer.volume}
                                    onValueChange={async (value) => { await TrackPlayer.setVolume(value[0] / 1); }}
                                    thumbTintColor={colors.primary}
                                    thumbStyle={{ width: 15, height: 15 }}
                                    thumbTouchSize={{ width: 40, height: 40 }}
                                    minimumTrackTintColor={colors.primary}
                                    maximumTrackTintColor='#DADADA40'
                                    maximumValue={1}
                                />
                            </View>
                            <Ionicons name="volume-high-sharp" size={20} color='#656565' style={{ bottom: 30, alignSelf: 'flex-end', right: 50 }} />
                            <AirPlayButton 
                                activeTintColor={colors.secondary}
                                tintColor={colors.primary}
                                prioritizesVideoDevices={false}
                                style={{ width: 20, height: 20, bottom: 50, alignSelf: 'flex-end', right: 15 }}
                            />
                            {/* <TouchableOpacity> */}
                                {/* <MaterialCommunityIcons name="cast-audio-variant" size={20} color='#656565' style={{ bottom: 50, alignSelf: 'flex-end', right: 15 }} /> */}
                            {/* </TouchableOpacity> */}

                        </View>
                        {/* EXTRA CONTROLS ----------------------------------------------------*/}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 15, marginRight: 15, top: 10 }}>
                            <TouchableOpacity onPress={async() => {
                                const current_track_index = await TrackPlayer.getActiveTrackIndex();
                                if(current_track_index === undefined) return;
                                set_add_to_playlist_state({ 'show': true, 'track_data': GLOBALS.global_var.playing_tracks[current_track_index]});
                            }}>
                                <View style={{ backgroundColor: colors.primary, height: 35, width: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text>+ Add</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {set_settings_state({ 'settings_visible': true })}}>
                                <SimpleLineIcons name="equalizer" size={28} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={async () => {
                                const current_track_index = await TrackPlayer.getActiveTrackIndex();
                                if(current_track_index === undefined) return;
                                const lyrics = await Illusive.get_track_lryics(GLOBALS.global_var.playing_tracks[current_track_index])
                                if(typeof lyrics === "object"){
                                    if(!lyrics.error.message.includes('YouTube')) {
                                        alert_error(lyrics);
                                        return;
                                    }
                                    return;
                                }
                                set_lyrics_state({ 'lyrics_visible': true, 'lyrics': lyrics });
                            }}>
                                <Ionicons name="mic-outline" size={28} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={share_track}>
                                <Ionicons name="share-outline" size={28} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
                <Modal animationType="slide"
                    transparent={false}
                    presentationStyle={'pageSheet'}
                    visible={now_playing_state.now_playing_visible}
                    onRequestClose={async () => {
                        set_now_playing_state({ now_playing_visible: !now_playing_state.now_playing_visible, queue_data: await updated_queue_items() });
                    }}>
                    <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                        <View style={{ marginLeft: 10 }}>
                            <Button color={colors.primary} title='close' onPress={() => { set_now_playing_state({ now_playing_visible: false, queue_data: [] }) }} />
                        </View>
                        <Text style={{ left: 85, color: "white", fontWeight: "bold", fontSize: 17 }}>Up Next</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.background }}>
                        <SwipeListView
                            data={now_playing_state.queue_data.slice(1)}
                            renderItem={renderNowPlayingItem}
                            ListHeaderComponent={() =>
                                <View style={{ flex: 1, width: '100%', height: 140 }}>
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', padding: 10 }}>Now Playing</Text>
                                    <SongComponentQueue track_data={now_playing_state.queue_data[0]}/>
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', padding: 10 }}>Up Next</Text>
                                </View>
                            }
                            renderHiddenItem={({item}) => (
                                <TouchableOpacity onPress={async () => remove_track_from_queue(item)} style={{ backgroundColor: "#FF2c00", flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
                                    <Ionicons name='trash-bin-outline' color={"white"} size={22} />
                                </TouchableOpacity>
                            )}
                            rightOpenValue={-75}
                            rightActionValue={-80}
                            rightActivationValue={-80}
                            disableRightSwipe
                        />
                    </View>
                </Modal>
                <Modal animationType="slide"
                    transparent={false}
                    presentationStyle={'pageSheet'}
                    visible={settings_state.settings_visible}
                    onRequestClose={() => {
                        set_settings_state({ 'settings_visible': !settings_state.settings_visible })
                    }}>
                    <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                        <View style={{ marginLeft: 10 }}>
                            <Button color={colors.primary} title='close' onPress={() => { set_settings_state({ 'settings_visible': false }) }} />
                        </View>
                        <Text style={{ left: 85, color: "white", fontWeight: "bold", fontSize: 17 }}>Settings</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.background }}>
                        <Text style={{ left: 17, top: 18, color: "white", fontWeight: "300", fontSize: 15 }}>Playback Speed:</Text>
                        <Text style={{ left: "34%", bottom: 0, color: "white", fontWeight: "bold", fontSize: 17 }}>{String(player_state_trackplayer.rate).slice(0, 4)}x</Text>
                        <MaterialCommunityIcons name="play-speed" size={20} color='#656565' style={{ top: 30, left: 15 }} />
                        <View style={styles.volumeslidercontainer}>
                            <Slider
                                value={player_state_trackplayer.rate}
                                onValueChange={async (value) => { await TrackPlayer.setRate((value[0])); set_player_state_trackplayer({...player_state_trackplayer, rate: value[0]}) }}
                                thumbTintColor={colors.primary}
                                thumbStyle={{ width: 15, height: 15 }}
                                thumbTouchSize={{ width: 40, height: 40 }}
                                minimumTrackTintColor={colors.primary}
                                maximumTrackTintColor='#DADADA40'
                                step={0.01}
                                maximumValue={2}
                            />
                        </View>
                    </View>
                </Modal>
                <Modal animationType="slide"
                    transparent={false}
                    presentationStyle={'pageSheet'}
                    visible={lyrics_state.lyrics_visible}
                    onRequestClose={() => {
                        set_lyrics_state({ 'lyrics_visible': !lyrics_state.lyrics_visible, 'lyrics': lyrics_state.lyrics })
                    }}>
                    <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                        <View style={{ marginLeft: 10 }}>
                            <Button color={colors.primary} title='close' onPress={() => { set_lyrics_state({ 'lyrics_visible': false, 'lyrics': lyrics_state.lyrics}) }} />
                        </View>
                        <Text style={{ left: 85, color: "white", fontWeight: "bold", fontSize: 17 }}>Lyrics</Text>
                    </View>
                    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
                        { is_empty(lyrics_state.lyrics) ? 
                            <Text style={styles.lyrics_text}>Unable to find lyrics for this song</Text>
                            : lyrics_state.lyrics
                            .split('\n')
                            .map(line => /\[.+?\]/.test(line) ? '' : line)
                            .map((line, i) => (
                                <Text key={line + i} style={styles.lyrics_text}>
                                    {line}
                                </Text>
                        ))}
                    </ScrollView>
                </Modal>
                <AddToPlaylistsModal set_modal_data={set_add_to_playlist_state} modal_data={add_to_playlist_state} callback={() => {}}/>
            </>
        </SlidingUpPanel>
    )
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    topcontainer: {
        flex: 1,
        backgroundColor: colors.playScreen
    },
    header: {
        backgroundColor: colors.playScreen,
        height: 45,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row'
    },
    topfrom: {
        color: '#808080',
        fontSize: 12,
        top: -4
    },
    toptitle: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        top: -2
    },
    timestampslidercontainer: {
        alignItems: 'stretch',
        justifyContent: 'center',
        bottom: 20
    },
    textcontainer: {
        justifyContent: 'flex-start',
        alignItems: 'center',
        bottom: 0,
        height: 100,
        marginLeft: 40,
        marginRight: 40
    },
    tsstyle: {
        color: '#808080'
    },
    title: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    artist: {
        color: '#808080'
    },
    playbackcontainer: {
        justifyContent: 'space-evenly',
        alignItems: 'center',
        flexDirection: 'row'
    },
    volumeslidercontainer: {
        marginLeft: 40,
        marginRight: 80,
    },
    lyrics_text: {
        color: colors.text,
        fontWeight: 'bold',
        width: "85%",
        fontSize: 24,
        margin: 15,
        marginVertical: 10
    }
});
export default AudioPlayer;