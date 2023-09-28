import AsyncStorage from '@react-native-async-storage/async-storage';

import TrackPlayer, {
    AppKilledPlaybackBehavior,
    Capability,
    RepeatMode,
    Event
  } from 'react-native-track-player';
import * as globals from './globals';
  
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

  export async function playbackService() {
    // let currentSongID = "";
    TrackPlayer.addEventListener(Event.PlaybackMetadataReceived, async(data) => {
        console.log('done')
        await TrackPlayer.play();
      // console.log(data)
    })
    TrackPlayer.addEventListener(Event.RemoteDuck, async(data) => {
        // console.log('done')
        // await TrackPlayer.play();
    })
    TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async() => {
      try {
        if(!globals.pQueue.isEmpty){
          globals.pQueue.dequeue();
        }
        globals.pQueue.elements = {}
        globals.pQueue.head = 0
        globals.pQueue.tail = 0

      } catch (error) {
      }
      // currentSongID = (await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack())).id
      // let storage = await AsyncStorage.getItem('RecentPlayed');
      // if(storage != null){
      //   let parsedStorage = JSON.parse(storage)
      //   parsedStorage.push( (await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack())) .id)
      //   if(parsedStorage.length > 200){
      //     parsedStorage.slice(1)
      //   }
      //   await AsyncStorage.setItem('RecentPlayed', JSON.stringify(parsedStorage))
      // }else{
      //   await AsyncStorage.setItem('RecentPlayed', JSON.stringify([ (await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack())).id]))
      // }
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
            let index = await TrackPlayer.getCurrentTrack();
            if(!globals.addTrackIntoQueueTracksMutex && index == globals.playingTracksIndex && globals.playingTracksIndex + 1 < globals.playingTracks.length ){
                globals.addTrackIntoQueueTracksMutex = true;
                globals.playingTracksIndex++;
                await TrackPlayer.add(await globals.playingTrackToRNTrack(globals.playingTracks[globals.playingTracksIndex]));
                await TrackPlayer.skipToNext();
                globals.addTrackIntoQueueTracksMutex = false;
            } else if(index < globals.playingTracksIndex){
                await TrackPlayer.skipToNext();
            }
        } catch (error) {
        }
        globals.mutex = false;
    });
  
    TrackPlayer.addEventListener(Event.RemotePrevious, async() => {
      globals.mutex = true;
      try {
        await TrackPlayer.skipToPrevious();
      } catch (error) {
      }
      globals.mutex = false;
    });
    TrackPlayer.addEventListener(Event.RemoteSeek, async(position) => {
      await TrackPlayer.seekTo(position.position)
    })
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async(data) => {
        console.log(data)
        try {
            let curTrack = await TrackPlayer.getTrack(data.track || 0);
            if(!globals.addTrackIntoQueueTracksMutex && data.track == globals.playingTracksIndex && data.position + 5 > curTrack.duration && globals.playingTracksIndex + 1 < globals.playingTracks.length ){
                globals.addTrackIntoQueueTracksMutex = true;
                globals.playingTracksIndex++;
                await TrackPlayer.add(await globals.playingTrackToRNTrack(globals.playingTracks[globals.playingTracksIndex]));
                globals.addTrackIntoQueueTracksMutex = false;
            }

            // let index = await TrackPlayer.getCurrentTrack();
        // if(data.position > (await TrackPlayer.getTrack(index)).duration && !globals.mutex){
        //   globals.mutex = true;
        //   await TrackPlayer.seekTo(0);
        //   await TrackPlayer.skipToNext();
        //   await TrackPlayer.seekTo(0);
        //   await TrackPlayer.play();
        //   globals.mutex = false;
        // }
        } catch (error) {
            console.log(error)
        }
    })
  }
  