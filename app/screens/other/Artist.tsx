// import React,  { useState, useRef, useEffect } from 'react';
// import { View, StyleSheet, Animated, Image, FlatList, ActionSheetIOS, Text, TouchableOpacity, Linking, Alert } from "react-native";
// import { AntDesign, Ionicons, MaterialCommunityIcons,FontAwesome } from "@expo/vector-icons";
// import { NavigationProp, useTheme } from '@react-navigation/native';
// import { useNavigation } from "@react-navigation/native";
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import TrackComponent from '../../components/TrackComponent';
// import BigList from "react-native-big-list";
// import { useIsFocused } from '@react-navigation/native';
// import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
// import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
// import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
// import { EditMode, NamedUUID, Route, Track } from '../../../lib-origin/Illusive/src/types';
// import * as Types from '../../../lib-origin/Illusive/src/types';

import { Route } from "../../../lib-origin/Illusive/src/types";

// import FourTrackArtwork from '../../components/FourTrackArtwork';
// import { default_playlists } from '../../../lib-origin/Illusive/src/illusi/src/default_playlists';
// import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
// import { cycle, music_service_uri_to_music_service, playlist_duration_to_string, split_uri } from '../../../lib-origin/Illusive/src/illusive_utilts';
// import { ExampleObj } from '../../../lib-origin/Illusive/src/illusi/src/example_objs';
// import { is_empty } from '../../../lib-origin/origin/src/utils/util';

export default function Artist(params: {route: Route<unknown>}){
    return (
        <>
        </>
    )
}

// const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
//     topContainer:{
//         flex: 1,
//         backgroundColor: colors.background
//     },
//     header:{
//         top: 60,
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginHorizontal: 10,
//         zIndex: 1
//     },
//     playlistListHeader:{
//         top: 50,
//         alignItems: 'center'
//     },
//     infoText:{
//         color: '#FFFFFF',
//         fontSize: 20,
//         fontWeight: 'bold'
//     },
//     playlistButtonsContainer:{
//         flexDirection: 'row',
//         top: 30,
//         marginBottom: 100
//     },
//     playlistButton:{
//         borderRadius: 20, 
//         backgroundColor: '#1a184f',
//         marginHorizontal: 10,
//         width: 40, height: 40, 
//         justifyContent: 'center', 
//         alignItems: 'center'
//     }
// });