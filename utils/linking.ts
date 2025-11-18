import { decode_track } from "@illusive/discord";
import { GLOBALS } from "@illusive/globals";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { SharedRouter } from "./shared_routes";

async function link_incoming_track(etrack: string){
    const track = SQLTracks.add_playback_saved_data_to_track(decode_track(etrack));
    GLOBALS.global_var.play_tracks(track, [track], "Shared Track");
    router.replace("/");
}

async function link_incoming_playlist(playlist_uri: string){
    SharedRouter.goto_shared_playlist(playlist_uri, "URI", {
        force_order: "1", 
    });
}

function handle_link(url: string){
    const parsed = Linking.parse(url);
    if(parsed.path?.startsWith("track")) {
        const etrack = parsed.path.split("/")[1];
        link_incoming_track(etrack);
    }
    else if(parsed.path?.startsWith("playlist")) {
        const playlist_uri = parsed.path.split("/")[1];
        link_incoming_playlist(playlist_uri);
    }
}

export function get_linking_handler(){
    Linking.getInitialURL().then(url => {
        if(url) handle_link(url);
    });

    const linking_handler = Linking.addEventListener("url", async ({ url }) => {
        const parsed = Linking.parse(url);

        if (parsed.path?.startsWith("track")) {
            const data = parsed.path.split("/")[1]; 
            console.log(data);
    
            router.replace("/"); // go home
        }
    });

    return linking_handler;
}