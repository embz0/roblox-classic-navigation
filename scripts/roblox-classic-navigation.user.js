// ==UserScript==
// @name         Roblox Classic Navigation
// @namespace    roblox-classic-navigation
// @version      2.0.1
// @description  Restores the classic Roblox sidebar using the current sidebar as a live data source.
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

    const CLASSIC_ID = 'roblox-classic-navigation';
    const STYLE_ID = 'roblox-classic-navigation-style';

    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];

    let sourceObserver;
    let pageObserver;
    let currentSource;
    let rebuildTimer;
    let rebuilding = false;
    let lastSignature = '';

    const absolute = value => {
        try {
            return new URL(value, location.href).href;
        } catch {
            return value || '';
        }
    };

    const url = value => {
        try {
            return new URL(value, location.href);
        } catch {
            return null;
        }
    };

    const sourceNav = () =>
        $('#left-navigation-container > .left-nav');

    const sourceMenu = () =>
        sourceNav()?.querySelector('nav');

    const sourceList = () =>
        sourceMenu()?.querySelector(':scope > ul');

    const classicNav = () =>
        document.getElementById(CLASSIC_ID);

    const controlOf = li =>
        li?.querySelector(':scope > a, :scope > button') || null;

    const isProfileURL = value => {
        const u = url(value);
        return !!u && (
            u.pathname === '/users/profile' ||
            /^\/users\/\d+\/profile$/.test(u.pathname)
        );
    };

    function cleanText(element) {
        if (!element) return '';

        const clone = element.cloneNode(true);

        clone.querySelectorAll(
            '.foundation-web-badge,.notification,[class*="badge"],[data-testid="foundation-web-icon"],svg,img'
        ).forEach(el => el.remove());

        return clone.textContent.replace(/\s+/g, ' ').trim();
    }

    function labelOf(control) {
        if (!control) return '';

        for (const selector of [
            '.nav-item-text',
            '.ropro-sidebar-item-label',
            '[class*="item-label"]',
            '[class*="nav-label"]'
        ]) {
            const text = control.querySelector(selector)?.textContent
                ?.replace(/\s+/g, ' ')
                .trim();

            if (text) return text;
        }

        return cleanText(control);
    }

    function badgeOf(control) {
        return control?.querySelector(
            '.foundation-web-badge,.notification,[class*="badge"]'
        )?.textContent.replace(/\s+/g, ' ').trim() || '';
    }

    function isAccountHeader(li) {
        const control = controlOf(li);
        return !!control &&
            isProfileURL(control.getAttribute('href')) &&
            !!control.querySelector('img[alt]');
    }

    function profileData() {
        const list = sourceList();
        if (!list) return null;

        for (const li of list.children) {
            if (!isAccountHeader(li)) continue;

            const control = controlOf(li);
            const image = control?.querySelector('img[alt]');

            if (!image?.src) continue;

            const username = (image.alt || cleanText(control)).trim();
            if (!username) continue;

            return {
                username,
                avatar: image.src,
                href: absolute(control.getAttribute('href'))
            };
        }

        return null;
    }

    function isPlus(li) {
        const u = url(controlOf(li)?.getAttribute('href'));
        return u?.pathname === '/plus';
    }

    function isPromo(li) {
        if (isAccountHeader(li)) return false;

        const control = controlOf(li);
        const image = control?.querySelector('img');

        return !!image && cleanText(control) === '';
    }

    const ICONS = [
        [u => u.pathname === '/home', 'icon-nav-home'],
        [u => isProfileURL(u.href), 'icon-nav-profile'],
        [u => u.pathname.startsWith('/my/messages'), 'icon-nav-message'],
        [u => u.pathname.startsWith('/users/friends'), 'icon-nav-friends'],
        [u => u.pathname === '/my/avatar', 'icon-nav-charactercustomizer'],
        [u => u.pathname === '/users/inventory' || /^\/users\/\d+\/inventory$/.test(u.pathname), 'icon-nav-inventory'],
        [u => u.pathname === '/trades', 'icon-nav-trade'],
        [u => u.pathname === '/communities' || u.pathname === '/my/communities', 'icon-nav-group'],
        [u => u.hostname === 'blog.roblox.com', 'icon-nav-blog'],
        [u => u.pathname.startsWith('/giftcards'), 'icon-nav-giftcards']
    ];

    function oldIconClass(control) {
        const u = url(control?.getAttribute('href'));
        if (!u) return null;

        for (const [match, icon] of ICONS) {
            try {
                if (match(u)) return icon;
            } catch {}
        }

        return null;
    }

    function sourceIcon(control) {
        if (!control) return null;

        for (const selector of [
            '[data-testid="foundation-web-icon"]',
            '.nav-item-icon',
            '.new-menu-icon',
            '.ropro-sidebar-icon',
            '[class*="sidebar-icon"]',
            '[class*="nav-icon"]',
            'svg',
            '[class*="icon"]'
        ]) {
            const found = control.querySelector(selector);
            if (found) return found;
        }

        return null;
    }

    function copyIconStyle(from, to) {
        const s = getComputedStyle(from);

        for (const property of [
            'background-image',
            'background-position',
            'background-repeat',
            'background-size',
            'mask-image',
            'mask-position',
            'mask-repeat',
            'mask-size',
            '-webkit-mask-image',
            '-webkit-mask-position',
            '-webkit-mask-repeat',
            '-webkit-mask-size',
            'color',
            'fill',
            'stroke',
            'border-radius'
        ]) {
            const value = s.getPropertyValue(property);

            if (value && !['none', 'normal', 'auto'].includes(value))
                to.style.setProperty(property, value);
        }
    }

    function makeIcon(control) {
        const wrapper = document.createElement('div');
        wrapper.className = 'classic-icon-container';

        const oldClass = oldIconClass(control);

        if (oldClass) {
            const icon = document.createElement('span');
            icon.className = oldClass;
            wrapper.append(icon);
            return wrapper;
        }

        const source = sourceIcon(control);

        if (!source) {
            const placeholder = document.createElement('span');
            placeholder.className = 'classic-icon-placeholder';
            wrapper.append(placeholder);
            return wrapper;
        }

        const clone = source.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('classic-copied-icon');

        copyIconStyle(source, clone);

        const originalChildren = source.querySelectorAll('*');
        const clonedChildren = clone.querySelectorAll('*');

        originalChildren.forEach((child, i) => {
            if (clonedChildren[i])
                copyIconStyle(child, clonedChildren[i]);
        });

        wrapper.append(clone);
        return wrapper;
    }

    function copyAttributes(from, to) {
        for (const attr of from.attributes) {
            if (['id', 'class', 'style', 'href'].includes(attr.name))
                continue;

            if (
                attr.name.startsWith('data-') ||
                attr.name.startsWith('aria-') ||
                ['target', 'rel', 'title'].includes(attr.name)
            ) {
                to.setAttribute(attr.name, attr.value);
            }
        }
    }

    function makeRow(li) {
        const source = controlOf(li);
        if (!source) return null;

        const button = source.tagName === 'BUTTON';
        const control = document.createElement(button ? 'button' : 'a');

        control.className = 'dynamic-overflow-container text-nav classic-nav-row';
        copyAttributes(source, control);

        if (button) {
            control.type = 'button';
            control.addEventListener('click', e => {
                e.preventDefault();
                source.click();
            });
        } else {
            const href = source.getAttribute('href');
            if (href) control.href = absolute(href);
        }

        control.append(makeIcon(source));

        const label = document.createElement('span');
        label.className = 'font-header-2 dynamic-ellipsis-item classic-nav-label';
        label.textContent = labelOf(source);
        control.append(label);

        const badgeText = badgeOf(source);

        if (badgeText) {
            const wrap = document.createElement('div');
            wrap.className = 'dynamic-width-item align-right';

            const badge = document.createElement('span');
            badge.className = 'notification-blue notification classic-live-badge';
            badge.textContent = badge.title = badgeText;

            wrap.append(badge);
            control.append(wrap);
        }

        const result = document.createElement('li');
        copyAttributes(li, result);
        result.append(control);

        return result;
    }

    function makeProfile(profile) {
        const ul = document.createElement('ul');
        ul.className = 'classic-profile-list';

        const li = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'dynamic-overflow-container text-nav classic-profile-link';
        link.href = profile.href;

        const avatar = document.createElement('span');
        avatar.className = 'avatar avatar-headshot-xs';

        const thumb = document.createElement('span');
        thumb.className = 'thumbnail-2d-container avatar-card-image';

        const image = document.createElement('img');
        image.className = 'classic-profile-image';
        image.src = profile.avatar;
        image.alt = profile.username;

        thumb.append(image);
        avatar.append(thumb);

        const name = document.createElement('span');
        name.className = 'classic-profile-name font-header-2 dynamic-ellipsis-item';
        name.textContent = profile.username;

        link.append(avatar, name);
        li.append(link);

        const divider = document.createElement('li');
        divider.className = 'rbx-divider classic-profile-divider';

        ul.append(li, divider);
        return ul;
    }

    function makePlus(li) {
        const source = controlOf(li);
        if (!source) return null;

        const text = (labelOf(source) || source.textContent)
            .replace(/\s+/g, ' ')
            .trim();

        const item = document.createElement('li');
        item.className = 'rbx-upgrade-now classic-upgrade';

        const link = document.createElement('a');
        link.className = 'btn-growth-md btn-secondary-md classic-plus-button';
        link.title = text;

        const href = source.getAttribute('href');
        if (href) link.href = absolute(href);

        if (text.length > 28) link.classList.add('classic-plus-very-long');
        else if (text.length > 18) link.classList.add('classic-plus-long');

        const span = document.createElement('span');
        span.className = 'classic-plus-label';
        span.textContent = text;

        link.append(span);
        item.append(link);

        return item;
    }

    function makePromo(li) {
        const source = controlOf(li);
        const image = source?.querySelector('img');

        if (!source || !image) return null;

        const item = document.createElement('li');
        item.className = 'classic-promo';

        const link = document.createElement('a');
        const href = source.getAttribute('href');

        if (href) link.href = absolute(href);
        if (source.target) link.target = source.target;

        const copy = image.cloneNode(true);
        copy.removeAttribute('style');

        link.append(copy);
        item.append(link);

        return item;
    }

    function copyExtras(root) {
        const nav = sourceMenu();
        const parent = nav?.parentElement;
        const destination = $('.classic-extra-sections', root);

        if (!nav || !parent || !destination) return;

        const children = [...parent.children];
        const index = children.indexOf(nav);

        if (index < 0) return;

        for (const source of children.slice(index + 1)) {
            if (
                !source.textContent.trim() &&
                !source.querySelector('img,a,button,svg')
            ) continue;

            const clone = source.cloneNode(true);
            clone.classList.add('classic-copied-section');

            clone.removeAttribute('id');
            $$('[id]', clone).forEach(el => el.removeAttribute('id'));

            $$('a[href]', clone).forEach(a =>
                a.href = absolute(a.getAttribute('href'))
            );

            const originals = $$('button', source);

            $$('button', clone).forEach((button, i) => {
                if (!originals[i]) return;

                button.addEventListener('click', e => {
                    e.preventDefault();
                    originals[i].click();
                });
            });

            destination.append(clone);
        }
    }

    function makeClassic() {
        const list = sourceList();
        const profile = profileData();

        if (!list || !profile) return null;

        const root = document.createElement('div');
        root.id = CLASSIC_ID;
        root.className = 'rbx-left-col nav-show roblox-classic-nav';
        root.append(makeProfile(profile));

        const scroll = document.createElement('div');
        scroll.className = 'rbx-scrollbar classic-scrollbar';

        const classicList = document.createElement('ul');
        classicList.className = 'left-col-list';

        let plus;
        const promos = [];

        for (const li of list.children) {
            if (isAccountHeader(li)) continue;

            if (isPlus(li)) {
                plus = li;
                continue;
            }

            if (isPromo(li)) {
                promos.push(li);
                continue;
            }

            const row = makeRow(li);
            if (row) classicList.append(row);
        }

        if (plus) {
            const item = makePlus(plus);
            if (item) classicList.append(item);
        }

        for (const promo of promos) {
            const item = makePromo(promo);
            if (item) classicList.append(item);
        }

        scroll.append(classicList);

        const extras = document.createElement('div');
        extras.className = 'classic-extra-sections';

        scroll.append(extras);
        root.append(scroll);

        copyExtras(root);

        return root;
    }

    function signature() {
        const list = sourceList();
        const profile = profileData();

        if (!list || !profile) return '';

        const data = [
            profile.username,
            profile.avatar,
            profile.href
        ];

        for (const li of list.children) {
            const control = controlOf(li);

            data.push([
                control?.tagName || '',
                control?.getAttribute('href') || '',
                labelOf(control),
                badgeOf(control),
                control?.querySelector('img')?.src || '',
                isAccountHeader(li),
                isPlus(li),
                isPromo(li)
            ].join('|'));
        }

        const nav = sourceMenu();
        const parent = nav?.parentElement;

        if (nav && parent) {
            const children = [...parent.children];
            const index = children.indexOf(nav);

            for (const extra of children.slice(index + 1)) {
                data.push(
                    extra.textContent.replace(/\s+/g, ' ').trim(),
                    ...$$('a[href]', extra).map(a => a.href),
                    ...$$('img[src]', extra).map(img => img.src)
                );
            }
        }

        return data.join('\n');
    }

    function syncTheme() {
        const source = sourceNav();
        const classic = classicNav();

        if (!source || !classic) return;

        const navStyle = getComputedStyle(source);
        const root = getComputedStyle(document.documentElement);

        if (
            navStyle.backgroundColor &&
            navStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ) {
            classic.style.setProperty(
                '--classic-bg',
                navStyle.backgroundColor
            );
        }

        if (navStyle.color)
            classic.style.setProperty('--classic-text', navStyle.color);

        const vars = {
            '--classic-hover': '--color-state-hover',
            '--classic-border': '--color-stroke-default',
            '--classic-badge-bg': '--color-system-contrast',
            '--classic-badge-text': '--color-surface-0',
            '--classic-button-bg': '--color-action-sub-emphasis-background',
            '--classic-button-text': '--color-action-sub-emphasis-foreground'
        };

        for (const [to, from] of Object.entries(vars)) {
            const value = root.getPropertyValue(from).trim();
            if (value) classic.style.setProperty(to, value);
        }
    }

    function rebuild(force = false) {
        if (rebuilding) return;

        const container = $('#left-navigation-container');
        const source = sourceNav();

        if (!container || !source || !sourceList() || !profileData())
            return;

        const nextSignature = signature();

        if (
            !force &&
            nextSignature === lastSignature &&
            classicNav()
        ) return;

        rebuilding = true;
        sourceObserver?.disconnect();

        try {
            const replacement = makeClassic();
            if (!replacement) return;

            const old = classicNav();

            if (old) old.replaceWith(replacement);
            else container.insertBefore(replacement, source);

            lastSignature = nextSignature;
            syncTheme();
        } finally {
            rebuilding = false;
            observeSource();
        }
    }

    function schedule(delay = 50) {
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => rebuild(), delay);
    }

    function observeSource() {
        const source = sourceNav();
        if (!source) return;

        currentSource = source;

        sourceObserver ??= new MutationObserver(() => {
            if (!rebuilding) schedule();
        });

        sourceObserver.disconnect();

        sourceObserver.observe(source, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['href', 'src', 'title']
        });
    }

    function observePage() {
        if (pageObserver) return;

        pageObserver = new MutationObserver(() => {
            const source = sourceNav();

            if (!source || source === currentSource || rebuilding)
                return;

            currentSource = source;
            lastSignature = '';

            observeSource();
            schedule(0);
        });

        pageObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    function installStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;

        style.textContent = `
#left-navigation-container>.left-nav{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
#left-navigation-container{width:175px!important}

#${CLASSIC_ID}{
--classic-bg:var(--color-surface-0,#121215);
--classic-text:var(--color-content-emphasis,#f7f7f8);
--classic-hover:var(--color-state-hover,rgba(255,255,255,.08));
--classic-border:var(--color-stroke-default,rgba(255,255,255,.12));
--classic-badge-bg:var(--color-system-contrast,#fff);
--classic-badge-text:var(--color-surface-0,#111);
--classic-button-bg:var(--color-action-sub-emphasis-background,#fff);
--classic-button-text:var(--color-action-sub-emphasis-foreground,#111);
position:fixed!important;
top:40px!important;
left:0!important;
z-index:1001!important;
width:175px!important;
height:calc(100vh - 40px)!important;
box-sizing:border-box!important;
visibility:visible!important;
opacity:1!important;
overflow:hidden!important;
background:var(--classic-bg)!important;
color:var(--classic-text)!important;
border-right:1px solid var(--classic-border)!important;
font-family:"Builder Sans","Helvetica Neue",Helvetica,Arial,"Lucida Grande",sans-serif!important
}

#${CLASSIC_ID},#${CLASSIC_ID} *{box-sizing:border-box}
#${CLASSIC_ID} ul{list-style:none!important;margin:0!important}

#${CLASSIC_ID} .classic-profile-list{padding:8px 8px 0!important}
#${CLASSIC_ID} .classic-profile-link{
display:flex!important;align-items:center!important;width:100%!important;height:34px!important;
padding:0 4px!important;background:transparent!important;color:var(--classic-text)!important;
text-decoration:none!important;min-width:0!important
}

#${CLASSIC_ID} .avatar-headshot-xs{
width:28px!important;height:28px!important;min-width:28px!important;flex:0 0 28px!important;
margin-right:7px!important;border-radius:50%!important;overflow:hidden!important;display:inline-block!important
}

#${CLASSIC_ID} .avatar-card-image,
#${CLASSIC_ID} .avatar-card-image img{width:100%!important;height:100%!important;display:block!important}
#${CLASSIC_ID} .avatar-card-image img{object-fit:cover!important}

#${CLASSIC_ID} .classic-profile-name{
min-width:0!important;color:var(--classic-text)!important;font-size:14px!important;font-weight:600!important;
line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important
}

#${CLASSIC_ID} .classic-profile-divider{
height:1px!important;padding:0!important;margin:4px 4px 7px!important;
background:var(--classic-text)!important;opacity:.7!important
}

#${CLASSIC_ID} .classic-scrollbar{
height:calc(100% - 54px)!important;overflow-y:auto!important;overflow-x:hidden!important;
scrollbar-width:thin;scrollbar-color:var(--classic-border) transparent
}

#${CLASSIC_ID} .left-col-list{padding:0 10px 14px!important}
#${CLASSIC_ID} .left-col-list>li{display:block!important;padding:0!important;margin:0!important}

#${CLASSIC_ID} .classic-nav-row{
position:relative!important;display:flex!important;align-items:center!important;width:100%!important;
height:32px!important;min-height:32px!important;padding:0 4px!important;margin:0!important;
border:0!important;border-radius:3px!important;outline:0!important;background:transparent!important;
color:var(--classic-text)!important;text-decoration:none!important;font-family:inherit!important;
font-size:14px!important;font-weight:500!important;line-height:32px!important;text-align:left!important;
cursor:pointer!important
}

#${CLASSIC_ID} .classic-nav-row:hover{background:var(--classic-hover)!important}

#${CLASSIC_ID} .classic-icon-container{
width:25px!important;min-width:25px!important;height:25px!important;flex:0 0 25px!important;
margin-right:5px!important;display:flex!important;align-items:center!important;justify-content:center!important;
color:var(--classic-text)!important
}

#${CLASSIC_ID} .classic-icon-container>span[class^="icon-nav-"]{
transform:scale(.92);transform-origin:center
}

#${CLASSIC_ID} .classic-copied-icon{
display:block!important;width:22px!important;height:22px!important;min-width:22px!important;
max-width:22px!important;min-height:22px!important;max-height:22px!important;color:var(--classic-text)!important
}

#${CLASSIC_ID} svg.classic-copied-icon{width:22px!important;height:22px!important;fill:currentColor}
#${CLASSIC_ID} .classic-copied-icon svg{max-width:22px!important;max-height:22px!important}
#${CLASSIC_ID} .classic-icon-placeholder{display:block;width:22px;height:22px}

#${CLASSIC_ID} .classic-nav-label{
flex:1 1 auto!important;min-width:0!important;color:var(--classic-text)!important;
overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important
}

#${CLASSIC_ID} .dynamic-width-item.align-right{
flex:0 0 auto!important;margin-left:auto!important;padding-left:4px!important;
display:flex!important;align-items:center!important
}

#${CLASSIC_ID} .classic-live-badge{
min-width:24px!important;height:18px!important;padding:0 5px!important;border:0!important;
border-radius:10px!important;display:inline-flex!important;align-items:center!important;
justify-content:center!important;background:var(--classic-badge-bg)!important;
color:var(--classic-badge-text)!important;font-size:10px!important;font-weight:700!important;
line-height:18px!important
}

#${CLASSIC_ID} .classic-upgrade{width:100%!important;padding:9px 0 5px!important;overflow:hidden!important}

#${CLASSIC_ID} .classic-plus-button{
display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;
max-width:100%!important;min-width:0!important;height:35px!important;margin:0!important;padding:0 8px!important;
overflow:hidden!important;border:0!important;border-radius:8px!important;
background:var(--classic-button-bg)!important;color:var(--classic-button-text)!important;
text-decoration:none!important;font-family:inherit!important;font-size:14px!important;font-weight:500!important
}

#${CLASSIC_ID} .classic-plus-label{
display:block!important;width:100%!important;min-width:0!important;overflow:hidden!important;
text-overflow:ellipsis!important;white-space:nowrap!important;text-align:center!important
}

#${CLASSIC_ID} .classic-plus-long .classic-plus-label{font-size:12px!important}
#${CLASSIC_ID} .classic-plus-very-long .classic-plus-label{font-size:11px!important}

#${CLASSIC_ID} .classic-promo{padding:6px 0 10px!important}
#${CLASSIC_ID} .classic-promo>a{display:block!important;width:100%!important}
#${CLASSIC_ID} .classic-promo img{
display:block!important;width:100%!important;max-width:100%!important;height:auto!important;border-radius:7px!important
}

#${CLASSIC_ID} .classic-extra-sections{
width:100%!important;padding:0 10px 14px!important;color:var(--classic-text)!important
}

#${CLASSIC_ID} .classic-copied-section{
width:100%!important;max-width:100%!important;color:var(--classic-text)!important
}

#${CLASSIC_ID} .classic-copied-section img{max-width:100%!important}

@media(max-width:767px){
#${CLASSIC_ID}{display:none!important}
}
`;

        document.documentElement.append(style);
    }

    function initialise() {
        installStyles();
        observePage();

        const source = sourceNav();

        if (source && source !== currentSource) {
            currentSource = source;
            lastSignature = '';
            observeSource();
        }

        if (sourceList() && profileData())
            rebuild();
    }

    installStyles();

    let attempts = 0;

    const startup = setInterval(() => {
        initialise();

        if (++attempts >= 200 || classicNav())
            clearInterval(startup);
    }, 25);

    observePage();
    initialise();

    setInterval(() => {
        const source = sourceNav();

        if (source !== currentSource) {
            currentSource = source;
            lastSignature = '';
            observeSource();
            schedule(0);
        }

        syncTheme();
    }, 1500);
})();
