import React, {useEffect,useState} from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, Alert } from 'react-native';
import { useNavigation,useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as GLOBALS from '../../globals';

import * as SQLActions from '../../SQLActions';


function SelectPlaylist(props) {
	const navigation = useNavigation();

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const [pinned, setPinned] =  useState(props.pinned);
	const [selected, setSelected] =  useState(GLOBALS.selectedPlaylists.has(props.title));

	return(
        <>      
            <TouchableOpacity style={styles.button} onPress={() => {let _selected = !selected; setSelected(_selected); 
                if(_selected){
                    GLOBALS.selectedPlaylists.add(props.title)
                }else{
                    GLOBALS.selectedPlaylists.delete(props.title)
                }
                }}>
                <>
                    {props.four_track.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
                    {props.four_track.length != 0 && props.four_track.length < 4 && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[0].video_id}/maxresdefault.jpg`}} style={styles.notfound}/>}
                    {props.four_track.length >= 4 &&<View>
							<View style={{flexDirection: 'row'}}>
								{props.four_track[0]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[0].video_id}/maxresdefault.jpg`}} style={{width: 35, height: 35, left: 15, borderTopLeftRadius: 5}}/>}
								{props.four_track[1]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[1].video_id}/maxresdefault.jpg`}} style={{width: 35, height: 35, left: 15, borderTopRightRadius: 5}}/>}
							</View>
							<View style={{flexDirection: 'row'}}>
								{props.four_track[2]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[2].video_id}/maxresdefault.jpg`}} style={{width: 35, height: 35, left: 15, borderBottomLeftRadius: 5}}/>}
								{props.four_track[3]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[3].video_id}/maxresdefault.jpg`}} style={{width: 35, height: 35, left: 15, borderBottomRightRadius: 5}}/>}
							</View>
						</View>}
                        <View style={{flexDirection: 'column', left: 25}}>
                            <Text style={{color: '#FFFFFF', fontSize:15}}>{props.title}</Text>
                            <View style={{flexDirection: 'row', top: 5}}>
                                {pinned && <MaterialIcons name="push-pin" size={22} color={colors.primary} style={styles.icon}/>}
                                <Text style={{color: '#AAAAAA'}}>{props.track_count} Tracks</Text>
                            </View>
                        </View>
                        <View style={{flex:1, justifyContent: 'flex-end', alignItems: 'center'}}>
                            <Ionicons name={'checkmark'} size={22} color={selected ? colors.green : "#808080"} style={{ left: 80}}/>
                        </View>
                    </>
                </TouchableOpacity>
            <View style={{width:'100%', height: 1, marginLeft:90, backgroundColor: '#303030'}}/>
        </>
	);
}
const themeStyles = (colors) => StyleSheet.create({
	button:{
		width: '100%',
		height: 80, 
		alignItems: 'flex-start',
        alignItems: 'center',
        backgroundColor: colors.track,
        flexDirection: 'row'
	},
    notfound:{
		width:70,
		height:70,
		borderRadius: 5,
        left: 15
	}
});
export default SelectPlaylist;