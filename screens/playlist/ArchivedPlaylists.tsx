import { Button, Text, View } from "react-native";
import { Playlist } from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import BigList from "react-native-big-list";
import PlaylistComponent from "@components/PlaylistComponent";
import usePTheme from "@hooks/usePTheme";

export default function ArchivedPlaylists(props: {
    playlists: Playlist[];
    close_panel: () => void;
    refresh_data: () => void;
}){
    const { colors } = usePTheme();

    const render_item = (item: {item: Playlist}) => (
        <PlaylistComponent playlist_data={item.item} refresh_data={props.refresh_data} compact={Prefs.get_pref('compact_playlists')}/>
    );

    const render_footer = () => (
        <View style={{padding: 10}}>
            <Text style={{color: colors.subtext}}>Note: Archived-Playlists don't have "Playlists Inheritance Preview" to help speed up Illusi.</Text>
            <View style={{height: 200}}/>
        </View>
    )

    return (
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <View style={{flexDirection: 'row', alignItems: 'center', height: 55, width: '100%', backgroundColor: colors.shelf, borderTopLeftRadius: 15, borderTopRightRadius: 15, borderColor: colors.deeptext, borderWidth: 1}}>
                <View style={{marginLeft:10}}></View>
                    <Button title='Hide' color={colors.primary} onPress={props.close_panel}></Button>
                <View style={{marginRight:60}}></View>
                <Text style={{color: colors.text, fontWeight:'500', fontSize: 18, alignSelf: 'center'}}>Archived Playlists</Text>
            </View>
            <View style={{height: 0.6, backgroundColor: colors.line}}/>
            <BigList style={{height: '70%'}} data={props.playlists.filter(playlist => playlist.archived)} keyExtractor={(item, _) => String(item.uuid)} itemHeight={Prefs.get_pref('compact_playlists') ? 56 : 81} headerHeight={0} footerHeight={500} renderItem={render_item} renderHeader={() => (<></>)} renderFooter={render_footer}/>
        </View>
    )
}