import { FlatList } from "react-native"
import { CompactArtist } from "../../lib-origin/Illusive/src/types"
import RowArtist from "./RowArtist"

export default function HorizontalRowArtists(props: {
    artists: CompactArtist[]
}){

    const render_item = (item: {item: CompactArtist}) => (<RowArtist artist_data={item.item}/>)

    return (
        <FlatList data={props.artists} renderItem={render_item} horizontal={true} contentContainerStyle={{flexDirection: 'row'}}/>
    )
}