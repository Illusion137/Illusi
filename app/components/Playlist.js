import React, {useEffect} from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button } from 'react-native';
import { useNavigation } from '@react-navigation/native';

function Playlist(props) {
	const navigation = useNavigation();

    // useEffect( () => {
	// 	(async function() {
	// 		let storage = await AsyncStorage.getItem(props.title);
	// 		if (storage == null){
	// 			setData([]);
	// 			return;
	// 		}
	// 		let playlists = [];
	// 		storage.toString().split('::').forEach(d => {
	// 			playlists.push(JSON.parse(d));
	// 		});
	// 		setData(playlists);
	// 	})();
	// }, []);

	return(
        <>
			<TouchableOpacity style={styles.button} onPress={async() => { navigation.navigate('PlaylistSubScreen', {playlistInfo: props.playlistInfo }) } }>
                <>
                    <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>
                    <View style={{flexDirection: 'column', left: 25}}>
                        <Text style={{color: '#FFFFFF', fontSize:15}}>{props.title}</Text>
                        <View style={{flexDirection: 'row', top: 5}}>
                            {props.pinned && <MaterialIcons name="push-pin" size={22} color='#424ed4' style={styles.icon}/>}
                            <Text style={{color: '#AAAAAA'}}>{props.length} Tracks</Text>
                        </View>
                    </View>
                </>
            </TouchableOpacity>
            <View style={{width:'100%', height: 1, marginLeft:90, backgroundColor: '#303030'}}/>
        </>
	);
}
const styles = StyleSheet.create({
	button:{
		width: '100%',
		height: 80, 
		alignItems: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#000000',
        flexDirection: 'row'
	},
    notfound:{
		width:70,
		height:70,
		borderRadius: 5,
        left: 15
	}
});
export default Playlist;