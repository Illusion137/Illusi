const { Queue } = require("./app/Illusive/Queue");
import * as SQLite from 'expo-sqlite'

let db = SQLite.openDatabase('illusi-db.sqlite3')
const SQLTracks = [];

module.exports = {
  DOWNLOADING: [],
  IsPlaying: false,
  pQueue: new Queue(),
  mutex: false,
  db,
  SQLTracks
};