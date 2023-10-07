const { Queue } = require("./app/Illusive/Queue");
import * as SQLite from 'expo-sqlite'
import * as FileSystem from 'expo-file-system';
import ytdl from "react-native-ytdl"
import { Alert } from 'react-native';

export const thumbnailsCacheDir = FileSystem.documentDirectory + "CachedThumbnails/"; 
export let DOWNLOADING = [];
export let db = SQLite.openDatabase('illusi-db.sqlite3')
export const importedIcon = require("./assets/imported.png")
export const notfoundIcon = require('./assets/notfound.png')
export const SQLTracks = [];

export let IsPlaying = false
export let addTrackIntoQueueTracksMutex = false
export let playingTracks = [];

class SmallTrack {
    constructor(t) {
        this.uid = t.uid || "";
        this.video_id = String(t.video_id) || "";
        this.video_name = String(t.video_name) || "";
        this.video_creator = String(t.video_creator) || "";
        this.video_duration = t.video_duration || 0;
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

export async function playingTrackToRNTrack(track){
    try {
        let artwork = "";
        if(track.imported)
            artwork = importedIcon;
        else if(track.thumbnail_URI !== "")
            artwork = thumbnailsCacheDir + track.thumbnail_URI;
        else
            artwork = `https://img.youtube.com/vi/${track.video_id}/mqdefault.jpg`
        let url = "";
        if(track.downloaded || track.imported)
            url = FileSystem.documentDirectory + track.media_URI
        else if(track.youtube){
            url = await ytdl(`https://www.youtube.com/watch?v=${track.video_id}`, { quality: '18' }); // Low:18 - Med:22 - High:37
            // url = await ytdl(`https://www.youtube.com/watch?v=${track.video_id}`, { quality: '140'}); // Low:18 - Med:22 - High:37
            url = url[0].url
        }
        return {
            'url': url,
            'title': track.video_name, 
            'artist': track.video_creator, 
            'duration': track.video_duration, 
            'id': track.uid, 
            'artwork': artwork,
            // 'contentType': (track.youtube && !track.downloaded && !track.imported) ? 'audio/mp4; codecs="mp4a.40.2"' : undefined
            // 'contentType': (track.youtube && !track.downloaded && !track.imported) ? 'video/mp4; codecs="avc1.42001E, mp4a.40.2"' : undefined
            'contentType': (track.youtube && !track.downloaded && !track.imported) ? 'video/mp4' : undefined
        }
    } catch (error) {
        let err = String(error)
        if(err.includes("Video unavailable")){
            let t = await db.execAsync([{sql: `SELECT * FROM tracks WHERE uid = (?)`, args: [track.uid]}], false);
            t = t[0].rows[0]
            t = new SmallTrack(t)
            let allPromises = [];
            allPromises.push(db.execAsync([{sql: `DELETE FROM tracks WHERE uid=?`, args: [t.uid]}], false));
            allPromises.push( db.execAsync([{sql: 'INSERT INTO backpack (uid, video_id, video_name, video_creator, video_duration) values (?, ?, ?, ?, ?)', args: t.toSQLInsert()}], false) );
        
            Alert.alert("Error", err)

            await Promise.all(allPromises);
            return 'skip'
        }
        Alert.alert("Error", err)
        return null;
    }
}
export let queueTracks = [];
export let pQueue = new Queue()
export let mutex = false
export let deletedCacheMutex = false
export let initialPlaybackTrackChangedMutex = true;

export let playingTracksIndex = 0;