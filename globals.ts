const { Queue } = require("./app/Illusive/Queue");
import * as SQLite from 'expo-sqlite'
import * as FileSystem from 'expo-file-system';
import ytdl from "react-native-ytdl"
import { Alert } from 'react-native';
import { prefs } from './Preferences';
import { Artwork, DownloadTrackResult, SetState, SmallTrack, Track } from './types';

export const thumbnailsCacheDir = FileSystem.documentDirectory + "CachedThumbnails/"; 
export let DOWNLOADING: 
    {
        'uid': string, 
        'progress': number, 
        'progress_updater': SetState, 
        'duration': number,
        'execution_id'?: number
    }[] = [];
export let db = SQLite.openDatabase('illusi-db.sqlite3')
export const importedIcon = require("./assets/imported.png")
export const notfoundIcon = require('./assets/notfound.png')

export let global_var = {
    "SQLTracks": [] as Track[],
    "IsPlaying": false,
    "addTrackIntoQueueTracksMutex": false,
    "playingTracks": [] as Track[],
    "queueTracks": [] as Track[],
    "playingQueue": new Queue(),
    "mutex": false,
    "deletedCacheMutex": false,
    "initialPlaybackTrackChangedMutex": true,
    "playingTracksIndex": 0,
    "ableToPlayAgainMutex": false,
    "selectedPlaylist": new Set(),
    "playTracks": (first_track: Track, tracks: Track[], playlist_name: string) => {},
    "downloadTrack": (track: Track, progress_updater: SetState, start_download: SetState, set_finished_downloaded?: SetState): any => {}
};

export async function playingTrackToRNTrack(track){
    try {
        let artwork = "";
        if(track.imported)
            artwork = importedIcon;
        else if(track.thumbnail_URI !== "")
            artwork = thumbnailsCacheDir + track.thumbnail_URI;
        else
            artwork = `https://img.youtube.com/vi/${track.video_id}/maxresdefault.jpg`
        let url = "";
        if(track.downloaded || track.imported)
            url = FileSystem.documentDirectory + track.media_URI
        else if(track.youtube){
            let requestOptions = {}
            if(prefs.settings.use_cookies_on_playback){
                requestOptions = {'headers': {
                    'Cookies': prefs.external_services.youtube_cookies
                }}
            }
            const yt_urls = await ytdl(`https://www.youtube.com/watch?v=${track.video_id}`, { quality: '18', 'requestOptions': requestOptions }); // Low:18 - Med:22 - High:37
            url = yt_urls[0].url;
        }
        return {
            'url': url as string,
            'title': track.video_name as string, 
            'artist': track.video_creator as string, 
            'duration': track.video_duration as number, 
            'id': track.uid as string, 
            'artwork': artwork as Artwork,
            'contentType': (track.youtube && !track.downloaded && !track.imported) ? 'video/mp4' : undefined
            // 'contentType': (track.youtube && !track.downloaded && !track.imported) ? 'audio/mp4' : undefined
        }
    } catch (error) {
        let err = String(error)
        if(err.includes("Video unavailable")){
            const t = await db.execAsync([{sql: `SELECT * FROM tracks WHERE uid = (?)`, args: [track.uid]}], false);
            const small_track = (t[0] as SQLite.ResultSet).rows[0] as SmallTrack
            let allPromises = [];
            allPromises.push(db.execAsync([{sql: `DELETE FROM tracks WHERE uid=?`, args: [small_track.uid]}], false));
            allPromises.push( db.execAsync([{sql: 'INSERT INTO backpack (uid, video_id, video_name, video_creator, video_duration) values (?, ?, ?, ?, ?)', args: small_track.toSQLInsert()}], false) );
        
            Alert.alert("Error", err)

            await Promise.all(allPromises);
            return 'skip'
        }
        Alert.alert("Error", err)
        return null;
    }
}