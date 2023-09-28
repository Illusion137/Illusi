const { Queue } = require("./app/Illusive/Queue");
import * as SQLite from 'expo-sqlite'
import * as FileSystem from 'expo-file-system';
import ytdl from "react-native-ytdl"

export const thumbnailsCacheDir = FileSystem.documentDirectory + "CachedThumbnails/"; 
export let DOWNLOADING = [];
export let db = SQLite.openDatabase('illusi-db.sqlite3')
export const importedIcon = require("./assets/imported.png")
export const SQLTracks = [];
export let IsPlaying = false
export let addTrackIntoQueueTracksMutex = false
export let playingTracks = [];
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
            // url = await ytdl(`https://www.youtube.com/watch?v=${track.video_id}`, { quality: '140' }); // Low:18 - Med:22 - High:37
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
            'contentType': (track.youtube && !track.downloaded && !track.imported) ? 'video/mp4; codecs="avc1.42001E, mp4a.40.2"' : undefined
        }
    } catch (error) {
        console.log(error)
        return null;
    }
}
export let queueTracks = [];
export let pQueue = new Queue()
export let mutex = false
export let deletedCacheMutex = false

export let playingTracksIndex = 0;