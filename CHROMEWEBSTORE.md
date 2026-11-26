# Marker Studio on the Chrome Web Store

Prepared November 26, 2026, for the first submission of version 1.1.0. The store listing and reviewer fields are in English.

## Store listing

| Dashboard field | Value |
| --- | --- |
| Name | Marker Studio |
| Short description from the manifest | Screen recording helpers: animated highlighter, spotlight zoom, smooth auto-scroll, clean mode and blur. |
| Category | Workflow & Planning |
| Language | English |
| Support URL | https://github.com/brkunver/marker-studio/issues |
| Homepage URL | https://github.com/brkunver/marker-studio |

### Detailed description

```text
Marker Studio helps viewers follow along when you record a webpage. Highlight the text you’re talking about, zoom in on a detail, and control the page with your keyboard.

• Animated highlighter: Select text and press H to queue it. Each press of Shift + H draws the next selection, in the order you saved it.
• Spotlight zoom: Press Z, drag a rectangle, and release. Press Z again to zoom smoothly into that area. Press Z once more to zoom out.
• Smooth scrolling: Press S to start or stop automatic scrolling.
• Clean mode: Press C to hide fixed and sticky page elements, such as floating headers.
• Blur: Hover over an element and press B to blur it. Press B again to restore it.
• Reset: Press Esc to clear your selections and effects and stop scrolling.

Open the toolbar popup to adjust highlight color and speed, zoom strength and duration, scroll speed, and blur strength. Marker Studio adds visual effects to the page. Use your own screen recorder to capture them.

Marker Studio needs access to sites where you want the shortcuts to work. It processes selected page content and the keyboard and pointer input needed for these effects on your device. Preferences stay in your Chrome profile. The extension sends no data off your device.
```

## Privacy practices

### Single purpose

```text
Marker Studio helps people present webpages clearly during screen recordings by adding keyboard-controlled visual emphasis and smooth scrolling.
```

### Permission justifications

**Storage**

```text
Marker Studio uses Chrome's local extension storage to remember the user's highlight color, opacity, speed and theme, zoom strength, duration and dimming, scroll speed, and blur strength. The toolbar popup saves these preferences, and the page tools read them to apply the chosen settings. Page content and browsing history are never written to extension storage.
```

**Host access represented by the content-script match `<all_urls>`**

```text
Users can record a walkthrough on any supported website. Marker Studio loads its page tools on eligible tabs so its keyboard shortcuts work on the current page without opening the toolbar first. To draw the effects in the right places, it processes the selected text range, page layout, and the element under the pointer locally. It uses the page DOM to draw highlights, zoom, scroll, hide fixed or sticky elements, and visually blur an element. It does not send page content, URLs, or browsing history to a server.
```

The manifest declares `storage` and a static content-script match. Use the host-access justification if the dashboard requests one. The permission scope lets the page shortcuts work across sites, including sites that the developer cannot list in advance.

**Remote code** — Select **No**. Every script is packaged in the ZIP.

**Data usage** — Disclose **Website content** and **User activity** for local handling. Website content covers selected text ranges and page elements used for the visual effects. User activity covers shortcut events, the element currently under the pointer, and drag or scroll positions used by the tools. Chrome keeps these transient values in the current tab. Marker Studio keeps no activity log, reads no browsing history, and transmits no user data. Leave the other data types clear and certify all three Limited Use statements.

**Privacy policy URL** — https://raw.githubusercontent.com/brkunver/marker-studio/refs/heads/main/PRIVACY.md

[Chrome Web Store privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) · [User Data FAQ on local processing](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)

## Upload assets

| Dashboard asset | File | Size |
| --- | --- | --- |
| Store icon | [icons/128.png](icons/128.png) | 128 × 128 |
| Screenshot 1 | [Animated highlighter](store-assets/01-highlighter.png) | 1280 × 800 |
| Screenshot 2 | [Spotlight zoom](store-assets/02-spotlight-zoom.png) | 1280 × 800 |
| Small promo tile | [Marker Studio](store-assets/small-promo.png) | 440 × 280 |
| Marquee promo tile (optional) | [Marker Studio marquee](store-assets/marquee-promo.png) | 1400 × 560 |

The screenshots show the extension running on an original demo page with sample content. Upload the images separately from the extension ZIP. [Listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) · [Image sizes and formats](https://developer.chrome.com/docs/webstore/images)

## Submit the first build

1. Register a Chrome Web Store developer account if needed, then set the publisher name, verify the contact email, and enable two-step verification. Complete the trader declaration with the publisher's own information if the dashboard requests it. [Developer account setup](https://developer.chrome.com/docs/webstore/set-up-account)
2. From the repo root, build the upload ZIP from the release commit. This includes the files listed by the manifest and the popup stylesheet. [Packaging requirements](https://developer.chrome.com/docs/webstore/prepare)

   ```sh
   git archive --format=zip --output=marker-studio-1.1.0.zip 4f8ef6a manifest.json shared.js content.js content popup.html popup.js popup.css icons
   ```

3. Go to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), add a new item, and upload the ZIP. Paste the listing and privacy fields and upload the graphics above. Confirm the distribution settings. The proposed defaults are **Free**, **Public**, and all supported regions.
4. For reviewer testing, open a normal web article with selectable text, such as the [Example Domain page](https://example.com/). Select two passages and press H after each. Press Shift + H twice to reveal them individually. Try Z on an area of the page and observe the zoom on the next press. Use a longer article to try S for scrolling and C on a page with fixed or sticky elements. Hover over a heading and press B to test blur, then press Esc to reset. No login is needed.
5. Submit for review. Choose manual publishing if you want to control when the approved listing goes live. [Submission options](https://developer.chrome.com/docs/webstore/publish)

| Version | Scope | Status |
| --- | --- | --- |
| Unreleased | Persistent On/Off switch in the toolbar popup | Implemented |
| 1.1.0 | Initial store submission with animated highlights, spotlight zoom, smooth scrolling, clean mode and blur | Submitted |

For the next store update, add that the popup can turn the tools on or off and remembers the choice locally. Include the enabled setting in the storage justification and privacy policy.
