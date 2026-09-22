# Roblox Classic Navigation

Restore a classic-style Roblox sidebar while keeping the live navigation as the source of truth.

**Author and credit:** emblazes  
**Status:** Early public release · Version 2.0.0

[![Install with Tampermonkey](https://img.shields.io/badge/Install-Tampermonkey-00485B?logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/embz0/roblox-classic-navigation/main/scripts/roblox-classic-navigation.user.js)

> This is an independent community userscript. It is not affiliated with, endorsed by, or sponsored by Roblox.

![Classic sidebar preview placeholder](assets/screenshots/classic-sidebar-placeholder.svg)

## Features

- Rebuilds the current Roblox sidebar in a classic layout.
- Keeps account name, avatar, navigation labels, badges, promotions, and extra sidebar sections live.
- Preserves the ordinary Profile navigation item while using the separate avatar account row as the header.
- Adapts to Roblox and extension-provided colour variables where possible.
- Uses the live Roblox sidebar rather than hard-coding temporary events or promotion links.
- Does not send, store, or collect account data.

## Install with Tampermonkey

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Open the repository’s `scripts/roblox-classic-navigation.user.js` file.
3. Click **Raw**. Tampermonkey should open its installation page.
4. Select **Install**.
5. Open or refresh [Roblox](https://www.roblox.com/).

### One-click install link

Install directly from GitHub:

```text
https://raw.githubusercontent.com/embz0/roblox-classic-navigation/main/scripts/roblox-classic-navigation.user.js
```

Tampermonkey recognizes the `.user.js` file and presents the install screen automatically. The script’s update metadata points to the same canonical file.

## Usage

The script runs automatically on `roblox.com`. Visit a page with the desktop sidebar and it will build the replacement once Roblox’s account row is available. The current sidebar remains in the page as the live data source, but is hidden visually.

To disable it, open Tampermonkey’s dashboard and toggle off **Roblox Classic Navigation**. To remove it, delete the script from that dashboard.

## Compatibility

| Item | Support |
| --- | --- |
| Tampermonkey | Supported |
| Desktop Roblox website | Supported |
| Chromium, Firefox, Safari browsers supported by Tampermonkey | Expected |
| Mobile/narrow layouts | Falls back to Roblox’s normal navigation |
| Roblox Plus / RoPro / RoSeal sidebar additions | Best-effort live copying |

Roblox can change its markup without notice. If that happens, please open an issue with the details requested in the bug report template.

## Screenshots

The repository includes a visual placeholder so the README has a stable layout before public screenshots are added.

- Replace `assets/screenshots/classic-sidebar-placeholder.svg` with a clean, logged-in desktop screenshot.
- Do not include usernames, private messages, friend counts, browser extensions, or other personal information unless intentionally redacted.
- Suggested shots: default dark theme, a custom theme, and a sidebar with a live promotion.

## Troubleshooting

**The classic sidebar does not appear**  
Refresh Roblox once. If it still does not appear, make sure the script is enabled and Roblox is being opened at `https://www.roblox.com/`.

**The normal sidebar is still visible**  
Check for another userscript or extension that changes Roblox navigation. Temporarily disable it to identify a conflict, then include its name and version in an issue.

**My profile header is blank during loading**  
The script waits for Roblox’s account row before replacing the navigation. A persistent blank header usually means Roblox changed the row’s markup; report it with a screenshot.

**An extension item is missing or looks wrong**  
Extension-created sidebar elements are copied on a best-effort basis. Include the extension name, version, and a redacted screenshot in an issue.

## FAQ

**Does this change Roblox’s servers or my account?**  
No. It changes the page in your browser only.

**Will event banners update?**  
The script reads the live sidebar, so a promo Roblox removes should disappear from the classic layout and a replacement can appear automatically.

**Does it work with custom colours?**  
It reads Roblox theme variables and the current sidebar’s computed colours where available. Some third-party extensions may use styles that cannot be reproduced exactly.

**Why did an update stop working?**  
Roblox frequently changes website markup. Please report regressions so the selectors can be updated.

## Privacy and security

The script runs only on `roblox.com`, uses no network requests of its own, and has no special userscript permissions (`@grant none`). It reads only the visible page navigation needed to render the replacement. It does not read cookies, credentials, messages, payment information, or local storage; it does not transmit data anywhere.

Review the source before installing any userscript, especially copies hosted outside this repository.

## Publishing and updates

GitHub is the canonical source. For a public directory listing, publish the same script on Greasy Fork or OpenUserJS after creating a GitHub release. The full workflow, including `@updateURL` and `@downloadURL`, is in [docs/PUBLISHING.md](docs/PUBLISHING.md).

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), keep changes focused, and test with Tampermonkey before opening a pull request.

## License

Distributed under the [MIT License](LICENSE).
