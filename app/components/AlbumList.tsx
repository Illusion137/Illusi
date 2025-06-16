import { Dimensions, FlatList, Text, View } from "react-native";
import { CompactPlaylist } from "../../lib-origin/Illusive/src/types";
import Album, { SecondLineType } from "./Album";
import { Prefs } from "../../lib-origin/Illusive/src/prefs";
import { useTheme } from "@react-navigation/native";
import { IoniconsTouchableOpacity } from "./TouchableIconOpacity";
import { useEffect, useState } from "react";
import { ResponseError } from "../../lib-origin/origin/src/utils/types";
import { alert_error } from "../../lib-origin/Illusive/src/illusi/src/alert";
import * as GLOBALS from '../../lib-origin/Illusive/src/illusi/src/globals'
import AlbumPlaceholder from "./AlbumPlaceholder";

export default function AlbumList(props: {
    title: string;
    else_type: "ALBUM"|"SINGLE"|"EP"
    albums: CompactPlaylist[],
    refresh?: {
        last_refresh: Date;
        refresh_data: () => Promise<(CompactPlaylist|ResponseError)[]|ResponseError>;
    }
    second_line_type?: SecondLineType;
    is_loading: boolean;
}) {
    const { colors } = useTheme() as Prefs.Theme;

    const render_album_placeholder = () => (<AlbumPlaceholder/>);
    const render_album = (item: {item: CompactPlaylist}) => (<Album album_data={item.item} second_line_type={props.second_line_type}/>);

    const is_loading = props.is_loading ?? false;
    const [albums, set_albums] = useState<CompactPlaylist[]>(props.albums);
    const [last_refresh, set_last_refresh] = useState<Date|undefined>(props.refresh?.last_refresh);

    async function refresh_data(){
        if(props.refresh?.refresh_data === undefined) return;
        const compact_album_data = await props.refresh.refresh_data();
        if("error" in compact_album_data){
            alert_error(compact_album_data);
            return;
        }
        for(const album of compact_album_data){
            if("error" in album){
                alert_error(album);
            }
        }
        const filterd_album_data = compact_album_data.filter(album => !("error" in album)) as CompactPlaylist[];
        set_albums(filterd_album_data);
        set_last_refresh(new Date());
        Prefs.save_pref('new_releases_last_refreshed', new Date());
        GLOBALS.global_var.bottom_alert("Successfully Refreshed Data", "GOOD");
    }

    useEffect(() => {
        set_albums(props.albums)
    }, [props.albums]);

    return (
        <View style={{paddingVertical: 10}}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold', left: 15}}>{props.title}</Text>
                {props.refresh ? 
                    <>
                        <Text style={{color: colors.subtext, fontSize: 10, top: 5}}>Last Refreshed: {(last_refresh ?? new Date(0)).toLocaleString()}</Text>
                        <IoniconsTouchableOpacity icon_name="refresh" icon_color={colors.secondary} on_press={refresh_data} icon_size={25} icon_style={{right: 20}} hitslop={12}/>
                    </>
                 : null}
            </View>
            <View style={{height: Dimensions.get('screen').width * .40 + 50, justifyContent: 'center'}}>
                {is_loading ? 
                    <FlatList data={new Array(3)} renderItem={render_album_placeholder} horizontal={true} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={6}/> : 
                    <FlatList data={albums.map(item => ({...item, album_type: item.album_type ?? props.else_type}))} renderItem={render_album} horizontal={true} initialNumToRender={3} maxToRenderPerBatch={3} windowSize={6}/> }
            </View>
        </View>
    );
};