const { Queue } = require("./app/Illusive/Queue");

module.exports = {
  DOWNLOADING: [],
  IsPlaying: false,
  pQueue: new Queue(),
  mutex: false
};