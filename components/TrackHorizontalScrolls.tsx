import { Dimensions, FlatList, ScrollView, View } from "react-native";
import { Track } from "@illusive/types";
import TrackComponent from "./TrackComponent";
import { Constants } from "@illusive/constants";
import { BASE_WIDTH_FN } from "./TrackComponentBase";

export default function TrackHorizontalScrolls(props: {
    height: number;
    tracks: Track[];
}){
    const screen_width = Dimensions.get('screen').width;
    const track_width = screen_width * .95;
    const split_tracks: Track[][] = props.tracks.reduce((result_array: any[], item, index) => { 
        const chunk_index = Math.floor(index / props.height)
      
        if(!result_array[chunk_index]) {
          result_array[chunk_index] = [] // start a new chunk
        }
      
        result_array[chunk_index].push(item)
      
        return result_array
      }, []);
    const render_track_component = (item: {item: Track}) =>
    (
        <View style={{width: track_width}}>
            <TrackComponent key={item.item.uid} track_data={item.item} width_fn={() => BASE_WIDTH_FN(Constants.library_write_playlist)} write_playlist_uuid={Constants.library_write_playlist} from={"Illusi"} track_callback={() => props.tracks}/>
        </View>
    );

    return (<ScrollView 
            horizontal={true} 
            decelerationRate={0}
            snapToInterval={track_width} //your element width
            snapToAlignment={"center"}>
        {split_tracks.map((tracks_chunk, i) => (
            <FlatList key={i} scrollEnabled={false} data={tracks_chunk} renderItem={render_track_component}/>
        ))}
    </ScrollView>)
}