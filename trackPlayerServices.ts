import AsyncStorage from '@react-native-async-storage/async-storage';

import TrackPlayer, {
    AppKilledPlaybackBehavior,
    Capability,
    RepeatMode,
    Event,
    Track,
    TrackMetadataBase
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
  let prevMutex = false;
  let changedMutex = false;
  let pnMutex = false;
    export async function TrackPlayerNext(){
        // if(!pnMutex){
            // pnMutex = true;
            try {
                let index = await TrackPlayer.getCurrentTrack();
                if(index + 1 >= globals.global_var.playingTracks.length){
                    pnMutex = false;
                    return
                }
                if(globals.global_var.playingTracks[index+1]['added']){
                  await TrackPlayer.skipToNext();

                  return;
                }
                globals.global_var.addTrackIntoQueueTracksMutex = true;
                globals.global_var.playingTracksIndex++;
                let rnTrack = await globals.playingTrackToRNTrack(globals.global_var.playingTracks[index + 1])
                if(rnTrack == null){
                  //handle dat
                  await TrackPlayer.add({url: require('./assets/placeholder.mp3'), 'title': 'NULL', 'artist': 'Sudo'}, index + 1 );
                }
                else{
                  globals.global_var.playingTracks[index + 1]["successful"] = true
                  globals.global_var.playingTracks[index + 1]["added"] = true
                  await TrackPlayer.add(rnTrack as Track, index + 1);
                }
                pnMutex = false;
                globals.global_var.addTrackIntoQueueTracksMutex = false;
                await TrackPlayer.skipToNext();
            }
            catch(error){
                console.log(error)
            }
        // }
    }
    export async function TrackPlayerPrev(){
        if(!pnMutex){
            pnMutex = true;
            try {
                let index = await TrackPlayer.getCurrentTrack();
                if(globals.global_var.playingTracks[index - 1]['successful'] == false){
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
        if(!globals.global_var.initialPlaybackTrackChangedMutex && !changedMutex){
            changedMutex = true;
          if(!globals.global_var.pQueue.isEmpty){
            globals.global_var.pQueue.dequeue();
          }
          globals.global_var.pQueue.elements = {}
          globals.global_var.pQueue.head = 0
          globals.global_var.pQueue.tail = 0
          let index = (await TrackPlayer.getCurrentTrack()) || 0;
          let track = globals.global_var.playingTracks[index];

          if(index != 0 && globals.global_var.playingTracks[index]['successful'] == false && !prevMutex){
                await TrackPlayer.pause();
                let newTrack = await globals.playingTrackToRNTrack(globals.global_var.playingTracks[index]);
                if(newTrack == null){
                    await TrackPlayerNext();
                }else{
                    globals.global_var.playingTracks[index + 1]["added"] = true
                    await TrackPlayer.updateMetadataForTrack(await TrackPlayer.getCurrentTrack(), newTrack as TrackMetadataBase)
                }
              await TrackPlayer.play();
          }
          index = (await TrackPlayer.getCurrentTrack()) || 0;
          track = globals.global_var.playingTracks[index];

          if(!track.imported){
            track['saved']=true
            await SQLActions.insertTrackIntoRecentlyPlayed(track)
          }
        }else{
          globals.global_var.initialPlaybackTrackChangedMutex = false;
        }
        } catch (error) {
            // console.log(error)
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
        globals.global_var.mutex = true;
        try {
            await TrackPlayerNext();
        } catch (error) {
        }
        globals.global_var.mutex = false;
    });
  
    TrackPlayer.addEventListener(Event.RemotePrevious, async() => {
      globals.global_var.mutex = true;
      try {
        await TrackPlayerPrev();
      } catch (error) {
      }
      globals.global_var.mutex = false;
    });
    TrackPlayer.addEventListener(Event.RemoteSeek, async(position) => {
      await TrackPlayer.seekTo(position.position)
    })
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async(data) => {
        // console.log(data)
        try {
            let curTrack = await TrackPlayer.getTrack(data.track || 0);
            //data.position + 5 > curTrack.duration
            if(globals.global_var.playingTracks[data.track + 1]["added"] === false && !globals.global_var.addTrackIntoQueueTracksMutex && globals.global_var.playingTracks[data.track + 1]["successful"] === false){
                globals.global_var.playingTracks[data.track + 1]["added"] = true
                pnMutex = true;
                globals.global_var.addTrackIntoQueueTracksMutex = true;
                globals.global_var.playingTracksIndex++;
                globals.global_var.playingTracksIndex++;
                let rnTrack = await globals.playingTrackToRNTrack(globals.global_var.playingTracks[data.track + 1])
                if(rnTrack == null){
                  //handle dat
                  await TrackPlayer.add({url: require('./assets/placeholder.mp3'), 'title': 'NULL', 'artist': 'Sudo'}, data.track + 1 );
                }
                else if(rnTrack == 'skip'){
                  globals.global_var.playingTracks.splice(data.track + 1, 1)
                }
                else{
                  globals.global_var.playingTracks[data.track + 1]["successful"] = true
                  await TrackPlayer.add(rnTrack as Track, data.track + 1);
                }
                globals.global_var.addTrackIntoQueueTracksMutex = false;
                pnMutex = false;
            }

        } catch (error) {
            // console.log(error)
        }
    })
  }
  