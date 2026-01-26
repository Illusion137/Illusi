import React,  { useState, useEffect } from 'react';
import { View, FlatList, Alert } from 'react-native';
import type { Track } from '@illusive/types';
import { unzip_backpack } from '@illusive/backpack';
import ExtrasSectionButton from '@components/ExtrasSectionButton';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import SongComponentBackpack from '@components/TrackComponentBackpack';
import usePTheme from '@hooks/usePTheme';
import { SQLBackpack } from '@illusive/sql/sql_backpack';

export default function ExtraBackpackScreen() {
	const { colors } = usePTheme();

    const [mode_index, set_mode_index] = useState(0);
	const [backpack_tracks, set_backpack_tracks] = useState<Track[]>([]);
	const [unzipped_backpack_tracks, set_unzipped_backpack_tracks] = useState<Track[]>([]);

	function ask_consent(title: string, confirmText: string, func: () => Promise<void>){
		Alert.alert(
			title,
			confirmText,
			[ { text: "Cancel"},
			  { text: "OK", onPress: async() => {
				  await func();
			  } } ]
		  );
	}

    async function unzip_backpack_tracks(){
        set_unzipped_backpack_tracks(await unzip_backpack(backpack_tracks));
        set_mode_index(1);
    }

	useEffect( () => {
		(async function() {
            set_backpack_tracks(await SQLBackpack.backpack_tracks());
        })();
	}, []);
	const render_header = () => (
		<>
				{unzipped_backpack_tracks.length == 0 && <View>
					<ExtrasSectionButton show_arrow={false} text='Restore tracks in Backpack' icon='refresh' onPress={async () => {ask_consent("Restore tracks in Backpack", "Are you sure you want to restore tracks in your Backpack", unzip_backpack_tracks)}}/>
					<ExtrasSectionButton show_arrow={false} text='Clear Backpack' icon='trash' onPress={async () => {ask_consent("Clear Backpack", "Are you sure you want to clear your Backpack", async() => {
						await SQLBackpack.empty_backpack();
						set_backpack_tracks([])
					})}}/>
				</View>}
				<View style={{height: 50}}/>
		</>
	)
	const render_item = (item: {item: Track}) => (
		<>
			<SongComponentBackpack track_data={item.item}/>
		</>
	)

	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
						<SegmentedControl 
				values={["View Backpack", "View Conversion"]}
				selectedIndex={mode_index}
				fontStyle={{color: colors.text}}
				onChange={async(event) => {set_mode_index(event.nativeEvent.selectedSegmentIndex);}}
			/>
			<View style={{height: 15}}/>

			{mode_index == 0 && <FlatList data={backpack_tracks} renderItem={render_item} ListHeaderComponent={render_header}/>}
			{mode_index == 1 && <FlatList data={unzipped_backpack_tracks} renderItem={render_item} ListHeaderComponent={() => (<View style={{height: 20}}/>)}/>}
		</View>
	);
}