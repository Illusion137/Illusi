import AsyncStorage from '@react-native-async-storage/async-storage';

import TrackPlayer, {
    AppKilledPlaybackBehavior,
    Capability,
    RepeatMode,
    Event
  } from 'react-native-track-player';
import * as globals from './globals';
import * as SQLActions from './SQLActions'
  
  export async function setupPlayer() {
    let isSetup = false;
    try {
      await TrackPlayer.getCurrentTrack();
      isSetup = true;
    }
    catch {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.PlayFromSearch,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.PlayFromSearch,
        ],
        progressUpdateEventInterval: 1,
      });
  
      isSetup = true;
    }
    finally {
      return isSetup;
    }
  }

  export async function addTracks(url, title, artist, duration, id, artwork = null) {
    await TrackPlayer.add([
      {
        url: url,
        title: title,
        artist: artist,
        duration: duration,
        id: id,
        artwork: artwork 
      }
    ]);
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
  }
  let trackMutex = false;
  let prevMutex = false;
  let changedMutex = false;
  let pnMutex = false;
    export async function TrackPlayerNext(){
        if(!pnMutex){
            pnMutex = true;
            try {
                let index = await TrackPlayer.getCurrentTrack();
                if(index + 1 >= globals.playingTracks.length){
                    pnMutex = false;
                    return
                }
                trackMutex = true;
                globals.addTrackIntoQueueTracksMutex = true;
                globals.playingTracksIndex++;
                let rnTrack = await globals.playingTrackToRNTrack(globals.playingTracks[index + 1])
                if(rnTrack == null){
                  //handle dat
                  await TrackPlayer.add({url: require('./assets/placeholder.mp3'), 'title': 'NULL', 'artist': 'Sudo'}, index + 1 );
                }
                else{
                  globals.playingTracks[index + 1]["successful"] = true
                  globals.playingTracks[index + 1]["added"] = true
                  await TrackPlayer.add(rnTrack, index + 1);
                }
                globals.addTrackIntoQueueTracksMutex = false;
                await TrackPlayer.skipToNext();
            }
            catch(error){
                console.log(error)
            }
            pnMutex = false;
        }
    }
    export async function TrackPlayerPrev(){
        if(!pnMutex){
            pnMutex = true;
            try {
                let index = await TrackPlayer.getCurrentTrack();
                if(globals.playingTracks[index - 1]['successful'] == false){
                    prevMutex = true
                    await TrackPlayer.skipToPrevious()
                    await TrackPlayer.skipToPrevious()
                    prevMutex = false
                }else {
                    await TrackPlayer.skipToPrevious()
                }
            } catch (error) {
                
            }
            pnMutex = false;
        }
    }

  export async function playbackService() {
    // let currentSongID = "";
    TrackPlayer.addEventListener(Event.PlaybackMetadataReceived, async(data) => {
        await TrackPlayer.play();
      // console.log(data)
    })
    TrackPlayer.addEventListener(Event.RemoteDuck, async(data) => {
        // console.log('done')
        // await TrackPlayer.play();
    })
    TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async() => {
      try {
        if(!globals.initialPlaybackTrackChangedMutex && !changedMutex){
            changedMutex = true;
            trackMutex = false;
          if(!globals.pQueue.isEmpty){
            globals.pQueue.dequeue();
          }
          globals.pQueue.elements = {}
          globals.pQueue.head = 0
          globals.pQueue.tail = 0
          let index = (await TrackPlayer.getCurrentTrack()) || 0;
          let track = globals.playingTracks[index];

          if(index != 0 && globals.playingTracks[index]['successful'] == false && !prevMutex){
                await TrackPlayer.pause(c);
                let newTrack = await globals.playingTrackToRNTrack(globals.playingTracks[index]);
                if(newTrack == null){
                    await TrackPlayerNext();
                }else{
                    globals.playingTracks[index + 1]["added"] = true
                    await TrackPlayer.updateMetadataForTrack(newTrack)
                }
              await TrackPlayer.play();
          }
          index = (await TrackPlayer.getCurrentTrack()) || 0;
          track = globals.playingTracks[index];

          if(!track.imported)
            await SQLActions.insertTrackIntoRecentlyPlayed(new SQLActions.Track(
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
              }))
        }else{
          globals.initialPlaybackTrackChangedMutex = false;
        }
        } catch (error) {
            console.log(error)
        }
      changedMutex = false;
    })
    // TODO: Attach remote event handlers
    TrackPlayer.addEventListener(Event.RemotePause, async() => {
      await TrackPlayer.pause();
    });
  
    TrackPlayer.addEventListener(Event.RemotePlay, async() => {
      await TrackPlayer.play();
    });
  
    TrackPlayer.addEventListener(Event.RemoteNext, async() => {
        globals.mutex = true;
        try {
            await TrackPlayerNext();
        } catch (error) {
        }
        globals.mutex = false;
    });
  
    TrackPlayer.addEventListener(Event.RemotePrevious, async() => {
      globals.mutex = true;
      try {
        await TrackPlayerPrev();
      } catch (error) {
      }
      globals.mutex = false;
    });
    TrackPlayer.addEventListener(Event.RemoteSeek, async(position) => {
      await TrackPlayer.seekTo(position.position)
    })
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async(data) => {
        // console.log(data)
        try {
            let curTrack = await TrackPlayer.getTrack(data.track || 0);
            //data.position + 5 > curTrack.duration
            if(!trackMutex && !globals.addTrackIntoQueueTracksMutex && globals.playingTracks[data.track + 1]["successful"] === false && globals.playingTracks[data.track + 1]["added"] === false){
                pnMutex = true;
                trackMutex = true;
                globals.addTrackIntoQueueTracksMutex = true;
                globals.playingTracksIndex++;
                let rnTrack = await globals.playingTrackToRNTrack(globals.playingTracks[data.track + 1])
                if(rnTrack == null){
                  //handle dat
                  globals.playingTracks[data.track + 1]["added"] = true
                  await TrackPlayer.add({url: require('./assets/placeholder.mp3'), 'title': 'NULL', 'artist': 'Sudo'}, data.track + 1 );
                }
                else{
                  globals.playingTracks[data.track + 1]["added"] = true
                  globals.playingTracks[data.track + 1]["successful"] = true
                  await TrackPlayer.add(rnTrack, data.track + 1);
                }
                globals.addTrackIntoQueueTracksMutex = false;
                pnMutex = false;
            }

        } catch (error) {
            console.log(error)
        }
    })
  }
  