Place AR.js assets here for offline/local usage:

Required files:
 - camera_para.dat (ARToolKit camera parameters)
 - patt.hiro (default marker pattern) or your custom .patt

Recommended sources (pick one and download):
 - Primary CDN (may be flaky):
   - https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/data/camera_para.dat
   - https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/data/patt.hiro
 - Fallback (raw GitHub):
   - https://raw.githubusercontent.com/artoolkitx/jsartoolkit5/master/examples/Three.js/data/camera_para.dat
   - https://raw.githubusercontent.com/artoolkitx/jsartoolkit5/master/examples/Three.js/data/patt.hiro

After placing, they will be served at:
 - /arjs/camera_para.dat
 - /arjs/patt.hiro

These paths are used automatically by the MarkerAR implementation.

Notes:
 - If a CDN returns an HTML error page (e.g. "Couldn't find the requested file"), the app now detects and skips it.
 - Valid file sizes are typically >1KB for `camera_para.dat` and >256B for `patt.hiro`.
 - If you replace these files, make sure your server serves them as static files without redirects.
