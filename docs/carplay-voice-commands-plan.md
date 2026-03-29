# CarPlay Voice Commands — Implementation Plan

## Overview
Add free-form voice command support to the CarPlay integration so users can control
Illusi hands-free while driving. Commands are recognized on-device and matched against
the local library via fuzzy search.

---

## Dependency

**`@react-native-voice/voice`** (new native dependency)

```bash
yarn add @react-native-voice/voice
npx pod-install
```

- Requires microphone permission (`NSMicrophoneUsageDescription` already in Info.plist)
- Requires speech recognition permission — add `NSSpeechRecognitionUsageDescription` to Info.plist
- Works offline for short phrases; falls back to server-side for longer queries

---

## CarPlay Integration Point

Use `VoiceControlTemplate` inside CarPlay:

```ts
import { CarPlay, VoiceControlTemplate } from 'react-native-carplay';
import Voice from '@react-native-voice/voice';

const voice_template = new VoiceControlTemplate({
  id: 'illusi-voice',
  voiceControlStates: [
    {
      identifier: 'listening',
      titleVariants: ['Listening…'],
      image: { uri: '...' },
    },
    {
      identifier: 'processing',
      titleVariants: ['Thinking…'],
      image: { uri: '...' },
    },
  ],
});

// Add a "Voice" bar button to the Playlists GridTemplate's trailing buttons
// that presents the VoiceControlTemplate.
```

Add a mic bar-button to the Playlists `GridTemplate`:

```ts
trailingNavigationBarButtons: [
  { id: 'play_mode', type: 'text', title: play_mode_label(mode) },
  { id: 'voice',     type: 'text', title: '🎤' },
],
onBarButtonPressed: ({ id }) => {
  if (id === 'voice') CarPlay.presentTemplate(voice_template, true);
},
```

---

## Command Parsing

### Architecture

```
microphone → @react-native-voice/voice → transcript string
             → intent_parser(transcript)
             → { intent, params }
             → command_executor({ intent, params })
```

### Intent Parser (regex-based)

```ts
type Intent =
  | { type: 'play_artist';    artist: string }
  | { type: 'play_track';     title: string; artist?: string }
  | { type: 'play_playlist';  name: string }
  | { type: 'enqueue_artist'; artist: string }
  | { type: 'play_lyrics';    snippet: string }
  | { type: 'play_default';   playlist: 'most_played' | 'recently_played' | 'shuffle_all' }
  | { type: 'unknown' };

const PATTERNS: [RegExp, (m: RegExpMatchArray) => Intent][] = [
  [/play(?:back)? (?:songs?|music|tracks?) by (.+)/i,
    m => ({ type: 'play_artist', artist: m[1].trim() })],

  [/play (.+?) by (.+)/i,
    m => ({ type: 'play_track', title: m[1].trim(), artist: m[2].trim() })],

  [/(?:enqueue|add|queue) (?:songs?|music|tracks?) by (.+)/i,
    m => ({ type: 'enqueue_artist', artist: m[1].trim() })],

  [/play (?:my )?most played/i,
    () => ({ type: 'play_default', playlist: 'most_played' })],

  [/play (?:my )?recently played/i,
    () => ({ type: 'play_default', playlist: 'recently_played' })],

  [/shuffle (?:all|everything|my library)/i,
    () => ({ type: 'play_default', playlist: 'shuffle_all' })],

  [/play the song that goes(?: like)?[:\s]+(.+)/i,
    m => ({ type: 'play_lyrics', snippet: m[1].trim() })],

  [/play (?:the playlist |my playlist )?(.+)/i,
    m => ({ type: 'play_playlist', name: m[1].trim() })],
];

export function parse_intent(transcript: string): Intent {
  for (const [pattern, builder] of PATTERNS) {
    const m = transcript.match(pattern);
    if (m) return builder(m);
  }
  return { type: 'unknown' };
}
```

### Command Executor

```ts
import Fuse from 'fuse.js'; // already a transitive dep
import { GLOBALS } from '@illusive/globals';
import { SQLPlaylists } from '@illusive/sql/sql_playlists';
import { default_playlists } from '@illusive/default_playlists';
import { shuffle_array } from '@common/utils/util';

export async function execute_intent(intent: Intent): Promise<void> {
  const tracks = GLOBALS.global_var.sql_tracks;

  switch (intent.type) {
    case 'play_artist':
    case 'enqueue_artist': {
      const fuse = new Fuse(tracks, {
        keys: ['artists.name'],
        threshold: 0.4,
        includeScore: true,
      });
      const results = fuse.search(intent.artist).map(r => r.item);
      if (results.length === 0) break;
      if (intent.type === 'play_artist') {
        const shuffled = shuffle_array(results);
        GLOBALS.global_var.play_tracks(shuffled[0], shuffled, `Voice: ${intent.artist}`);
      } else {
        for (const t of results) {
          await insert_track_into_player_queue(t, 1 + GLOBALS.global_var.playing_queue.length);
        }
        await on_modify_track_player_queue();
      }
      break;
    }

    case 'play_track': {
      const fuse = new Fuse(tracks, {
        keys: ['title', 'artists.name'],
        threshold: 0.3,
      });
      const query = intent.artist ? `${intent.title} ${intent.artist}` : intent.title;
      const result = fuse.search(query)[0]?.item;
      if (result) GLOBALS.global_var.play_tracks(result, [result], 'Voice');
      break;
    }

    case 'play_playlist': {
      // Check default playlists first, then user playlists
      const dp = default_playlists.find(
        p => p.name.toLowerCase().includes(intent.name.toLowerCase())
      );
      if (dp) {
        const t = await dp.track_function();
        if (t.length > 0) {
          const s = shuffle_array(t);
          GLOBALS.global_var.play_tracks(s[0], s, dp.name);
        }
        break;
      }
      const user_playlists = await SQLPlaylists.all_playlists_names();
      const fuse = new Fuse(user_playlists, { keys: ['title'], threshold: 0.4 });
      const match = fuse.search(intent.name)[0]?.item as { title: string } | undefined;
      if (match) {
        // Lookup full playlist by title and play
        // TODO: use SQLPlaylists.compact_playlists() + play
      }
      break;
    }

    case 'play_default': {
      if (intent.playlist === 'most_played') {
        const t = await default_playlists.find(p => p.name === 'Most Played')!.track_function();
        if (t.length > 0) GLOBALS.global_var.play_tracks(t[0], t, 'Most Played');
      } else if (intent.playlist === 'recently_played') {
        const t = await default_playlists.find(p => p.name === 'Recently Played')!.track_function();
        if (t.length > 0) GLOBALS.global_var.play_tracks(t[0], t, 'Recently Played');
      } else {
        const s = shuffle_array([...tracks]);
        if (s.length > 0) GLOBALS.global_var.play_tracks(s[0], s, 'My Library');
      }
      break;
    }

    case 'play_lyrics': {
      // Search cached lyrics files for the snippet
      // Requires: each track's lyrics_uri to be loaded and searched
      // Implementation: iterate GLOBALS.global_var.sql_tracks, read lyrics file,
      // check if snippet (normalized) appears in text → collect candidates →
      // play best match.
      // NOTE: This is slow without a lyrics index. Consider building an in-memory
      //       lyrics index on startup (opt-in, gated by a pref).
      const snippet = intent.snippet.toLowerCase().replace(/[^a-z0-9 ]/g, '');
      const candidates: typeof tracks = [];
      for (const track of tracks.slice(0, 200)) { // cap search at 200 tracks
        if (!track.lyrics_uri) continue;
        const raw = await SQLTracks.read_track_lyrics(track).catch(() => undefined);
        if (typeof raw !== 'string') continue;
        if (raw.toLowerCase().includes(snippet)) candidates.push(track);
      }
      if (candidates.length > 0) {
        GLOBALS.global_var.play_tracks(candidates[0], candidates, 'Voice: lyrics');
      }
      break;
    }
  }
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `lib-origin/Illusive/src/carplay/carplay_voice.ts` | New — Voice listener + intent parser + executor |
| `lib-origin/Illusive/src/carplay/carplay_service.ts` | Add voice bar-button + `VoiceControlTemplate` |
| `ios/Illusi/Info.plist` | Add `NSSpeechRecognitionUsageDescription` |
| `package.json` | Add `@react-native-voice/voice` |
| `ios/Podfile` (if exists) | No manual change needed — `pod install` handles it |

---

## Native Config

### Info.plist addition
```xml
<key>NSSpeechRecognitionUsageDescription</key>
<string>Illusi uses speech recognition to let you play music by voice in CarPlay.</string>
```

### Permissions request (at init time)
```ts
import Voice from '@react-native-voice/voice';
// Request permission when voice button first pressed:
await Voice.start('en-US');
```

---

## Future: Lyrics Index

For fast lyric-snippet search ("play the song that goes like…"), build an optional
in-memory index on startup:

```ts
// Triggered lazily when the lyrics intent is first used
const lyrics_index: Map<string, string> = new Map(); // uid → normalized lyrics
for (const track of GLOBALS.global_var.sql_tracks) {
  if (!track.lyrics_uri) continue;
  const raw = await SQLTracks.read_track_lyrics(track);
  if (typeof raw === 'string') {
    lyrics_index.set(track.uid, raw.toLowerCase().replace(/[^a-z0-9 ]/g, ''));
  }
}
```

Gate this behind a pref: `carplay_lyrics_index_enabled` (expensive on large libraries).
