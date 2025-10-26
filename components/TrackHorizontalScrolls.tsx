import { Dimensions, View } from "react-native";
import { Track } from "@illusive/types";
import TrackComponent from "./TrackComponent";
import { Constants } from "@illusive/constants";
import { BASE_WIDTH_FN } from "./TrackComponentBase";
import { chunkify, gen_uuid } from "@common/utils/util";
import { FlashList } from "@shopify/flash-list";

export default function TrackHorizontalScrolls(props: {
    height: number;
    tracks: Track[];
    replace_album_with?: keyof Track;
}){
    const screen_width = Dimensions.get('screen').width;
    const track_width = screen_width * .95;
    const split_tracks: Track[][] = chunkify(props.tracks, props.height);
    
    const RenderTrackComponent = (item: {item: Track}) =>
    (
        <View key={item.item.uid} style={{width: track_width}}>
            <TrackComponent key={item.item.uid} 
                track_data={item.item}
                width_fn={() => BASE_WIDTH_FN(Constants.library_write_playlist)} 
                write_playlist_uuid={Constants.library_write_playlist} 
                from={"Illusi"} 
                track_callback={() => props.tracks}
                base_background={true}
                replace_album_with={props.replace_album_with}/>
        </View>
    );

    const RenderTrackColumnComponent = (item: {item: Track[]}) =>
    (
        <View key={item.item?.[0]?.uid ?? gen_uuid()}>
            {
                item.item.map(track => (
                    <RenderTrackComponent key={track.uid} item={track}/>
                ))
            }
        </View>
    );

    return (
        <FlashList data={split_tracks}
            renderItem={RenderTrackColumnComponent}
            horizontal={true}
            decelerationRate={0}
            snapToInterval={track_width}
            snapToAlignment={"center"}
            />
    );

    // return (<ScrollView 
    //         horizontal={true} 
    //         decelerationRate={0}
    //         snapToInterval={track_width} //your element width
    //         snapToAlignment={"center"}>
    //     {split_tracks.map((tracks_chunk, i) => (
    //         <FlashList key={i} scrollEnabled={false} data={tracks_chunk} renderItem={render_track_component}/>
    //     ))}
    // </ScrollView>)
}