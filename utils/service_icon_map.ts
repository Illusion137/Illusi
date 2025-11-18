import type { MusicServiceType } from "@illusive/types";
import { type Fontisto } from '@expo/vector-icons';
import { Prefs } from "@illusive/prefs";

export const service_icon_map: Record<MusicServiceType, {color: string, name: keyof (typeof Fontisto)["glyphMap"]}> = {
    Illusi: {
        color: Prefs.prefs.primary_color.default_value,
        name: "star"
    },
    Musi: {
        color: "#FF0000",
        name: "youtube-play"
    },
    YouTube: {
        color: "#FF0000",
        name: "youtube-play"
    },
    "YouTube Music": {
        color: "#FF0000",
        name: "youtube-play"
    },
    Spotify: {
        color: "#1db954",
        name: "spotify"
    },
    "Amazon Music": {
        color: "0077C1",
        name: "amazon"
    },
    "Apple Music": {
        color: "#f94c57",
        name: "applemusic"
    },
    BandLab: {
        color: "#f12d19",
        name: "music-note"
    },
    SoundCloud: {
        color: "#ff5500",
        name: "soundcloud"
    },
    API: {
        color: Prefs.prefs.primary_color.default_value,
        name: "link"
    }
};