import { BG, buildURL, GOOG_API_KEY, USER_AGENT } from "bgutils-js";
import { JSDOM } from "jsdom";
import nodeFetch from "node-fetch";

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

async function setupGlobals() {
	if (typeof globalThis.document !== "undefined") return;

	const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
		url: "https://www.youtube.com",
		referrer: "https://www.youtube.com/",
		contentType: "text/html",
		storageQuota: 10000000,
		userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
	});

	Object.assign(globalThis, {
		window: dom.window,
		document: dom.window.document,
		location: dom.window.location,
		origin: dom.window.origin,
		addEventListener: dom.window.addEventListener.bind(dom.window),
		removeEventListener: dom.window.removeEventListener.bind(dom.window),
		dispatchEvent: dom.window.dispatchEvent.bind(dom.window),
		screen: {
			width: 1920,
			height: 1080,
			availWidth: 1920,
			availHeight: 1050,
			colorDepth: 24,
			pixelDepth: 24
		},
		performance: {
			now: () => Date.now(),
			timeOrigin: Date.now()
		}
	});

	if (!Reflect.has(globalThis, "navigator")) {
		Object.defineProperty(globalThis, "navigator", {
			value: dom.window.navigator
		});
	}

	Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", {
		value: () => null,
		writable: true,
		configurable: true
	});

	globalThis.TextEncoder = TextEncoder;
	globalThis.TextDecoder = TextDecoder;
	globalThis.atob = (str) => Buffer.from(str, "base64").toString("binary");
	globalThis.btoa = (str) => Buffer.from(str, "binary").toString("base64");

	globalThis.HTMLElement = dom.window.HTMLElement;
	globalThis.HTMLBodyElement = dom.window.HTMLBodyElement;
	globalThis.HTMLDivElement = dom.window.HTMLDivElement;
	globalThis.HTMLIFrameElement = dom.window.HTMLIFrameElement;

	let lastTime = 0;
	globalThis.requestAnimationFrame = (callback) => {
		const currTime = Date.now();
		const timeToCall = Math.max(0, 16 - (currTime - lastTime));
		const id = setTimeout(() => callback(currTime + timeToCall), timeToCall);
		lastTime = currTime + timeToCall;
		return id;
	};
	globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

	if (!globalThis.fetch) {
		globalThis.fetch = nodeFetch;
		globalThis.Headers = nodeFetch.Headers;
		globalThis.Request = nodeFetch.Request;
		globalThis.Response = nodeFetch.Response;
	}
}

let attestation_challenge_cache;

export async function generateContentBoundPoToken(content_binding, context) {
	await setupGlobals();

	let challengeData;
	if (attestation_challenge_cache === undefined) {
		const challengeResponse = await nodeFetch("https://www.youtube.com/youtubei/v1/att/get?prettyPrint=false&alt=json", {
			method: "POST",
			headers: {
				Accept: "*/*",
				"Content-Type": "application/json",
				"X-Goog-Visitor-Id": context.client.visitorData ?? "",
				"X-Youtube-Client-Version": context.client.clientVersion,
				"X-Youtube-Client-Name": "1",
				"User-Agent": USER_AGENT
			},
			body: JSON.stringify({
				engagementType: "ENGAGEMENT_TYPE_UNBOUND",
				context
			})
		});

		if (!challengeResponse.ok) {
			throw new Error(`BotGuard challenge request failed: ${challengeResponse.status}`);
		}

		challengeData = await challengeResponse.json();

		if (!challengeData.bgChallenge) {
			throw new Error("Failed to get BotGuard challenge");
		}
		attestation_challenge_cache = challengeData;
	} else challengeData = attestation_challenge_cache;

	let interpreterUrl = challengeData.bgChallenge.interpreterUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;

	if (interpreterUrl.startsWith("//")) {
		interpreterUrl = `https:${interpreterUrl}`;
	}

	const bgScriptResponse = await nodeFetch(interpreterUrl);
	const interpreterJavascript = await bgScriptResponse.text();

	if (!interpreterJavascript) {
		throw new Error("Could not load VM: empty interpreter JS");
	}

	// eslint-disable-next-line @typescript-eslint/no-implied-eval
	new Function(interpreterJavascript)();

	const botGuard = await BG.BotGuardClient.create({
		program: challengeData.bgChallenge.program,
		globalName: challengeData.bgChallenge.globalName,
		globalObj: globalThis
	});

	const webPoSignalOutput = [];
	const botGuardResponse = await botGuard.snapshot({ webPoSignalOutput }, 10_000);

	const integrityTokenResponse = await nodeFetch(buildURL("GenerateIT", true), {
		method: "POST",
		headers: {
			"content-type": "application/json+protobuf",
			"x-goog-api-key": GOOG_API_KEY,
			"x-user-agent": "grpc-web-javascript/0.1",
			"user-agent": USER_AGENT
		},
		body: JSON.stringify([REQUEST_KEY, botGuardResponse])
	});

	const integrityTokenData = await integrityTokenResponse.json();

	if (typeof integrityTokenData[0] !== "string") {
		throw new Error("Could not get integrity token");
	}

	const minter = await BG.WebPoMinter.create({ integrityToken: integrityTokenData[0] }, webPoSignalOutput);

	return await minter.mintAsWebsafeString(content_binding);
}
