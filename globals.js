const { Queue } = require("./app/Illusive/Queue");
import * as SQLite from 'expo-sqlite'

export let DOWNLOADING = [];
export let db = SQLite.openDatabase('illusi-db.sqlite3')
export let prefs = {};
export const importedIcon = require("./assets/imported.png")
export const SQLTracks = [];
export let IsPlaying = false
export let pQueue = new Queue()
export let mutex = false