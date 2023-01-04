import React from 'react';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView , Alert, BackHandler} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ExtrasSectionButton from '../components/ExtrasSectionButton';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';

function ExtraScreen(props) {
	const navigation = useNavigation();

	const confirmDeleteDataAlert = () =>
    Alert.alert(
      "Clear All Data",
      "Are you sure?",
      [ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			
			AsyncStorage.clear(); 
			
			for(const file of await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)){
				try {
					await FileSystem.deleteAsync(FileSystem.documentDirectory+file, {idempotent:true});
				} catch (error) {
					
				}
			}
			for(const file of await FileSystem.readDirectoryAsync('file:///var/mobile/Containers/Data/Application/2ECF71AE-2E45-4A4E-A445-BB53A4489429/Library/Caches/ExponentExperienceData/%2540illusion137%252FIllusi/DocumentPicker/')){
				try {
					await FileSystem.deleteAsync('file:///var/mobile/Containers/Data/Application/2ECF71AE-2E45-4A4E-A445-BB53A4489429/Library/Caches/ExponentExperienceData/%2540illusion137%252FIllusi/DocumentPicker/' + file, {idempotent:true});
				} catch (error) {
					
				}
			}
			// FileSystem.deleteAsync();
			BackHandler.exitApp() 

		} } ]
    );

	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<Text style={styles.toptext}>More</Text>
				</View>
			</View>
			<ScrollView>
				{/* <ExtrasSectionButton text='Backup, Recover, & Transfer' icon='cloud-outline' onPress={() => navigation.navigate('Backup & Recovery')}/>
				<Text style={styles.descriptiontxt}>Backup your music, transfer your library to other devices, recover deleted music and more.</Text>
				

				<ExtrasSectionButton text='Settings' icon='settings-outline' onPress={() => navigation.navigate('Settings')}/>
				<View style={styles.line}></View>
								
				<ExtrasSectionButton text='Youtube Login' icon='logo-youtube' onPress={() => console.log('yt')}/>
				<Text style={styles.descriptiontxt}>Login to YouTube to play age-restricted songs, add private YouTube playlists, export playlists to YouTube, etc...</Text> */}

				<View style={styles.line}></View>
				{/* <ExtrasSectionButton text='Import Manager' icon='cloud-upload-outline' onPress={() => navigation.navigate('Import Manager')}/> */}
				{/* <Text style={styles.descriptiontxt}>Import Manager for own MP3 files</Text> */}
				<ExtrasSectionButton showArrow={false} text='Clear All Data' icon='trash' onPress={confirmDeleteDataAlert}/>

				<Text style={styles.descriptiontxt}>Illusi Version: 1.0.0</Text>
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