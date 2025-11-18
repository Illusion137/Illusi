import { FlashList } from "@shopify/flash-list";
import { View } from "react-native"
import type { CompactArtist } from "@illusive/types"
import RowArtist from "./RowArtist"

export default function HorizontalRowArtists(props: {
    artists: CompactArtist[];
    size?: number;
}){
    const render_item = (item: {item: CompactArtist}) => (<RowArtist size={props.size} artist_data={item.item}/>)

    return (
        <View style={{paddingHorizontal: 10}}>
            <FlashList data={props.artists}
                renderItem={render_item}
                horizontal={true}
                contentContainerStyle={{flexDirection: 'row'}}/>
        </View>
    )
}