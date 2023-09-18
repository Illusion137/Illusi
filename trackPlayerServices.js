import AsyncStorage from '@react-native-async-storage/async-storage';

import TrackPlayer, {
    AppKilledPlaybackBehavior,
    Capability,
    RepeatMode,
    Event
  } from 'react-native-track-player';
import globals from './globals';
  
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
        progressUpdateEventInterval: 2,
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
      // console.log('Event.RemotePause');
      await TrackPlayer.pause();
    });
  
    TrackPlayer.addEventListener(Event.RemotePlay, async() => {
      // console.log('Event.RemotePlay');
      await TrackPlayer.play();
    });
  
    TrackPlayer.addEventListener(Event.RemoteNext, async() => {
      // console.log('Event.RemoteNext');
      globals.mutex = true;
      await TrackPlayer.skipToNext();
      globals.mutex = false;
    });
  
    TrackPlayer.addEventListener(Event.RemotePrevious, async() => {
      // console.log('Event.RemotePrevious');
      globals.mutex = true;
      await TrackPlayer.skipToPrevious();
      globals.mutex = false;
    });
    TrackPlayer.addEventListener(Event.RemoteSeek, async(position) => {
      // console.log('Event.RemoteSeek');
      // console.log(position)
      await TrackPlayer.seekTo(position.position)
    })
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async(data) => {
      try {
        let index = await TrackPlayer.getCurrentTrack();
        // if(data.position > (await TrackPlayer.getTrack(index)).duration && !globals.mutex){
        //   globals.mutex = true;
        //   await TrackPlayer.seekTo(0);
        //   await TrackPlayer.skipToNext();
        //   await TrackPlayer.seekTo(0);
        //   await TrackPlayer.play();
        //   globals.mutex = false;
        // }
      } catch (error) {
        
      }
    })
  }
  