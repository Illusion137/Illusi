import GLOBALS from './globals';

class Track { 
    constructor(t) {
        this.uuid = t.uuid || "";
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
        
        toArray.push(this.uuid)
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

async function recreateAllTables(){
    await GLOBALS.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS tracks (uuid STRING PRIMARY KEY, video_id STRING, video_name STRING, video_creator STRING, video_duration INTEGER, media_URI STRING, thumbnail_URI STRING, saved BOOLEAN, imported BOOLEAN, downloaded BOOLEAN, youtube BOOLEAN, soundcloud BOOLEAN, spotify BOOLEAN, amazonmusic BOOLEAN, ytmusic BOOLEAN, applemusic BOOLEAN, longvid BOOLEAN )', args: []}], false);
    await GLOBALS.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY, playlist_name STRING, pinned BOOLEAN)', args: []}], false);
}

async function createPlaylist(playlistName){
    await GLOBALS.db.execAsync([{sql: 'INSERT INTO playlists (playlist_name, pinned) Values (?, false)', args: [playlistName]}], false)
    await GLOBALS.db.execAsync([{sql: `CREATE TABLE IF NOT EXISTS ${playlistName} (id INTEGER PRIMARY KEY, track_uuid STRING)`, args: []}], false);
}

async function deleteAllTables(){
    await GLOBALS.db.execAsync([{sql: 'DELETE FROM tracks', args: []}], false)
}

function fetchTrackDataFromUUID(uuid) {
    let ret;
    GLOBALS.db.transaction(tx => {
      tx.executeSql('SELECT * FROM tracks WHERE uuid = (?)', uuid,
        (txObj, { rows: { _array } }) => {ret = _array},
        (txObj, error) => console.log('Error ', error)
        )
      })
    return ret; 
}
 
async function fetchTrackData() {
    let tracks = await GLOBALS.db.execAsync([{sql: 'SELECT * FROM tracks', args: []}], false);
    GLOBALS.SQLTracks = tracks[0].rows
}

async function getAllTables() {
    let tables = await GLOBALS.db.execAsync([{sql: "SELECT * FROM sqlite_master where type='table'", args: []}], false);
    // tables;
    return tables[0].rows;

}

async function pinUnpinPlaylist(playlistName, pin) {
    if(pin)
        await GLOBALS.db.execAsync([{sql: `UPDATE playlists SET pinned=true WHERE playlist_name="${playlistName}"`, args: []}], false);
    else
        await GLOBALS.db.execAsync([{sql: `UPDATE playlists SET pinned=false WHERE playlist_name="${playlistName}"`, args: []}], false);
}

async function getPlaylistTracks(playlistName) {
    let playlist = await GLOBALS.db.execAsync([{sql: `SELECT * FROM tracks WHERE uuid IN (SELECT track_uuid FROM ${playlistName})`, args: []}], false);
    return playlist[0].rows;
}

async function getAllPlaylists() {
    let playlists = await GLOBALS.db.execAsync([{sql: "SELECT playlist_name FROM playlists", args: []}], false);
    return playlists[0].rows;
}

async function getAllPlaylistsData() {
    let playlists = await GLOBALS.db.execAsync([{sql: "SELECT * FROM playlists", args: []}], false);
    return playlists[0].rows;
}

async function getIsPlaylistsPinned(playlistName) {
    let playlists = await GLOBALS.db.execAsync([{sql: `SELECT pinned FROM playlists WHERE playlist_name="${playlistName}"`, args: []}], false);
    return playlists[0].rows[0].pinned;
}


async function deletePlaylist(playlistName) {
    await GLOBALS.db.execAsync([{sql: `DELETE FROM playlists WHERE playlist_name="${playlistName}"`, args: []}], false);
    await GLOBALS.db.execAsync([{sql: `DELETE FROM "${playlistName}"`, args: []}], false);

}

async function deleteTrackInPlaylist(playlistName) {
    //await GLOBALS.db.execAsync([{sql: `DELETE FROM playlists WHERE playlist_name="${playlistName}"`, args: []}], false);
}

async function deleteTrack(uuid) {
    await GLOBALS.db.execAsync([{sql: `DELETE FROM track WHERE uuid="${uuid}"`, args: []}], false);
}

async function checkIfVideoIdExists(video_id){
    let count = await GLOBALS.db.execAsync([{sql: 'SELECT COUNT(tracks.video_id) FROM tracks WHERE tracks.video_id = ?;', args: [video_id]}], false);
    count = count[0].rows[0]["COUNT(tracks.video_id)"]
    return count > 0
}

async function insertTrackData(track) {
    GLOBALS.SQLTracks.push(track)
    let tracks = await GLOBALS.db.execAsync([{sql: 'INSERT INTO tracks (uuid, video_id, video_name, video_creator, video_duration, media_URI, thumbnail_URI, saved, imported, downloaded, youtube, soundcloud, spotify, amazonmusic, ytmusic, applemusic, longvid) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: track.toSQLInsert()}], false);
}

async function insertTrackIntoPlaylist(track, playlistName) {
    let tracks = await GLOBALS.db.execAsync([{sql: `INSERT INTO ${playlistName} (track_uuid) values (?)`, args: [track.uuid]}], false);
}

export {Track, getAllPlaylists, deletePlaylist, deleteTrackInPlaylist, deleteTrack, getAllPlaylistsData, getIsPlaylistsPinned, recreateAllTables, pinUnpinPlaylist, getPlaylistTracks, deleteAllTables, createPlaylist, insertTrackIntoPlaylist, fetchTrackDataFromUUID, fetchTrackData, checkIfVideoIdExists, getAllTables, insertTrackData};
