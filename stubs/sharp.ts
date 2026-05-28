export type Channels = 1 | 2 | 3 | 4;

const sharp = (_input?: unknown, _options?: unknown) => {
    const chain: {
        raw: () => typeof chain;
        png: () => typeof chain;
        toBuffer: () => Promise<Buffer>;
    } = {
        raw: () => chain,
        png: () => chain,
        toBuffer: () => Promise.reject(new Error('sharp is not supported in the React Native JS thread')),
    };
    return chain;
};

export default sharp;
