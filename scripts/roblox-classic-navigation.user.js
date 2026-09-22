// ==UserScript==
// @name         Roblox Classic Navigation
// @namespace    roblox-classic-navigation
// @version      2.0.0
// @description  Restores a classic Roblox sidebar from the live current navigation.
// @author       emblazes
// @credit       emblazes
// @match        https://www.roblox.com/*
// @match        https://roblox.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// @homepageURL  https://github.com/embz0/roblox-classic-navigation
// @supportURL   https://github.com/embz0/roblox-classic-navigation/issues
// @updateURL    https://raw.githubusercontent.com/embz0/roblox-classic-navigation/main/scripts/roblox-classic-navigation.user.js
// @downloadURL  https://raw.githubusercontent.com/embz0/roblox-classic-navigation/main/scripts/roblox-classic-navigation.user.js
// ==/UserScript==

(() => {
    'use strict';
    const ID = 'roblox-classic-navigation', STYLE = `${ID}-style`;
    const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
    let observer, pageObserver, timer, rebuilding = false, lastSignature = '';
    const absolute = value => { try { return new URL(value, location.href).href; } catch { return value || ''; } };
    const url = value => { try { return new URL(value, location.href); } catch { return null; } };
    const sourceNav = () => $('#left-navigation-container > .left-nav');
    const sourceMenu = () => sourceNav()?.querySelector('nav');
    const sourceList = () => sourceMenu()?.querySelector(':scope > ul');
    const classic = () => document.getElementById(ID);
    const controlOf = li => li?.querySelector(':scope > a, :scope > button') || null;
    const isProfileURL = value => { const u = url(value); return !!u && (u.pathname === '/users/profile' || /^\/users\/\d+\/profile$/.test(u.pathname)); };
    const text = element => {
        if (!element) return '';
        const copy = element.cloneNode(true);
        copy.querySelectorAll('.foundation-web-badge,.notification,[class*="badge"],[data-testid="foundation-web-icon"],svg,img').forEach(node => node.remove());
        return copy.textContent.replace(/\s+/g, ' ').trim();
    };
    const labelOf = control => {
        for (const selector of ['.nav-item-text','.ropro-sidebar-item-label','[class*="item-label"]','[class*="nav-label"]']) {
            const value = control?.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
            if (value) return value;
        }
        return text(control);
    };
    const badgeOf = control => control?.querySelector('.foundation-web-badge,.notification,[class*="badge"]')?.textContent.replace(/\s+/g, ' ').trim() || '';
    const isAccount = li => { const c = controlOf(li); return !!c && isProfileURL(c.getAttribute('href')) && !!c.querySelector('img[alt]'); };
    const profileData = () => {
        for (const li of sourceList()?.children || []) {
            if (!isAccount(li)) continue;
            const c = controlOf(li), image = c?.querySelector('img[alt]'), username = (image?.alt || text(c)).trim();
            if (image?.src && username) return { username, avatar: image.src, href: absolute(c.getAttribute('href')) };
        }
        return null;
    };
    const isPlus = li => url(controlOf(li)?.getAttribute('href'))?.pathname === '/plus';
    const isPromo = li => !isAccount(li) && !!controlOf(li)?.querySelector('img') && !text(controlOf(li));
    const ICONS = [
        [u => u.pathname === '/home','icon-nav-home'], [u => isProfileURL(u.href),'icon-nav-profile'],
        [u => u.pathname.startsWith('/my/messages'),'icon-nav-message'], [u => u.pathname.startsWith('/users/friends'),'icon-nav-friends'],
        [u => u.pathname === '/my/avatar','icon-nav-charactercustomizer'], [u => u.pathname === '/users/inventory' || /^\/users\/\d+\/inventory$/.test(u.pathname),'icon-nav-inventory'],
        [u => u.pathname === '/trades','icon-nav-trade'], [u => u.pathname === '/communities' || u.pathname === '/my/communities','icon-nav-group'],
        [u => u.hostname === 'blog.roblox.com','icon-nav-blog'], [u => u.pathname.startsWith('/giftcards'),'icon-nav-giftcards']
    ];
    const oldIcon = control => { const u = url(control?.getAttribute('href')); return u && ICONS.find(([match]) => match(u))?.[1]; };
    const sourceIcon = control => ['[data-testid="foundation-web-icon"]','.nav-item-icon','.new-menu-icon','.ropro-sidebar-icon','[class*="sidebar-icon"]','[class*="nav-icon"]','svg','[class*="icon"]'].map(s => control?.querySelector(s)).find(Boolean);
    const copyStyle = (from, to) => ['background-image','background-position','background-repeat','background-size','mask-image','mask-position','mask-repeat','mask-size','-webkit-mask-image','-webkit-mask-position','-webkit-mask-repeat','-webkit-mask-size','color','fill','stroke','border-radius'].forEach(property => {
        const value = getComputedStyle(from).getPropertyValue(property);
        if (value && !['none','normal','auto'].includes(value)) to.style.setProperty(property, value);
    });
    const makeIcon = control => {
        const wrap = document.createElement('div'); wrap.className = 'classic-icon-container';
        const known = oldIcon(control);
        if (known) { const node = document.createElement('span'); node.className = known; wrap.append(node); return wrap; }
        const source = sourceIcon(control);
        if (!source) { const node = document.createElement('span'); node.className = 'classic-icon-placeholder'; wrap.append(node); return wrap; }
        const copy = source.cloneNode(true); copy.removeAttribute('id'); copy.classList.add('classic-copied-icon'); copyStyle(source, copy);
        source.querySelectorAll('*').forEach((node, i) => { const target = copy.querySelectorAll('*')[i]; if (target) copyStyle(node, target); });
        wrap.append(copy); return wrap;
    };
    const copyAttributes = (from, to) => [...from.attributes].forEach(attr => {
        if (!['id','class','style','href'].includes(attr.name) && (attr.name.startsWith('data-') || attr.name.startsWith('aria-') || ['target','rel','title'].includes(attr.name))) to.setAttribute(attr.name, attr.value);
    });
    const makeRow = li => {
        const source = controlOf(li); if (!source) return null;
        const control = document.createElement(source.tagName === 'BUTTON' ? 'button' : 'a');
        control.className = 'dynamic-overflow-container text-nav classic-nav-row'; copyAttributes(source, control);
        if (source.tagName === 'BUTTON') { control.type = 'button'; control.addEventListener('click', e => { e.preventDefault(); source.click(); }); }
        else if (source.getAttribute('href')) control.href = absolute(source.getAttribute('href'));
        control.append(makeIcon(source));
        const label = document.createElement('span'); label.className = 'font-header-2 dynamic-ellipsis-item classic-nav-label'; label.textContent = labelOf(source); control.append(label);
        const badgeText = badgeOf(source);
        if (badgeText) { const wrap = document.createElement('div'), badge = document.createElement('span'); wrap.className = 'dynamic-width-item align-right'; badge.className = 'notification-blue notification classic-live-badge'; badge.textContent = badge.title = badgeText; wrap.append(badge); control.append(wrap); }
        const result = document.createElement('li'); copyAttributes(li, result); result.append(control); return result;
    };
    const makeProfile = profile => {
        const list = document.createElement('ul'), item = document.createElement('li'), link = document.createElement('a'), avatar = document.createElement('span'), thumb = document.createElement('span'), image = document.createElement('img'), name = document.createElement('span'), divider = document.createElement('li');
        list.className = 'classic-profile-list'; link.className = 'dynamic-overflow-container text-nav classic-profile-link'; link.href = profile.href; avatar.className = 'avatar avatar-headshot-xs'; thumb.className = 'thumbnail-2d-container avatar-card-image'; image.className = 'classic-profile-image'; image.src = profile.avatar; image.alt = profile.username; name.className = 'classic-profile-name font-header-2 dynamic-ellipsis-item'; name.textContent = profile.username; divider.className = 'rbx-divider classic-profile-divider';
        thumb.append(image); avatar.append(thumb); link.append(avatar, name); item.append(link); list.append(item, divider); return list;
    };
    const makePlus = li => {
        const source = controlOf(li); if (!source) return null;
        const value = (labelOf(source) || source.textContent).replace(/\s+/g, ' ').trim(), item = document.createElement('li'), link = document.createElement('a'), label = document.createElement('span');
        item.className = 'rbx-upgrade-now classic-upgrade'; link.className = 'btn-growth-md btn-secondary-md classic-plus-button'; link.title = value; if (source.getAttribute('href')) link.href = absolute(source.getAttribute('href')); if (value.length > 28) link.classList.add('classic-plus-very-long'); else if (value.length > 18) link.classList.add('classic-plus-long'); label.className = 'classic-plus-label'; label.textContent = value; link.append(label); item.append(link); return item;
    };
    const makePromo = li => {
        const source = controlOf(li), image = source?.querySelector('img'); if (!source || !image) return null;
        const item = document.createElement('li'), link = document.createElement('a'), copy = image.cloneNode(true); item.className = 'classic-promo'; if (source.getAttribute('href')) link.href = absolute(source.getAttribute('href')); if (source.target) link.target = source.target; copy.removeAttribute('style'); link.append(copy); item.append(link); return item;
    };
    const copyExtras = root => {
        const nav = sourceMenu(), parent = nav?.parentElement, target = $('.classic-extra-sections', root); if (!nav || !parent || !target) return;
        for (const source of [...parent.children].slice([...parent.children].indexOf(nav) + 1)) {
            if (!source.textContent.trim() && !source.querySelector('img,a,button,svg')) continue;
            const copy = source.cloneNode(true); copy.classList.add('classic-copied-section'); copy.removeAttribute('id'); $$('[id]', copy).forEach(node => node.removeAttribute('id')); $$('a[href]', copy).forEach(link => link.href = absolute(link.getAttribute('href')));
            $$('button', copy).forEach((button, i) => button.addEventListener('click', e => { e.preventDefault(); $$('button', source)[i]?.click(); })); target.append(copy);
        }
    };
    const makeClassic = () => {
        const list = sourceList(), profile = profileData(); if (!list || !profile) return null;
        const root = document.createElement('div'), scroll = document.createElement('div'), items = document.createElement('ul'), extras = document.createElement('div'); root.id = ID; root.className = 'rbx-left-col nav-show roblox-classic-nav'; scroll.className = 'rbx-scrollbar classic-scrollbar'; items.className = 'left-col-list'; extras.className = 'classic-extra-sections'; root.append(makeProfile(profile));
        let plus; const promos = [];
        for (const li of list.children) { if (isAccount(li)) continue; if (isPlus(li)) { plus = li; continue; } if (isPromo(li)) { promos.push(li); continue; } const row = makeRow(li); if (row) items.append(row); }
        if (plus) { const item = makePlus(plus); if (item) items.append(item); } promos.forEach(promo => { const item = makePromo(promo); if (item) items.append(item); }); scroll.append(items, extras); root.append(scroll); copyExtras(root); return root;
    };
    const signature = () => {
        const list = sourceList(), profile = profileData(); if (!list || !profile) return '';
        const data = [profile.username,profile.avatar,profile.href];
        for (const li of list.children) { const c = controlOf(li); data.push([c?.tagName || '',c?.getAttribute('href') || '',labelOf(c),badgeOf(c),c?.querySelector('img')?.src || '',isAccount(li),isPlus(li),isPromo(li)].join('|')); }
        const nav = sourceMenu(), parent = nav?.parentElement; if (nav && parent) [...parent.children].slice([...parent.children].indexOf(nav) + 1).forEach(extra => data.push(extra.textContent.replace(/\s+/g,' ').trim(),...$$('a[href]',extra).map(a=>a.href),...$$('img[src]',extra).map(image=>image.src)));
        return data.join('\n');
    };
    const syncTheme = () => {
        const source = sourceNav(), nav = classic(); if (!source || !nav) return;
        const style = getComputedStyle(source), root = getComputedStyle(document.documentElement); if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') nav.style.setProperty('--classic-bg',style.backgroundColor); if (style.color) nav.style.setProperty('--classic-text',style.color);
        Object.entries({'--classic-hover':'--color-state-hover','--classic-border':'--color-stroke-default','--classic-badge-bg':'--color-system-contrast','--classic-badge-text':'--color-surface-0','--classic-button-bg':'--color-action-sub-emphasis-background','--classic-button-text':'--color-action-sub-emphasis-foreground'}).forEach(([to,from]) => { const value = root.getPropertyValue(from).trim(); if (value) nav.style.setProperty(to,value); });
    };
    const observe = () => {
        const source = sourceNav(); if (!source) return; observer?.disconnect(); observer = new MutationObserver(() => { if (!rebuilding) schedule(); }); observer.observe(source,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','src','alt','class','aria-label']});
    };
    const rebuild = (force = false) => {
        if (rebuilding) return; const container = $('#left-navigation-container'), source = sourceNav(), next = signature(); if (!container || !source || !sourceList() || !profileData() || (!force && next === lastSignature && classic())) return;
        rebuilding = true; observer?.disconnect(); try { const replacement = makeClassic(); if (!replacement) return; classic()?.replaceWith(replacement) || container.insertBefore(replacement,source); lastSignature = next; syncTheme(); } finally { rebuilding = false; observe(); }
    };
    const schedule = (delay = 60) => { clearTimeout(timer); timer = setTimeout(rebuild,delay); };
    const installStyle = () => {
        if ($( `#${STYLE}`)) return; const style = document.createElement('style'); style.id = STYLE; style.textContent = `#${ID}{--classic-bg:var(--color-navigation-background,var(--color-surface-0,#121215));--classic-text:var(--color-content-emphasis,#f7f7f8);--classic-hover:rgba(255,255,255,.08);--classic-border:rgba(255,255,255,.12);--classic-badge-bg:#fff;--classic-badge-text:#111;--classic-button-bg:#fff;--classic-button-text:#111;background:var(--classic-bg)!important;color:var(--classic-text)!important;display:flex!important;flex-direction:column;width:175px;min-width:175px;height:100%;position:fixed;z-index:1000;left:0;top:0}.classic-profile-list,.left-col-list{list-style:none;margin:0;padding:0}.classic-profile-link,.classic-nav-row{display:flex!important;align-items:center;gap:10px;min-height:32px;padding:0 10px;color:var(--classic-text)!important;text-decoration:none!important;font-size:14px}.classic-profile-link{height:50px}.classic-profile-image{width:30px;height:30px;border-radius:50%;object-fit:cover}.classic-profile-name,.classic-nav-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.classic-profile-divider{border-top:1px solid var(--classic-border);margin:0 10px}.classic-scrollbar{overflow-y:auto;flex:1;padding:6px 0}.classic-nav-row:hover{background:var(--classic-hover)}.classic-icon-container{width:18px;height:18px;display:grid;place-items:center;flex:0 0 18px}.classic-icon-container>span,.classic-copied-icon{max-width:18px;max-height:18px}.classic-icon-placeholder{width:12px;height:12px;border-radius:3px;background:currentColor;opacity:.45}.classic-live-badge{margin-left:auto;background:var(--classic-badge-bg)!important;color:var(--classic-badge-text)!important;min-width:18px;text-align:center}.classic-upgrade{padding:10px}.classic-plus-button{display:block!important;width:100%;text-align:center;background:var(--classic-button-bg)!important;color:var(--classic-button-text)!important}.classic-plus-label{font-size:12px}.classic-promo{padding:4px 10px}.classic-promo img{display:block;width:100%;height:auto;border-radius:6px}.classic-extra-sections{padding:0 10px}.classic-copied-section{max-width:100%;overflow:hidden}#left-navigation-container>.left-nav{visibility:hidden!important;pointer-events:none!important}body{padding-left:175px!important}@media(max-width:768px){#${ID}{display:none!important}#left-navigation-container>.left-nav{visibility:visible!important;pointer-events:auto!important}body{padding-left:0!important}}`; (document.head || document.documentElement).append(style);
    };
    const start = () => { installStyle(); pageObserver?.disconnect(); pageObserver = new MutationObserver(schedule); pageObserver.observe(document.documentElement,{childList:true,subtree:true}); rebuild(true); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
