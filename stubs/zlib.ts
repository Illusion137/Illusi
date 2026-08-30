import pako from "pako";
import { Buffer } from "buffer";

export function deflateRawSync(data: Uint8Array | string): Buffer {
	return Buffer.from(pako.deflateRaw(data));
}

export function inflateRawSync(data: Uint8Array | string): Buffer {
	return Buffer.from(pako.inflateRaw(data));
}
