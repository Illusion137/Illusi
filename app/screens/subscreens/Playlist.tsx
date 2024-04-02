import React,  { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Image, FlatList, ActionSheetIOS, Text, TouchableOpacity, Linking, Alert } from "react-native";
import { AntDesign, Ionicons, MaterialCommunityIcons,FontAwesome } from "@expo/vector-icons";
import { NavigationProp, useTheme } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponent from '../../components/TrackComponent';
import BigList from "react-native-big-list";
import { useIsFocused } from '@react-navigation/native';
import * as Prefs from '../../../Preferences'
import * as GLOBALS from '../../../globals';
import * as SQLActions from '../../../SQLActions';
import { EditMode, Route, Track } from '../../../types';
import FourTrackArtwork from '../../components/FourTrackArtwork';

export default function Playlist({route}){
    const ts_route = route as Route<{title: string}>

    const navigation: NavigationProp<any, any> = useNavigation();
    const { colors } = useTheme();
	const styles = themeStyles(colors);

    const [tracks, setTracks] = useState([] as Track[]);
    const [block, setBlock] = useState(false);
    const [editMode, seteditMode] = useState("NONE" as EditMode);
    const [duration, setDuration] = useState("");
    const actions = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "Edit Playlist"],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
        userInterfaceStyle: 'dark'
      },
      buttonIndex => {
        if (buttonIndex === 0) {
            // cancel action
        }else if (buttonIndex === 1) {
            let edit_mode = editMode;
            switch(edit_mode){
                case "NONE": edit_mode = "DOWNLOAD"; break;
                case "DOWNLOAD": edit_mode = "DELETE"; break;
                case "DELETE": edit_mode = "EDIT"; break;
                case "EDIT": edit_mode = "NONE"; break;
                default: break;
            }
            seteditMode(edit_mode);
        }
      }
    );
    const is_focused = useIsFocused();

    useEffect( () => {
        if(is_focused){
            refreshData();
        }
	}, [is_focused]);
    async function refreshData(){
        let playlist_tracks = [] as Track[];
        if(ts_route.params.title == "Recently Added"){
            const t = [...GLOBALS.global_var.SQLTracks]
            playlist_tracks = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
        }
        else if(ts_route.params.title == "Downloads"){
            const t = [...GLOBALS.global_var.SQLTracks].filter(item=>item.downloaded || item.imported)
            playlist_tracks = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
        }
        else if(ts_route.params.title == "Recently Played"){
            const t = await SQLActions.getRecentlyPlayedData();
            playlist_tracks = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
        }
        else{
            playlist_tracks = await SQLActions.getPlaylistTracks(ts_route.params.title);
            setBlock(true);
        }
        setTracks(playlist_tracks);

        try {
            if(playlist_tracks.length === 0){ 
                setDuration("> 1m"); 
                return; 
            }
            const duration = playlist_tracks.map(({video_duration}) => video_duration).reduce(function(prev, cur) {
                return prev + cur;
            })
            if(duration/3600 >= 1){
                setDuration(Math.floor(duration/3600).toString() + 'h ' + Math.floor((duration % 3600) / 60).toString() + 'm');
            }else if(duration/60 >= 1){
                setDuration(Math.floor(duration/60).toString() + 'm');
            }else{
                setDuration("> 1m")
            }
        } catch (error) {
            Alert.alert("Error",error)
        }
    } 

    function playShuffle(dat){
        let newData = [...dat]
		let currentIndex = newData.length, randomIndex;

		if(Prefs.prefs.settings.only_play_downloaded)
            newData = newData.filter(item => item.downloaded || item.imported);

        while (currentIndex != 0) {

            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;

            [newData[currentIndex], newData[randomIndex]] = [
                newData[randomIndex], newData[currentIndex]];
        }
        
        GLOBALS.global_var.playTracks(newData[0], newData, ts_route.params.title);
	}

	const renderTracks = ({ item }) => (
		<SongComponent track_data={item} from={ts_route.params.title} edit_mode={editMode} playlist_from={ts_route.params.title} refreshData={refreshData.bind(this)}/>
	);
	const headerComponent = () => (
		<View style={styles.playlistListHeader}>
            <FourTrackArtwork four_track={tracks} size={75}/>
            <View style={{top: 15, alignItems: 'center'}}>
                <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'}}>{ts_route.params.title}</Text>
                <Text style={{color: '#808080', fontSize: 12}}>{tracks.length} tracks • {duration}</Text>
            </View>
            <View style={styles.playlistButtonsContainer}>
                {block && <TouchableOpacity style={styles.playlistButton} onPress={() => {
                    navigation.navigate('Add To Playlist', {write_playlist: ts_route.params.title })
                }}>
                    <Ionicons name="add" size={35} color={colors.primary} style={{left:1}}/>
                </TouchableOpacity>}
                {block && <TouchableOpacity style={styles.playlistButton} onPress={() => {}}>
                    <MaterialCommunityIcons name="pencil" size={25} color={colors.primary}/>
                </TouchableOpacity>}
                {block && <TouchableOpacity style={styles.playlistButton} onPress={() => {}}>
                    <FontAwesome name="share" size={25} color={colors.primary}/>
                </TouchableOpacity>}
            </View>
            <TouchableOpacity onPress={async() => {
                playShuffle(tracks);
            }} style={{backgroundColor: colors.primary, width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', bottom: 20}}><Ionicons name="shuffle" size={25} color='#000000' style={{}}/>
            <Text style={{fontWeight: '500', fontSize: 15}}>Shuffle Play</Text></TouchableOpacity>
        </View>	
    );
    const footerComponent = () => (
        <View style={{height:100}}></View>
    );

    return(
        <View style={styles.topContainer}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <AntDesign name="left" size={30} color={colors.primary}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={actions}>
                    <Ionicons name="ellipsis-horizontal-outline" size={40} color={colors.primary}/>
                </TouchableOpacity>
            </View>
            <View style={{height: '94%'}}>                
                <BigList style={{backgroundColor: colors.background}} 
                headerHeight={400} 
                renderHeader={headerComponent} 
                data={tracks}
                renderItem={renderTracks} 
                itemHeight={61} 
                renderFooter={footerComponent} 
                footerHeight={50}>
                </BigList>
            </View>
        </View>
    );
}

const themeStyles = (colors) => StyleSheet.create({
    topContainer:{
        flex: 1,
        backgroundColor: colors.background
    },
    header:{
        top: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 10,
        zIndex: 1
    },
    playlistListHeader:{
        top: 50,
        alignItems: 'center'
    },
    infoText:{
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold'
    },
    playlistButtonsContainer:{
        flexDirection: 'row',
        top: 30,
        marginBottom: 100
    },
    playlistButton:{
        borderRadius: 20, 
        backgroundColor: '#1a184f',
        marginHorizontal: 10,
        width: 40, height: 40, 
        justifyContent: 'center', 
        alignItems: 'center'
    }
});