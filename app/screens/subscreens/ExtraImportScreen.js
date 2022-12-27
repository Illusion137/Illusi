import React,  { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, FlatList } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import SongComponent from '../../components/SongComponent';



function ExtraImportScreen(props) {
	const [data, setData] = React.useState()

	const renderSongComponents = ({ item }) => (
		<SongComponent video_id={'0'} video_name={item.video_name} video_creator={"Illusion"} video_duration={0} saved={true} imported={true}/>
	);

	return(
		<View style={{backgroundColor: '#000000', width: '100%', flex: 1,}}>
			<TouchableOpacity style={styles.importButton} onPress={async() => { 
					let audioFile = await DocumentPicker.getDocumentAsync({type: 'audio/*', multiple: true, copyToCacheDirectory: true});
					setData([{video_name: audioFile.name}]);
					console.log(data)
				}}>
				<Text style={{fontWeight: '100', fontSize:20, color:'white'}}>Import Tracks</Text>
			</TouchableOpacity>
			
			<FlatList data={data} renderItem={renderSongComponents}/>

		</View>
	);
}
const styles = StyleSheet.create({
	importButton:{
		top: 5,
		width: '95%',
		height: 100,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#080808',
		marginHorizontal: 10,
		borderRadius: 4
	},

});
export default ExtraImportScreen;