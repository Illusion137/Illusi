import ArtistGridRenderer from "@screens/search/ArtistGridRenderer";
import { shared_values } from "@utils/shared_values";
import { useLocalSearchParams } from "expo-router";

export default function ArtistsGrid(){
    const { title } = useLocalSearchParams<{title: string}>();
    return (<ArtistGridRenderer title={title} artist_data={shared_values.artist_grid.map(artist => artist.name)}/>);
}