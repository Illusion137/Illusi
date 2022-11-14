import React,  { useState, useRef } from 'react';
import { View, Animated, Text, StyleSheet, Image, TouchableOpacity, TextInput, TouchableHighlight, ActionSheetIOS, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SlidingUpPanel from 'rn-sliding-up-panel';
import AddPlaylist from './subscreens/AddPlaylist';


function PlaylistScreen(props) {
	const [data, setData] = useState('');
	const addPlaylistPanelRef = useRef();
	const addPlaylistRef = useRef();


	const renderItem = ({ item }) => (
		<SongComponent imguri={item.thumbnailURI} title={item.title} artist={item.artist} />
	);
	function hide(){
		addPlaylistPanelRef.current.hide();
	}
	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>

					<TouchableOpacity>
						<Ionicons name="swap-vertical-sharp" size={25} color='#424ed4' style={{right:110}}/>
					</TouchableOpacity>
					<Text style={styles.toptext}>Playlists</Text>
					<TouchableOpacity onPress={() => { 
							addPlaylistPanelRef.current.show();
							InteractionManager.runAfterInteractions(() => {
								addPlaylistRef.current.focusInput(); 
							});
						 }}>
						<Ionicons name="add" size={25} color='#424ed4' style={{left: 110}}/>
					</TouchableOpacity>
				</View>
				<View style={styles.searchcontainer}>
					<Ionicons name="search" size={22} color='#808080' style={styles.icon}/>
					<TextInput placeholder='Search Playlists' placeholderTextColor='#808080' style={styles.searchinput} onChangeText={() => Search()}></TextInput>
				</View>
			</View>
			<View style={styles.defaultContainer}>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={() => console.log('Pressed!')}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Recently Added</Text>
					<Image source={require('../../assets/notfound.png')} style={styles.notfound}/>
					</View>
				</TouchableHighlight>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={() => console.log('Pressed!')}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Downloads</Text>
					<Image source={require('../../assets/notfound.png')} style={styles.notfound}/>
					</View>
				</TouchableHighlight>
				<TouchableHighlight style={styles.defaultPlaylistButton} onPress={() => console.log('Pressed!')}>
					<View style={{justifyContent: 'center', alignItems: 'center'}}>
						<Text style={styles.defaultPlaylistText}>Recently Played</Text>
						{/* <View>
							<View style={{flexDirection: 'row'}}>
								<Image source={{uri: 'https://img.youtube.com/vi/pujfWflGk8k/mqdefault.jpg'}} style={styles.images}/>
								<Image source={{uri: 'https://img.youtube.com/vi/pujfWflGk8k/mqdefault.jpg'}} style={styles.images}/>
							</View>
							<View style={{flexDirection: 'row'}}>
								<Image source={{uri: 'https://img.youtube.com/vi/pujfWflGk8k/mqdefault.jpg'}} style={styles.images}/>
								<Image source={{uri: 'https://img.youtube.com/vi/pujfWflGk8k/mqdefault.jpg'}} style={styles.images}/>
							</View>
						</View> */}
					<Image source={require('../../assets/notfound.png')} style={styles.notfound}/>

					</View>
				</TouchableHighlight>
			</View>
			<View style={{width: '100%', height: 1, backgroundColor: '#808080', marginLeft: 30, marginRight: 30}}/>
			{data ==! null && <FlatList style={{height: '71%'}} data={data} renderItem={renderItem}/>}

			<SlidingUpPanel draggableRange={{top:660, bottom: 0}} ref={addPlaylistPanelRef} animatedValue={new Animated.Value(0)}>
				<AddPlaylist ref={addPlaylistRef} panelref={hide.bind()}/>
			</SlidingUpPanel>
		</View>
	);
}
const styles = StyleSheet.create({
	topcontainer:{
		backgroundColor: '#000000',
		flex: 1,
	},
	header:{
		backgroundColor: '#121212',
		width: '100%',
		height: '18%',
		top: 0,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	toptext:{
		color: '#FFFFFF',
		fontSize: 18,
		fontWeight: '500'
	},
	searchinput:{
		backgroundColor: '#303030',
		color: 'white',
		width: '90%',
		bottom: 10,
		padding: 10,
		borderTopRightRadius: 10,// Top Right Corner
		borderBottomRightRadius: 10, // Bottom Right Corner
	},
	searchcontainer:{
		justifyContent: 'center',
		height: '24%',
		left:-5,
		width: '100%',
		flexDirection: 'row'
	},
	icon:{
		overflow: 'hidden',
		backgroundColor: '#303030',
		paddingTop: 5,
		paddingLeft: 5,
		paddingRight: 5,
		bottom: 10,
		left: 10,
		borderRadius:10,
		zIndex: 1
	},
	defaultPlaylistText:{
		color:'#FFFFFF', 
		fontSize: 18, 
		fontWeight: 'bold', 
		textAlign:'center',
		position: 'absolute',
		zIndex: 1
	},
	defaultPlaylistButton:{
		backgroundColor: '#121212', 
		height: 110, 
		width: 110,
		borderRadius: 5,
		margin: 5,
		justifyContent: 'center'
	},
	defaultContainer:{
		margin: 5,
		flexDirection: 'row'
	},
	images:{
		width: 55, 
		height: 55, 
		aspectRatio:1, 
		resizeMode: 'cover',
	},
	notfound:{
		width:110,
		height:110,
		borderRadius: 5
	}

});
export default PlaylistScreen;