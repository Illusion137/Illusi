import AlbumGridRenderer from "@screens/search/AlbumGridRenderer";
import { shared_values } from "@utils/shared_values";

export default function NewReleasesGrid(){

    return (<AlbumGridRenderer album_data={shared_values.cached_new_releases}/>);
}