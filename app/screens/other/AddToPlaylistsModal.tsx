
import React,  { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, Image, Modal, FlatList } from 'react-native';
import { useTheme } from '@react-navigation/native';
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import * as SQLTracks from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import SelectPlaylist from '../../components/SelectPlaylist';
import { sort_playlists } from '../../../lib-origin/Illusive/src/illusi/src/playlist';
import { Playlist, Track } from '../../../lib-origin/Illusive/src/types';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import { remove_topic } from '../../../lib-origin/origin/src/utils/util';

type ModalData = {show: boolean, track_data: Track|null};
function AddToPlaylistsModal(props: {modal_data: ModalData, callback: () => void}) {
	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors); styles;

	const [playlists_data, set_playlists_data] = useState<Playlist[]>([])
    const [modal_data, set_modal_data] = useState<ModalData>({show:false, track_data: null})

    useEffect(() => {
        if(props.modal_data.show === false) return;
        GLOBALS.global_var.selected_playlists_uuids?.clear();
        set_modal_data(props.modal_data);
    }, [props.modal_data.track_data])

	const render_playlist_item = (item: {item: Playlist}) => (
		<SelectPlaylist playlist={item.item}/>
	);
    async function save_selection(){
        if(!(await SQLTracks.track_exists(modal_data.track_data!))){
            await SQLTracks.insert_track(modal_data.track_data!);
        }
        for(const playlist_uuid of [...GLOBALS.global_var.selected_playlists_uuids.values()]){
            await SQLPlaylists.insert_track_playlist(playlist_uuid, modal_data.track_data!.uid);
        }
        props.callback();
        set_modal_data({'show':false, 'track_data': null});
    }

	return(
        <Modal
        animationType="slide"
        visible={modal_data.show}
        presentationStyle={'pageSheet'}
        onShow={async() => {
            const playlists = await SQLPlaylists.all_playlists_data();
            const ordered_playlists: Playlist[] = sort_playlists(playlists);
            set_playlists_data(ordered_playlists);
        }
        }
        onRequestClose={() => {
            set_modal_data({'show':false, 'track_data': null});
        }}>
            <View style={{flex: 1, backgroundColor: colors.background}}>
                <View style={{height: 50, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                    <Button color={colors.primary} title={'Cancel'} onPress={() => {
                        set_modal_data({'show':false, 'track_data': null});
                    }}/>
                    <Text style={{color: colors.text, fontWeight: 'bold', fontSize: 18, right: '30%'}}>Add To Playlist</Text>
                </View>
                <Image source={modal_data.track_data === null ? undefined : modal_data.track_data.playback?.artwork} resizeMode="cover" style={{
                    width: '100%',
                    height: '20%',
                }}/>
                <Text numberOfLines={1} style={{marginHorizontal: 20, bottom: 50, color: colors.text, fontWeight: 'bold', fontSize: 24}}>{modal_data.track_data?.title || ""}</Text>
                <Text style={{marginHorizontal: 20, bottom: 50, color: colors.text, fontSize: 14}}>{modal_data.track_data?.artists.map(artist => remove_topic(artist.name)).join(', ') || ""}</Text>
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