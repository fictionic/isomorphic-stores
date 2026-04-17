import {PAGE_HEADER_LINK_ELEMENT_ATTR, PAGE_HEADER_STYLE_ELEMENT_ATTR} from "../core/constants";
import {getMetaTagAttrs} from "../core/handler/Page";
import type {StandardizedPage, Stylesheet, LinkTag, MetaTag, BaseTag} from "../core/handler/Page";

export function writeHeader(page: StandardizedPage, write: (html: string) => void) {
  write('<meta charset="utf-8" />'); // TODO is this needed given we set Content-Type in handleRoute?
  write(renderBaseTag(page.getBase()));
  write(renderMetaTags(page.getMetaTags()));
  write(renderTitle(page.getTitle()));
  write(renderLinkTags(page.getSystemLinkTags()));
  write(renderLinkTags(page.getLinkTags()));
  write(renderStylesheets(page.getSystemStylesheets()));
  write(renderStylesheets(page.getStylesheets()));
}

function renderBaseTag(base: BaseTag | null): string {
  if (!base) return '';
  let s = '<base';
  if (base.href) s += ` href="${escapeHtml(base.href)}"`;
  if (base.target) s += ` target="${escapeHtml(base.target)}"`;
  return s + '>';
}

function renderMetaTags(tags: MetaTag[]): string {
  return tags.map(t => {
    const attrs = Object.entries(getMetaTagAttrs(t)).map(([k, v]) => ` ${k}="${escapeHtml(v)}"`).join('');
    const tag = `<meta${attrs}>`;
    return t.noscript ? `<noscript>${tag}</noscript>` : tag;
  }).join('\n');
}

function renderTitle(title: string | null): string {
  if (typeof title === 'string') {
    return `<title>${escapeHtml(title)}</title>`;
  }
  return '';
}

function renderLinkTags(tags: LinkTag[]): string {
  return tags.map(t => {
    let s = `<link ${PAGE_HEADER_LINK_ELEMENT_ATTR} rel="${escapeHtml(t.rel)}" href="${escapeHtml(t.href)}"`;
    if (t.as) s += ` as="${escapeHtml(t.as)}"`;
    if (t.crossorigin) s += ` crossorigin="${escapeHtml(t.crossorigin)}"`;
    if (t.type) s += ` type="${escapeHtml(t.type)}"`;
    return s + '>';
  }).join('\n');
}

function renderStylesheets(stylesheets: Stylesheet[]): string {
  return stylesheets.map(s => {
    const dataAttr = s.dataAttr
      ? ` ${s.dataAttr.name}${s.dataAttr.value != null ? `="${escapeHtml(s.dataAttr.value)}"` : ''}`
      : '';
    if ('href' in s) {
      return `<link ${PAGE_HEADER_STYLE_ELEMENT_ATTR} rel="stylesheet" href="${escapeHtml(s.href)}"${dataAttr}>`;
    }
    const type = s.type ?? 'text/css';
    const media = s.media ?? '';
    const mediaAttr = media ? ` media="${escapeHtml(media)}"` : '';
    return `<style ${PAGE_HEADER_STYLE_ELEMENT_ATTR} type="${escapeHtml(type)}"${mediaAttr}${dataAttr}>${escapeStyleText(s.text)}</style>`;
  }).join('\n');
}

function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeStyleText(s: string): string {
  return s.replace(/<\/style/gi, '<\\/style');
}
