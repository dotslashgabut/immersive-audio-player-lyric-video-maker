# Release Notes

# v2.2.4

## What's New
- **Visual Editor**:
    - **Playback Speed**: Added a new controls to adjust the playback rate (0.25x - 2.0x) for video and audio slides in the timeline.
- **Rendering & Export**:
    - **Visual Fidelity**: Fixed discrepancies between the Web View and Exported Video. Highlight colors and Song Information styling now render exactly as seen in the preview.
    - **Smart Timestamp Inference**: Enhanced export logic for **TTML** and **SRT**, particularly for Enhanced LRC files. The exporter now filters out whitespace/empty timing tags and intelligently links word end-times to the next meaningful word's start time, ensuring perfectly contiguous, gapless karaoke highlights.
- **Playlist Workflow**:
    - **Auto-Load**: Added logic to automatically load the first track of any newly added audio batch, allowing for immediate playback without extra clicks.
- **User Interface**:
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
