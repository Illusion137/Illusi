import AlbumGridRenderer from "@screens/search/AlbumGridRenderer";
import { shared_values } from "@utils/shared_values";
import { useLocalSearchParams } from "expo-router";

export default function AlbumGrid(){
    const { title } = useLocalSearchParams<{title: string}>();
    return (<AlbumGridRenderer title={title} album_data={shared_values.album_grid}/>);
}