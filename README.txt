TikTok Wallet Demo - Full Local Project

Admin login
- username: admin
- password: crazzyadmin123

What this version does
- real TikTok profile lookup route at /api/tiktok/profile/:username
- accepts usernames with @ or without @
- ignores uppercase/lowercase differences
- only shows a profile when the exact username matches
- if TikTok fetch fails, the app shows a generated letter avatar
- search loading and payment loading colors can be changed in Toolbox
- installable app support with manifest.json and sw.js

Full terminal setup
1. Unzip this folder.
2. Open Terminal inside the folder.
3. Check your Node version:
   node -v
   npm -v
4. Install packages:
   npm install
5. Start the app:
   npm start
6. Open your browser at:
   http://localhost:3000

If port 3000 is busy
- macOS/Linux:
  PORT=3001 npm start
- Windows PowerShell:
  $env:PORT=3001; npm start
Then open http://localhost:3001

Install as app
- Chrome / Edge: open the site and click the install icon in the address bar.
- If you had an older version before, do a hard refresh or uninstall the old app first.

How to use TikTok fetch
- Type a username like @tiktok or tiktok
- The app strips @ automatically
- Uppercase and lowercase are treated the same
- The backend tries to read the public TikTok profile page and extract the name, avatar, and followers
- If TikTok blocks the request or the username does not exist, the app shows a generated avatar and an error message

Important
- This works only for public TikTok profiles that can be reached from your internet connection.
- TikTok sometimes rate-limits or blocks requests. If that happens, you will still get the letter avatar fallback.
- If you see old files in the browser, clear site data or unregister the service worker, then reload.
