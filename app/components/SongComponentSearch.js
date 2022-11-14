import React, {useState} from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as FileSystem from 'expo-file-system';

const { StorageAccessFramework } = FileSystem;

function SongComponentSearch(props) {
	const [downloadProgress, setDownloadProgress] = React.useState();
	const downloadPath = FileSystem.documentDirectory + (Platform.OS == 'android' ? '' : '');
	
	const ensureDirAsync = async (dir, intermediates = true) => {
		const props = await FileSystem.getInfoAsync(dir)
		if (props.exist && props.isDirectory) {
			return props;
		}
		let _ = await FileSystem.makeDirectoryAsync(dir, { intermediates })
		return await ensureDirAsync(dir, intermediates)
	}
	const downloadCallback = downloadProgress => {
		const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
		setDownloadProgress(progress);
	};

	const downloadFile = async (fileUrl) => {
		let fileName = fileUrl.split('Reports/')[1];
		//alert(fileName)
		const downloadResumable = FileSystem.createDownloadResumable(
		  fileUrl,
		  downloadPath + fileName,
		  {},
		  downloadCallback
		);
	
		try {
		 	const { uri } = await downloadResumable.downloadAsync();
			console.log(uri)
			// saveIosFile(uri);
		} catch (e) {
		  console.error('download error:', e);
		}
	}
	
	const id = props.id;
	const [saved, isSaved] = useState(props.saved);
	const [downloaded, isDownloaded] = useState(props.downloaded);
	return (
		<TouchableOpacity>
			<View style={styles.songbox}>
				<View style={{justifyContent: 'center'}}>
					<Image source={{uri:props.imguri}} style={styles.image}></Image>
				</View>
				<View style={styles.text}>				
					<Text style={styles.title} numberOfLines={1} >{props.title}</Text>
					<Text style={styles.artist} numberOfLines={1} >{props.artist}</Text>
				</View>
				<TouchableOpacity disabled={(saved && downloaded)} style={{justifyContent: 'center'}} onPress={async()=>{
						if(!saved){
							class Vid {
								constructor(thumbnailURI, title, artist, id, saved) {
									this.thumbnailURI = thumbnailURI;
									this.title = title;
									this.artist = artist;
									this.id = id;
									this.saved = true;
								}
							};
							try{
								let songs = await AsyncStorage.getItem('Library');
								if(songs == null){
									AsyncStorage.setItem('Library', JSON.stringify(new Vid(
										props.imguri,
										props.title,
										props.artist,
										props.id,
										true,
										false
									)));
								}else{
									AsyncStorage.setItem('Library', songs.concat('::'+JSON.stringify(new Vid(
										props.imguri,
										props.title,
										props.artist,
										props.id,
										true,
										false
									))));
								}
							}catch(e){
								console.log(e);
								return;
							}
						}
						else if(!downloaded){
							//downloadFile(`https://api.vevioz.com/api/button/mp3/${id}`)
							isDownloaded(true);
						}
						else{
							return;
						}
					}}>
					<Ionicons name={!saved ? "add" : (!downloaded ? "download-outline" : "checkmark")} size={30} color='#AA00FF' style={styles.icon}/>
				</TouchableOpacity>
			</View>
			<View style={styles.line}/>

		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
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
		width: '65%',
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
		// backgroundColor: 'rgba(255,255,255,0.4)',
		right: 10,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 30,
		paddingRight: 30
	}
});

export default SongComponentSearch;