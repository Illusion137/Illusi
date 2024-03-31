export type Artwork = string | number | {uri: string, cache?: string};

export type EditMode = "NONE" | "DOWNLOAD" | "DELETE" | "EDIT";
export type DownloadTrackResult = "GOOD" | "ERROR";
export type SetState = React.Dispatch<React.SetStateAction<any>>;

export interface Playlist {
    id: number,
    playlist_name: string,
    pinned: boolean,
    thumbnail_uri: string,
    public: boolean,
    public_uid: string,
    inherited_playlists_json: string,
    linked_playlists_json: string
}

export class Track{
    uid: string
    video_id: string
    video_name: string
    video_creator: string
    video_duration: number
    media_uri: string
    thumbnail_uri: string
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
    callback: () => void

    constructor(t: {
        uid: string
        video_id?: string
        video_name: string
        video_creator: string
        video_duration: number
        media_uri?: string
        thumbnail_uri?: string
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
        callback?: () => void
    }){
        this.uid = t.uid;
        this.video_id = t.video_id ?? "";
        this.video_name = t.video_name ?? "";
        this.video_creator = t.video_creator ?? "";;
        this.video_duration = t.video_duration ?? -1;
        this.media_uri = t.media_uri ?? "";
        this.thumbnail_uri = t.thumbnail_uri ?? "";
        this.saved = t.saved ?? false;
        this.imported = t.imported ?? false;
        this.downloaded = t.downloaded ?? false;
        this.youtube = t.youtube ?? false;
        this.soundcloud = t.soundcloud ?? false;
        this.spotify = t.spotify ?? false;
        this.amazonmusic = t.amazonmusic ?? false;
        this.applemusic = t.applemusic ?? false;
        this.exid = t.exid ?? "";
        this.artwork = t.artwork ?? 0
        this.disabled = t.disabled ?? false
        this.callback = t.callback ?? null
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