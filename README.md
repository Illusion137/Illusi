# Illusi

<div style="text-align: center;" align="center">
    <img src="assets/icon.png" height="100" alt="Illusi-Logo">
</div>

Illusi is a superset of [Musi](https://www.feelthemusi.com), from an iOS music app with only YouTube playback to now as an Universal Music App that supports YouTube, YouTube Music, Spotify, SoundCloud, Apple Music, Amazon Music, Musi, and BandLab. Every service supports at least importing playlists, however many services offer way more functionality.\
The app was originally designed as an proof of concept for features for Musi and as an archiving service since previously I experience many songs being lost to circumstance.

### Note

Although Illusi is optimized for iOS, it should still work if built for Android.

## Features

**Library**

-   Download media, lyrics, and thumbnails for offline playback
-   Trim tracks and upload custom artwork
-   Batch download entire playlists at once
-   Import local media from device

**Playlists**

-   Import from any supported service via URL
-   Playlist inheritance; (include/exclude/intersection/mask) other playlists or search querys inside another playlist
-   Default playlists: Recently Added, Recently Played, Most Played, Imported, Downloaded, Least Played, and Past Queue
-   Past Queue; store your previous queue inside it's own playlist
-   Siri Shortcuts support to play a playlist with a iOS shortcut

**Player**

-   Customizable shuffler
-   Equalizer support
-   Lyrics viewing

**Explore**

-   Search across all supported services
-   Artist pages and new / latest release feeds
-   Track mix / radio for YouTube and SoundCloud

**Customization**

-   Fully custom color theming
-   Extensive preferences for Playlist, Interactions, Visual, Automation, and Data.

**Other**

-   Statistics and listening history (Illusi Rewind)
-   Discord bot integration through webhooks

## Music Service Support

| Feature               | YouTube | YT Music | Spotify | SoundCloud | Apple Music | Amazon Music | BandLab | Musi | Illusi |
| --------------------- | :-----: | :------: | :-----: | :--------: | :---------: | :----------: | :-----: | :--: | :----: |
| Import playlist       |    ✓    |    ✓     |    ✓    |     ✓      |      ✓      |      ✓       |    ✓    |  ✓   |   ✓    |
| My playlists          |    ✓    |    ✓     |    ✓    |     ✓      |      ✓      |      ✓       |    ✓    |  —   |   —    |
| Search                |    ✓    |    ✓     |    ✓    |     ✓      |      ✓      |      ✓       |    —    |  —   |   —    |
| Create playlist       |    ✓    |    ✓     |    ✓    |     ✓      |      ✓      |      ✓       |    —    |  —   |   —    |
| Edit playlist         |    ✓    |    ✓     |    ✓    |     ✓      |      ✓      |      ✓       |    —    |  —   |   —    |
| Download              |    ✓    |    —     |    —    |     ✓      |      —      |      —       |    ✓    |  —   |   —    |
| Artist page           |    ✓    |    ✓     |    ✓    |     ✓      |      ✓      |      —       |    —    |  —   |   ✓    |
| Track mix / radio     |    ✓    |    —     |    —    |     ✓      |      —      |      —       |    —    |  —   |   —    |
| New / latest releases |    ✓    |    ✓     |    ✓    |     ✓      |      ✓      |      —       |    —    |  —   |   —    |

## Prerequisites

-   **Node.js 25+** — although [nvm](https://github.com/nvm-sh/nvm) is required for nodejs-mobile-react-native (v18.20.4)
-   **Xcode** for building iOS

## Setup

1. Install dependencies:

    ```bash
    npm install
    ```

2. Clone the `RNTPvE` dependency as a sibling of this repo; the Podfile references it via a local relative path (`../../../RNTPvE/SwiftAudioEx/`):

    ```bash
    cd ..           # move up to the parent of this repo
    git clone https://github.com/Illusion137/RNTPvE
    cd mobile       # return to this repo
    ```

    The expected directory layout is:

    ```
    parent/
    ├── Illusi/
    │   └── mobile/       ← this repo
    └── RNTPvE/           ← cloned here
    ```

3. Install iOS native dependencies:

    ```bash
    cd ios && pod install && cd ..
    ```

If you want to integrate with Sentry, then in `.env.local`

```
SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
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

### Prod (Xcode)

In Illusi/mobile

```bash
xed ios
```

Then in Xcode: **Product → Archive**, wait for the archive to complete, then click **Distribute App** in the Organizer window.

Or in the command line:

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

## Terms of Use

All network requests to other music services are done locally, and as such you are aware that using this app likely violates the **Terms of Service** of some music services.
