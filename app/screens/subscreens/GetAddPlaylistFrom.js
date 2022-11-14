
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, FlatList, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponentSearch from '../../components/SongComponentSearch';

function GetAddPlaylistFrom({route}) {

	const inputRef = useRef()
	const navigation = useNavigation();

	const [isDoneSearching, setSearch] = useState(false)
	const [data, setData] = useState('')
	
	const sendURL = encodeURIComponent(route.params.url)
	const service = route.params.title.toString().split(' ')[1]
	function getAPI(){
		switch(service){
			case('Spotify'):
				return 'spotify-to-youtube'
			case('Amazon'):
				return 'amazonmusic-to-youtube'
			default:
				console.log('noAPI')
				return null
		}
	}
	const api = getAPI();

	// console.log(sendURL)

	useEffect(() => {
		function setHeader() {
			navigation.setOptions({title: route.params.title})
		}
		setHeader();
		const search = async() => { 
			setData('');
				try {
					const response = await fetch(`http://illusion.wiki:8080/api/illusi/fetch/${api}/${sendURL}`);
					const json = await response.json();
					let libdata = await AsyncStorage.getItem('Library');
					let datas = [];
					let dat = libdata.toString().split('::').forEach(d => {
						datas.push(JSON.parse(d));
					});
					if(datas != null || datas != '' || datas != undefined){
						json.forEach(newVideo => {
							newVideo['saved'] = false;
							newVideo['downloaded'] = false;
							datas.forEach(video => {
								// console.log(video.id + ':' + newVideo.id)
								if(video.id == newVideo.id){
									if(video.saved){
										newVideo['saved'] = true;
									}
									if(video.downloaded){
										newVideo['downloaded'] = true;
									} else{
										newVideo['downloaded'] = false;
									}
								}
							})
						});
					}
					setData(json);
				} catch (error) {
					console.log(error);
				  }
				// console.log(data);
				
				if(data == null){
					console.log('Error in search');
					return;
				}
				setSearch(true)
		}
		search().catch(console.error)
	}, []);

	const renderItem = ({ item }) => (
		// data = await AsyncStorage.getItem('Library');
		<SongComponentSearch id={item.id} imguri={`https://img.youtube.com/vi/${item.id}/mqdefault.jpg`} title={item.title} artist={item.artist} saved={item.saved} downloaded={item.downloaded}/>
	);

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1,}}>
			{ !isDoneSearching && <Text style={{color: 'white', fontSize: 25, top: 250, textAlign: 'center'}} >Play Ad Here While Fetching Data</Text>}
			{ isDoneSearching && <View style={styles.searchview}>
				<FlatList data={data} renderItem={renderItem}/>
			</View>}
		</View>
	);
}
const styles = StyleSheet.create({
	nameinput:{
		backgroundColor: '#121212',
		height: 60,
		color: 'white',
		width: '100%',
		padding: 10,
	},
	enterittext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 10
	},
	looksliketext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 15
	},
	exlinktext:{
		color: '#909090',
		marginHorizontal: 10
	},
	searchview:{
		backgroundColor: '#000000',
		top: 0,
		height: '100%'
	}
});
export default GetAddPlaylistFrom;