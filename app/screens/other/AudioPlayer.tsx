import { Fontisto, Ionicons, MaterialCommunityIcons, SimpleLineIcons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { useTheme } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Button, Dimensions, Easing, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import TextTicker from 'react-native-text-ticker';
import TrackPlayer, { Event, RepeatMode, State, Track, useTrackPlayerEvents } from 'react-native-track-player';
import SlidingUpPanel from 'rn-sliding-up-panel';

import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { is_empty } from '../../../lib-origin/origin/src/utils/util';
import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
import { illusive_track_to_track_player_track, setup_track_player, track_player_next, track_player_previous } from '../../../lib-origin/Illusive/src/illusi/src/track_player_service';
import * as IllusiveType from '../../../lib-origin/Illusive/src/types';
import NavLink from '../../components/NavLink';
import SongComponentQueue from '../../components/SongComponentQueue';

interface PlayerStateType {
    title?: string,
    artist?: string,
    artwork?: IllusiveType.Artwork,
    duration?: number,
    elapsed_time?: number,
    duration_remaining?: number,
    volume?: number,
    rate?: number,
    is_playing?: boolean,
    loop_track?: boolean,
};

let panel_animated_value = 0;
function AudioPlayer(props: {
    tracks: IllusiveType.Track[],
    playing_from: string
}) {
    const { colors } = useTheme() as typeof Prefs.dark_theme;
    const styles = theme_styles(colors);
    const panel_ref = useRef<SlidingUpPanel>() as React.MutableRefObject<SlidingUpPanel>;


    const [panelState, setPanelState] = useState({
        is_visible: true,
    });
    const [nowPlayingState, setNowPlayingState] = useState({
        now_playing_visible: false,
        queue_data: props.tracks as IllusiveType.QueueTrack[],
    });
    const [settingsState, setSettingsState] = useState({
        settings_visible: false,
    });
    const [artist_data, set_artist_data] = useState<IllusiveType.NamedUUID>();
    const [playerState, setPlayerState] = useState({
        title: props.tracks[0]?.title,
        artist: props.tracks[0]?.artists.map(artist => artist.name).join(", "),
        artwork: props.tracks[0]?.playback!.artwork,
        duration: props.tracks[0]?.duration ?? 0,
        elapsed_time: 0,
        duration_remaining: props.tracks[0]?.duration ?? 0,
        volume: 1,
        rate: 1,
        is_playing: false,
        loop_track: false,
    });

    const panel_min_height = 180;
    const panel_max_height = Dimensions.get('screen').height;
    const panel_animated = new Animated.Value(panel_min_height);
    panel_animated.addListener(({ value }) => panel_animated_value = value);

    function updatePlayerState(updated_state: PlayerStateType) {
        const player_state_copy = playerState;
        setPlayerState({
            title: updated_state.title ?? player_state_copy.title,
            artist: updated_state.artist ?? player_state_copy.artist,
            artwork: updated_state.artwork ?? player_state_copy.artwork,
            duration: updated_state.duration ?? player_state_copy.duration,
            elapsed_time: updated_state.elapsed_time ?? player_state_copy.elapsed_time,
            duration_remaining: updated_state.duration_remaining ?? player_state_copy.duration_remaining,
            volume: updated_state.volume ?? player_state_copy.volume,
            rate: updated_state.rate ?? player_state_copy.rate,
            is_playing: updated_state.is_playing ?? player_state_copy.is_playing,
            loop_track: updated_state.loop_track ?? player_state_copy.loop_track,
        });
    }

    function interpolatePanelPosition(output_range: any[]) {
        return panel_animated.interpolate({ 'inputRange': [panel_min_height, panel_max_height], 'outputRange': output_range, 'extrapolate': 'clamp' });
    }

    async function shareTrack() {
        try {
            const UTI = 'public.item';
            const current_track = await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack() as number);
            const illusi_track = await SQLActions.track_from_uid((current_track as Track).id);
            if (illusi_track.media_uri)
                await Sharing.shareAsync(FileSystem.documentDirectory + illusi_track.media_uri, { UTI });
            else if (!is_empty(illusi_track.youtube_id))
                await Sharing.shareAsync(`https://www.youtube.com/watch?v=${illusi_track.youtube_id}`);

        } catch (error) {
            Alert.alert("error", String(error));
        }
    }

    useEffect(() => {
        async function setup() {
            panel_ref.current?.show();
            const is_setup = await setup_track_player();
            await TrackPlayer.reset();
            const queue = await TrackPlayer.getQueue();
            if (is_setup && queue.length <= 0) {
                GLOBALS.global_var.playing_track_index = 0;
                GLOBALS.global_var.playing_tracks = props.tracks;
                for (let i = 0; i < props.tracks.length; i++) {
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
        setup();
    }, []);

    const togglePlaying = useCallback(async () => {
        const player_state = await TrackPlayer.getState();
        const player_state_copy = playerState;
        updatePlayerState({ is_playing: !player_state_copy.is_playing });

        if (player_state == State.Playing) await TrackPlayer.pause();
        else await TrackPlayer.play();
    }, []);

    function togglePanel() {
        if (panelState.is_visible) panel_ref.current.hide();
        else panel_ref.current.show();
    }

    function timeToTimestamp(time_seconds: number): string {
        const time_ms = Math.floor(time_seconds * 1000);
        const time_min = Math.floor(time_ms / 60000);
        const time_sec = Math.floor((time_ms - time_min * 60000) / 1000);

        return String(time_min).padStart(2, '0') + ':' + String(time_sec).padStart(2, '0');
    }

    async function getUpdatedQueueItems() {
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

    useTrackPlayerEvents([Event.PlaybackProgressUpdated], async event => {
        const player_state = await TrackPlayer.getPlaybackState();
        set_artist_data(GLOBALS.global_var.playing_tracks[event.track].artists[0]);
        updatePlayerState({
            title: GLOBALS.global_var.playing_tracks[event.track]!.title,
            artist: GLOBALS.global_var.playing_tracks[event.track]!.artists?.[0].name,
            duration: event.duration,
            artwork: GLOBALS.global_var.playing_tracks[event.track].playback!.artwork,
            elapsed_time: event.position,
            duration_remaining: event.duration - event.position,
            is_playing: player_state.state === State.Playing,
            volume: await TrackPlayer.getVolume(),
            rate: await TrackPlayer.getRate(),
            loop_track: await TrackPlayer.getRepeatMode() === RepeatMode.Track
        })
    })
    useEffect(() => {
        const interval = setInterval(async () => {
            setPanelState({ 'is_visible': panel_animated_value > 181 })
        }, 100);

        return () => {
            clearInterval(interval);
        };
    },);

    const renderNowPlayingItem = (item: { item: IllusiveType.QueueTrack }) => <SongComponentQueue track_data={item.item} />;

    return (
        <SlidingUpPanel ref={panel_ref}
            allowDragging={!nowPlayingState.now_playing_visible}
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
                <Animated.View pointerEvents={panelState.is_visible ? 'auto' : 'none'} style={{ backgroundColor: colors.playScreen, height: 45, opacity: interpolatePanelPosition([0, 1]) }} />
                {/* HEADER ---------------------------------------------------- */}
                <View style={styles.header}>
                    <Animated.View style={{
                        left: 25,
                        transform: [
                            { rotate: interpolatePanelPosition(['180deg', '0deg']) },
                        ]
                    }}>
                        <TouchableOpacity hitSlop={{ 'left': 20, 'top': 20, 'bottom': 20, 'right': 20 }} onPress={togglePanel}>
                            <Ionicons name="chevron-down-sharp" size={20} color='#808080' />
                        </TouchableOpacity>
                    </Animated.View>
                    <TouchableOpacity style={{ alignItems: 'center', justifyContent: 'center', width: 250 }} disabled={panelState.is_visible} onPress={() => panel_ref.current.show()}>
                        <Text style={{ color: '#808080', fontSize: 12, top: panelState.is_visible ? -4 : 19 }}>{panelState.is_visible ? "PLAYING FROM" : playerState.artist}</Text>
                        <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: 'bold', top: panelState.is_visible ? -2 : -15 }}> {panelState.is_visible ? props.playing_from : playerState.title}</Text>
                    </TouchableOpacity>
                    {panelState.is_visible ?
                        <TouchableOpacity hitSlop={{ 'left': 20, 'top': 20, 'bottom': 20, 'right': 20 }} style={{ top: 0, right: 20 }} onPress={async () => {
                            setNowPlayingState({ 'now_playing_visible': true, 'queue_data': await getUpdatedQueueItems() })
                        }}>
                            <Fontisto name="play-list" size={15} color={colors.primary} />
                        </TouchableOpacity> : null
                    }
                    {!panelState.is_visible ?
                        <TouchableOpacity hitSlop={{ 'left': 20, 'top': 20, 'bottom': 20, 'right': 20 }} style={{ top: 0, right: 20 }} onPress={togglePlaying}>
                            <Ionicons name={playerState.is_playing ? "pause-circle-sharp" : "play-circle-sharp"} size={30} color={colors.primary} />
                        </TouchableOpacity> : null
                    }
                </View>
                <Animated.View pointerEvents={panelState.is_visible ? 'auto' : 'none'} style={{ flex: 1, backgroundColor: colors.playScreen, opacity: interpolatePanelPosition([0, 2]) }}>
                    <Image source={playerState.artwork as number} height={220} style={{ width: "auto", opacity: 0.5, maxHeight: 220, minHeight: 220 }} />
                    {/* <Image source={playerState.artwork as ImageSourcePropType} height={220} style={{width: "auto", opacity: 0.5}}/> */}
                    {/* TIMESTAMPS & TIME----------------------------------------------------*/}
                    <View style={styles.timestampslidercontainer}>
                        <Slider
                            value={playerState.elapsed_time}
                            onValueChange={async (val) => { await TrackPlayer.seekTo(val[0]); }}
                            thumbTintColor={colors.primary}
                            minimumTrackTintColor={colors.primary}
                            maximumTrackTintColor='#DADADAA0'
                            thumbStyle={{ width: 8, height: 8 }}
                            thumbTouchSize={{ width: 40, height: 40 }}
                            minimumValue={0}
                            maximumValue={playerState.duration}
                        />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 10, marginRight: 10, bottom: 30 }}>
                        <Text style={{ color: '#808080', fontSize: 12 }}>{timeToTimestamp(playerState.elapsed_time)}</Text>
                        <Text style={{ color: '#808080', fontSize: 12 }}>-{timeToTimestamp(playerState.duration_remaining)}</Text>
                    </View>
                    {/* TITLE & ARTIST ----------------------------------------------------*/}
                    <View style={styles.textcontainer}>
                        <TextTicker style={styles.title} scroll={false} duration={12000} bounce={false} easing={Easing.linear}>{playerState.title}</TextTicker>
                        <NavLink text_style={styles.artist} text={playerState.artist} uri={artist_data?.uri ?? ""} />
                    </View>
                    {/* PLAY CONTROLS ----------------------------------------------------*/}
                    <View style={{ bottom: 40 }}>
                        <View style={styles.playbackcontainer}>
                            <TouchableOpacity onPress={() => { }}>
                                <Ionicons name="shuffle-sharp" size={35} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={track_player_previous}>
                                <Ionicons name="play-back-sharp" size={35} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={togglePlaying}>
                                <Ionicons name={playerState.is_playing ? "pause-circle-sharp" : "play-circle-sharp"} size={90} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={track_player_next}>
                                <Ionicons name="play-forward-sharp" size={35} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { }}>
                                <Ionicons name="repeat-sharp" size={35} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        {/* VOLUME CONTROLS ----------------------------------------------------*/}
                        <View>
                            <Ionicons name="volume-off-sharp" size={20} color='#656565' style={{ top: 30, left: 15 }} />
                            <View style={styles.volumeslidercontainer}>
                                <Slider
                                    value={playerState.volume}
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
                            <TouchableOpacity>
                                <MaterialCommunityIcons name="cast-audio-variant" size={20} color='#656565' style={{ bottom: 50, alignSelf: 'flex-end', right: 15 }} />
                            </TouchableOpacity>

                        </View>
                        {/* EXTRA CONTROLS ----------------------------------------------------*/}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginLeft: 15, marginRight: 15 }}>
                            <TouchableOpacity>
                                <View style={{ backgroundColor: colors.primary, height: 35, width: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text>+ Add</Text>
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { }}>
                                <SimpleLineIcons name="equalizer" size={28} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={async () => {
                                // await getLyrics(title);
                            }}>
                                <Ionicons name="mic-outline" size={28} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={shareTrack}>
                                <Ionicons name="share-outline" size={28} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
                <Modal animationType="slide"
                    transparent={false}
                    presentationStyle={'pageSheet'}
                    visible={nowPlayingState.now_playing_visible}
                    onRequestClose={async () => {
                        setNowPlayingState({ now_playing_visible: !nowPlayingState.now_playing_visible, queue_data: await getUpdatedQueueItems() });
                    }}>
                    <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                        <View style={{ marginLeft: 10 }}>
                            <Button color={colors.primary} title='close' onPress={() => { setNowPlayingState({ now_playing_visible: false, queue_data: [] }) }} />
                        </View>
                        <Text style={{ left: 85, color: "white", fontWeight: "bold", fontSize: 17 }}>Up Next</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.background }}>
                        <SwipeListView
                            data={nowPlayingState.queue_data.slice(1)}
                            renderItem={renderNowPlayingItem}
                            ListHeaderComponent={() =>
                                <View style={{ flex: 1, width: '100%', height: 140 }}>
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', padding: 10 }}>Now Playing</Text>
                                    <SongComponentQueue track_data={nowPlayingState.queue_data[0]}/>
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '700', padding: 10 }}>Up Next</Text>
                                </View>
                            }
                            renderHiddenItem={({item}) => (
                                <TouchableOpacity onPress={async () => {
                                    const current_track_index = await TrackPlayer.getActiveTrackIndex();
                                    if(current_track_index === undefined) return;
                                    const global_index = GLOBALS.global_var.playing_tracks.slice(current_track_index).findIndex(track => track.uid === item.uid);
                                    if(global_index !== -1)
                                        GLOBALS.global_var.playing_tracks.splice(current_track_index + global_index, 1);
                                    const tp_queue = await TrackPlayer.getQueue();
                                    const tp_index = tp_queue.findIndex(track => track.title === item.title);
                                    if(tp_index !== -1) await TrackPlayer.remove([tp_index]);
                                    setNowPlayingState({ 'now_playing_visible': true, 'queue_data': await getUpdatedQueueItems() });
                                }} style={{ backgroundColor: "#FF2c00", flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
                                    <Ionicons name='trash-bin-outline' color={"white"} size={22} />
                                </TouchableOpacity>
                            )}
                            rightOpenValue={-75}
                            rightActionValue={-80}
                            rightActivationValue={-80}
                            disableRightSwipe
                        />
                        {/* <BigList style={{height: '71%'}} data={nowPlayingState.queue_data.slice(1)}
							renderItem={renderNowPlayingItem}
							keyExtractor={(item, index) => String(index)}
							itemHeight={61}
							headerHeight={140}
							renderFooter={undefined}
							renderHeader={() => 
							<View style={{flex: 1, width: '100%', height: 140}}>
								<Text style={{color: 'white', fontSize: 16, fontWeight: '700', padding: 10}}>Now Playing</Text>
								<SongComponentQueue track_data={nowPlayingState.queue_data[0]}/>
								<Text style={{color: 'white', fontSize: 16, fontWeight: '700', padding: 10}}>Up Next</Text>
							</View>}
						/> */}
                    </View>
                </Modal>
                <Modal animationType="slide"
                    transparent={false}
                    presentationStyle={'pageSheet'}
                    visible={settingsState.settings_visible}
                    onRequestClose={() => {
                        setSettingsState({ 'settings_visible': !settingsState.settings_visible })
                    }}>
                    <View style={{ width: "100%", height: 55, backgroundColor: colors.shelf, justifyContent: 'flex-start', alignItems: 'center', borderTopLeftRadius: 10, borderTopRightRadius: 10, flexDirection: "row" }} >
                        <View style={{ marginLeft: 10 }}>
                            <Button color={colors.primary} title='close' onPress={() => { setSettingsState({ 'settings_visible': false }) }} />
                        </View>
                        <Text style={{ left: 85, color: "white", fontWeight: "bold", fontSize: 17 }}>Settings</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.background }}>
                        <Text style={{ left: 17, top: 18, color: "white", fontWeight: "300", fontSize: 15 }}>Playback Speed</Text>
                        <MaterialCommunityIcons name="play-speed" size={20} color='#656565' style={{ top: 30, left: 15 }} />
                        <View style={styles.volumeslidercontainer}>
                            <Slider
                                value={playerState.rate}
                                onValueChange={async (value) => { await TrackPlayer.setRate((value[0])) }}
                                thumbTintColor={colors.primary}
                                thumbStyle={{ width: 15, height: 15 }}
                                thumbTouchSize={{ width: 40, height: 40 }}
                                minimumTrackTintColor={colors.primary}
                                maximumTrackTintColor='#DADADA40'
                                maximumValue={2}
                            />
                        </View>
                        <Text style={{ left: 300, bottom: 35, color: "white", fontWeight: "bold", fontSize: 17 }}>{playerState.rate}x</Text>
                    </View>
                </Modal>
            </>
        </SlidingUpPanel>
    )
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
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
    }
});
export default AudioPlayer;