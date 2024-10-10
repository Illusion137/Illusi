import { Entypo, Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActionSheetIOS, Button, Image } from 'react-native';

import { illusi_startup } from './lib-origin/Illusive/src/illusi/src/startup';
import * as GLOBALS from './lib-origin/Illusive/src/illusi/src/globals';
import { filter_play_tracks } from './lib-origin/Illusive/src/illusi/src/play';
import { Prefs } from './lib-origin/Illusive/src/prefs';
import { PlayingState, Track } from './lib-origin/Illusive/src/types';
import GlobalStateProvider from './app/components/GlobalContext';
import ExtraBatchDownloaderScreen from './app/screens/extra/ExtraBatchDownloaderScreen';
import ExtraDeveloperScreen from './app/screens/extra/ExtraDeveloperScreen';
import ExternalServicesScreen from './app/screens/extra/ExtraExternalServicesScreen';
import ExtraLinkerScreen from './app/screens/extra/ExtraLinkerScreen';
import ExtraPlaylistConverter from './app/screens/extra/ExtraPlaylistConverter';
import ExtraRecoveryScreen from './app/screens/extra/ExtraRecoveryScreen';
import ExtraSettingsScreen from './app/screens/extra/ExtraSettingsScreen';
import ExtraScreen from './app/screens/ExtraScreen';
import LibraryScreen from './app/screens/LibraryScreen';
import Artist from './app/screens/other/Artist';
import AudioPlayer from './app/screens/other/AudioPlayer';
import SelectImportMusicServicePlaylist from './app/screens/playlist/SelectImportMusicServicePlaylist';
import ImportMusicServicePlaylist from './app/screens/playlist/ImportMusicServicePlaylist';
import Playlist from './app/screens/playlist/Playlist';
import PlaylistAddSearch from './app/screens/playlist/PlaylistAddSearch';
import PlaylistScreen from './app/screens/PlaylistScreen';
import SearchHomeScreen from './app/screens/SearchHomeScreen';
import AddToPlaylistBase from './app/screens/playlist/AddToPlaylistBase';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ExtrasStack = createNativeStackNavigator();

function ExtrasStackScreen() {
    return (
        <ExtrasStack.Navigator screenOptions={{ headerShown: true }}>
            <ExtrasStack.Screen name="Extra" component={ExtraScreen} options={{ headerShown: false }} />
            <ExtrasStack.Screen name="Backup, Recover & Transfer" component={ExtraRecoveryScreen} />
            <ExtrasStack.Screen name="Settings" component={ExtraSettingsScreen} />
            <ExtrasStack.Screen name="External Services" component={ExternalServicesScreen} />
            <ExtrasStack.Screen name="Batch Downloader" component={ExtraBatchDownloaderScreen} options={{}} />
            <ExtrasStack.Screen name="Linker" component={ExtraLinkerScreen} />
            <ExtrasStack.Screen name="Playlist Converter" component={ExtraPlaylistConverter} />
            {/* <ExtrasStack.Screen name="Backpack" component={ExtraBackpackScreen} /> */}
            <ExtrasStack.Screen name="Developer" component={ExtraDeveloperScreen} />
        </ExtrasStack.Navigator>
    );
}

const PlaylistsStack = createNativeStackNavigator();

function PlaylistsStackScreen() {
    return (
        <PlaylistsStack.Navigator screenOptions={{ headerShown: false }}>
            <PlaylistsStack.Screen options={{ headerShown: false }} name="PlaylistScreen" component={PlaylistScreen}/>
            <PlaylistsStack.Screen options={{ headerShown: false }} name="Playlist" component={Playlist as any} />
            <PlaylistsStack.Screen options={{ headerShown: false }} name="Artist" component={Artist} />
            <PlaylistsStack.Screen options={{ headerShown: false }} name="AddToPlaylistBase" component={AddToPlaylistBase as any}/>
        </PlaylistsStack.Navigator>
    );
}


function Tabs() {
    return (
        <Tab.Navigator initialRouteName={'My Library'}
            screenOptions={{
                headerShown: false, tabBarActiveTintColor: Prefs.dark_theme.colors.primary, tabBarInactiveTintColor: Prefs.dark_theme.colors.tabInactive,
                tabBarActiveBackgroundColor: Prefs.dark_theme.colors.background, tabBarInactiveBackgroundColor: Prefs.dark_theme.colors.background, tabBarStyle: { backgroundColor: Prefs.dark_theme.colors.background, height: 90, zIndex: 1 }
            }}
            detachInactiveScreens={true}>
            <Tab.Screen name="My Library" component={LibraryScreen}
                options={{
                    tabBarIcon: ({ color }) => (<Ionicons name="library-sharp" size={30} color={color} />),
                    unmountOnBlur: false,
                }}
            />
            <Tab.Screen name="Playlists" component={PlaylistsStackScreen}
                options={{
                    tabBarIcon: ({ color }) => (<Ionicons name="musical-notes" size={25} color={color} />),
                    unmountOnBlur: true,
                }}
            />
            <Tab.Screen name="Search" component={SearchHomeScreen}
                options={{
                    tabBarIcon: ({ color }) => (<Ionicons name="search" size={25} color={color} />),
                    unmountOnBlur: false,
                }}
            />
            <Tab.Screen name="Extras" component={ExtrasStackScreen}
                options={{
                    tabBarIcon: ({ color }) => (<Entypo name="dots-three-horizontal" size={25} color={color} />),
                }}
            />
        </Tab.Navigator>
    )
}

export default function App() {
    const [playing_tracks, set_playing_tracks] = useState<Track[]>([]);
    const [playing_from, set_playing_from] = useState("");
    const [is_playing, set_is_playing] = useState<PlayingState>("OFF");
    const [is_loading, set_is_loading] = useState(true);

    useEffect(() => {
        (async function () {
            await illusi_startup(play_tracks);
            set_is_loading(false);
        })();
    }, []);
    useEffect(() => {
        if (is_playing == "LOADING") {
            set_is_playing("ON");
            GLOBALS.global_var.is_playing = true;
        }
    }, [is_playing])

    function play_tracks(start_track: Track, tracks: Track[], title: string) {
        tracks = filter_play_tracks(start_track, tracks, title);
        if (tracks.length === 0) return;
        set_playing_tracks(tracks);
        set_playing_from(title);
        set_is_playing("LOADING");
    }
    return (
        <GlobalStateProvider>
            <NavigationContainer theme={Prefs.dark_theme}>
                {is_loading && <Image style={{ flex: 1, backgroundColor: 'black', width: '100%', height: '100%' }} source={require('./assets/splash.png')} />}
                {is_playing == "ON" && <AudioPlayer tracks={playing_tracks} playing_from={playing_from} />}
                {!is_loading && <Stack.Navigator>
                    <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
                    <Stack.Screen name="Add To Playlist" component={PlaylistAddSearch} options={{ headerShown: true }} />
                    <Stack.Screen name="Backup & Recovery" component={ExtraRecoveryScreen} />
                    <Stack.Screen name="Settings" component={ExtraSettingsScreen} />
                    <Stack.Screen name="SelectImportMusicServicePlaylist" component={SelectImportMusicServicePlaylist}
                        options={(_) => ({
                            headerShown: true, headerStyle: { backgroundColor: Prefs.dark_theme.colors.background, }, headerTitleStyle: { fontWeight: '500', color: '#FFFFFF' }, headerTintColor: Prefs.dark_theme.colors.primary,
                            headerRight: () => (<Button color='#808080' onPress={() => { }} title="Next" />),
                        })}
                    />
                    <Stack.Screen name="ImportMusicServicePlaylist" component={ImportMusicServicePlaylist} options={(_) => ({
                        headerShown: true, headerStyle: { backgroundColor: Prefs.dark_theme.colors.background, }, headerTitleStyle: { fontWeight: '500', color: '#FFFFFF' }, headerTintColor: 'blue',
                        headerRight: () => (
                            <Button
                                color='#1313ff'
                                onPress={() => ActionSheetIOS.showActionSheetWithOptions({ options: ['Cancel', 'Save Playlist', 'Add Tracks To Library'], cancelButtonIndex: 0, userInterfaceStyle: 'dark', }, (_) => { })}
                                title="Save" />)
                    })}
                    />
                </Stack.Navigator>}
            </NavigationContainer>
        </GlobalStateProvider>
    );
}