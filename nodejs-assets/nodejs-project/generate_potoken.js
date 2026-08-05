/* eslint-disable @typescript-eslint/no-implied-eval */
import { BotGuardClient } from "bgutils-js/botguard";
import { buildURL, parseLooseJSON, getHeaders, USER_AGENT } from "bgutils-js/utils";
import { WebPoMinter } from "bgutils-js/webpo";
import { JSDOM } from "jsdom";
import nodeFetch from "node-fetch";

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

function setupBotguardEnvironment(pageHtml) {
	if (typeof globalThis.document !== "undefined") return;

	const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "https://www.youtube.com", referrer: "https://www.youtube.com/", contentType: "text/html", storageQuota: 10000000, userAgent: USER_AGENT });

	const ytcfgMatch = /ytcfg\.set\(({.+?})\);/s.exec(pageHtml);
	if (!ytcfgMatch) {
		throw new Error("Could not find ytcfg in page HTML");
	}
	let ytcfg;
	try {
		ytcfg = JSON.parse(ytcfgMatch[1]);
	} catch (e) {
		throw new Error(`Could not parse ytcfg: ${e.message}`);
	}
	// Needed because of EVENT_ID
	dom.window.yt = { config_: ytcfg };

	Object.assign(globalThis, {
		yt: dom.window.yt,
		window: dom.window,
		document: dom.window.document,
		location: dom.window.location,
		origin: dom.window.origin,
		addEventListener: dom.window.addEventListener.bind(dom.window),
		removeEventListener: dom.window.removeEventListener.bind(dom.window),
		dispatchEvent: dom.window.dispatchEvent.bind(dom.window),
		screen: { width: 1920, height: 1080, availWidth: 1920, availHeight: 1050, colorDepth: 24, pixelDepth: 24 },
		performance: { now: () => Date.now(), timeOrigin: Date.now() }
	});

	if (!Reflect.has(globalThis, "navigator")) {
		Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator });
	}

	Object.defineProperty(dom.window.HTMLCanvasElement.prototype, "getContext", { value: () => null, writable: true, configurable: true });

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

let global_minter;
async function create_minter() {
	if (global_minter !== undefined) return global_minter;

	const pageResponse = await nodeFetch("https://www.youtube.com", { headers: { accept: "*/*", "accept-language": "en-US,en;q=0.7", "user-agent": USER_AGENT } });
	if (!pageResponse.ok) {
		throw new Error(`YouTube page request failed: ${pageResponse.status}`);
	}
	const pageHtml = await pageResponse.text();

	setupBotguardEnvironment(pageHtml);

	const initialAttestationMatch = /window\.ytAtN\(\s*({[\s\S]*?})\s*\)/.exec(pageHtml);
	if (!initialAttestationMatch) {
		throw new Error("Could not find challenge in page HTML");
	}

	let initialAttestationData;
	try {
		initialAttestationData = parseLooseJSON(initialAttestationMatch[1]);
	} catch (e) {
		throw new Error(`Failed to parse initial attestation data: ${e.message}`);
	}
	const challengeData = initialAttestationData.R;

	if (!challengeData?.bgChallenge) {
		throw new Error("Could not get BotGuard challenge");
	}

	let interpreterUrl = challengeData.bgChallenge.interpreterUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;

	if (!interpreterUrl) {
		throw new Error("Could not get interpreter URL from BotGuard challenge");
	}

	if (interpreterUrl.startsWith("//")) {
		interpreterUrl = `https:${interpreterUrl}`;
	}

	const bgScriptResponse = await nodeFetch(interpreterUrl);
	const interpreterJavascript = await bgScriptResponse.text();

	if (!interpreterJavascript) {
		throw new Error("Could not load VM: empty interpreter JS");
	}

	new Function(interpreterJavascript)();

	const botGuard = await BotGuardClient.create({ program: challengeData.bgChallenge.program, globalName: challengeData.bgChallenge.globalName, globalObject: globalThis });

	const webPoSignalOutput = [];
	const botGuardResponse = await botGuard.snapshot({ webPoSignalOutput }, 10_000);

	const integrityTokenResponse = await nodeFetch(buildURL("GenerateIT", true), { method: "POST", headers: getHeaders(), body: JSON.stringify([REQUEST_KEY, botGuardResponse]) });

	const integrityTokenJson = await integrityTokenResponse.json();

	if (typeof integrityTokenJson[0] !== "string") {
		throw new Error("Could not get integrity token");
	}

	const [integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken] = integrityTokenJson;

	const minter = await WebPoMinter.create({ integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken }, webPoSignalOutput);

	global_minter = minter;
	return minter;
}

let minter_status = undefined;
export async function fetch_minter() {
	if (minter_status?.[0] === "recieved") return minter_status[1];
	if (minter_status?.[0] === "sent") {
		const recieved = await minter_status[1];
		minter_status = ["recieved", recieved];
		return recieved;
	}
	const sent_minter = create_minter();
	minter_status = ["sent", sent_minter];
	return await sent_minter;
}

export async function generateContentBoundPoToken(content_binding) {
	const minter = await fetch_minter();
	return await minter.mintAsWebsafeString(content_binding);
}
