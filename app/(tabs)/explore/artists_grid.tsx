import { GLOBALS } from "@illusive/globals";
import { get_unique_artists } from "@illusive/illusive_utils";
import ArtistGridRenderer from "@screens/search/ArtistGridRenderer";
import { useRef } from "react";

export default function ArtistsGrid(){
    const unique_artists = useRef(get_unique_artists(GLOBALS.global_var.sql_tracks));
    return (<ArtistGridRenderer artist_data={unique_artists.current}/>);
}