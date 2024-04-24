import * as FileSystem from 'expo-file-system';
import * as Prefs from './Preferences';
import * as GLOBALS from './globals';
import { Alert } from 'react-native';
import { ResultSet, ResultSetError } from 'expo-sqlite';
import * as probe from 'probe-image-size';
import { Playlist, SmallTrack, SQLAlter, SQLTable, SQLType, Track, TrackProps } from './types';
import axios from 'axios';

export async function swapFromBackpack(old_uid: string, new_track: Track){
    await deleteFromBackpack(old_uid);
    await insertTrackData(new_track);
}

export async function clearBackpack(){
    await GLOBALS.global_var.db.execAsync([{sql: `DELETE FROM backpack`, args: []}], false);
}

export async function deleteFromBackpack(uid: string){
    await GLOBALS.global_var.db.execAsync([{sql: `DELETE FROM backpack WHERE uid="${uid}"`, args: []}], false);
}

export async function getBackpack(): Promise<Track[]>{
    const tracks_sql = await GLOBALS.global_var.db.execAsync([{sql: 'SELECT * FROM backpack', args: []}], false);
    const tracks: Track[] = (tracks_sql[0] as ResultSet).rows.map(t => new Track(t as TrackProps));
    for(let i = 0; i < tracks.length; i++){
        tracks[i].video_name = String(tracks[i].video_name)
        tracks[i].video_creator = String(tracks[i].video_creator)
        tracks[i].artwork = GLOBALS.notfoundIcon
        tracks[i].disabled = true
    }
    return tracks;
}

export async function addToBackpack(uid: string){
    const track: SmallTrack = await fetchTrackDataFromUID(uid);
    const all_promises = [];
    all_promises.push( deleteTrack(uid) );
    all_promises.push( GLOBALS.global_var.db.execAsync([{sql: 'INSERT INTO backpack (uid, video_id, video_name, video_creator, video_duration) values (?, ?, ?, ?, ?)', args: track.toSQLInsert()}], false) );

    await Promise.all(all_promises);
}

export async function createPlaylist(playlist_name: string): Promise<string> {
    if(playlist_name == 'backpack' || playlist_name == 'tracks' || playlist_name == 'recently_played_tracks' || playlist_name == 'playlists' || playlist_name == 'audiobooks'){
        playlist_name += ' - Illusi';
    }
    const playlist_names = await getAllPlaylists();
    let count = 2;
    if(playlist_names.findIndex((item) => item.playlist_name == playlist_name) != -1){
        while(playlist_names.findIndex((item) => item.playlist_name == `${playlist_name} ${count}`) != -1 && count <= 100){
            count++;
        }
        if(count > 0)
            playlist_name = `${playlist_name} ${count}`;
    }
    await GLOBALS.global_var.db.execAsync([{sql: 'INSERT INTO playlists (playlist_name, pinned, thumbnail_uri) Values (?, false, "")', args: [playlist_name]}], false)
    await GLOBALS.global_var.db.execAsync([{sql: `CREATE TABLE IF NOT EXISTS ${playlist_name.replaceAll(' ', '_')} (id INTEGER PRIMARY KEY, track_uid STRING)`, args: []}], false);
    return playlist_name;
}

export async function deleteAllTables(){
    await GLOBALS.global_var.db.execAsync([{sql: 'DELETE FROM tracks', args: []}], false)
}

export async function fetchTrackDataFromUID(uid: string): Promise<Track> {
    let track = await GLOBALS.global_var.db.execAsync([{sql: `SELECT * FROM tracks WHERE uid = (?)`, args: [uid]}], false);
    return (track[0] as ResultSet).rows.map(t => new Track(t as TrackProps))[0]; 
}

export async function setTrackAsDownloaded(uid: string, media_uri: string) {
    await GLOBALS.global_var.db.execAsync([{sql: `UPDATE tracks SET media_uri="${media_uri}", downloaded=true WHERE uid="${uid}"`, args: []}], false);
    await fetchTrackData();
}

export function getTrackArtwork(track: Track){
    if(track.imported ?? false)
        return GLOBALS.importedIcon;
    else if((track.thumbnail_uri ?? "") !== "")
        return {'uri': GLOBALS.thumbnailsCacheDir + track.thumbnail_uri};
    else if(track.youtube ?? false)
        return {'uri': `https://img.youtube.com/vi/${track.video_id}/0.jpg`, 'cache': 'force-cache'}
        // return {'uri': `https://img.youtube.com/vi/${track.video_id}/mqdefault.jpg`, 'cache': 'force-cache'}
    return {'uri': `https://img.youtube.com/vi/${"null"}/0.jpg`, 'cache': 'force-cache'}
}
export function getTrackArtworkRP(track: Track){
    return {'uri': `https://img.youtube.com/vi/${track.video_id}/0.jpg`, 'cache': 'force-cache'}
}

export async function fetchTrackData() {
    let tracks = await GLOBALS.global_var.db.execAsync([{sql: 'SELECT * FROM tracks', args: []}], false);
    GLOBALS.global_var.SQLTracks = (tracks[0] as ResultSet).rows.map(t => new Track(t as TrackProps));
    for(let i = 0; i < GLOBALS.global_var.SQLTracks.length; i++){
        GLOBALS.global_var.SQLTracks[i].video_name = String(GLOBALS.global_var.SQLTracks[i].video_name)
        GLOBALS.global_var.SQLTracks[i].video_creator = String(GLOBALS.global_var.SQLTracks[i].video_creator)
        GLOBALS.global_var.SQLTracks[i].saved = Boolean(GLOBALS.global_var.SQLTracks[i].saved)
        GLOBALS.global_var.SQLTracks[i].imported = Boolean(GLOBALS.global_var.SQLTracks[i].imported)
        GLOBALS.global_var.SQLTracks[i].downloaded = Boolean(GLOBALS.global_var.SQLTracks[i].downloaded)
        GLOBALS.global_var.SQLTracks[i].amazonmusic = Boolean(GLOBALS.global_var.SQLTracks[i].amazonmusic)
        GLOBALS.global_var.SQLTracks[i].applemusic = Boolean(GLOBALS.global_var.SQLTracks[i].applemusic)
        GLOBALS.global_var.SQLTracks[i].soundcloud = Boolean(GLOBALS.global_var.SQLTracks[i].soundcloud)
        GLOBALS.global_var.SQLTracks[i].spotify = Boolean(GLOBALS.global_var.SQLTracks[i].spotify)
        GLOBALS.global_var.SQLTracks[i].youtube = Boolean(GLOBALS.global_var.SQLTracks[i].youtube)
        GLOBALS.global_var.SQLTracks[i]['artwork'] = getTrackArtwork(GLOBALS.global_var.SQLTracks[i])
    }
}

export async function getAllTables() {
    let tables = await GLOBALS.global_var.db.execAsync([{sql: "SELECT * FROM sqlite_master where type='table'", args: []}], false);
    return (tables[0] as ResultSet).rows as SQLTable[];
}

export async function pinUnpinPlaylist(playlist_name: string, pin: boolean) {
    if(pin)
        await GLOBALS.global_var.db.execAsync([{sql: `UPDATE playlists SET pinned=true WHERE playlist_name="${playlist_name}"`, args: []}], false);
    else
        await GLOBALS.global_var.db.execAsync([{sql: `UPDATE playlists SET pinned=false WHERE playlist_name="${playlist_name}"`, args: []}], false);
}

export async function getPlaylistTracks(playlist_name: string) {
    const playlist = await GLOBALS.global_var.db.execAsync([{sql: `SELECT * FROM tracks AS t JOIN ${playlist_name.replaceAll(' ', '_')} AS p ON p.track_uid = t.uid ORDER BY p.id`, args: []}], false);
    const tracks: Track[] = (playlist[0] as ResultSet).rows.map(t => new Track(t as TrackProps))
    for(let i = 0; i < tracks.length; i++){
        tracks[i].video_name = String(tracks[i].video_name)
        tracks[i].video_creator = String(tracks[i].video_creator)
        tracks[i].saved = Boolean(tracks[i].saved)
        tracks[i].downloaded = Boolean(tracks[i].downloaded)
        tracks[i].amazonmusic = Boolean(tracks[i].amazonmusic)
        tracks[i].applemusic = Boolean(tracks[i].applemusic)
        tracks[i].soundcloud = Boolean(tracks[i].soundcloud)
        tracks[i].spotify = Boolean(tracks[i].spotify)
        tracks[i].youtube = Boolean(tracks[i].youtube)
        tracks[i]['artwork'] = getTrackArtwork(tracks[i])
    }
    return tracks;
}

export async function getAllPlaylists(): Promise<Playlist[]> {
    let playlists = await GLOBALS.global_var.db.execAsync([{sql: "SELECT playlist_name FROM playlists", args: []}], false);
    return (playlists[0] as ResultSet).rows as Playlist[];
}

export async function getAllPlaylistsData() {
    let playlists = await GLOBALS.global_var.db.execAsync([{sql: "SELECT * FROM playlists", args: []}], false);
    return (playlists[0] as ResultSet).rows as Playlist[];
}

export async function getIsPlaylistsPinned(playlist_name: string): Promise<boolean> {
    let playlists = await GLOBALS.global_var.db.execAsync([{sql: `SELECT pinned FROM playlists WHERE playlist_name="${playlist_name}"`, args: []}], false);
    return Boolean((playlists[0] as ResultSet).rows[0].pinned);
}
export async function deleteAllPlaylists() {
    let playlist_names = await getAllPlaylists();
    for(const playlist_name of playlist_names){
        await GLOBALS.global_var.db.execAsync([{sql: `DELETE FROM playlists`, args: []}], false);
        await GLOBALS.global_var.db.execAsync([{sql: `DROP TABLE "${playlist_name.playlist_name.replaceAll(' ', '_')}"`, args: []}], false);
    }
}

export async function deletePlaylist(playlist_name: string) {
    await GLOBALS.global_var.db.execAsync([{sql: `DELETE FROM playlists WHERE playlist_name="${playlist_name}"`, args: []}], false);
    await GLOBALS.global_var.db.execAsync([{sql: `DROP TABLE "${playlist_name.replaceAll(' ', '_')}"`, args: []}], false);
}

export async function deleteTrackInPlaylist(playlist_name: string, track_uid: string) {
    await GLOBALS.global_var.db.execAsync([{sql: `DELETE FROM ${playlist_name.replaceAll(' ', '_')} WHERE track_uid = ?`, args: [track_uid]}], false);
}

export async function deleteTrack(uid: string) {
    await GLOBALS.global_var.db.execAsync([{sql: `DELETE FROM tracks WHERE uid=?`, args: [uid]}], false);
}

export async function checkIfVideoIdExists(video_id: string){
    const count_sql = await GLOBALS.global_var.db.execAsync([{sql: 'SELECT COUNT(tracks.video_id) FROM tracks WHERE tracks.video_id = ?;', args: [video_id]}], false);
    const count = (count_sql[0] as ResultSet).rows[0]["COUNT(tracks.video_id)"]
    return count > 0;
}

export async function getExistingVideoIdUID(video_id: string): Promise<{"uid": string}> {
    let track = await GLOBALS.global_var.db.execAsync([{sql: 'SELECT uid FROM tracks WHERE video_id = ?;', args: [video_id]}], false);
    return (track[0] as ResultSet).rows[0] as {"uid": string};
}

export async function readCacheDirs(){
    return await FileSystem.readDirectoryAsync(GLOBALS.thumbnailsCacheDir)
}

export async function getHighestQualityYouTubeThumbnailURI(video_id: string){
    const uris_descending = [
        `https://i.ytimg.com/vi/${video_id}/maxresdefault.jpg`,
        `https://i.ytimg.com/vi/${video_id}/hq720.jpg`,
        `https://i.ytimg.com/vi/${video_id}/sddefault.jpg`,
        `https://i.ytimg.com/vi/${video_id}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${video_id}/mqdefault.jpg`,
        `https://i.ytimg.com/vi/${video_id}/default.jpg`,
    ];
    for(const uri of uris_descending){
        try {
            const result = await axios.get(uri, {"responseEncoding": "binary", "responseType": "arraybuffer"});
            if(result.status === 200) return uri;
        } catch (error) {}
    }
    return `https://img.youtube.com/vi/${video_id}/0.jpg`;
}

export async function downloadTrackThumbnail(track: Track){
    const thumbnailDownload = FileSystem.createDownloadResumable(await getHighestQualityYouTubeThumbnailURI(track.video_id),  GLOBALS.thumbnailsCacheDir + track.uid + ".jpg", {})
    await thumbnailDownload.downloadAsync();
    await GLOBALS.global_var.db.execAsync([{sql: `UPDATE tracks SET thumbnail_uri="${track.uid + ".jpg"}" WHERE uid="${track.uid}"`, args: []}], false);
}

export async function refreshCache(){
    await fetchTrackData();
    for(const track of GLOBALS.global_var.SQLTracks){
        if(!(track.imported || ((track.thumbnail_uri || "") !== ""))){
            console.log(track)
            downloadTrackThumbnail(track)
        }
    }
}

export async function clearCache(){
    await fetchTrackData();
    let files = await readCacheDirs();
    let allPromises = []
    for(const file of files)
        allPromises.push(FileSystem.deleteAsync(GLOBALS.thumbnailsCacheDir + file))
    await GLOBALS.global_var.db.execAsync([{sql: `UPDATE tracks SET thumbnail_uri=""`, args: []}], false);
    await Promise.all(allPromises);
}

export async function cleanCache(){
    await fetchTrackData();
    let files = await readCacheDirs();
    let filesToDelete = [];
    let thumbnail_uris = GLOBALS.global_var.SQLTracks.map(({thumbnail_uri}) => thumbnail_uri);
    for(const file of files){
        if(!thumbnail_uris.includes(file)){
            filesToDelete.push(FileSystem.deleteAsync(GLOBALS.thumbnailsCacheDir + file))
        }
    }
    await Promise.all(filesToDelete)
}

export async function deleteCacheDirs(){
    await FileSystem.deleteAsync(GLOBALS.thumbnailsCacheDir, {'idempotent': true});
}

export async function createCacheDirs(){
    if(!(await FileSystem.getInfoAsync(GLOBALS.thumbnailsCacheDir)).exists){
        await FileSystem.makeDirectoryAsync(GLOBALS.thumbnailsCacheDir)
    }
}

export async function updateTrackExid(uid: string, newExid: string, service: string){
    await GLOBALS.global_var.db.execAsync([{sql: `UPDATE tracks SET exid='${newExid}' WHERE uid="${uid}"`, args: []}], false);
    await GLOBALS.global_var.db.execAsync([{sql: `UPDATE tracks SET ${service}=true WHERE uid="${uid}"`, args: []}], false);
}

export async function insertTrackData(track: Track) {
    if( !track.imported && await checkIfVideoIdExists(track.video_id) ) return;
    if(Prefs.getExperimentalFeatureEnabled('auto_cache_thumbnails') && track.youtube){
        downloadTrackThumbnail(track);
    }
    GLOBALS.global_var.SQLTracks.push(track);
        
    await GLOBALS.global_var.db.execAsync([{sql: 'INSERT INTO tracks (uid, video_id, video_name, video_creator, video_duration, media_uri, thumbnail_uri, saved, imported, downloaded, youtube, soundcloud, spotify, amazonmusic, applemusic, exid) values ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: track.toSQLInsert()}], false);
}

export async function insertTrackIntoPlaylist(track_uid: string, playlistName: string) {
    let tracks = await GLOBALS.global_var.db.execAsync([{sql: `INSERT INTO ${playlistName.replaceAll(' ', '_')} (track_uid) values (?)`, args: [track_uid]}], false);
}
export async function getRecentlyPlayedData(){
    let recently_played_tracks = await GLOBALS.global_var.db.execAsync([{sql: 'SELECT * FROM recently_played_tracks', args: []}], false);
    let tracks = ((recently_played_tracks[0] as ResultSet).rows).map(t => new Track(t as TrackProps))
    for(let i = 0; i < tracks.length; i++){
        let found_track_idx = GLOBALS.global_var.SQLTracks.findIndex((el) => el.video_id == tracks[i].video_id);
        if(found_track_idx != -1){
            let j = found_track_idx;
            tracks[i].video_name = String(GLOBALS.global_var.SQLTracks[j].video_name)
            tracks[i].video_creator = String(GLOBALS.global_var.SQLTracks[j].video_creator)
            tracks[i].saved = Boolean(GLOBALS.global_var.SQLTracks[j].saved)
            tracks[i].downloaded = Boolean(GLOBALS.global_var.SQLTracks[j].downloaded)
            tracks[i].amazonmusic = Boolean(GLOBALS.global_var.SQLTracks[j].amazonmusic)
            tracks[i].applemusic = Boolean(GLOBALS.global_var.SQLTracks[j].applemusic)
            tracks[i].soundcloud = Boolean(GLOBALS.global_var.SQLTracks[j].soundcloud)
            tracks[i].spotify = Boolean(GLOBALS.global_var.SQLTracks[j].spotify)
            tracks[i].youtube = Boolean(GLOBALS.global_var.SQLTracks[j].youtube)
            tracks[i].artwork = getTrackArtworkRP(GLOBALS.global_var.SQLTracks[j])
            tracks[i].media_uri = GLOBALS.global_var.SQLTracks[j].media_uri
            tracks[i].thumbnail_uri = GLOBALS.global_var.SQLTracks[j].thumbnail_uri
            tracks[i].uid = GLOBALS.global_var.SQLTracks[j].uid
        } else{
            tracks[i].video_name = String(tracks[i].video_name)
            tracks[i].video_creator = String(tracks[i].video_creator)
            tracks[i].saved = Boolean(tracks[i].saved)
            tracks[i].downloaded = Boolean(tracks[i].downloaded)
            tracks[i].amazonmusic = Boolean(tracks[i].amazonmusic)
            tracks[i].applemusic = Boolean(tracks[i].applemusic)
            tracks[i].soundcloud = Boolean(tracks[i].soundcloud)
            tracks[i].spotify = Boolean(tracks[i].spotify)
            tracks[i].youtube = Boolean(tracks[i].youtube)
            tracks[i]['artwork'] = getTrackArtworkRP(tracks[i])
        }
    }
    return tracks;
}
export async function insertTrackIntoRecentlyPlayed(track: Track){
    await GLOBALS.global_var.db.execAsync([{sql: "DELETE FROM recently_played_tracks where video_id = ?", 'args':[track.video_id]}],false)
    await GLOBALS.global_var.db.execAsync([{sql: 'INSERT INTO recently_played_tracks (uid, video_id, video_name, video_creator, video_duration, media_uri, thumbnail_uri, saved, imported, downloaded, youtube, soundcloud, spotify, amazonmusic, applemusic, exid) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', args: track.toSQLInsert()}], false);
}
export async function cleanupRecentlyPlayed(){
    const recently_played_max_size = 100;
    let recently_played_data = await getRecentlyPlayedData();
    
    let all_promises = [];
    
    if(recently_played_data.length > recently_played_max_size){
        recently_played_data.reverse();
        recently_played_data = recently_played_data.slice(0, recently_played_max_size);
        recently_played_data.reverse();
        await GLOBALS.global_var.db.execAsync([{'sql': 'DELETE FROM recently_played_tracks', 'args': [] }], false);
        for(let i = 0; i < recently_played_max_size; i++){
            let track = recently_played_data[i];
            all_promises.push(
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
                        })
                ))
        }
    }
    await Promise.all(all_promises);
}
function getSQLTableColumnProperties(table: SQLTable): {'column_name': string, 'type': SQLType}[]{
    const column_props: {'column_name': string, 'type': SQLType}[] = [];
    const inner_sql = table.sql.slice(table.sql.indexOf('(') + 1, table.sql.indexOf(')'));
    for(const prop of inner_sql.split(', ').map((prop => prop.trim())) ){
        const [column_name, type] = prop.split(' ');
        column_props.push({'column_name': column_name, 'type': type as SQLType})
    }
    return column_props;
}
async function alterSQL(alter: SQLAlter){
    const tables = await getAllTables();
    const selected_table_index = tables.findIndex((table) => table.name == alter.table);

    const table_column_props = getSQLTableColumnProperties(tables[selected_table_index]);
    const selected_column_index = table_column_props.findIndex((props) => props.column_name == alter.column_name);
    const column_props = table_column_props[selected_column_index];
    if(alter.action === 'ADD' && column_props === undefined){
        await GLOBALS.global_var.db.execAsync([{sql: `ALTER TABLE ${alter.table} ${alter.action} ${alter.column_name} ${alter.type}`, args: []}], false);
    }
    else if(alter.action === 'DROP' && column_props !== undefined){
        await GLOBALS.global_var.db.execAsync([{sql: `ALTER TABLE ${alter.table} ${alter.action} COLUMN ${alter.column_name}`, args: []}], false);
    }
    else if(alter.action === 'RENAME' && column_props !== undefined && column_props.column_name !== alter.new_column_name){
        await GLOBALS.global_var.db.execAsync([{sql: `ALTER TABLE ${alter.table} ${alter.action} COLUMN ${alter.column_name} TO ${alter.new_column_name}`, args: []}], false);
    }
    else return;
    Alert.alert("Altered SQL Table: ", `Changes ${JSON.stringify(alter)}`);
}
export async function recreateAllTables(){
    await GLOBALS.global_var.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS tracks                 (id INTEGER PRIMARY KEY, uid STRING, video_id STRING, video_name STRING, video_creator STRING, video_duration INTEGER, media_uri STRING, thumbnail_uri STRING, views INTEGER, saved BOOLEAN, imported BOOLEAN, downloaded BOOLEAN, youtube BOOLEAN, soundcloud BOOLEAN, spotify BOOLEAN, amazonmusic BOOLEAN, applemusic BOOLEAN, exid STRING)', args: []}], false);
    await GLOBALS.global_var.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS recently_played_tracks (id INTEGER PRIMARY KEY, uid STRING, video_id STRING, video_name STRING, video_creator STRING, video_duration INTEGER, media_uri STRING, thumbnail_uri STRING, views INTEGER, saved BOOLEAN, imported BOOLEAN, downloaded BOOLEAN, youtube BOOLEAN, soundcloud BOOLEAN, spotify BOOLEAN, amazonmusic BOOLEAN, applemusic BOOLEAN, exid STRING)', args: []}], false);
    await GLOBALS.global_var.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS backpack (id INTEGER PRIMARY KEY, uid STRING, video_id STRING, video_name STRING, video_creator STRING, video_duration INTEGER)', args: []}], false);
    await GLOBALS.global_var.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS playlists (id INTEGER PRIMARY KEY, playlist_name STRING, pinned BOOLEAN, thumbnail_uri STRING, sort STRING, public BOOLEAN, public_uid STRING, inherited_playlists_json STRING, linked_playlists_json STRING)', args: []}], false);
    await GLOBALS.global_var.db.execAsync([{sql: 'CREATE TABLE IF NOT EXISTS audiobooks (id INTEGER PRIMARY KEY, uid STRING, title STRING, media_uri STRING, thumbnail_uri STRING, subtitle_uri STRING, chapters_json STRING, extra_json STRING)', args: []}], false);
    await createCacheDirs();
}
export async function fixToNewUpdate(){
    // UPDATE 13.0.4 BETA
    await alterSQL({table: 'playlists', action: 'RENAME', column_name: 'thumbnail_URI',         new_column_name: 'thumbnail_uri'}); 
    await alterSQL({table: 'playlists', action: 'ADD', column_name: 'sort',                     type: 'STRING'}); 
    await alterSQL({table: 'playlists', action: 'ADD', column_name: 'public',                   type: "BOOLEAN"});
    await alterSQL({table: 'playlists', action: 'ADD', column_name: 'public_uid',               type: "STRING"});
    await alterSQL({table: 'playlists', action: 'ADD', column_name: 'inherited_playlists_json', type: "STRING"});
    await alterSQL({table: 'playlists', action: 'ADD', column_name: 'linked_playlists_json',    type: "STRING"});

    // UPDATE 13.0.5 BETA
    await alterSQL({table: 'tracks', action: 'ADD', column_name: 'views', type: "INTEGER"});
    await alterSQL({table: 'recently_played_tracks', action: 'ADD', column_name: 'views', type: "INTEGER"});
}