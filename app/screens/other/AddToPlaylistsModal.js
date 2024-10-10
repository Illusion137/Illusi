
import React,  { useState, useRef,useImperativeHandle, forwardRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, Modal, FlatList } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import SelectPlaylist from '../../components/SelectPlaylist';

function AddToPlaylistsModal(props) {

	const { colors } = useTheme();
	const styles = theme_styles(colors);
	const [playlistsData, setPlaylistsData] = useState([])
    const [modalData, setModalData] = useState({'show':false, 'track_data': null})

    useEffect(() => {
        setModalData(props.modalData);
    }, [props])

	const renderPlaylistItem = ({item}) => (
		<SelectPlaylist title={item.title} pinned={item.pinned} four_track={item.visual_data.four_track} track_count={item.visual_data.track_count} />
	);

	return(
        <Modal
        animationType="slide"
        visible={modalData.show}
        presentationStyle={'pageSheet'}
        onShow={async() => {
            let playlists = await SQLActions.getAllPlaylists();

            for(let i = 0; i < playlists.length; i++){
                let playlistTracks = await SQLActions.getPlaylistTracks(playlists[i].title.replaceAll(' ', '_'));
    
                playlists[i]['track_count'] = playlistTracks.length;
                playlists[i]['four_track'] = playlistTracks.slice(0,4);
                playlists[i]['pinned'] = await SQLActions.getIsPlaylistsPinned(playlists[i].title) == 0 ? false : true
            }
            let orderedPlaylists = []
            for(let i = 0; i < playlists.length; i++){
                if(playlists[i].pinned)
                    orderedPlaylists.unshift(playlists[i])
                else
                    orderedPlaylists.push(playlists[i])
            }
            setPlaylistsData(orderedPlaylists)
        }
        }
        onRequestClose={() => {
            setModalData({'show':false, 'track_data': null});
        }}>
            <View style={{flex: 1, backgroundColor: colors.background}}>
                <View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
                    <Button color={colors.primary} title={'Cancel'} onPress={() => {
                        setModalData({'show':false, 'track_data': null});
                    }}/>
                    <Text style={{color: '#FFFFFF', fontWeight: 'bold', fontSize: 18}}>Add To Playlist</Text>
                </View>
                <Image source={modalData.track_data === null ? undefined : {uri: `https://img.youtube.com/vi/${modalData.track_data?.video_id}/maxresdefault.jpg`}} resizeMode="cover" style={{
                    width: '100%',
                    height: '20%',
                }}/>
                <Text numberOfLines={1} style={{marginHorizontal: 20, bottom: 50, color: '#FFFFFF', fontWeight: 'bold', fontSize: 24}}>{modalData.track_data?.video_name || ""}</Text>
                <Text style={{marginHorizontal: 20, bottom: 50, color: '#FFFFFF', fontSize: 14}}>{modalData.track_data?.video_creator || ""}</Text>
                <FlatList style={{bottom: 45}} data={playlistsData} renderItem={renderPlaylistItem}/>
                <TouchableOpacity style={{width: '90%', alignSelf: 'center', height: 60, backgroundColor: colors.primary, borderRadius: 50, bottom: 30, alignItems: 'center', justifyContent: 'center'}} onPress={async() => {
                    if(!(await SQLActions.checkIfVideoIdExists(modalData.track_data.video_id))){
                        await SQLActions.insertTrackData(new SQLActions.Track({
                                video_name: modalData.track_data.video_name || "-",
                                video_creator: modalData.track_data.video_creator || "-",
                                video_id: modalData.track_data.video_id || "0",
                                video_duration: modalData.track_data.video_duration || 0,
                                saved: true,
                                youtube: true,
                                uid: modalData.track_data.uid,
                        }));
                    }
                    let selectedPlaylistsArray = [...GLOBALS.selectedPlaylists]
                    for(const selectedPlaylist of selectedPlaylistsArray){
                        let playlistTracksVideoIds = (await SQLActions.getPlaylistTracks(selectedPlaylist)).map(({video_id}) => video_id)
                        if(!playlistTracksVideoIds.includes(modalData.track_data.video_id)){
                            await SQLActions.insertTrackIntoPlaylist({'uid': modalData.track_data.uid}, selectedPlaylist);
                        }
                    }
                    modalData.track_data.callback();
                    setModalData({'show':false, 'track_data': null})
                    }}>
                    <Text style={{color: '#FFFFFF', fontSize: 24, fontWeight: '600'}}>Save</Text>
                </TouchableOpacity>
            </View>
        </Modal>
	);
}
const theme_styles = (colors) => StyleSheet.create({

});
export default AddToPlaylistsModal;