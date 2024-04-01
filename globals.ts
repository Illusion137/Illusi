const { Queue } = require("./app/Illusive/Queue");
import * as SQLite from 'expo-sqlite'
import * as FileSystem from 'expo-file-system';
import ytdl from "react-native-ytdl"
import { Alert } from 'react-native';
import { prefs } from './Preferences';
import { Artwork, DownloadTrackResult, SetState, SmallTrack, Track } from './types';
import * as TrackPlayer from 'react-native-track-player';

export const thumbnailsCacheDir = FileSystem.documentDirectory + "CachedThumbnails/"; 
export let DOWNLOADING: 
    {
        'uid': string, 
        'progress': number, 
        'progress_updater': SetState, 
        'duration': number,
        'execution_id'?: number
    }[] = [];
export const importedIcon = require("./assets/imported.png");
export const notfoundIcon = require('./assets/notfound.png');

export const app_icons = {
    musi: 'https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/7d/76/2f/7d762f0e-10ab-1ff2-baf7-84cdaca16219/Icon-1x_U007emarketing-0-6-0-85-220.png/350x350.png?',
    youtube: 'https://is5-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/c7/18/fcc718a6-bd55-b1aa-93e4-4073a2ad3b13/logo_youtube_color-1x_U007emarketing-0-6-0-85-220.png/350x350.png?',
    youtube_music: 'https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/44/c6/3d/44c63da2-7a82-bd82-821d-1cd01f2b510f/AppIcon-0-1x_U007emarketing-0-0-0-7-0-0-0-85-220-0.png/350x350.png?',
    spotify: 'https://is2-ssl.mzstatic.com/image/thumb/Purple122/v4/63/64/fa/6364fa97-398a-46da-32ac-765e8f328548/AppIcon-0-1x_U007emarketing-0-6-0-0-0-85-220-0.png/350x350.png?',
    amazon_music: 'https://is4-ssl.mzstatic.com/image/thumb/Purple122/v4/fc/b8/aa/fcb8aae7-180e-7b29-7c83-255f1c86eba8/AppIcon-1x_U007emarketing-0-10-0-85-220.png/350x350.png?',
    apple_music: 'https://is1-ssl.mzstatic.com/image/thumb/Purple122/v4/8e/18/bd/8e18bd19-1453-d9be-620d-66930b61e487/AppIcon-0-0-1x_U007emarketing-0-10-0-85-220.png/246x0w.webp',
    soundcloud: 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/87/15/59/871559b2-5653-32f3-c9aa-b61a39bb8d84/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/246x0w.webp',
}

export let global_var = {
    "db": SQLite.openDatabase('illusi-db.sqlite3'),
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

export async function playingTrackToRNTrack(track): Promise< 'skip' | TrackPlayer.Track >{
    try {
        let artwork = "";
        if(track.imported)
            artwork = importedIcon;
        else if(track.thumbnail_uri !== "")
            artwork = thumbnailsCacheDir + track.thumbnail_uri;
        else
            artwork = `https://img.youtube.com/vi/${track.video_id}/maxresdefault.jpg`
        let url = "";
        if(track.downloaded || track.imported)
            url = FileSystem.documentDirectory + track.media_uri
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
            'artwork': artwork as string,
            'contentType': (track.youtube && !track.downloaded && !track.imported) ? 'video/mp4' : undefined
            // 'contentType': (track.youtube && !track.downloaded && !track.imported) ? 'audio/mp4' : undefined
        }
    } catch (error) {
        let err = String(error)
        if(err.includes("Video unavailable")){
            const t = await global_var.db.execAsync([{sql: `SELECT * FROM tracks WHERE uid = (?)`, args: [track.uid]}], false);
            const small_track = (t[0] as SQLite.ResultSet).rows[0] as SmallTrack
            let allPromises = [];
            allPromises.push(global_var.db.execAsync([{sql: `DELETE FROM tracks WHERE uid=?`, args: [small_track.uid]}], false));
            allPromises.push(global_var.db.execAsync([{sql: 'INSERT INTO backpack (uid, video_id, video_name, video_creator, video_duration) values (?, ?, ?, ?, ?)', args: small_track.toSQLInsert()}], false) );
        
            Alert.alert("Error", err)

            await Promise.all(allPromises);
            return 'skip'
        }
        Alert.alert("Error", err)
        return null;
    }
}