# SnapStat Website

This repository contains the official static website for **SnapStat**, an Android app for scanning paper survey forms, tallying responses, reviewing individual answers, and exporting reports.

## What This Website Shows

- App overview and main features
- Custom questionnaire setup preview
- Paper-to-report workflow
- Printable form explanation
- VirusTotal safety proof
- Scan instructions
- Update logs
- APK download button

## Website Files

| File or folder | Purpose |
|---|---|
| `index.html` | Main website content |
| `styles.css` | Website layout, colors, responsive design, and full-page scrolling |
| `script.js` | One-scroll section movement and instruction carousel behavior |
| `functions/download.js` | Cloudflare Pages download proxy for the APK |
| `assets/branding/` | Logo, app screenshots, custom paper images, and VirusTotal proof |
| `assets/instructions/` | Scan instruction images |
| `assets/survey_forms/` | Survey form preview image |
| `DEPLOYMENT_NOTES.md` | Notes for Cloudflare Pages and hidden APK download setup |

## Download Setup

The website download button points to:

```text
/download
```

The real APK link should not be placed directly inside `index.html` or `script.js`.

Instead, set this Cloudflare Pages environment variable:

```text
APK_DOWNLOAD_URL
```

Use the direct GitHub Release APK URL as the value. The Cloudflare function in `functions/download.js` will fetch the APK and return it as `snapstat.apk`.

## Owner Message

SnapStat was made to help students, researchers, and teachers process paper-based survey results faster and more clearly. The app is designed to keep scanned forms, responses, and reports stored locally on the user's phone unless the user chooses to export or share them.

Thank you for visiting the SnapStat website and for supporting the development of this application.

## Deployment Notes

This site is intended for Cloudflare Pages.

Recommended setup:

1. Push this folder to GitHub.
2. Connect the GitHub repository to Cloudflare Pages.
3. Set the `APK_DOWNLOAD_URL` environment variable.
4. Upload new APK versions through GitHub Releases.
5. Update the website update logs in `index.html` whenever a new version is released.

## Current App Version Shown

```text
0.1.2
```

When a new APK is released, update both:

- The download card version text in `index.html`
- The Update Logs section in `index.html`

