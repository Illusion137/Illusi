import { Entypo, Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, useTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Button, Image } from 'react-native';

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
import AudioPlayer from './app/screens/other/AudioPlayer';
import SelectImportMusicServicePlaylist from './app/screens/playlist/SelectImportMusicServicePlaylist';
import Playlist from './app/screens/playlist/Playlist';
import PlaylistScreen from './app/screens/PlaylistScreen';
import SearchHomeScreen from './app/screens/SearchHomeScreen';
import AddToPlaylistBase from './app/screens/playlist/AddToPlaylistBase';
import ExtraSleepTimerScreen from './app/screens/extra/ExtraSleepTimerScreen';
import ExtraBackpackScreen from './app/screens/extra/ExtraBackpackScreen';
import EditPlaylist from './app/screens/playlist/EditPlaylist';
import ExtraExperimentalSettingsScreen from './app/screens/extra/ExtraExperimentalSettingsScreen';
import ExtraMiscSettingsScreen from './app/screens/extra/ExtraMiscSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ExtrasStack = createNativeStackNavigator();
function ExtrasStackScreen() {
    return (
        <ExtrasStack.Navigator screenOptions={{ headerShown: true }}>
            <ExtrasStack.Screen name="Extra" component={ExtraScreen} options={{ headerShown: false }} />
            <ExtrasStack.Screen name="Backup, Recover & Transfer" component={ExtraRecoveryScreen} />
            <ExtrasStack.Screen name="Sleep Timer" component={ExtraSleepTimerScreen} />
            <ExtrasStack.Screen name="Settings" component={ExtraSettingsScreen} />
            <ExtrasStack.Screen name="Miscellaneous Settings" component={ExtraMiscSettingsScreen} />
            <ExtrasStack.Screen name="Experimental Settings" component={ExtraExperimentalSettingsScreen} />
            <ExtrasStack.Screen name="External Services" component={ExternalServicesScreen} />
            <ExtrasStack.Screen name="Batch Downloader" component={ExtraBatchDownloaderScreen} options={{}} />
            <ExtrasStack.Screen name="Linker" component={ExtraLinkerScreen} />
            <ExtrasStack.Screen name="Playlist Converter" component={ExtraPlaylistConverter} />
            <ExtrasStack.Screen name="Backpack" component={ExtraBackpackScreen} />
            <ExtrasStack.Screen name="Developer" component={ExtraDeveloperScreen} />
        </ExtrasStack.Navigator>
    );
}

const PlaylistsStack = createNativeStackNavigator();
function PlaylistsStackScreen() {
    return (
        <PlaylistsStack.Navigator screenOptions={{ headerShown: false }}>
            <PlaylistsStack.Screen options={{ headerShown: false }} name="PlaylistScreen" component={PlaylistScreen}/>
            <PlaylistsStack.Screen name="SelectImportMusicServicePlaylist" component={SelectImportMusicServicePlaylist}
                        options={(_) => ({
                            headerShown: true, headerStyle: { backgroundColor: Prefs.dark_theme.colors.background, }, headerTitleStyle: { fontWeight: '500', color: '#FFFFFF' }, headerTintColor: Prefs.dark_theme.colors.primary,
                            headerRight: () => (<Button color='#808080' onPress={() => { }} title="Next" />),
                        })}
                    />
            <PlaylistsStack.Screen options={{ headerShown: true }} name="Edit Playlist" component={EditPlaylist as any} />
            <PlaylistsStack.Screen options={{ headerShown: false }} name="Playlist" component={Playlist as any} />
            <PlaylistsStack.Screen options={{ headerShown: false }} name="AddToPlaylistBase" component={AddToPlaylistBase as any}/>
        </PlaylistsStack.Navigator>
    );
}

const SearchStack = createNativeStackNavigator();
function SearchStackScreen() {
    return (
        <SearchStack.Navigator screenOptions={{ headerShown: false }}>
            <SearchStack.Screen options={{ headerShown: false }} name="SearchHome" component={SearchHomeScreen}/>
            <SearchStack.Screen options={{ headerShown: false }} name="Playlist" component={Playlist as any} />
        </SearchStack.Navigator>
    );
}
function Tabs() {
    const theme = useTheme() as Prefs.Theme;
    return (
        <Tab.Navigator initialRouteName={'My Library'}
            screenOptions={{
                headerShown: false, tabBarActiveTintColor: theme.colors.primary, tabBarInactiveTintColor: theme.colors.tabInactive,
                tabBarActiveBackgroundColor: theme.colors.background, tabBarInactiveBackgroundColor: theme.colors.background, tabBarStyle: { backgroundColor: theme.colors.background, height: 90, zIndex: 1 }
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
            <Tab.Screen name="Search" component={SearchStackScreen}
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
    const [theme, set_theme] = useState<Prefs.Theme>(Prefs.get_theme(Prefs.get_pref('theme')));
    const [playing_tracks, set_playing_tracks] = useState<Track[]>([]);
    const [playing_from, set_playing_from] = useState("");
    const [is_playing, set_is_playing] = useState<PlayingState>("OFF");
    const [is_loading, set_is_loading] = useState(true);

    useEffect(() => {
        (async function () {
            await illusi_startup(play_tracks, set_theme);
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
            <NavigationContainer theme={theme}>
                {is_loading && <Image style={{ flex: 1, backgroundColor: 'black', width: '100%', height: '100%' }} source={require('./assets/splash.png')} />}
                {is_playing == "ON" && <AudioPlayer tracks={playing_tracks} playing_from={playing_from} />}
                {!is_loading && <Stack.Navigator>
                    <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false,  }} />
                    <Stack.Screen name="Backup & Recovery" component={ExtraRecoveryScreen} />
                    <Stack.Screen name="Settings" component={ExtraSettingsScreen} />
                </Stack.Navigator>}
            </NavigationContainer>
        </GlobalStateProvider>
    );
}