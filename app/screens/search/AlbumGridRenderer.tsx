import { Dimensions, FlatList, View } from "react-native";
import { CompactPlaylist, Route } from "../../../lib-origin/Illusive/src/types";
import Album from "../../components/Album";

export default function AlbumGridRenderer(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{album_data: CompactPlaylist[]}>;
    
    const album_size = Dimensions.get('screen').width * .3;
    const columns = 3;

    const split_albums: [CompactPlaylist, CompactPlaylist, CompactPlaylist][] = (ts_route.params.album_data ?? []).reduce((result_array: any[], item, index) => { 
        const chunk_index = Math.floor(index / columns)
      
        if(!result_array[chunk_index]) {
          result_array[chunk_index] = [] // start a new chunk
        }
      
        result_array[chunk_index].push(item)
      
        return result_array
    }, []);

    const render_item = (item: {item: [CompactPlaylist, CompactPlaylist, CompactPlaylist]}) => (
        <View style={{flexDirection: 'row'}}>
            {item.item[0] ? <Album size={album_size} album_data={item.item[0]} second_line_type={"ARTIST"}/> : null}
            {item.item[1] ? <Album size={album_size} album_data={item.item[1]} second_line_type={"ARTIST"}/> : null}
            {item.item[2] ? <Album size={album_size} album_data={item.item[2]} second_line_type={"ARTIST"}/> : null}
        </View>
    )

    return (
        <>
            <View style={{height: 100}}/>
            <FlatList data={split_albums} renderItem={render_item} ListFooterComponent={() => (<View style={{height: 100}}/>)}/>
        </>
    )
}