import { decode_track } from "@illusive/discord";
import { GLOBALS } from "@illusive/globals";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import * as Linking from "expo-linking";
import { SharedRouter } from "./shared_routes";
import type { MusicServiceType } from "@illusive/types";

async function link_incoming_track(etrack: string) {
    console.log(etrack);
    const track = SQLTracks.add_playback_saved_data_to_track(decode_track(etrack));
    GLOBALS.global_var.play_tracks(track, [track], "Shared Track");
}

async function link_incoming_playlist(playlist_uri: string) {
    SharedRouter.goto_shared_playlist(playlist_uri, "URI", {
        force_order: "1",
    });
}

function handle_illusi_url(url: string) {
    const parsed = Linking.parse(url);
    if (parsed.path?.startsWith("track")) {
        const etrack = parsed.path.split("/")[1];
        link_incoming_track(etrack);
    }
    else if (parsed.path?.startsWith("playlist")) {
        const playlist_uri = parsed.path.split("/")[1];
        link_incoming_playlist(playlist_uri);
    }
}

const service_hostname_map: Record<MusicServiceType, string> = {
    Illusi: "illusi.dev",
    Musi: "feelthemusi.com",
    YouTube: "www.youtube.com",
    "YouTube Music": "music.youtube.com",
    Spotify: "spotify.com",
    "Amazon Music": "music.amazon.com",
    "Apple Music": "music.apple.com",
    SoundCloud: "soundcloud.com",
    BandLab: "bandlab.com",
    API: "$$NO_USE$$"
} as const;
const service_linking_map: Record<MusicServiceType, (url: Linking.ParsedURL) => Promise<void>> = {
    Illusi: async (url) => { },
    Musi: async (url) => { },
    YouTube: async (url) => { },
    "YouTube Music": async (url) => { },
    Spotify: async (url) => { },
    "Amazon Music": async (url) => { },
    "Apple Music": async (url) => { },
    SoundCloud: async (url) => { },
    BandLab: async (url) => { },
    API: async (url) => { }
};

function handle_link(url: string) {
    if (url.startsWith("illusi:///")) {
        handle_illusi_url(url);
        return;
    }
    const parsed = Linking.parse(url);
    if (parsed.hostname === "actions") {
        if (!parsed.queryParams) return;
        if (!("url" in parsed.queryParams)) return;
        const parsed_query = Linking.parse(parsed.queryParams.url as string);
        if (parsed_query.scheme === "illusi") handle_illusi_url(parsed.queryParams.url as string);
        else {
            for (const key of Object.keys(service_hostname_map) as MusicServiceType[]) {
                if (parsed_query.hostname?.includes(service_hostname_map[key])) {
                    service_linking_map[key](parsed_query);
                }
            }
        }
    }

}

export function get_linking_handler() {
    Linking.getInitialURL().then(url => {
        if (url) handle_link(url);
    });

    const linking_handler = Linking.addEventListener("url", async ({ url }) => {
        if (url) handle_link(url);
    });

    return linking_handler;
}