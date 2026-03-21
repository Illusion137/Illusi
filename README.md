# Illusi

<div style="text-align: center;" align="center">
    <img src="assets/icon.png" height="100" alt="Illusi-Logo">
</div>

Illusi is a superset of [Musi](https://www.feelthemusi.com), a iOS music app, aimed at allowing users to archive music so that music will live on forever.

### Note

Although Illusi is optimized for iOS, it should still work if built for Android.

## Features

-   **Library** — Manage your local music library with full metadata support
-   **Playlists** — Create, edit, sort, and archive playlists; import from external services
-   **Explore** — Search and discover music from YouTube and other sources
-   **Batch Downloader** — Download multiple tracks at once for offline playback
-   **Backpack** — Store and manage archived tracks
-   **Audio Trimmer** — Trim tracks directly in-app
-   **Equalizer** — Fine-tune audio with a built-in equalizer
-   **Lyrics** — View, edit, and share lyrics for any track
-   **Visualizer** — Audio visualizer in the player
-   **Waveform Display** — See audio waveforms while trimming
-   **Themes** — Fully customizable color themes
-   **Statistics** — View listening stats and history (Illusi Rewind)
-   **Sync** — Sync your library across devices
-   **Siri Shortcuts** — Control playback with Siri
-   **AirPlay** — Stream audio to AirPlay devices
-   **Keep / Delete** — Quickly curate your library
-   **Discord** — Discord integration
-   **SQLite Storage** — Fast local database via op-sqlite + Drizzle ORM

## Prerequisites

-   Node.js
-   Xcode (for iOS builds)
-   [EAS CLI](https://docs.expo.dev/eas/) (`npm install -g eas-cli`)
-   An Expo account with EAS configured

## Setup

```bash
npm install
```

## Development

### Run on Device (Dev Client)

Requires a development build installed on the device.

```bash
npm run run:dev
```

### Run on Simulator (Quick Start)

```bash
npm run ios
```

### Run on Simulator (Installed Build)

Installs and launches a pre-built simulator build, then starts the dev server.

```bash
npm run run:sim
```

## Building

Due to several custom/forked packages (e.g. `RNTPvE`, `react-native-siri-shortcut`), **local builds are preferred** over EAS cloud builds, which can be unreliable with non-standard packages.

### Simulator Build (Local)

Builds a `.app` for the iOS Simulator and extracts it to `builds/sim/`.

```bash
npm run build:sim
```

### Development Build (Local)

Builds a development client locally for internal distribution.

```bash
npm run build:dev
```

### Production Build (Xcode)

**Preferred method.** Open the workspace in Xcode and archive from there:

```bash
open ios/Illusi.xcworkspace
```

Then in Xcode: **Product → Archive**, wait for the archive to complete, then click **Distribute App** in the Organizer window.

Or via the command line:

```bash
xcodebuild -workspace ios/Illusi.xcworkspace \
           -scheme Illusi \
           -configuration Release \
           -archivePath builds/Illusi.xcarchive \
           archive

xcodebuild -exportArchive \
           -archivePath builds/Illusi.xcarchive \
           -exportOptionsPlist ios/ExportOptions.plist \
           -exportPath builds/prod/
```

The `build:prod` script uses EAS cloud and may fail due to custom packages — use as a fallback only:

```bash
npm run build:prod  # EAS cloud — fallback
```

## Publishing to TestFlight

After archiving in Xcode, use **Distribute App → TestFlight** directly from the Organizer.

To upload a `.ipa` manually, drag it into **Transporter** (available on the Mac App Store).

To submit via EAS after a manual build:

```bash
eas submit -p ios --path builds/prod/<build>.ipa
```

## Other Commands

```bash
npm run ts:check   # TypeScript type checking
npm run lint       # ESLint
```
