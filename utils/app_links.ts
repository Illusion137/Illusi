const APP_SCHEME = /^(illusi|com\.illusion137\.illusi(\.dev)?):/i;
const DEV_CLIENT = /^[\w.+-]+:\/\/expo-development-client\b/i;

/** The link a share sheet passed as `url=`, whole: older share extensions left the link's own `&`s unescaped */
export function shared_url(url: string): string | null {
	const match = /[?&]url=/.exec(url);
	if (match === null) return null;
	const raw = url.slice(match.index + match[0].length);
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

/** Links utils/linking opens itself rather than as a route */
export function is_app_link(url: string): boolean {
	return APP_SCHEME.test(url) && !DEV_CLIENT.test(url);
}
