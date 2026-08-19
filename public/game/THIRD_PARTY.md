# Third-party runtime

None.

The browser edition ships no third-party runtime code. The Civilization world is drawn with
Canvas 2D from `src/render/`, and the management UI is plain DOM. Phaser 3.90.0 was vendored in
earlier releases but was never loaded by `index.html`, so it was removed in v1.4.0.
