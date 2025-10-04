import { Button, Text, View } from "react-native";
import usePTheme from "@hooks/usePTheme";
import BigList from "react-native-big-list";
import useParsedLocalSearchParams from "@hooks/useParsedLocalSearchParams";
import type { Playlist } from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import PlaylistComponent from "@components/PlaylistComponent";
import { router } from "expo-router";

export interface ArchivedPlaylistsParams {
    _playlists: Playlist[];
};

export default function ArchivedPlaylists(){
    const { _playlists } = useParsedLocalSearchParams<ArchivedPlaylistsParams>();
    const { colors } = usePTheme();
    

    // TODO remove refresh callbacks, screens should just know
    const render_item = (item: {item: Playlist}) => (
        <PlaylistComponent refresh_data={() => {}} playlist_data={item.item} compact={Prefs.get_pref('compact_playlists')}/>
    );

    const render_footer = () => (
        <View style={{padding: 10}}>
            <Text style={{color: colors.subtext}}>Note: Archived-Playlists don't have "Playlists Inheritance Preview" to help speed up Illusi.</Text>
            <View style={{height: 200}}/>
        </View>
    )

    function hide(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }

    return (
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <View style={{flexDirection: 'row', alignItems: 'center', height: 55, width: '100%', backgroundColor: colors.shelf, borderTopLeftRadius: 15, borderTopRightRadius: 15, borderColor: colors.deeptext, borderWidth: 1}}>
                <View style={{marginLeft:10}}></View>
                    <Button title='Hide' color={colors.primary} onPress={hide}></Button>
                <View style={{marginRight:60}}></View>
                <Text style={{color: colors.text, fontWeight:'500', fontSize: 18, alignSelf: 'center'}}>Archived Playlists</Text>
            </View>
            <View style={{height: 0.6, backgroundColor: colors.line}}/>
            <BigList style={{height: '70%'}} data={_playlists} keyExtractor={(item, _) => String(item.uuid)} itemHeight={Prefs.get_pref('compact_playlists') ? 56 : 81} headerHeight={0} footerHeight={500} renderItem={render_item} renderHeader={() => (<></>)} renderFooter={render_footer}/>
        </View>
    )
}