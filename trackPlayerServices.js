import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, {
    AppKilledPlaybackBehavior,
    Capability,
    RepeatMode,
    Event
  } from 'react-native-track-player';
  
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
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        progressUpdateEventInterval: 2,
      });
  
      isSetup = true;
    }
    finally {
      return isSetup;
    }
  }
  
  export async function addTracks(url, title, artist, duration, id) {
    await TrackPlayer.add([
      {
        url: url,
        title: title,
        artist: artist,
        duration: duration,
        id: id
      }
    ]);
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
  }
  
  export async function playbackService() {
    TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async() => {
      let storage = await AsyncStorage.getItem('RecentPlayed');
      if(storage != null){
        let parsedStorage = JSON.parse(storage)
        parsedStorage.push( (await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack())) .id)
        if(parsedStorage.length > 200){
          parsedStorage.slice(1)
        }
        await AsyncStorage.setItem('RecentPlayed', JSON.stringify(parsedStorage))
      }else{
        await AsyncStorage.setItem('RecentPlayed', JSON.stringify([ (await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack())).id]))
      }
    })
    // TODO: Attach remote event handlers
    TrackPlayer.addEventListener(Event.RemotePause, () => {
      // console.log('Event.RemotePause');
      TrackPlayer.pause();
    });
  
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
      // console.log('Event.RemotePlay');
      TrackPlayer.play();
    });
  
    TrackPlayer.addEventListener(Event.RemoteNext, () => {
      // console.log('Event.RemoteNext');
      TrackPlayer.skipToNext();
    });
  
    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
      // console.log('Event.RemotePrevious');
      TrackPlayer.skipToPrevious();
    });
    TrackPlayer.addEventListener(Event.RemoteSeek, (position) => {
      // console.log('Event.RemoteSeek');
      // console.log(position)
      TrackPlayer.seekTo(position.position)
    })
    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async(data) => {
      if(data.position > (await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack())).duration){
        TrackPlayer.skipToNext()
      }
    })
  }
  