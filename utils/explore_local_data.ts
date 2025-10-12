import { Constants } from "@illusive/constants";
import type { CompactPlaylist, ISOString, NamedUUID } from "@illusive/types";
import { reinterpret_cast } from '../lib-origin/common/cast';

export namespace ExploreLocalData {
    const base_artist: NamedUUID[] = [{name: Constants.local_illusi_person_name, uri: null}];
    const year = new Date().getFullYear();
    const valentines_day = reinterpret_cast<ISOString>(new Date(`February 14 ${year}`).toISOString());
    const halloween_day = reinterpret_cast<ISOString>(new Date(`October 31 ${year}`).toISOString());
    const christmas_day = reinterpret_cast<ISOString>(new Date(`December 25 ${year}`).toISOString());
    
    export const valentines_playlist: CompactPlaylist = {
        title: {name: "<3", uri: null},
        artist: base_artist,
        date: valentines_day,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "ALBUM",
    };
    export const halloween_playlist: CompactPlaylist = {
        title: {name: "Spooky", uri: null},
        artist: base_artist,
        date: halloween_day,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "ALBUM",
    };
    export const christmas_playlist: CompactPlaylist = {
        title: {name: "Santa Time", uri: null},
        artist: base_artist,
        date: christmas_day,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "ALBUM",
    };
    export const christmas_extended_playlist: CompactPlaylist = {
        title: {name: "Santa Time (Extended)", uri: null},
        artist: base_artist,
        date: christmas_day,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };

    export const seasonal_illusi_playlists: CompactPlaylist[] = [
        valentines_playlist,
        halloween_playlist,
        christmas_playlist,
        christmas_extended_playlist
    ];

    export const new_detroit_playlist: CompactPlaylist = {
        title: {name: "New Detroit", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const old_detroit_playlist: CompactPlaylist = {
        title: {name: "Old Detroit", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const classical_playlist: CompactPlaylist = {
        title: {name: "Clasical", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const alt_rock_playlist: CompactPlaylist = {
        title: {name: "Alt-Rock", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const indie_playlist: CompactPlaylist = {
        title: {name: "Indie", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const cry_playlist: CompactPlaylist = {
        title: {name: "#CRY", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const certified_playlist: CompactPlaylist = {
        title: {name: "Certi", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const jpop_playlist: CompactPlaylist = {
        title: {name: "JPop", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const vocaloid_playlist: CompactPlaylist = {
        title: {name: "Vocaloid", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };
    export const mexican_playlist: CompactPlaylist = {
        title: {name: "White Girls", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };    
    export const whitegirls_playlist: CompactPlaylist = {
        title: {name: "White Girls", uri: null},
        artist: base_artist,
        explicit: "NONE",
        album_type: "ALBUM",
        type: "PLAYLIST",
    };

    export const illusi_recommend_playlists = [
        new_detroit_playlist,
        old_detroit_playlist,
        classical_playlist,
        alt_rock_playlist,
        indie_playlist,
        cry_playlist,
        certified_playlist,
        jpop_playlist,
        vocaloid_playlist,
        mexican_playlist,
        whitegirls_playlist
    ];
};