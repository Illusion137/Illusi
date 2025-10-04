
import React,  { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SQLPlaylists } from '@illusive/sql/sql_playlists';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { GLOBALS } from '@illusive/globals';
import { sort_playlists } from '@illusive/illusi/src/playlist';
import { Playlist, SetState, Track } from '@illusive/types';
import { Prefs } from '@illusive/prefs';
import { artist_string, track_exists } from '@illusive/illusive_utilts';
import PlaylistComponent from '@components/PlaylistComponent';
import IImage from '@components/IImage';
import usePTheme from '@hooks/usePTheme';

type ModalData = {show: boolean, track_data: Track|null};
function AddToPlaylistsModal(props: {
    modal_data: ModalData,
    set_modal_data: SetState
    callback: () => void,
}) {
	const { colors } = usePTheme();
	const styles = theme_styles(colors); styles;

	const [playlists_data, set_playlists_data] = useState<Playlist[]>([])

    useEffect(() => {
        if(props.modal_data.show === false) return;
        GLOBALS.global_var.selected_playlists_uuids?.clear();
    }, [props.modal_data])

	const render_playlist_item = (item: {item: Playlist}) => (
		<PlaylistComponent playlist_data={item.item} select={{mode: true, track: props.modal_data.track_data!}} refresh_data={() => {}}/>
	);
    async function save_selection(){
        if(!(track_exists(props.modal_data.track_data!, GLOBALS.global_var.sql_tracks))){
            await SQLTracks.insert_track(props.modal_data.track_data!);
        }
        for(const playlist_uuid of [...GLOBALS.global_var.selected_playlists_uuids.values()]){
            await SQLPlaylists.insert_track_playlist({uuid: playlist_uuid, track_uid: props.modal_data.track_data!.uid});
        }
        props.callback();
        props.set_modal_data({'show':false, 'track_data': null});
    }

	return(
        <Modal
        animationType="slide"
        visible={props.modal_data.show}
        presentationStyle={'pageSheet'}
        onShow={async() => {
            const playlists = await SQLPlaylists.all_playlists_data();
            const ordered_playlists: Playlist[] = sort_playlists(playlists);
            set_playlists_data(ordered_playlists);
        }
        }
        onRequestClose={() => {
            props.set_modal_data({'show':false, 'track_data': null});
        }}>
            <View style={{flex: 1, backgroundColor: colors.background}}>
                <View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Button color={colors.primary} title={'Cancel'} onPress={() => {
                        props.set_modal_data({'show':false, 'track_data': null});
                    }}/>
                    <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 18, right: '30%'}}>Add To Playlist</Text>
                </View>
                <IImage source={props.modal_data.track_data?.playback?.artwork} resizeMode="cover" style={{
                    width: '100%',
                    height: '21%',
                    opacity: 0.7
                }}/>
                <Text numberOfLines={1} style={{marginHorizontal: 20, bottom: 60, color: colors.text, fontWeight: 'bold', fontSize: 24}}>{props.modal_data.track_data?.title || ""}</Text>
                <Text style={{marginHorizontal: 20, bottom: 62, color: colors.text, fontSize: 14}}>{artist_string(props.modal_data.track_data!)}</Text>
                <View style={{height: 10}}/>
                <FlatList style={{bottom: 45}} data={playlists_data} renderItem={render_playlist_item}/>
                <TouchableOpacity style={{width: '90%', alignSelf: 'center', height: 60, backgroundColor: colors.primary, borderRadius: 50, bottom: 30, alignItems: 'center', justifyContent: 'center'}} onPress={async() => save_selection()}>
                    <Text style={{color: colors.text, fontSize: 24, fontWeight: '600'}}>Save</Text>
                </TouchableOpacity>
            </View>
        </Modal>
	);
}
const theme_styles = (_: Prefs.Theme['colors']) => StyleSheet.create({

});
export default AddToPlaylistsModal;