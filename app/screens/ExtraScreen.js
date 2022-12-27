import React from 'react';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView , Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ExtrasSectionButton from '../components/ExtrasSectionButton';
import { useNavigation } from '@react-navigation/native';

function ExtraScreen(props) {
	const navigation = useNavigation();

	const confirmDeleteDataAlert = () =>
    Alert.alert(
      "Clear All Data",
      "Are you sure?",
      [ { text: "Cancel"},
        { text: "OK", onPress: () => AsyncStorage.clear() } ]
    );

	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<Text style={styles.toptext}>More</Text>
				</View>
			</View>
			<ScrollView>
				<ExtrasSectionButton text='Backup, Recover, & Transfer' icon='cloud-outline' onPress={() => navigation.navigate('Backup & Recovery')}/>
				<Text style={styles.descriptiontxt}>Backup your music, transfer your library to other devices, recover deleted music and more.</Text>
				

				<ExtrasSectionButton text='Settings' icon='settings-outline' onPress={() => navigation.navigate('Settings')}/>
				<View style={styles.line}></View>
				
				<ExtrasSectionButton text='Sleep Timer' icon='timer-outline' onPress={() => navigation.navigate('Sleep Timer')}/>
				<View style={styles.line}></View>
				
				<ExtrasSectionButton text='Youtube Login' icon='logo-youtube' onPress={() => console.log('yt')}/>
				<Text style={styles.descriptiontxt}>Login to YouTube to play age-restricted songs, add private YouTube playlists, export playlists to YouTube, etc...</Text>
				<ExtrasSectionButton text='Import Manager' icon='download' onPress={() => navigation.navigate('Import Manager')}/>
				<Text style={styles.descriptiontxt}>Import Manager for own MP3 files</Text>
				<ExtrasSectionButton showArrow={false} text='Clear All Data' icon='trash' onPress={confirmDeleteDataAlert}/>

				<Text style={styles.descriptiontxt}>Illusi Version: ALPHA 0.0.0</Text>
			</ScrollView>

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
		marginBottom: 20,
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
export default ExtraScreen;