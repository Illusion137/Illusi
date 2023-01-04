import React,  { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Image, FlatList, ActionSheetIOS, Text, TouchableOpacity } from "react-native";
import { AntDesign, Ionicons, MaterialCommunityIcons, FontAwesome, createIconSetFromFontello } from "@expo/vector-icons";
import { useTheme } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native";
import SlidingUpPanel from 'rn-sliding-up-panel';
import PlaylistAddSearch from './PlaylistAddSearch'
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponent from '../../components/SongComponent';

function PlaylistSubScreen({route}){
    const navigation = useNavigation();
    const { colors } = useTheme();
	const styles = themeStyles(colors);

    const playlistInfo = route.params.playlistInfo;

    const [data, setData] = useState([]);
    const [editMode, seteditMode] = useState(0);

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
        }else if (buttonIndex === 2) {
            console.log('Clear Tracks')
        }else if (buttonIndex === 3) {
            console.log('Edit Playlist')
        }
      }
    );
    useEffect( () => {
		(async function() {
            let storage = await AsyncStorage.getItem('Playlists')
            let parsedStorage = JSON.parse(storage)
            let pIndex = parsedStorage.findIndex((item, i) => {return item.playlistInfo.title == playlistInfo.title})
            setData(parsedStorage[pIndex].playlistInfo.tracks)
		})();
	}, []);
	const renderTracks = ({ item }) => (
		<SongComponent key={item.video_id} video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} downloaded={item.downloaded} uuid={item.uuid} setPlaying={route?.params?.setPlaying} from={"My Library"} editMode={editMode}/>
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
                {/* <Ionicons name="search" size={22} color='#808080' style={styles.icon}/> */}
            </View>
            <FlatList style={{backgroundColor: '#121212'}} ListHeaderComponent={(
                <View style={styles.playlistListHeader}>
                    <Image source={require('../../../assets/notfound.png')} style={{width: 150, height: 150}}/>
                    <View style={{top: 15, alignItems: 'center'}}>
                        <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'}}>{playlistInfo.title}</Text>
                        <Text style={{color: '#808080', fontSize: 12}}>{playlistInfo.trackLength} tracks • {playlistInfo.trackDuration} Mins</Text>
                    </View>
                    <View style={styles.playlistButtonsContainer}>
                        <TouchableOpacity style={styles.playlistButton} onPress={() => {
                            navigation.navigate('Add To Playlist', {writePlaylist: playlistInfo.title })
                        }}>
                            <Ionicons name="add" size={35} color={colors.primary}/>
                        </TouchableOpacity>
                        {/* <TouchableOpacity style={styles.playlistButton} onPress={() => {}}>
                            <MaterialCommunityIcons name="pencil" size={25} color={colors.primary}/>
                        </TouchableOpacity> */}
                        {/* <TouchableOpacity style={styles.playlistButton} onPress={() => {}}>
                            <FontAwesome name="share" size={25} color={colors.primary}/>
                        </TouchableOpacity> */}
                    </View>
                </View>
            )} data={data} renderItem={renderTracks}>
            </FlatList>
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