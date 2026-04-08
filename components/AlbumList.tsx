import { Text, View } from "react-native";
import type { CompactPlaylist} from "@illusive/types";
import type { Track } from "@illusive/types";
import type { SecondLineType } from "./Album";
import Album from "./Album";
import { Prefs } from "@illusive/prefs";
import { AntDesignTouchableOpacity, IoniconsTouchableOpacity } from "./TouchableIconOpacity";
import { useEffect, useState, useMemo } from "react";
import type { ResponseError } from "@common/types";
import { alert_error } from "@illusive/illusi/src/alert";
import { GLOBALS } from '@illusive/globals'
import AlbumPlaceholder from "./AlbumPlaceholder";
import usePTheme from "@hooks/usePTheme";
import useDimensions from "@hooks/useDimensions";
import { FlashList } from "@shopify/flash-list";
import { SharedRouter } from "@utils/shared_routes";

export default function AlbumList(props: {
    title: string;
    else_type: "ALBUM"|"SINGLE"|"EP"
    albums: CompactPlaylist[],
    refresh?: {
        last_refresh: Date;
        refresh_data: () => Promise<(CompactPlaylist|ResponseError)[]|ResponseError>;
    }
    second_line_type?: SecondLineType;
    is_loading?: boolean;
}) {
    const { colors } = usePTheme();
    const { width } = useDimensions();
    const album_list_height = useMemo(() => width * 0.4 + 50, [width]);

    const render_album_placeholder = () => (<AlbumPlaceholder/>);
    const other_tracks = props.albums.filter(album => album.song_track).map(album => album.song_track) as Track[];
    const render_album = (item: {item: CompactPlaylist}) => (<Album album_data={item.item} second_line_type={props.second_line_type} other_tracks={other_tracks}/>);

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

    function full_screen(){
        SharedRouter.goto_shared_album_grid(props.title, props.albums);
    }

    return (
        <View style={{paddingVertical: 10}}>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold', left: 15}}>{props.title}</Text>
                {props.refresh ? 
                    <>
                        <Text style={{color: colors.subtext, fontSize: 9, top: 5}}>Last Refreshed: {(last_refresh ?? new Date(0)).toLocaleString()}</Text>
                        <IoniconsTouchableOpacity icon_name="refresh" icon_color={colors.secondary} on_press={refresh_data} icon_size={25} icon_style={{right: 15}} hitslop={12}/>
                    </>
                : null
                }
                <AntDesignTouchableOpacity icon_name="right" icon_color={colors.text} on_press={full_screen} icon_size={20} icon_style={{right: 20}} hitslop={12}/>
            </View>
            <View style={{paddingHorizontal: 10, height: album_list_height, justifyContent: 'center'}}>
                {is_loading ? 
                    <FlashList data={new Array(3)} renderItem={render_album_placeholder} horizontal={true}/> : 
                    <FlashList data={albums.map(item => ({...item, album_type: item.album_type ?? props.else_type}))} renderItem={render_album} horizontal={true}/> }
            </View>
        </View>
    );
};