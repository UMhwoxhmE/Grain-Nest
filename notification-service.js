const https = require('https');
const fs = require('graceful-fs');
const path = require('path');
const { app } = require('electron');
const marked = require("marked");

// v1.3.0 (settings review): "new version" notice for Grain-Nest
// itself. Replaces the upstream Deepnest service, which checked
// deepnest-next/deepnest's releases and the deepnest.net news feed (already
// switched off in this fork). On start-up it asks GitHub for Grain-Nest's
// latest release; if it's newer than this app and hasn't been dismissed
// before, main.js shows it in the notification window.
//
// The GitHub API answers this without a login because the repository is
// public. If it fails (offline,
// rate-limited, no releases) nothing is shown.
//
// v1.5.2: the repository's owner was renamed. GitHub answers requests
// for the old name with a redirect, so the check follows redirects;
// copies of the app built with the old name keep finding releases.
const RELEASES_API = 'https://api.github.com/repos/cut-on-fold/Grain-Nest/releases/latest';
const MAX_REDIRECTS = 3;

/** Compare "1.2.10" with "1.3.0": positive when a is newer. */
function compareVersions(a, b) {
    const pa = String(a).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d !== 0) return d;
    }
    return 0;
}

class NotificationService {
    constructor() {
        this.appVersion = app.getVersion();
        this.seenDataPath = path.join(app.getPath('userData'), 'seen-notifications.json');
        this.seenData = this.loadSeenData();
    }

    loadSeenData() {
        try {
            if (fs.existsSync(this.seenDataPath)) {
                const data = JSON.parse(fs.readFileSync(this.seenDataPath, 'utf8'));
                return { lastSeenRelease: data.lastSeenRelease || null };
            }
        } catch (err) {
            console.error('Error loading seen notifications data:', err);
        }
        return { lastSeenRelease: null };
    }

    saveSeenData() {
        try {
            fs.writeFileSync(this.seenDataPath, JSON.stringify(this.seenData));
        } catch (err) {
            console.error('Error saving seen notifications data:', err);
        }
    }

    // Grain-Nest's latest GitHub release, or a rejection (offline,
    // rate-limited, no releases…).
    getLatestRelease() {
        return new Promise((resolve, reject) => {
            const options = {
                headers: { 'User-Agent': 'grain-nest-app/' + this.appVersion },
                timeout: 10000,
            };
            const get = (url, redirectsLeft) => {
                const req = https.get(url, options, (res) => {
                    const status = res.statusCode;
                    const location = res.headers.location;
                    if ((status === 301 || status === 302 || status === 307 || status === 308) && location) {
                        res.resume();
                        if (redirectsLeft <= 0) {
                            reject(new Error('Too many redirects from GitHub'));
                            return;
                        }
                        get(new URL(location, url), redirectsLeft - 1);
                        return;
                    }
                    let data = '';
                    res.on('data', (chunk) => (data += chunk));
                    res.on('end', () => {
                        if (status !== 200) {
                            reject(new Error(`GitHub responded with status ${status}`));
                            return;
                        }
                        try {
                            resolve(JSON.parse(data));
                        } catch (err) {
                            reject(new Error('Failed to parse release JSON'));
                        }
                    });
                });
                req.on('timeout', () => req.destroy(new Error('Release check timed out')));
                req.on('error', reject);
            };
            get(new URL(RELEASES_API), MAX_REDIRECTS);
        });
    }

    // A notice for a newer, not-yet-dismissed release, or null.
    async checkForNotifications() {
        const release = await this.getLatestRelease().catch(() => null);
        if (!release || !release.tag_name || release.draft || release.prerelease) {
            return null;
        }
        const tag = release.tag_name;
        if (compareVersions(tag, this.appVersion) <= 0) return null;
        if (this.seenData.lastSeenRelease === tag) return null;

        const asset = (release.assets || []).find((a) => /macos-arm64\.(dmg|zip)$/i.test(a.name));
        const download = asset ? asset.browser_download_url : release.html_url;
        const content =
            `<p>You have v${this.appVersion}.</p>` +
            marked.parse(release.body || '') +
            `<p><a href="${download}" target="_blank">Download ${tag}</a>` +
            ` · <a href="${release.html_url}" target="_blank">Release page</a></p>`;

        return {
            type: 'release',
            title: `Grain-Nest ${tag} is out`,
            content,
            markAsSeen: () => {
                this.seenData.lastSeenRelease = tag;
                this.saveSeenData();
            },
        };
    }
}

module.exports = NotificationService;
module.exports.compareVersions = compareVersions;
