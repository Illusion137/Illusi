import React,  { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Image, FlatList, ActionSheetIOS, Text, TouchableOpacity, Linking } from "react-native";
import { AntDesign, Ionicons, MaterialCommunityIcons,FontAwesome } from "@expo/vector-icons";
import { useTheme } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponent from '../../components/SongComponent';
import BigList from "react-native-big-list";

function PlaylistSubScreen({route}){
    const navigation = useNavigation();
    const { colors } = useTheme();
	const styles = themeStyles(colors);

    const playlistInfo = route.params.playlistInfo;

    const [data, setData] = useState(playlistInfo.tracks);
    const [editMode, seteditMode] = useState(0);
    const [duration, setDuration] = useState("");
    const actions = () =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel","Export Playlist To YouTube" , "Clear Tracks", "Edit Playlist"],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 0,
        userInterfaceStyle: 'dark'
      },
      buttonIndex => {
        if (buttonIndex === 0) {
            // cancel action
        }else if (buttonIndex === 1) {
            console.log('Export Playlist To YouTube')
            let base = 'http://www.youtube.com/watch_videos?video_ids='
            let allIds = playlistInfo.tracks.map(({video_id}) => video_id).filter(item=> item != '0').slice(0,50)
            for(let i = 0; i < allIds.length; i++){
                if(i == allIds.length-1){
                    base += allIds[0]
                }
                else{
                    base += (allIds[0] + ',')
                }
            }
            base+='&disable_polymer=true'
            // console.log(base)
            Linking
            .openURL( base  )
        }else if (buttonIndex === 2) {
            console.log('Clear Tracks')
        }else if (buttonIndex === 3) {
            let toggle = editMode
            if(toggle == 0){
                toggle = 2
            }else{
                toggle = 0
            }
            seteditMode(toggle)
            // console.log('Toggle Edit Playlist')
        }
      }
    );
    useEffect( () => {
		(async function() {
            if(playlistInfo.tracks.length == 0){setDuration("> 1m"); return}
            let duration = playlistInfo.tracks.map(({video_duration}) => video_duration).reduce(function(prev, cur) {
                return prev + cur;
            })
            if(duration/3600 >= 1){
                setDuration(Math.floor(duration/3600).toString() + 'h ' + Math.floor((duration % 3600) / 60).toString() + 'm');
            }else if(duration/60 >= 1){
                setDuration(Math.floor(duration/60).toString() + 'm');
            }else{
                setDuration("> 1m")
            }
            // console.log(parsedStorage[pIndex].playlistInfo.tracks)
		})();
	}, []);
	const renderTracks = ({ item }) => (
		<SongComponent video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} downloaded={item.downloaded} uuid={item.uuid} setPlaying={route.params?.setPlaying} from={playlistInfo.title} editMode={editMode}/>
	);
    function playShuffle(){
		if(route.params.setPlaying == undefined){
			return
		}
		let newData = [...data]
		let currentIndex = newData.length, randomIndex;
        
		while (currentIndex != 0) {
            
            randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;
            
			[newData[currentIndex], newData[randomIndex]] = [
                newData[randomIndex], newData[currentIndex]];
            }
            // console.log(newData[0])
		route.params.setPlaying(newData, playlistInfo.title);
        // console.log('end')
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
            <View style={{height: '83%'}}>                
                <BigList style={{backgroundColor: '#121212'}} headerHeight={400} ListHeaderComponent={(
                    <View style={styles.playlistListHeader}>
                        {playlistInfo.tracks.length == 0 && <Image source={require('../../../assets/notfound.png')} style={{width: 150, height: 150}}/>}
                        <View>
                            <View style={{flexDirection: 'row'}}>
                                {playlistInfo.tracks[2]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${playlistInfo.tracks[2].video_id}/mqdefault.jpg`}} style={{width: 75, height: 75}}/>}
                                {playlistInfo.tracks[3]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${playlistInfo.tracks[3].video_id}/mqdefault.jpg`}} style={{width: 75, height: 75}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {playlistInfo.tracks[0]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${playlistInfo.tracks[0].video_id}/mqdefault.jpg`}} style={{width: 75, height: 75}}/>}
                                {playlistInfo.tracks[1]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${playlistInfo.tracks[1].video_id}/mqdefault.jpg`}} style={{width: 75, height: 75}}/>}
                            </View>
                        </View>
                        <View style={{top: 15, alignItems: 'center'}}>
                            <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'}}>{playlistInfo.title}</Text>
                            <Text style={{color: '#808080', fontSize: 12}}>{playlistInfo.tracks.length} tracks • {duration}</Text>
                        </View>
                        <View style={styles.playlistButtonsContainer}>
                            {playlistInfo.block == undefined && <TouchableOpacity style={styles.playlistButton} onPress={() => {
                                navigation.navigate('Add To Playlist', {writePlaylist: playlistInfo.title })
                            }}>
                                <Ionicons name="add" size={35} color={colors.primary}/>
                            </TouchableOpacity>}
                            {/* {playlistInfo.block == undefined && <TouchableOpacity style={styles.playlistButton} onPress={() => {}}>
                                <MaterialCommunityIcons name="pencil" size={25} color={colors.primary}/>
                            </TouchableOpacity>}
                            <TouchableOpacity style={styles.playlistButton} onPress={() => {}}>
                                <FontAwesome name="share" size={25} color={colors.primary}/>
                            </TouchableOpacity> */}
                        </View>
                        <TouchableOpacity onPress={async() => {
                            playShuffle(playlistInfo.tracks)
                        }} style={{backgroundColor: '#424ed4', width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', bottom: 20}}><Ionicons name="shuffle" size={25} color='#000000' style={{}}/>
                        <Text style={{fontWeight: '500', fontSize: 15}}>Shuffle Play</Text></TouchableOpacity>
                    </View>
                )} data={data} renderItem={renderTracks} itemHeight={61}>
                </BigList>
            </View>
            <View style={{backgroundColor: '#202020', width: '100%', height: 110}}></View>
        </View>
    );
}

const themeStyles = (colors) => StyleSheet.create({
    topContainer:{
        flex: 1,
        backgroundColor: '#121212'
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