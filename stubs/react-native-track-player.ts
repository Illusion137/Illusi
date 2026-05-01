/**
 * Desktop stub for react-native-track-player
 * Provides a no-op implementation so desktop builds don't fail
 * User will implement real desktop audio player support
 */

export enum TrackPlayerEvents {
	PlaybackState = "playback-state",
	PlaybackError = "playback-error",
	PlaybackMetadataReceived = "playback-metadata-received",
}

export interface Track {
	url?: string;
	title?: string;
	artist?: string;
	album?: string;
	artwork?: string;
	duration?: number;
	[key: string]: any;
}

class TrackPlayerStub {
	async setupPlayer() {
		return;
	}

	async updateOptions() {
		return;
	}

	async add(tracks: Track | Track[]) {
		return;
	}

	async remove(trackIds: number | number[]) {
		return;
	}

	async play() {
		return;
	}

	async pause() {
		return;
	}

	async stop() {
		return;
	}

	async reset() {
		return;
	}

	async seek(position: number) {
		return;
	}

	async skipToNext() {
		return;
	}

	async skipToPrevious() {
		return;
	}

	async setVolume(volume: number) {
		return;
	}

	async setRate(rate: number) {
		return;
	}

	async setRepeatMode(repeatMode: number) {
		return;
	}

	async setShuffledQueue(trackIds: number[]) {
		return;
	}

	async moveToIndex(fromIndex: number, toIndex: number) {
		return;
	}

	async getQueue() {
		return [];
	}

	async getActiveTrack() {
		return null;
	}

	async getActiveTrackIndex() {
		return 0;
	}

	async getState() {
		return "idle";
	}

	async getPosition() {
		return 0;
	}

	async getDuration() {
		return 0;
	}

	async getBufferedPosition() {
		return 0;
	}

	addEventListener(event: string, listener: any) {
		return () => { };
	}

	registerPlaybackService(fn: () => any) {
		return;
	}
}

export default new TrackPlayerStub();
