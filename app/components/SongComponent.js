import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';


function SongComponent(props) {
	const route = useRoute();
	const navigation = useNavigation();
	
	const id = props.video_id;
	const duration = props.video_duration;
	const imported = props.imported;

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	return (
		<TouchableOpacity onPress={ async ()=>{
			let data = await AsyncStorage.getItem('Library');
			if (data == null){
				return;
			}
			let datas = [];
			let ids = [];
			data.split('::').forEach(d => {
				datas.push(JSON.parse(d));
			});
			datas.forEach(d=>{
				ids.push(d.id)
			})                                     
			Array.prototype.swapItems = function(a, b){
				this[a] = this.splice(b, 1, this[a])[0];
				return this;
			}
			let idIndex = ids.indexOf(id)
			ids.swapItems(0, idIndex);
			
			props.setPlaying(ids, props.from);
			// navigation.navigate('PlayVideo', { id:ids, playlist:route.name }); 
			} } >
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={{uri:`https://img.youtube.com/vi/${id}/mqdefault.jpg`}} style={styles.image}></Image>
				</View>
				<View style={styles.text}>
					<Text style={styles.title} numberOfLines={1} >{props.video_name}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.video_creator}</Text>
					<View style={{flexDirection: 'row'}}>
						{!props.imported && <Ionicons name="logo-youtube" size={15} color={colors.primary} style={styles.icon}/>}
						{props.imported && <Ionicons name="cloud-upload" size={15} color={colors.primary} style={styles.icon}/>}
						{props.downloaded && <Ionicons name="save-outline" size={15} color='#00AAFF' style={styles.icon}/>}
					</View>
				</View>
			</View>
			<View style={styles.line}/>
		</TouchableOpacity>
	);
}

const themeStyles = (colors) => StyleSheet.create({
	songbox:{
		width: '100%',
		height: 60,
		flexDirection: 'row',
	},
	image:{
		left: 10,
		height: '80%',
		width: 65,
		borderRadius: 5
	},
	text:{
		width: '70%',
		top: 5,
		left: 20
	},
	title:{
		color: '#D0D0D0',
		fontSize:15,
	},
	artist:{
		color: '#808080',
		fontSize:14
	},
	line:{
		height: 1,
		backgroundColor: '#202020',
		width: '90%',
		left: 85
	},
	icon:{
		marginRight: 5
	}
});

export default SongComponent;