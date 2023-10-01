import * as FileSystem from 'expo-file-system';
import * as Prefs from './Preferences';
import * as GLOBALS from './globals';
export class Track { 
    constructor(t) {
        this.uid = t.uid || "";
        this.video_id = t.video_id || "";
        this.video_name = t.video_name || "";
        this.video_creator = t.video_creator || "";
        this.video_duration = t.video_duration || -1;
        this.media_URI = t.media_URI || "";
        this.thumbnail_URI = t.thumbnail_URI || "";
        this.saved = t.saved || false;
        this.imported = t.imported || false;
        this.downloaded = t.downloaded || false;
        this.youtube = t.youtube || false;
        this.soundcloud = t.soundcloud || false;
        this.spotify = t.spotify || false;
        this.amazonmusic = t.amazonmusic || false;
        this.applemusic = t.applemusic || false;
        this.lvid = t.lvid || false;
        this.exid = t.exid || "";
    }
    toSQLInsert(){
        const toArray = [];
        
        toArray.push(this.uid)
        toArray.push(this.video_id)
        toArray.push(this.video_name)
        toArray.push(this.video_creator)
        toArray.push(this.video_duration)
        toArray.push(this.media_URI)
        toArray.push(this.thumbnail_URI)
        toArray.push(this.saved)
        toArray.push(this.imported)
        toArray.push(this.downloaded)
        toArray.push(this.youtube)
        toArray.push(this.soundcloud)
        toArray.push(this.spotify)
        toArray.push(this.amazonmusic)
        toArray.push(this.applemusic)
        toArray.push(this.lvid)
        toArray.push(this.exid)
        
        return toArray;
    }
}

export async function recreateAllTables(){
    await GLOBALS.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS tracks (id INTEGER PRIMARY KEY, uid STRING, video_id STRING, video_name STRING, video_creator STRING, video_duration INTEGER, media_URI STRING, thumbnail_URI STRING, saved BOOLEAN, imported BOOLEAN, downloaded BOOLEAN, youtube BOOLEAN, soundcloud BOOLEAN, spotify BOOLEAN, amazonmusic BOOLEAN, applemusic BOOLEAN, longvid BOOLEAN, exid STRING )', args: []}], false);
    await GLOBALS.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS recently_played_tracks (id INTEGER PRIMARY KEY, uid STRING, video_id STRING, video_name STRING, video_creator STRING, video_duration INTEGER, media_URI STRING, thumbnail_URI STRING, saved BOOLEAN, imported BOOLEAN, downloaded BOOLEAN, youtube BOOLEAN, soundcloud BOOLEAN, spotify BOOLEAN, amazonmusic BOOLEAN, applemusic BOOLEAN, longvid BOOLEAN, exid STRING )', args: []}], false);
    await GLOBALS.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY, playlist_name STRING, pinned BOOLEAN, thumbnail_URI STRING)', args: []}], false);
    await createCacheDirs();
}

export async function createPlaylist(playlistName, thumbnailToDownload = undefined){
    let playlistNames = await getAllPlaylists();
    let count = 2;
    if(playlistNames.findIndex((item) => item.playlist_name == playlistName) != -1){
        while(playlistNames.findIndex((item) => item.playlist_name == `${playlistName} ${count}`) != -1 && count <= 100){
            count++;
        }
        if(count > 0)
            playlistName = `${playlistName} ${count}`;
    }
    if(thumbnailToDownload === undefined)
        await GLOBALS.db.execAsync([{sql: 'INSERT INTO playlists (playlist_name, pinned, thumbnail_URI) Values (?, false, "")', args: [playlistName]}], false)
    else{
        let thumbnail_URI;
        await GLOBALS.db.execAsync([{sql: 'INSERT INTO playlists (playlist_name, pinned, thumbnail_URI) Values (?, false, ?)', args: [playlistName, thumbnail_URI]}], false)
    }

    await GLOBALS.db.execAsync([{sql: `CREATE TABLE IF NOT EXISTS ${playlistName.replaceAll(' ', '_')} (id INTEGER PRIMARY KEY, track_uid STRING)`, args: []}], false);
}

export async function deleteAllTables(){
    await GLOBALS.db.execAsync([{sql: 'DELETE FROM tracks', args: []}], false)
}

export async function fetchTrackDataFromUID(uid) {
    let track = await GLOBALS.db.execAsync([{sql: `SELECT * FROM tracks WHERE uid = (?)`, args: [uid]}], false);
    return track[0].rows[0]; 
}

export async function setTrackAsDownloaded(uid, media_URI) {
    await GLOBALS.db.execAsync([{sql: `UPDATE tracks SET media_URI="${media_URI}", downloaded=true WHERE uid="${uid}"`, args: []}], false);
    await fetchTrackData();
}

export function getTrackArtwork(track){
    if(track.imported || false)
        return GLOBALS.importedIcon;
    else if(track.thumbnail_URI || "" !== "")
        return {'uri': GLOBALS.thumbnailsCacheDir + track.thumbnail_URI};
    else if(track.youtube || false)
        return {'uri': `https://img.youtube.com/vi/${track.video_id}/mqdefault.jpg`, 'cache': 'force-cache'}
    return {uri: ""} ;
}
export function getTrackArtworkRP(track){
    return {'uri': `https://img.youtube.com/vi/${track.video_id}/mqdefault.jpg`, 'cache': 'force-cache'}
}

export async function fetchTrackData() {
    let tracks = await GLOBALS.db.execAsync([{sql: 'SELECT * FROM tracks', args: []}], false);
    GLOBALS.SQLTracks = tracks[0].rows
    for(let i = 0; i < GLOBALS.SQLTracks.length; i++){
        GLOBALS.SQLTracks[i].video_name = String(GLOBALS.SQLTracks[i].video_name)
        GLOBALS.SQLTracks[i].video_creator = String(GLOBALS.SQLTracks[i].video_creator)
        GLOBALS.SQLTracks[i].saved = Boolean(GLOBALS.SQLTracks[i].saved)
        GLOBALS.SQLTracks[i].downloaded = Boolean(GLOBALS.SQLTracks[i].downloaded)
        GLOBALS.SQLTracks[i].lvid = Boolean(GLOBALS.SQLTracks[i].lvid)
        GLOBALS.SQLTracks[i].amazonmusic = Boolean(GLOBALS.SQLTracks[i].amazonmusic)
        GLOBALS.SQLTracks[i].applemusic = Boolean(GLOBALS.SQLTracks[i].applemusic)
        GLOBALS.SQLTracks[i].soundcloud = Boolean(GLOBALS.SQLTracks[i].soundcloud)
        GLOBALS.SQLTracks[i].spotify = Boolean(GLOBALS.SQLTracks[i].spotify)
        GLOBALS.SQLTracks[i].youtube = Boolean(GLOBALS.SQLTracks[i].youtube)
        GLOBALS.SQLTracks[i]['artwork'] = getTrackArtwork(GLOBALS.SQLTracks[i])
    }
}

export async function getAllTables() {
    let tables = await GLOBALS.db.execAsync([{sql: "SELECT * FROM sqlite_master where type='table'", args: []}], false);
    return tables[0].rows;

}

export async function pinUnpinPlaylist(playlistName, pin) {
    if(pin)
        await GLOBALS.db.execAsync([{sql: `UPDATE playlists SET pinned=true WHERE playlist_name="${playlistName}"`, args: []}], false);
    else
        await GLOBALS.db.execAsync([{sql: `UPDATE playlists SET pinned=false WHERE playlist_name="${playlistName}"`, args: []}], false);
}

export async function getPlaylistTracks(playlistName) {
    let playlist = await GLOBALS.db.execAsync([{sql: `SELECT * FROM tracks AS t JOIN ${playlistName} AS p ON p.track_uid = t.uid ORDER BY p.id`, args: []}], false);
    let data = playlist[0].rows
    for(let i = 0; i < data.length; i++){
        data[i].video_name = String(data[i].video_name)
        data[i].video_creator = String(data[i].video_creator)
        data[i].saved = Boolean(data[i].saved)
        data[i].downloaded = Boolean(data[i].downloaded)
        data[i].lvid = Boolean(data[i].lvid)
        data[i].amazonmusic = Boolean(data[i].amazonmusic)
        data[i].applemusic = Boolean(data[i].applemusic)
        data[i].soundcloud = Boolean(data[i].soundcloud)
        data[i].spotify = Boolean(data[i].spotify)
        data[i].youtube = Boolean(data[i].youtube)
        data[i]['artwork'] = getTrackArtwork(data[i])
    }
    return data;
}

export async function getAllPlaylists() {
    let playlists = await GLOBALS.db.execAsync([{sql: "SELECT playlist_name FROM playlists", args: []}], false);
    return playlists[0].rows;
}

export async function getAllPlaylistsData() {
    let playlists = await GLOBALS.db.execAsync([{sql: "SELECT * FROM playlists", args: []}], false);
    return playlists[0].rows;
}

export async function getIsPlaylistsPinned(playlistName) {
    let playlists = await GLOBALS.db.execAsync([{sql: `SELECT pinned FROM playlists WHERE playlist_name="${playlistName}"`, args: []}], false);
    return playlists[0].rows[0].pinned;
}
export async function deleteAllPlaylists() {
    let playlistNames = await getAllPlaylists();
    for(const playlist_name of playlistNames){
        await GLOBALS.db.execAsync([{sql: `DELETE FROM playlists`, args: []}], false);
        await GLOBALS.db.execAsync([{sql: `DROP TABLE "${playlist_name.playlist_name.replaceAll(' ', '_')}"`, args: []}], false);
    }
}

export async function deletePlaylist(playlistName) {
    await GLOBALS.db.execAsync([{sql: `DELETE FROM playlists WHERE playlist_name="${playlistName}"`, args: []}], false);
    await GLOBALS.db.execAsync([{sql: `DROP TABLE "${playlistName.replaceAll(' ', '_')}"`, args: []}], false);
}

export async function deleteTrackInPlaylist(playlistName, track_uid) {
    await GLOBALS.db.execAsync([{sql: `DELETE FROM ${playlistName.replaceAll(' ', '_')} WHERE track_uid = ?`, args: [track_uid]}], false);
}

export async function deleteTrack(uid) {
    await GLOBALS.db.execAsync([{sql: `DELETE FROM tracks WHERE uid=?`, args: [uid]}], false);
}

export async function checkIfVideoIdExists(video_id){
    let count = await GLOBALS.db.execAsync([{sql: 'SELECT COUNT(tracks.video_id) FROM tracks WHERE tracks.video_id = ?;', args: [video_id]}], false);
    count = count[0].rows[0]["COUNT(tracks.video_id)"]
    return count > 0
}

export async function getExistingVideoIdUID(video_id){
    let track = await GLOBALS.db.execAsync([{sql: 'SELECT uid FROM tracks WHERE video_id = ?;', args: [video_id]}], false);
    return track[0].rows[0]
}

export async function readCacheDirs(){
    return await FileSystem.readDirectoryAsync(GLOBALS.thumbnailsCacheDir)
}

export async function deleteUnusedCachedThumbnails(){
    let files = await readCacheDirs();
    let allPromises = []
    for(let i = 0; i < GLOBALS.SQLTracks.length; i++){
        if(!GLOBALS.SQLTracks[i].imported || false){
            let itemIndex = files.findIndex((item) => item == GLOBALS.SQLTracks[i].thumbnail_URI)
            if(itemIndex !== -1){
                files.splice(itemIndex, 1)
            }
        }
    }
    for(const file of files)
        allPromises.push(FileSystem.deleteAsync(GLOBALS.thumbnailsCacheDir + file))
    await Promise.all(allPromises);
}

export async function deleteCacheDirs(){
    await FileSystem.deleteAsync(GLOBALS.thumbnailsCacheDir, {'idempotent': true});
}

export async function createCacheDirs(){
    if(!(await FileSystem.getInfoAsync(GLOBALS.thumbnailsCacheDir)).exists){
        await FileSystem.makeDirectoryAsync(GLOBALS.thumbnailsCacheDir)
    }
}

export async function insertTrackData(track) {
    if(Prefs.getExperimentalFeatureEnabled('auto_cache_thumbnails') && track.youtube){
        track.thumbnail_URI = track.uid + ".jpg"
        const thumbnailDownload = FileSystem.createDownloadResumable(`https://img.youtube.com/vi/${track.video_id}/mqdefault.jpg`,  GLOBALS.thumbnailsCacheDir + track.thumbnail_URI, {})
		thumbnailDownload.downloadAsync();
    }
    GLOBALS.SQLTracks.push(track)
    await GLOBALS.db.execAsync([{sql: 'INSERT INTO tracks (uid, video_id, video_name, video_creator, video_duration, media_URI, thumbnail_URI, saved, imported, downloaded, youtube, soundcloud, spotify, amazonmusic, applemusic, longvid, exid) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: track.toSQLInsert()}], false);
}

export async function insertTrackIntoPlaylist(track, playlistName) {
    let tracks = await GLOBALS.db.execAsync([{sql: `INSERT INTO ${playlistName.replaceAll(' ', '_')} (track_uid) values (?)`, args: [track.uid]}], false);
}
export async function getRecentlyPlayedData(){
    let tracks = await GLOBALS.db.execAsync([{sql: 'SELECT * FROM recently_played_tracks', args: []}], false);
    let data = tracks[0].rows
    for(let i = 0; i < data.length; i++){
        data[i].video_name = String(data[i].video_name)
        data[i].video_creator = String(data[i].video_creator)
        data[i].saved = Boolean(data[i].saved)
        data[i].downloaded = Boolean(data[i].downloaded)
        data[i].lvid = Boolean(data[i].lvid)
        data[i].amazonmusic = Boolean(data[i].amazonmusic)
        data[i].applemusic = Boolean(data[i].applemusic)
        data[i].soundcloud = Boolean(data[i].soundcloud)
        data[i].spotify = Boolean(data[i].spotify)
        data[i].youtube = Boolean(data[i].youtube)
        data[i]['artwork'] = getTrackArtworkRP(data[i])
    }
    return data;
}
export async function insertTrackIntoRecentlyPlayed(track){
    await GLOBALS.db.execAsync([{sql: 'INSERT INTO recently_played_tracks (uid, video_id, video_name, video_creator, video_duration, media_URI, thumbnail_URI, saved, imported, downloaded, youtube, soundcloud, spotify, amazonmusic, applemusic, longvid, exid) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: track.toSQLInsert()}], false);
}
export async function cleanupRecentlyPlayed(){
    const recently_played_max_size = 100;
    let recently_played_data = await getRecentlyPlayedData();
    recently_played_data.reverse();
    
    let allPromises = [];
    
    if(recently_played_data.length > recently_played_max_size){
        await GLOBALS.db.execAsync([{'sql': 'DELETE FROM recently_played_tracks', 'args': [] }], false);
        for(let i = 0; i < recently_played_max_size; i++){
            let track = recently_played_data[i];
            allPromises.push(
                insertTrackIntoRecentlyPlayed(
                    new Track(
                        {
                            'uid':track.uid,
                            'video_id':track.video_id,
                            'video_name':track.video_name,
                            'video_creator':track.video_creator,
                            'video_duration':track.video_duration,
                            'saved': true,
                            'youtube':track.youtube,
                            'spotify':track.spotify,
                            'amazonmusic':track.amazonmusic,
                            'exid':track.exid,
                        })
                ))
        }
    }
    await Promise.all(allPromises);
}
