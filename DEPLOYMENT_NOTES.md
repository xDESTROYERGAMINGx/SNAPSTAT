# SnapStat Website Deployment Notes

## Hidden APK Download Link

The public page links to:

```text
/download
```

The real APK URL is handled by a Cloudflare Pages Function in:

```text
functions/download.js
```

Set this Cloudflare Pages environment variable:

```text
APK_DOWNLOAD_URL
```

Its value should be the real HTTPS APK download URL from your GitHub Release.

This keeps the GitHub APK link out of the website HTML and JavaScript, so it is not visible through normal Inspect Element on the page. The function streams the APK through `/download` with APK download headers instead of redirecting visitors to GitHub.

Important: if the website source repository is public, anyone who can see the repository can still see that `/download` exists. The real URL is protected only if it is stored in the Cloudflare environment variable, not committed into the website files.
