import React,  { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Image, FlatList, ActionSheetIOS, Text, TouchableOpacity, Linking, Alert } from "react-native";
import { AntDesign, Ionicons, MaterialCommunityIcons,FontAwesome } from "@expo/vector-icons";
import { useTheme } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponent from '../../components/SongComponent';
import BigList from "react-native-big-list";
import { useIsFocused } from '@react-navigation/native';
import * as Prefs from '../../../Preferences'
import * as GLOBALS from '../../../globals';
import * as SQLActions from '../../../SQLActions';

function PlaylistSubScreen({route}){

    const navigation = useNavigation();
    const { colors } = useTheme();
	const styles = themeStyles(colors);

    const playlistInfo = route.params.playlistInfo;

    const [data, setData] = useState([]);
    const [block, setBlock] = useState(false);
    const [editMode, seteditMode] = useState(0);
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
            let toggle = editMode
            if(toggle == 0){
                toggle = 2
            }else{
                toggle = 0
            }
            seteditMode(toggle)
        }
      }
    );
    const isFocused = useIsFocused();

    useEffect( () => {
		(async function() {
            if(isFocused){ 
                let trackData = [];
                if(route.params.title == "Recently Added"){
                    let t = [...GLOBALS.SQLTracks]
                    trackData = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
                }
                else if(route.params.title == "Downloads"){
                    let t = [...GLOBALS.SQLTracks].filter(item=>item.downloaded || item.imported)
                    trackData = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
                }
                else if(route.params.title == "Recently Played"){
                    let t = await SQLActions.getRecentlyPlayedData();
                    trackData = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
                }
                else{
                    trackData = await SQLActions.getPlaylistTracks(route.params.title.replaceAll(' ','_'));
                    setBlock(true);
                }
                setData(trackData);

                try {
                    if(trackData.length == 0){setDuration("> 1m"); return}
                    let duration = trackData.map(({video_duration}) => video_duration).reduce(function(prev, cur) {
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
		})();
	}, [isFocused]);
    async function refreshData(){
        let trackData = [];
        if(route.params.title == "Recently Added"){
            let t = [...GLOBALS.SQLTracks]
            trackData = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
        }
        else if(route.params.title == "Downloads"){
            let t = [...GLOBALS.SQLTracks].filter(item=>item.downloaded || item.imported)
            trackData = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
        }
        else if(route.params.title == "Recently Played"){
            let t = await SQLActions.getRecentlyPlayedData();
            trackData = t.reverse().slice(0,Prefs.prefs.settings.default_playlists_size);
        }
        else{
            trackData = await SQLActions.getPlaylistTracks(route.params.title.replaceAll(' ','_'));
            setBlock(true);
        }
        setData(trackData);

        try {
            if(trackData.length == 0){setDuration("> 1m"); return}
            let duration = trackData.map(({video_duration}) => video_duration).reduce(function(prev, cur) {
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
	const renderTracks = ({ item }) => (
		<SongComponent disabled={Prefs.prefs.settings.edit_mode_disables_playing && (editMode !== 0)} artwork={item.artwork} imported={item.imported} media_URI={item.media_URI} video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} duration={item.video_duration} downloaded={item.downloaded} thumbnail_URI={item.thumbnail_URI} youtube={item.youtube} amazonmusic={item.amazonmusic} spotify={item.spotify} soundcloud={item.soundcloud} uid={item.uid} setPlaying={route.params?.setPlaying} from={route.params.title} editMode={editMode} playlistFrom={route.params.title} refreshData={refreshData.bind(this)}/>
	);
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
        
        route.params.setPlaying(newData, route.params.title);
	}
    return(
        <View style={styles.topContainer}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <AntDesign name="left" size={30} color={colors.primary}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={actions}>
                    <Ionicons name="ellipsis-horizontal-outline" size={40} color={colors.primary}/>
                </TouchableOpacity>
                {/* <Ionicons name="search" size={22} color='#808080' style={styles.icon}/> */}
            </View>
            <View style={{height: '94%'}}>                
                <BigList style={{backgroundColor: colors.background}} headerHeight={400} ListHeaderComponent={(
                    <View style={styles.playlistListHeader}>
                        {data.length == 0 && <Image source={require('../../../assets/notfound.png')} style={{width: 150, height: 150}}/>}
                        {data.length !== 0 && data.length < 4 && <Image source={data[0].artwork} style={{width: 150, height: 150}}/>}
                        {data.length >= 4 && <View>
                            <View style={{flexDirection: 'row'}}>
                                {data[0] != undefined && <Image source={data[0].artwork} style={{width: 75, height: 75}}/>}
                                {data[1] != undefined && <Image source={data[1].artwork} style={{width: 75, height: 75}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {data[2] != undefined && <Image source={data[2].artwork} style={{width: 75, height: 75}}/>}
                                {data[3] != undefined && <Image source={data[3].artwork} style={{width: 75, height: 75}}/>}
                            </View>
                        </View>}
                        <View style={{top: 15, alignItems: 'center'}}>
                            <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'}}>{route.params.title}</Text>
                            <Text style={{color: '#808080', fontSize: 12}}>{data.length} tracks • {duration}</Text>
                        </View>
                        <View style={styles.playlistButtonsContainer}>
                            {block && <TouchableOpacity style={styles.playlistButton} onPress={() => {
                                navigation.navigate('Add To Playlist', {writePlaylist: route.params.title })
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
                            playShuffle(data)
                        }} style={{backgroundColor: colors.primary, width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', bottom: 20}}><Ionicons name="shuffle" size={25} color='#000000' style={{}}/>
                        <Text style={{fontWeight: '500', fontSize: 15}}>Shuffle Play</Text></TouchableOpacity>
                    </View>
                )} data={data} renderItem={renderTracks} itemHeight={61} ListFooterComponent={(<View style={{height:50}}></View>)} footerHeight={50}>
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

export default PlaylistSubScreen;