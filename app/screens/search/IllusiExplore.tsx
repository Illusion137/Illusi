import { ScrollView, View } from "react-native";
import { CompactPlaylist, IllusiveURI } from "../../../lib-origin/Illusive/src/types";
import AlbumList from "../../components/AlbumList";
import { artist_watch } from "../../../lib-origin/Illusive/src/illusi/src/artist_watch";
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals'
import { is_empty, json_catch } from "../../../lib-origin/origin/src/utils/util";
import { ResponseError } from "../../../lib-origin/origin/src/utils/types";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";

export default function IllusiExplore(){
    async function refresh_new_releases(): Promise<(CompactPlaylist|ResponseError)[]|ResponseError|ResponseError>{
        const seen_artists = new Set<IllusiveURI>();
        const most_played_artists = GLOBALS.global_var.sql_tracks
            .filter(track => !is_empty(track.artists[0].uri))
            .filter(track => (track.meta?.plays ?? 0) !== 0)
            .sort((a, b) => b.meta!.plays - a.meta!.plays)
            .filter(track => {
                if(seen_artists.has(track.artists[0].uri!)) return false;
                seen_artists.add(track.artists[0].uri!)
                return true;
            })
            .map(track => track.artists[0])
            .slice(0, Prefs.get_pref('new_releases_amount'));
        const new_releases: (CompactPlaylist|ResponseError)[]|ResponseError = await artist_watch(most_played_artists).catch(json_catch);
        return new_releases;
    }

    return (
        <ScrollView>
            <View style={{height: 100}}/>
            <AlbumList second_line_type="ARTIST" refresh={{last_refresh: new Date(), refresh_data: refresh_new_releases}} title="New Releases" else_type="ALBUM" albums={Prefs.get_pref('new_releases_persistant_cache')}/>
        </ScrollView>
    )
}