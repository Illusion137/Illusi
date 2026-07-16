import { Text, View } from "react-native";
import type { Track } from "@illusive/types";
import TrackComponent from "./TrackComponent";
import { Constants } from "@illusive/constants";
import { BASE_WIDTH_FN } from "./TrackComponentBase";
import { chunkify } from "@common/utils/util";
import { FlashList } from "@shopify/flash-list";
import { get_common_styles } from "@utils/common_styles";
import usePTheme from "@hooks/usePTheme";
import { AntDesignTouchableOpacity } from "./TouchableIconOpacity";
import { SharedRouter } from "@utils/shared_routes";
import useDimensions from "@hooks/useDimensions";
import { useCallback, useMemo } from "react";

export default function TrackHorizontalScrolls(props: {
    title: string;
    height: number;
    tracks: Track[];
    replace_album_with?: keyof Track;
}){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);
    const { width } = useDimensions();
    const track_width = useMemo(() => width * .95, [width]);
    const split_tracks: Track[][] = useMemo(() => chunkify(props.tracks, props.height), [props.tracks, props.height]);

    const render_track_column = useCallback((item: {item: Track[]}) =>
    (
        <View>
            {
                item.item.map(track => (
                    <View key={track.uid} style={{width: track_width}}>
                        <TrackComponent
                            track_data={track}
                            width_fn={() => BASE_WIDTH_FN(Constants.library_write_playlist)}
                            write_playlist_uuid={Constants.library_write_playlist}
                            from={"Illusi"}
                            track_callback={() => props.tracks}
                            base_background={true}
                            replace_album_with={props.replace_album_with}/>
                    </View>
                ))
            }
        </View>
    ), [track_width, props.tracks, props.replace_album_with]);
    // Stable keys — the old gen_uuid() fallback minted a new key every render,
    // forcing FlashList to remount columns.
    const key_extractor = useCallback((item: Track[], index: number) => item[0]?.uid ?? `col-${index}`, []);

    function full_screen(){
        SharedRouter.goto_shared_track_list(props.title, props.tracks);
    }

    return (
    <>
    {props.tracks.length > 0 ?
        <>
            <View style={{flexDirection: 'row', alignContent: 'center', width: '100%', justifyContent: 'space-between', marginBottom: 10, marginTop: 10}}>
                <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold', left: 20}}>{props.title}</Text>
                <AntDesignTouchableOpacity icon_name="right" icon_color={colors.text} on_press={full_screen} icon_size={20} icon_style={{right: 20, top: 5}} hitslop={12}/>
            </View>
            <View style={common_styles.line_long}/>
            <FlashList data={split_tracks}
                renderItem={render_track_column}
                keyExtractor={key_extractor}
                horizontal={true}
                decelerationRate={0}
                snapToInterval={track_width}
                snapToAlignment={"center"}
                />
        </>
        : null
    }
    </>
    );
}