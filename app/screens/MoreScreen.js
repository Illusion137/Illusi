import React from 'react';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoreSectionButton from '../components/MoreSectionButton';

function MoreScreen(props) {
	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<Text style={styles.toptext}>More</Text>
				</View>
			</View>
			<ScrollView>
				<MoreSectionButton text='Backup, Recover, & Transfer' icon='cloud-outline' onPress={() => console.log('Pressed')}/>
				<Text style={styles.descriptiontxt}>Backup your music, transfer your library to other devices, recover deleted music and more.</Text>
				

				<MoreSectionButton text='Settings' icon='settings-outline' onPress={() => console.log('Pressed')}/>
				<View style={styles.line}></View>
				
				<MoreSectionButton text='Sleep Timer' icon='timer-outline' onPress={() => console.log('Pressed')}/>
				<View style={styles.line}></View>
				
				<MoreSectionButton text='Youtube Login' icon='logo-youtube' onPress={() => console.log('Pressed')}/>
				<Text style={styles.descriptiontxt}>Login to YouTube to play restricted songs, add private YouTube playlists, and more.</Text>
			</ScrollView>
			<Button style={styles.b} title='Clear all Data' onPress={()=>{
				AsyncStorage.clear();
			}}></Button>
		</View>
	);
}
const styles = StyleSheet.create({
	topcontainer:{
		backgroundColor: '#101010',
		flex: 1,
	},
	header:{
		backgroundColor: '#121212',
		width: '100%',
		height: '13%',
		top: 0,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	toptext:{
		color: '#FFFFFF',
		fontSize: 18,
		top:10,
		fontWeight: '500'
	},
	descriptiontxt:{
		color: '#A0A0A0',
		marginTop: 10,
		marginBottom: 35,
		marginHorizontal: 12,
		textAlign: 'left'
	},
	line:{
		width: '100%',
		height: 0.8,
		backgroundColor: 'white',
		marginHorizontal: 10,
		top: 50
	}
});
export default MoreScreen;