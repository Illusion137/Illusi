import { fs } from "@native/fs/fs";
import { zip } from "@native/zip/zip";
import { ZipFile } from "@native/zip/zip_utils";
import { gen_uuid } from "@common/utils/util";
import type { CookieJar } from "@common/utils/cookie_util";
import { SQLfs } from "@illusive/sql/sql_fs";
import * as expo_fs from "expo-file-system/legacy";

export interface EpubMetadata {
	title?: string;
	author?: string;
	publisher?: string;
	date?: string;
	cover_path?: string;
}

function strip_path_prefix(path: string): string {
	return path.startsWith("file://") ? path.slice("file://".length) : path;
}

function join_path(base: string, ...parts: string[]): string {
	let result = base.replace(/\/+$/, "");
	for (const part of parts) {
		const cleaned = part.replace(/^\/+/, "").replace(/\/+$/, "");
		if (cleaned.length > 0) result += "/" + cleaned;
	}
	return result;
}

// Download the epub straight to disk via expo's native downloader. This
// streams the bytes on the native side, so the multi-MB payload never crosses
// the JS bridge — critical because routing it as base64 through
// write_file_as_string monopolizes the FS module and starves concurrent
// callers (e.g. FSCache.get_info from Elscione.view_path).
async function download_epub_to_cache(remote_url: string, audiobook_uuid: string, cookie_jar?: CookieJar): Promise<string | null> {
	const headers: Record<string, string> = {
		"user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
		"accept": "*/*"
	};
	if (cookie_jar !== undefined) headers.cookie = cookie_jar.toString();
	try {
		const cache_dir = await fs().temp_directory();
		const local_path = join_path(cache_dir, `${audiobook_uuid}_${gen_uuid()}.epub`);
		const result = await expo_fs.downloadAsync(remote_url, local_path, { headers });
		if (result.status < 200 || result.status >= 300) {
			await fs().remove(local_path).catch(() => { });
			return null;
		}
		const content_type = result.headers["Content-Type"] ?? result.headers["content-type"] ?? "";
		if (content_type.includes("text/html")) {
			await fs().remove(local_path).catch(() => { });
			return null;
		}
		return local_path;
	} catch {
		return null;
	}
}

function decode_xml_entities(s: string): string {
	return s
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, "\"")
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
		.replace(/&amp;/g, "&");
}

function extract_tag(xml: string, tag: string): string | undefined {
	const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
	const m = xml.match(re);
	return m ? decode_xml_entities(m[1].trim()) : undefined;
}

function extract_attr(tag: string, attr: string): string | undefined {
	const re = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, "i");
	const m = tag.match(re);
	return m ? m[1] : undefined;
}

function find_manifest_items(opf_xml: string): { id: string; href: string; media_type: string; properties: string }[] {
	const items: { id: string; href: string; media_type: string; properties: string }[] = [];
	const re = /<item\b[^>]*\/>|<item\b[^>]*>[\s\S]*?<\/item>/gi;
	const matches = opf_xml.match(re) ?? [];
	for (const m of matches) {
		const id = extract_attr(m, "id");
		const href = extract_attr(m, "href");
		const media_type = extract_attr(m, "media-type");
		const properties = extract_attr(m, "properties");
		if (id && href && media_type) items.push({ id, href, media_type, properties: properties ?? "" });
	}
	return items;
}

function find_cover_meta_id(opf_xml: string): string | undefined {
	const re = /<meta\b[^>]*name\s*=\s*"cover"[^>]*content\s*=\s*"([^"]+)"[^>]*\/?>/i;
	const m = re.exec(opf_xml);
	if (m) return m[1];
	const re2 = /<meta\b[^>]*content\s*=\s*"([^"]+)"[^>]*name\s*=\s*"cover"[^>]*\/?>/i;
	const m2 = re2.exec(opf_xml);
	return m2 ? m2[1] : undefined;
}

function resolve_relative(base_dir: string, rel: string): string {
	if (rel.startsWith("/")) return rel.slice(1);
	const parts = base_dir.length === 0 ? [] : base_dir.split("/").filter(p => p.length > 0);
	for (const part of rel.split("/")) {
		if (part === "" || part === ".") continue;
		if (part === "..") parts.pop();
		else parts.push(part);
	}
	return parts.join("/");
}

function dirname_of(path: string): string {
	const i = path.lastIndexOf("/");
	return i === -1 ? "" : path.slice(0, i);
}

function extension_for_media_type(media_type: string): string {
	const lower = media_type.toLowerCase();
	if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
	if (lower.includes("png")) return "png";
	if (lower.includes("gif")) return "gif";
	if (lower.includes("webp")) return "webp";
	return "img";
}

function find_entry_case_insensitive(entries: string[], target: string): string | undefined {
	const lower = target.toLowerCase();
	return entries.find(e => e.toLowerCase() === lower);
}

export async function extract_epub_metadata_from_url(remote_url: string, audiobook_uuid: string, cookie_jar?: CookieJar): Promise<EpubMetadata> {
	const downloaded = await download_epub_to_cache(remote_url, audiobook_uuid, cookie_jar);
	if (downloaded === null) return {};
	const local_path = strip_path_prefix(downloaded);
	try {
		const result = await extract_epub_metadata_from_file(local_path, audiobook_uuid);
		return result;
	} finally {
		fs().remove(local_path).catch(() => { });
	}
}

export async function extract_epub_metadata_from_file(file_path: string, audiobook_uuid: string): Promise<EpubMetadata> {
	const zip_file = new ZipFile(file_path);
	const loaded = await zip_file.load_zip();
	if ("error" in loaded) return {};
	const entries = zip_file.entry_list;

	const container_entry = find_entry_case_insensitive(entries, "META-INF/container.xml");
	if (container_entry === undefined) return {};
	const container_buf = await zip().stream_entry(file_path, container_entry);
	if ("error" in container_buf) return {};
	const container_xml = container_buf.toString("utf-8");
	const rootfile_match = /<rootfile\b[^>]*full-path\s*=\s*"([^"]+)"/i.exec(container_xml);
	if (rootfile_match === null) return {};
	const opf_path = rootfile_match[1];
	const opf_entry = find_entry_case_insensitive(entries, opf_path);
	if (opf_entry === undefined) return {};

	const opf_buf = await zip().stream_entry(file_path, opf_entry);
	if ("error" in opf_buf) return {};
	const opf_xml = opf_buf.toString("utf-8");
	const opf_dir = dirname_of(opf_path);

	const metadata: EpubMetadata = {
		title: extract_tag(opf_xml, "dc:title") ?? extract_tag(opf_xml, "title"),
		author: extract_tag(opf_xml, "dc:creator") ?? extract_tag(opf_xml, "creator"),
		publisher: extract_tag(opf_xml, "dc:publisher") ?? extract_tag(opf_xml, "publisher"),
		date: extract_tag(opf_xml, "dc:date") ?? extract_tag(opf_xml, "date")
	};

	const manifest_items = find_manifest_items(opf_xml);
	const cover_id = find_cover_meta_id(opf_xml);
	let cover_item = cover_id !== undefined ? manifest_items.find(it => it.id === cover_id) : undefined;
	if (cover_item === undefined) cover_item = manifest_items.find(it => it.properties.split(/\s+/).includes("cover-image"));
	if (cover_item === undefined) cover_item = manifest_items.find(it => /cover/i.test(it.id) && it.media_type.startsWith("image/"));
	if (cover_item === undefined) cover_item = manifest_items.find(it => it.media_type.startsWith("image/"));

	if (cover_item !== undefined) {
		const cover_path_in_zip = resolve_relative(opf_dir, cover_item.href);
		const cover_entry = find_entry_case_insensitive(entries, cover_path_in_zip);
		if (cover_entry !== undefined) {
			const cover_buf = await zip().stream_entry(file_path, cover_entry);
			if (!("error" in cover_buf)) {
				const book_dir = SQLfs.audiobook_directory(`${audiobook_uuid}/`);
				if (!(await fs().get_info(book_dir)).exists) {
					await fs().make_directory(book_dir).catch(() => { });
				}
				const ext = extension_for_media_type(cover_item.media_type);
				const cover_rel = `${audiobook_uuid}/cover.${ext}`;
				const dest = SQLfs.audiobook_directory(cover_rel);
				const base64 = cover_buf.toString("base64");
				const write_result = await fs().write_file_as_string(dest, base64, { encoding: "base64" });
				if (write_result === undefined || !("error" in write_result)) {
					const info = await fs().get_info(dest);
					if (info.exists) metadata.cover_path = cover_rel;
				}
			}
		}
	}

	return metadata;
}
