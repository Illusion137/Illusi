declare module 'nodejs-mmkv' {
	interface MMKVModuleOptions {
		rootDir: string;
		id?: string;
		multiProcess?: boolean;
		cryptKey?: string;
		logLevel?: 'debug' | 'info' | 'warning' | 'error' | 'none';
	}

	class MMKVModule {
		constructor(options: MMKVModuleOptions);

		setString(key: string, value: string): boolean | undefined;
		getString(key: string): string | undefined;
		setBoolean(key: string, value: boolean): boolean | undefined;
		getBoolean(key: string): boolean | undefined;
		setNumber(key: string, value: number): boolean | undefined;
		getNumber(key: string): number | undefined;

		containsKey(key: string): boolean | undefined;
		getKeys(): string[] | undefined;
		removeKey(key: string): void;
		clearMemoryCache(): void;
		clearAll(): void;
	}

	export { MMKVModule, MMKVModuleOptions };
}

declare module 'get-audio-duration' {
	const getAudioDurationInSeconds: (absolutePathToFile: string, ffprobePath?: string) => Promise<number>;
	export default getAudioDurationInSeconds;
	export { getAudioDurationInSeconds };
}

declare module 'jsdom-jscore-rn' {
	const jsdom: { jsdom: (html: string) => unknown };
	export default jsdom;
}

declare module 'mammoth/mammoth.browser.js' {
	const mammoth: unknown;
	export default mammoth;
}

declare module 'pdfjs-dist/build/pdf.mjs' {
	export * from 'pdfjs-dist';
}
