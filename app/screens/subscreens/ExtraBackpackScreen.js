import React,  { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import * as SQLActions from '../../../SQLActions';

import { useNavigation, useTheme } from '@react-navigation/native';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import { importedIcon } from '../../../globals';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import SongComponentBackpack from '../../components/SongComponentBackpack';
import { getProxyList, getRandomIndex } from '../../Illusive/IllusivePlaylistResolver';
import SearchYouTube from '../../Illusive/IllusiveSearch';

function ExtraBackpackScreen(props) {
	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const [index, setIndex] = useState(0);
	const [data, setData] = useState([]);
	const [restoredData, setRestoredData] = useState([]);

	function toCleanedQuery(title, artist){
		let cleanedQuery = "";
		title =    title.replaceAll(/\(.+?\)/g, '')
						.replaceAll(/\[.+?\]/g, '')
						.replaceAll('\\', '')
						.replaceAll(/\s\s/g, '\\')
						.replaceAll('\\', '');
		let titleWords = title.split(' ');
		let n_titleWords = [];
		if(titleWords.length == 1){
			return title + ' ' + artist;
		}
		let artistWords = artist.split(' ');

		for(let i = 0; i < titleWords.length; i++){
			if( !artistWords.includes(titleWords[i]) ){
				n_titleWords.push(titleWords[i]);
			}
		}
		cleanedQuery = n_titleWords.join(' ').replaceAll(/\s-\s/g, ' ').replaceAll(/-\s/g, ' ').replaceAll(/\s-/g, ' ') + ' - ' + artistWords.join(' ');
		cleanedQuery = cleanedQuery.trim()
		return cleanedQuery
	}

	function askConsent(title, confirmText, func){
		Alert.alert(
			title,
			confirmText,
			[ { text: "Cancel"},
			  { text: "OK", onPress: async() => {
				  await func();
			  } } ]
		  );
	}

	useEffect( () => {
		(async function() {
				let backpackTracks = await SQLActions.getBackpack();
				setData(backpackTracks)
			})();
	}, []);

	const renderHeader = () => (
		<>
			<ExtrasSectionButton showArrow={false} text='Restore tracks in Backpack' icon='refresh' onPress={async () => {askConsent("Restore tracks in Backpack", "Are you sure you want to restore tracks in your Backpack", async() => {
				let proxies = getProxyList();
				async function searchYT(title, artist, oldUID, proxy = null){
					let search_query = toCleanedQuery(title, artist)
					let ytSearchResult = await SearchYouTube(search_query, 0, proxy)
					let result = ytSearchResult.data[0]
					result['artwork'] = {'uri': `https://img.youtube.com/vi/${result.video_id}/mqdefault.jpg`, 'cache': 'force-cache'}
					result['oldUID'] = oldUID;
					return result
				}
				let tracks = data;
				const ytTracks = [];
				for(let i = 0; i < tracks.length; i++){
					ytTracks.push(
						searchYT(tracks[i].video_name, tracks[i].video_creator, tracks[i].uid, proxies[getRandomIndex(proxies.length)])
					)
				}
				let results = await Promise.all(ytTracks)
				setRestoredData(results)
				setIndex(1)
			})}}/>
			<ExtrasSectionButton showArrow={false} text='Clear Backpack' icon='trash' onPress={async () => {askConsent("Clear Backpack", "Are you sure you want to clear your Backpack", async() => {
				await SQLActions.clearBackpack();
				setData([])
			})}}/>
			<SegmentedControl 
				values={["View Backpack","View Conversion"]}
				selectedIndex={index}
				onChange={async(event) => {setIndex(event.nativeEvent.selectedSegmentIndex);}}
			/>
			<View style={{height: 50}}/>
		</>
	)
	const renderItem = ({item}) => (
		<>
			<SongComponentBackpack disabled={index == 0 ? true : false} oldUID={item.oldUID} video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} artwork={item.artwork} video_duration={item.video_duration}/>
		</>
	)

	return(
		<View style={{backgroundColor: colors.backgroundColor, width: '100%', flex: 1,}}>
			<FlatList data={index == 0 ? data : restoredData} renderItem={renderItem} ListHeaderComponent={renderHeader}/>
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
    
});
export default ExtraBackpackScreen;