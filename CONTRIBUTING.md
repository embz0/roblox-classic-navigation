# Contributing

Thanks for improving Roblox Classic Navigation.

## Before you start

- Search existing issues and pull requests first.
- Keep changes limited to this userscript and its documentation.
- Never include Roblox cookies, authentication values, personal account data, or unredacted screenshots in an issue or pull request.

## Development workflow

1. Fork the repository and create a focused branch.
2. Install the local `scripts/roblox-classic-navigation.user.js` file in Tampermonkey.
3. Test a signed-in desktop page, a page transition, and a narrow/mobile-sized window.
4. Update `CHANGELOG.md` when the user-facing behaviour changes.
5. Open a pull request using the supplied template.

## Code guidelines

- Keep the script dependency-free and `@grant none` unless a change clearly requires otherwise.
- Prefer live DOM data over hard-coded account, event, or promotion values.
- Avoid broad observers and unnecessary rebuilds.
- Use clear names and keep metadata accurate.

## Reporting website changes

Roblox changes page markup regularly. A useful report includes the Roblox URL category, browser, Tampermonkey version, other Roblox extensions, steps to reproduce, and a redacted screenshot or relevant non-sensitive DOM snippet.
