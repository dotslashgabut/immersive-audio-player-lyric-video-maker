# Release Notes

# v2.0.9

## What's New
- **Typography Enhancements**:
    - **Text Case Control**: New options to transform lyric and song info text: **Normal**, **Uppercase**, **Lowercase**, **Title Case**, **Sentence Case**, and **Invert Case**.
    - **Smart Fallback**: 'Normal' case respects the default aesthetic of the selected preset (e.g., 'Metal' preset will still default to Uppercase unless overridden).
- **Intro Enhancements**:
    - **Refined Typography**: 'Auto' mode now elegantly displays Title and Artist on separate lines for better readability.
    - **Manual Control**: Toggle Intro text between 'Auto' (metadata) and 'Manual' custom text.
    - **Playlist Logic**: In 'Manual' mode, intro triggers only on the first song; in 'Auto' mode, it triggers on every song.
- **Visual & Rendering**:
    - **Blur Strength Slider**: Fine-tune the intensity of the background blur effect.
    - **Default to Instant**: Transition effect now defaults to 'None' (Instant Cut) for a sharper editing start.
    - **Solid Color Default**: 'Solid Color' background now defaults to pure black.
    - **Info Padding**: New slider to adjust the distance of Song Info text from the screen edges.
    - **JSON Settings**: Render Settings export/import now includes all new typography and text case preferences.
- **Improved UX**:
    - **Shortcut**: Press **D** to quickly toggle the Render Settings panel.
    - **Reset Logic**: Improved 'Reset' button reliability in Render Settings.

## Bug Fixes
- **Render Stability**: 
    - Fixed a brief black screen flash (0.xx sec) at the start of rendered videos.
    - Resolved vertical black line artifacts on default backgrounds.
- **Playlist Rendering**: Fixed 'All Playlist' render scope clickability issues.
- **Playback**: Resolved browser playback issues after a render cycle.
- **Settings Sync**: Fixed synchronization of blur settings between main view and render panel.
- **Dependencies**: Removed unused packages for a cleaner build.

# v2.0.8

## What's New
- **Professional Video Export**:
    - **Full Control**: Customize Resolution (720p, 1080p), Frame Rate (24, 30, 60 FPS), and Quality (Low, Med, High).
    - **Codecs**: Support for **H.264 (MP4)**, **VP9 (WebM)**, and **AV1**.
    - **Aspect Ratios**: Expanded support for social media formats (16:9, 9:16, 4:5, 4:3, 2:1, 21:9, etc.).
    - **Visual Toggles**: Quick toggles for background blur directly in the export panel.
- **User Interface & Experience**:
    - **Header Shortcuts**: Added quick access buttons for **LyricFlow** and **LyricalVision**.
    - **Mobile Optimization**: Fixed viewport height issues (`100dvh`) for a stable native-app feel on mobile browsers.
    - **Layout Improvements**: Swapped Playlist and Timeline/Edit buttons in the header for better ergonomics.
    - **Editor Actions**: Relocated 'Delete' button and added a new 'Close' action for faster slide management.
- **Advanced Render Settings**:
    - **Smart Gradient**: Generate beautiful backgrounds instantly by picking a single color.
    - **Song Info Design**: 
        - **Styles**: New 'Modern + Cover', 'Circle Cover', 'Boxed', and 'Minimal' styles.
        - **Positioning**: 9-point grid positioning system.
        - **Padding**: Adjustable margin scale to keep text safe from edges.
    - **Live Font Preview**: Hover over fonts in the list to see them applied instantly.
    - **Text Animations**: New effects including Bounce, Pulse, Wave, Glitch, Shake, and Typewriter.
- **Enhanced Lyric Control**:
    - **Display Modes**: Options for *Show All*, *Previous-Active-Next*, *Next Only*, and *Active Only*.
    - **Custom Preset**: Auto-saves manual changes to a 'Custom' preset.
    - **'None' Preset**: Option to hide all text and overlays completely.

## Bug Fixes
- **Mobile Viewport**: Fixed issue where address bar would hide bottom controls on mobile.
- **Lyric Display**: Fixed an issue where "Show All" would sometimes truncate lines.
- **UI Stability**: Auto-close behavior for dropdowns and better Render Panel visibility management.
