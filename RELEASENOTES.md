# Release Notes

# 2.3.10

## What's New
- **Rendering Stability**:
  - **Custom Video Backgrounds**: Fixed an issue where custom video backgrounds would fail to loop or sync correctly during **WebCodecs** playlist rendering. The background now seamlessly maintains continuity and timing across all tracks.
  - **Looping Logic**: Enhanced the `syncVideoElements` logic to ensure custom background videos loop precisely as intended in the exported video, matching the timeline preview.
- **User Interaction**:
  - **Minimal Mode Safety**: Disabled the "Double-Click/Double-Tap" shortcut (which toggles Minimal Mode) while a render is in progress. This prevents accidental UI changes that could disrupt the detailed render progress view.


# 2.3.9

## What's New
- **Playlist Improvements**:
  - **Drag-and-Drop Reordering**: Added a dedicated **Grip Handle** to every playlist item, allowing you to easily drag and reorder tracks to your preferred sequence.
- **Render Settings**:
  - **Matched Fonts**: Added a **"Same as Lyrics"** option for both **Channel Info** and **Song Info** fonts. This ensures your watermark and metadata overlays automatically match the main lyric font family for a cohesive design.
- **Bug Fixes**:
  - **Playlist Rendering**: Fixed a logic issue where the "Render All Playlist" mode would incorrectly start from the currently playing track instead of the beginning of the playlist. It now reliably processes the entire queue from the first song.
  - **UI Feedback**: Added clear toast notifications to confirm whether a "Single Track" or "Playlist" render has started.
  - **Visual Editor**: Fixed an issue where changing the playback speed of a clip did not update its duration on the timeline. Also improved the "Reset" button to correctly reset both speed and duration.
  - **Background Source**: Resolved an issue where the "Metadata / Default" background option would not display the cover art if the timeline contained items. It now correctly prioritizes your background source selection.


# 2.3.8

## What's New
- **Rendering Engine Fixes**:
  - **WebCodecs Reliability**: Resolved the "closed codec" error by implementing dynamic audio sample rate and channel detection. The engine now automatically adapts to the hardware's native sample rate for stable playlist exports.
  - **FFmpeg Playlist Sync**: Forced a consistent 44.1kHz audio output for all segments, ensuring seamless concatenation and preventing audio corruption in playlist exports.
  - **FFmpeg Offline Resilience**: Fixed "False Positive" local loading where servers/Vite would return HTML (SPA redirects) instead of binaries. Implemented **Binary Signature Verification** (\0asm magic number check) for WASM files.
- **PWA & Performance**:
  - **Extended Offline Support**: Increased Service Worker cache limit to **50MB** to ensure the large FFmpeg core WASM file is successfully cached for fully offline professional rendering.
  - **Google Fonts Persistence**: Implemented Workbox runtime caching for Google Fonts (CSS & Woff2), allowing your typography designs to remain consistent even without an active internet connection.
- **Improved Diagnostics**:
  - **Detailed Logging**: Added ultra-detailed UI logging for FFmpeg initialization, including path probing and content-type validation to help users troubleshoot hosting issues.


# 2.3.7

## What's New
- **Lyric Edge Margins**:
  - Added adjustable **Top Margin** and **Bottom Margin** sliders in the Typography & Style section. 
  - Allows precise control over the vertical spacing of lyrics when aligned to the Top or Bottom edge.
  - Real-time preview and consistent rendering for both Web View and Video Export.
- **Settings Management**:
  - Enhanced JSON **Import/Export** to include lyric margin preferences.
  - The "Reset to Default" button now correctly reverts margin scales to their factory state (1.0x).


# 2.3.6

## What's New
- **User Interface** : Replace codec selector with render engine.


# 2.3.5

## What's New
- **Playlist Management**:
  - **Export Playlist**: Added a new button in the playlist header to export the current list as a standard **.m3u8** file.
  - **Smart Duration**: The export process automatically scans files to calculate accurate duration (in seconds) for the `#EXTINF` metadata, ensuring broad compatibility with third-party players even if the tracks haven't been played in the app yet.
- **Settings Management**:
  - **Bug Fix**: Resolved an issue where the "Reset to Default" button in Render Settings would not correctly revert all settings (dropdowns/values) to their default state.


# 2.3.4

## What's New
- **Bug Fixes**


# 2.3.3

## What's New
- **Advanced Typography**:
  - **Individual Google Fonts**: You can now load and apply different Google Fonts to specific text elements independently.
  - **Granular Control**: Assign unique font families to **Lyrics**, **Channel Info**, and **Song Info** for a truly custom look.
- **Export & Rendering**:
  - **WebCodecs Acceleration**: Introduced a new **WebCodecs** rendering engine. This utilizes your device's hardware acceleration for ultra-fast video encoding (up to 5x faster than software rendering).
  - **Performance**: Capable of handling higher resolutions and frame rates with significantly reduced render times on supported devices.
- **Settings Management**:
  - **Robust Import**: Fixed a bug where importing settings JSON would fail to restore Font Weight and Font Style preferences for Song Info and Channel Info.
  - **Reliable Reset**: The "Reset to Defaults" action now correctly clears all custom font entries and restores distinct style toggles to their default states.


# 2.3.2

## What's New
- **Render Settings Enhancements**:
  - **Export & Import Settings**: You can now export your entire render configuration (including custom fonts, colors, and layout preferences) to a JSON file and import it anytime. Perfect for sharing presets or backing up your workspace.
  - **Enhanced Reset**: The "Reset to Defaults" button has been improved to correctly clear all custom font selections and restore the default styling.
- **Advanced typography**:
  - **Custom Font Styles**: Added granular control for **Channel Info** and **Song Info** overlays. You can now independently toggle **Bold** and **Italic** styles for these elements.
  - **Custom Colors**: Introduced dedicated color pickers for Channel Info and Song Info text, giving you full creative freedom over your watermark and metadata display.
- **Minimal Mode**:
  - **Preview Accuracy**: The Minimal Mode (Shortcut 'O') now perfectly mirrors your custom font choices (Family, Weight, Style, and Color) for Channel and Song Info, ensuring what you see is exactly what you get in the export.


# 2.3.1

## What's New
- **Render Settings**:
  - **Reset to Defaults**: Added a dedicated "Reset to Defaults" button (refresh icon) in the Render Settings panel. Quickly revert all visual, layout, and export configurations to their factory state.
  - **Color Fixes**: Resolved an issue where disabling "Custom Colors" did not correctly revert the highlight color to the default orange.
- **Visual Effects**:
  - **Cyberpunk Refinement**: Updated the "Cyberpunk" text effect with a more authentic font and improved glitch aesthetics.
  - **Smooth Transition Plus**: Fixed a bug where the active text color was not correctly applied in the Web View.
  - **Smooth Transition White**: Added a new karaoke highlight effect that features a smooth gradient wipe but keeps the future text (and the unplayed portion of the active word) permanently **White (Opacity 100%)**, essentially overriding any global font color or opacity settings. This creates a high-contrast look where the text is always fully visible.
- **Export & Rendering**:
  - **Gapless TTML**: Fixed word-level timestamp gaps in TTML exports, ensuring contiguous highlighting for smoother karaoke playback.
- **User Interface**:
  - **New Shortcut**: Added **Y** key to quickly toggle the "Keyboard Shortcuts" info overlay.
  - **Shortcuts Help**: Updated the Keyboard Shortcuts modal (`?` or `Y`) to include a new section for **Mouse & Touch Interactions** (e.g., Click-to-Seek, Double-Tap for Minimal Mode).
- **Documentation**:
  - **README Update**: Added detailed "Mouse & Touch Gestures" section and missing shortcuts to the main documentation.
- **AI Transcription**:
  - **Precision**: Tuned system prompts for Gemini to improve stability and reduce text repetition on longer audio files.


# 2.3.0

## What's New
- **Video File Support**:
  - **Video as Audio Source**: You can now load video files (MP4, WebM, etc.) directly into the player or playlist. The audio track will be played, and the video itself will automatically be set as the dynamic background.
  - **Seamless Integration**: Supports drag-and-drop in the Playlist Editor, automatically detecting video files and setting them up as visual covers.
  - **Format Support**: Validated support for standard web video formats including `mp4`, `webm`, `mkv`, `mov`, etc.
- **Enhanced Lyric Support**:
  - **Input Acceptance**: File pickers and drop zones now explicitly accept and parse `.vtt` and `.ttml` files alongside existing formats.
- **User Interaction**:
  - **Minimal Mode Shortcut**: Added "Double-Tap" / "Double-Click" gesture on the main screen area to quickly exit Minimal Mode, providing an alternative to the "O" keyboard shortcut for touch devices and mouse users.


# v2.2.9

## What's New
- **VTT Support**: Full support for WebVTT (`.vtt`) subtitle format.
  - **Import**: Drag & Drop or manually load `.vtt` files for any track.
  - **Playback**: Native parsing and synchronization of VTT timestamps, including **Word-Level** `<timestamp>` tags for karaoke effects.
  - **Export**: Export lyrics to **VTT** format, including robust end-time management (fallback logic matching SRT) and support for **Word-Level** tags (`<timestamp>`) for karaoke displays.
- **Playlist Management**:
  - **Auto-Detection**: The playlist editor now recognizes `.vtt` files during drag-and-drop operations for automatic pairing.
  - **Export Options**: Added 'VTT' to the quick export menu in the playlist item row.


# v2.2.8

## What's New
- **Bug Fixes**:
  - **Visual Presets**: Fixed text truncation issues in the **Subtitle** preset for both Web View and Exported Video.
  - **Code Cleanup**: Removed unrelated comments and unused code. 


# v2.2.7

## What's New
- **Real Color Media Source**: Added a new toggle in Render Settings under "Background Effects".
  - **Disable Darkening**: When enabled, removes the default semi-transparent dark overlay (used for text readability), allowing your background images and videos to display their true, vibrant original colors.
  - **Universal Support**: Works seamlessly in the Web Player, Live Recorder, and FFmpeg Render engine.
- **Settings Management**:
  - **Reset Logic**: "Reset All Settings" now correctly resets the Real Color Media Source preferences to default (false).
  - **Import/Export**: JSON settings import/export fully supports the new Real Color configuration.
- **Bug Fixes**:
  - Fixed loop video issue where videos would not loop correctly.


# v2.2.6

## What's New
- **FFmpeg WASM Integration**: Added a new "Pro" rendering engine option in the export panel.
  - **Frame-by-Frame Rendering**: Ensures perfect synchronization and zero dropped frames, even on slower devices.
  - **High Quality**: Supports direct encoding to **H.264 (MP4)**, **VP9 (WebM)**, and **AV1**.
  - **Smart Fallback**: Automatically switches between Multi-threaded (faster) and Single-threaded (compatible) modes based on your browser environment (COOP/COEP headers).
- **Offline Mode Support**: FFmpeg core files are now intelligently cached. The app works fully offline using local resources if available, falling back to CDN only when needed.
- **Visual Effects Compatibility**: Improved the export renderer to match the web preview more closely.
  - **Animated Fire**: Added dynamic flickering and heat wave animations to the 'Fire' text effect during export.
  - **VHS/Retro Drift**: Added color channel drift and static noise to the 'VHS' effect during export.
- **Settings Management**: Updated Export/Import JSON schema to include new Render Engine and Codec preferences.
- **Bug Fixes**:
  - Fixed discrepancy between Web View and Export for animated text effects.
  - Fixed dependency optimizer issues with FFmpeg worker files. 


# v2.2.5

## What's New
- **Visual Editor Enhancements**:
    - **Video Looping**: Automatically loops video clips when their duration on the timeline is extended beyond their original length. This allows for seamless background extensions without manual duplication.
    - **Duration Reset**: Added a "Reset" button to video thumbnails in the editor. Clicking this instantly reverts the clip's duration to its original source length.
    - **Consistent Rendering**: Looping behavior is perfectly synchronized between the Editor preview and the final Video Export.
- **Render Settings**:
    - **Gradient Overlay**: Added a "Black Gradient Overlay" toggle. This adds a subtle bottom-to-top fade to improve text readability against busy backgrounds.

## Bug Fixes
- **Subtitle Cropping**: Fixed an issue where subtitle text could appear cropped in the web view.
- **Audio Slider**: Fixed accuracy issues with the audio duration slider to ensure precise seeking.


# v2.2.4

## What's New
- **Visual Editor**:
    - **Playback Speed**: Replaced the fixed dropdown with a **Manual Input** field for precise playback rate control (0.25x - 2.0x). Supports decimal values and **Arrow Key** adjustments (Up/Down) for fine-tuning.
- **Rendering & Export**:
    - **Visual Fidelity**: Fixed discrepancies between the Web View and Exported Video. Highlight colors and Song Information styling now render exactly as seen in the preview.
    - **Smart Timestamp Inference**: Enhanced export logic for **TTML** and **SRT**, particularly for Enhanced LRC files. The exporter now filters out whitespace/empty timing tags and intelligently links word end-times to the next meaningful word's start time, ensuring perfectly contiguous, gapless karaoke highlights.
- **Playlist Workflow**:
    - **Auto-Load**: Added logic to automatically load the first track of any newly added audio batch, allowing for immediate playback without extra clicks.
- **User Interface**:
    - **UI Consistency**: Adjusted button heights/sizes in the Playlist Editor ("Add Files", "Add Folder") to match the Visual Editor for a reliable look and feel.
    - **Modal Shortcuts**: Confirmation dialogs (Delete, Clear, etc.) now support **Enter** to confirm and **Escape** to cancel.

## Bug Fixes
- **Export Colors**: Resolved an issue where highlight effects (e.g., Neon, Glow) in exported videos used incorrect or default colors instead of the user-selected custom colors.
- **Song Info Layout**: Fixed positioning and styling mismatches for Song Info overlays in the final render.
- **Visual Presets**: Fixed vertical alignment in the **Subtitle** preset and ensured **Classic Serif** renders properly in Italic during video export.
- **Channel Info**: Resolved a bug that caused duplicate Channel Info overlays to appear in certain render configurations.


# v2.2.3

## What's New
- **Lyric Rendering & Formats**:
    - **Formatting Polish**: Improved spacing logic for LRC, Enhanced LRC, and TTML formats (cleaner hyphen handling, precise word spacing).
    - **Newline Support**: Added support for literal newline characters (`\n`) in Enhanced LRC files.
    - **Style Scope**: New "Lyric Style Target" setting allows applying font styles (Bold, Italic) exclusively to the **Active Line** or **All Lines**.
- **Visual & Rendering**:
    - **SVG Support**: "Channel Info" now supports rendering raw SVG code for scalable logos/graphics.
    - **Highlight Stability**: Fixed text shifting issues when highlight effects are active.
    - **Intro Layout**: Fixed title/artist overlap in 'Auto' intro mode with large fonts.
- **User Interface**:
    - **Playlist Control**: Clicking the play button on the active track now correctly pauses playback.
    - **Custom Fonts**: Auto-activation of custom fonts upon upload/load.
    - **Preset Stability**: Adjusting font size or using shortcuts no longer forcibly switches the preset to "Custom", preserving the active preset identity.
    - **Shortcuts**: Fixed 'Z' (Cycle) and 'X' (Toggle) shortcuts to maintain effect presets correctly.

## Bug Fixes
- **Font Rendering**: Fixed a regression where custom fonts would sometimes fail to apply in the Web View or Export until manually reset.
- **Render Settings**: Fixed synchronization between UI toggles and internal render config.
- **Lyric Scroll**: Fixed scrolling behavior to reset correctly on song repeat.
- **Canvas Renderer**: Resolved type errors and custom color rendering issues.


# v2.2.2

## What's New
- **Lyric Editor & Formats**:
    - **Enhanced LRC Export**: Added support for exporting **Enhanced LRC** (Word-Level) format. The new **eLRC** button allows you to save karaoke-ready lyrics with precise word timings.
    - **Cleaner Parsed Lyrics**: Improved parsing logic to normalize spacing (removing excessive gaps) for a cleaner text display from enhanced lyric files.
    - **Online Lyric Search**: Integrated **@stef-0012/synclyrics** to search and download synchronized lyrics from multiple sources (**Musixmatch**, **LRCLIB**, **Netease**) directly in the playlist. Includes automatic fallback to **LRCLIB** API.
    - **Transcription Line Length**: Search prompts for transcription now enforce a strict **3-8 words per line** limit for better readability.
    - **Transcription Mode**: Added a new dropdown to choose between **Line** (Standard) and **Word** (Karaoke/Enhanced) granularity for AI transcription.
    - **Word Spacing Fix**: Resolved an issue where word-level lyrics lacked proper spacing in web and render views.
- **Visual Editor**:
    - **Click-to-Seek**: Clicking any lyric segment on the Visual Editor timeline now instantly jumps the player to that timestamp.
- **UI Interaction**:
    - **Minimal Mode Toggle**: Added a dedicated button in the main control bar to quickly toggle Minimal Mode.
    - **Playlist Layout**: Improved the Playlist Editor to keep control buttons visible on rows for better accessibility.
    - **Dropdown Fix**: Fixed a UI issue where the "Line/Word" dropdown box was obscured by a hover effect.
- **Channel Info Control**:
    - **Center Position**: Added **Top-Center** and **Bottom-Center** positioning options for watermark/logo placement.
    - **Styling**: Introduced new layout styles: `Classic` (Row), `Modern` (Column), `Minimal` (Text Only), `Logo Only`, and `Boxed`.
- **Render Settings**:
    - **JSON Import/Export**: Added robust **JSON Import/Export** functionality. Users can now backup, share, and restore their exact render configurations (including custom fonts and complex visual effects).
    - **Minimal Mode Automation**: Activating **Minimal Mode** (O) now automatically enables **UI Inhibit** (preventing controls from auto-hiding) for a stable viewing experience. This preference is remembered.

## Bug Fixes
- **Settings Export**: Fixed precision issues in exported JSON settings (rounding floating-point values) to ensure cleaner configuration files.
- **Search Functionality**: Resolved "Could not find suitable search function" errors when fetching synchronized lyrics.
- **Text Rendering**: Fixed handling of hyphenated words (e.g. "semi-automatic") to prevent incorrect spacing splits in Web and Video rendering.
- **Channel Info**: Fixed layout consistency for 'Minimal' style in render output to match web preview.
- **Transcription State**: Fixed an infinite loading state if an API key was not provided.
- **Internal Cleanup**: Removed unused code and comments for better performance and maintainability.


# v2.2.1

## What's New
- **Advanced Backgrounds**:
    - **Custom Image Source**: You can now select "Custom Image" directly from the Background Source dropdown in Render Settings, allowing for easier single-image background setup.
- **Minimal Mode Refinements**:
    - **UI Polish**: Improved positioning, sizing, and margins for Channel Info and Song Info elements in Minimal Mode.
    - **Visual Consistency**: Aligned album art and text in the web view to perfectly match the final video export.
    - **Shortcut**: Added **O** shortcut to quickly toggle Minimal Mode on/off.
- **Channel Info Control**:
    - **Adjustable Margins**: New slider setting to fine-tune the edge margin of the Channel Info display.
    - **Z-Index Fix**: Resolved issues where channel info could be obstructed by other elements.
- **Render Settings**:
    - **Settings Sync**: Fixed synchronization issues between shortcuts and the Render Settings panel (e.g., Highlight Effect 'Z').
    - **Visual Preset Dropdown**: Added a dedicated dropdown menu to apply visual presets (Simple, Large, Social, etc.) directly from the panel. The dropdown is now fully synchronized with the **J** keyboard shortcut.
    - **Robust Import/Export**: Settings export/import now correctly handles custom fonts and ensures all render configurations (resolution, FPS, quality) are preserved.
- **System Notifications**:
    - **Expanded Feedback**: Added toast notifications for major keyboard shortcuts (e.g., 'H' for UI Inhibit) to confirm actions.
    - **Improved UX**: Optimized notification duration and removed duplicates for a cleaner experience.
- **Clean UI**:
    - **Smart Channel Info**: Channel Info overlay is now hidden by default on the main player view and only appears when **Minimal Mode** (O) is active, keeping the main interface clutter-free.
- **Lyric Interactions**:
    - **Copy to Clipboard**: Clicking the current/active lyric line now copies the text to the clipboard.
- **AI & Transcription (Gemini)**:
    - **Mixed-Language Mastery**: Significantly improved handling of multi-lingual audio (Code-Switching). The AI now accurately distinguishes between mixed languages (e.g., Japanese + English) within the same sentence.
    - **Native Script Preservation**: Enforced strict rules to keep words in their native script (e.g., English words in a Japanese song remain in Latin script, avoiding unnecessary Katakana conversion).
    - **Resilience**: Added robust JSON repair logic and timestamp normalization to handle truncated or malformed API responses, ensuring fewer failures on long audio files.

## Bug Fixes
- **Lyric Alignment**: Fixed text alignment issues where wrapped second lines were not correctly centered in Canvas and Video export.
- **Sync**: Fixed double notifications when changing effects via shortcuts.
- **Defaults**: Fixed issue where toggling off settings (Channel Info/Intro) didn't correctly reset their sub-settings to defaults.


# v2.2.0

## What's New
- **Advanced Karaoke Effects**: Added 10+ new highlight effects including `Neon`, `Glow`, `Bounce`, `Wave`, and solid colors (`Blue`, `Purple`, `Green`, `Pink`, `Cyan`).
- **Shape Highlights**: Introduced shape-based highlights: `Pill`, `Box`, and `Rounded Box` backgrounds.
- **Customizable Highlight Colors**: New color pickers for **Text/Glow Color** and **Background/Shape Color** allow for full personalization of karaoke effects.
- **TTML/XML Support**: Native support for `.ttml` and `.xml` lyric files with word-level timing precision (Karaoke mode).
- **Polished Settings UI**: Redesigned dropdowns in the Render Settings panel (Highlight, Background, FPS, Codec, etc.) with a modern, grouped interface.
- **Improved Keyboard Shortcuts**: 
    - **X**: Toggle Highlight Effect On/Off.
    - **Z**: Cycle through all available Highlight Effects.
    - **F**: Toggle Fullscreen.
    - Added "Visual Effects" section to the Keyboard Shortcuts help modal.
- **Improved TTML Handling**: Enhanced parsing and export of Word-Level timing data (`<span>` tags) for precise karaoke synchronization.
- **Smart Presets**: Selecting a named color effect (e.g., "Karaoke Blue") automatically configures the custom color pickers.
- **Refined Rendering**: Improved visual consistency for both live playback and video export.


# v2.1.0

## What's New
- **Advanced Lyric Management**:
    - **Manually Load Lyrics**: You can now manually load lyric (`.lrc`) or subtitle (`.srt`) files for any track in the playlist.
    - **Clear Lyric Button**: Added a dedicated button to clear/delete the lyric timeline for a specific track.
    - **Sync Across Components**: Lyric changes (load/delete) in the Playlist Editor now instantly sync with the main Player/Timeline view.
- **Playlist Improvements**:
    - **Drag & Drop**: Added robust drag-and-drop support for Audio (`mp3`, `wav`, etc.) and Lyric (`lrc`, `srt`) files directly into the Playlist Editor.
    - **Smart Pairing**: Dropped files are automatically paired by filename (e.g., `song.mp3` + `song.lrc` = one track).
- **AI-Powered Transcription (Gemini)**:
    - **Gemini Integration**: Built-in support for Google's Gemini models (`gemini-2.5-flash`, `gemini-3-flash-preview`, etc.) for high-quality audio transcription.
    - **Smart Transcription**: Refined prompts to ensure complete coverage and minimize missed lines.
    - **Abort Control**: Added the ability to stop/abort an ongoing transcription process.
    - **Timestamp Correction**: Logic to clamp timestamps to audio duration and prevent playback jumps to incorrect times.
- **Editor & Export Improvements**:
    - **LRC Export Refinement**: Improved logic for handling blank lines and ensuring the final timestamp doesn't exceed audio duration.
    - **Timeline Alignment**: Fixed ruler and playhead alignment issues for precise seeking.
    - **Visual Editor Defaults**: Media background defaults to black; "Import Media" button moved for better accessibility.
    - **Split Shortcut**: Changed the "Split" shortcut to **X** to avoid conflict with Stop (S).
    - **Lyric Mode Shortcut**: Added **G** shortcut to quickly cycle through lyric display modes (Show All, Previous-Next, Next Only, Active Only).
    - **Text Case Shortcut**: Added **C** shortcut to cycle through text case options (Normal, Upper, Lower, Title, Sentence, Invert).
- **Playback Enhancements**:
    - **Advanced Repeat Logic**: Expanded to 4 modes: **Off**, **Repeat One**, **Play All** (Stop at end), and **Repeat All** (Loop Playlist).

## Bug Fixes
- **Transcription**: Fixed "Gemini Timestamp Jump" where clicking a timestamp would jump to a different model's result.
- **UX**: Fixed issue where the Transcribe Model dropdown wasn't selected by default.
- **Export**: Resolved timestamp overflow issues in LRC/SRT exports.


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
