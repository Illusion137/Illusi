import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import { playback_service } from './lib-origin/Illusive/src/illusi/src/track_player_service';
import App from './App';

// import TestApp from './TestApp';

// console.disableYellowBox = true; 

const error = console.error; console.error = (...args) => { if (/defaultProps/.test(args[0])) return; error(...args); };

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// registerRootComponent(TestApp);
registerRootComponent(App);
TrackPlayer.registerPlaybackService(() => playback_service)