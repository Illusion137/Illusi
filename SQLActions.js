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
        this.ytmusic = t.ytmusic || false;
        this.applemusic = t.applemusic || false;
        this.lvid = t.lvid || false;
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
        toArray.push(this.ytmusic)
        toArray.push(this.applemusic)
        toArray.push(this.lvid)
  
        return toArray;
    }
}

export async function recreateAllTables(){
    await GLOBALS.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS tracks (uid STRING PRIMARY KEY, video_id STRING, video_name STRING, video_creator STRING, video_duration INTEGER, media_URI STRING, thumbnail_URI STRING, saved BOOLEAN, imported BOOLEAN, downloaded BOOLEAN, youtube BOOLEAN, soundcloud BOOLEAN, spotify BOOLEAN, amazonmusic BOOLEAN, ytmusic BOOLEAN, applemusic BOOLEAN, longvid BOOLEAN )', args: []}], false);
    await GLOBALS.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY, playlist_name STRING, pinned BOOLEAN)', args: []}], false);
}

export async function createPlaylist(playlistName){
    let playlistNames = await getAllPlaylists();
    let count = 0;
    while(playlistNames.findIndex((item) => item.playlist_name == `${playlistName} ${count}`) != -1 && count <= 100){
        count++;
    }
    playlistName = `${playlistName} ${count}`;

    await GLOBALS.db.execAsync([{sql: 'INSERT INTO playlists (playlist_name, pinned) Values (?, false)', args: [playlistName]}], false)
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
 
export async function fetchTrackData() {
    let tracks = await GLOBALS.db.execAsync([{sql: 'SELECT * FROM tracks', args: []}], false);
    GLOBALS.SQLTracks = tracks[0].rows
    for(let i = 0; i < GLOBALS.SQLTracks.length; i++){
        GLOBALS.SQLTracks[i].video_name = String(GLOBALS.SQLTracks[i].video_name)
        GLOBALS.SQLTracks[i].video_creator = String(GLOBALS.SQLTracks[i].video_creator)
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
    let playlist = await GLOBALS.db.execAsync([{sql: `SELECT * FROM tracks WHERE uid IN (SELECT track_uid FROM ${playlistName})`, args: []}], false);
    return playlist[0].rows;
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

export async function insertTrackData(track) {
    GLOBALS.SQLTracks.push(track)
    let tracks = await GLOBALS.db.execAsync([{sql: 'INSERT INTO tracks (uid, video_id, video_name, video_creator, video_duration, media_URI, thumbnail_URI, saved, imported, downloaded, youtube, soundcloud, spotify, amazonmusic, ytmusic, applemusic, longvid) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: track.toSQLInsert()}], false);
}

export async function insertTrackIntoPlaylist(track, playlistName) {
    let tracks = await GLOBALS.db.execAsync([{sql: `INSERT INTO ${playlistName.replaceAll(' ', '_')} (track_uid) values (?)`, args: [track.uid]}], false);
}
