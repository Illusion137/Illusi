export type Artwork = string | number | {uri: string, cache?: string};

export type Route<T> = {"key": string, "name": string, "params": T, path: string};

export type SQLType = "INTEGER" | "STRING" | "BOOLEAN";
export type SQLAlter = {"table": string, "action": "DROP",   'column_name': string} | 
                       {"table": string, "action": "RENAME", 'column_name': string, 'new_column_name': string} |
                       {"table": string, "action": "ADD",    'column_name': string, 'type': SQLType}
export type PlayingState = "OFF" | "LOADING" | "ON";
export type EditMode = "NONE" | "DOWNLOAD" | "DELETE" | "EDIT";
export type DownloadTrackResult = "GOOD" | "ERROR";
export type SetState = React.Dispatch<React.SetStateAction<any>>;

export type TrackProps = {"uid": string};
export type SortType = "ALPHABETICAL" | "NEWEST" | "OLDEST"

export type MusicServiceType = "Illusi" | "Musi" | "YouTube" | "YouTube Music" | "Spotify" | "Amazon Music" | "Apple Music" | "SoundCloud" | "API";
export type MusicServiceImport = {tracks: Track[], title: string};

export type DefaultPlaylist = {
    name: string,
    track_function: () => Track[]
};

export type DefaultPlaylistData = {
    name: string,
    tracks: Track[]
};

export interface QueueTrack {
    artwork: Artwork, 
    video_creator: string
    video_name: string
}
export interface MusiTrack {
    video_id: string,
    video_name: string,
    video_creator: string,
    video_duration: number,
}

export interface SQLTable {
    name: string
    rootpage: number
    sql: string
    tbl_name: string
    type: string
}

export interface Playlist {
    id: number,
    playlist_name: string,
    pinned: boolean,
    thumbnail_uri: string,
    sort: SortType,
    public: boolean,
    public_uid: string,
    inherited_playlists_json: string,
    linked_playlists_json: string,
    four_track?: Track[],
    track_count?: number
}

export class Track{
    uid: string
    video_id: string
    video_name: string
    video_creator: string
    video_duration: number
    media_uri: string
    thumbnail_uri: string
    views: number
    saved: boolean
    imported: boolean
    downloaded: boolean
    youtube: boolean
    soundcloud: boolean
    spotify: boolean
    amazonmusic: boolean
    applemusic: boolean
    exid: string
    artwork: Artwork
    disabled: boolean
    successful: boolean
    added: boolean
    callback: () => void

    constructor(t: {
        uid: string
        video_id?: string
        video_name?: string
        video_creator?: string
        video_duration?: number
        media_uri?: string
        thumbnail_uri?: string
        views?: number
        saved?: boolean
        imported?: boolean
        downloaded?: boolean
        youtube?: boolean
        soundcloud?: boolean
        spotify?: boolean
        amazonmusic?: boolean
        applemusic?: boolean
        exid?: string
        artwork?: Artwork
        disabled?: boolean
        successful?: boolean
        added?: boolean
        callback?: () => void
    }){
        this.uid = t.uid;
        this.video_id = t.video_id ?? "";
        this.video_name = t.video_name ?? "";
        this.video_creator = t.video_creator ?? "";
        this.video_duration = t.video_duration ?? -1;
        this.media_uri = t.media_uri ?? "";
        this.thumbnail_uri = t.thumbnail_uri ?? "";
        this.views = t.views ?? 0;
        this.saved = t.saved ?? false;
        this.imported = t.imported ?? false;
        this.downloaded = t.downloaded ?? false;
        this.youtube = t.youtube ?? false;
        this.soundcloud = t.soundcloud ?? false;
        this.spotify = t.spotify ?? false;
        this.amazonmusic = t.amazonmusic ?? false;
        this.applemusic = t.applemusic ?? false;
        this.exid = t.exid ?? "";
        this.artwork = t.artwork ?? 0;
        this.disabled = t.disabled ?? false;
        this.successful = t.successful ?? false;
        this.added = t.added ?? false;
        this.callback = t.callback ?? (() => {});
    }

    toSQLInsert(): any[]{
        const toArray = [];
        
        toArray.push(this.uid)
        toArray.push(this.video_id)
        toArray.push(this.video_name)
        toArray.push(this.video_creator)
        toArray.push(this.video_duration)
        toArray.push(this.media_uri)
        toArray.push(this.thumbnail_uri)
        toArray.push(this.saved)
        toArray.push(this.imported)
        toArray.push(this.downloaded)
        toArray.push(this.youtube)
        toArray.push(this.soundcloud)
        toArray.push(this.spotify)
        toArray.push(this.amazonmusic)
        toArray.push(this.applemusic)
        toArray.push(this.exid)
        
        return toArray;
    }
}

export class SmallTrack {
    uid: string
    video_id: string
    video_name: string
    video_creator: string
    video_duration: number

    constructor(t : {
        uid: string
        video_id: string
        video_name: string
        video_creator: string
        video_duration: number
    }) {
        this.uid = t.uid ?? "";
        this.video_id = String(t.video_id) ?? "";
        this.video_name = String(t.video_name) ?? "";
        this.video_creator = String(t.video_creator) ?? "";
        this.video_duration = t.video_duration ?? 0;
    }
    toSQLInsert(){
        const toArray = [];
        
        toArray.push(this.uid)
        toArray.push(this.video_id)
        toArray.push(this.video_name)
        toArray.push(this.video_creator)
        toArray.push(this.video_duration)
        
        return toArray;
    }
}

type MusicServicePlaylistTitle = string;
type MusicServicePlaylistURL = string;
export class MusicService {
    link_text: string
    valid_playlist_url_regex: RegExp
    has_credentials: () => boolean
    get_playlists_list: () => Promise<Map<MusicServicePlaylistTitle, MusicServicePlaylistURL>>
    get_playlist_import: (url: string) => Promise<MusicServiceImport>
    
    constructor(s: {
        link_text: string,
        valid_playlist_url_regex: RegExp,
        has_credentials: () => boolean,
        get_playlists_list: () => Promise<Map<MusicServicePlaylistTitle, MusicServicePlaylistURL>>,
        get_playlist_import: (url: string) => Promise<MusicServiceImport>
    }){
        this.valid_playlist_url_regex = s.valid_playlist_url_regex;
        this.get_playlists_list = s.get_playlists_list;
        this.has_credentials = s.has_credentials;
        this.link_text = s.link_text;
        this.get_playlist_import = s.get_playlist_import;
    }
}