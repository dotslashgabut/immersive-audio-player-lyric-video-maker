# Immersive Audio Player & Lyric Video Maker

**Immersive Audio Player & Lyric Video Maker** is a powerful all-in-one web tool designed for music lovers and content creators. It combines a distraction-free audio player with a professional-grade timeline editor, allowing you to create stunning, synchronized lyric videos directly in your browser. Whether you want to enjoy your local music library with beautiful visuals or create viral content for TikTok, Instagram, and YouTube, this app delivers high-quality results without watermarks or server uploads.

![Immersive Audio Player Main Screen](screenshot-main-screen.jpg)

## Key Features

### 🎧 Advanced Audio Player & Playlist
- **Smart Playlist**: Drag & drop multiple files. Automatically groups audio files with matching lyric files (`.lrc` or `.srt`) based on filename.
- **Sorting & Management**: Sort by Filename, Artist, Title, Album (Ascending/Descending), or Shuffle.
- **Repeat Modes**: Cycle between **Off**, **Repeat All**, and **Repeat One**.
- **Immersive Mode**: UI controls automatically fade out when idle for a distraction-free experience.

![Playlist Management](screenshot-playlist.jpg)

### 📝 Synchronized Lyrics
- **Dual Format Support**: Compatible with both `.lrc` (Karaoke style) and `.srt` (Subtitle style) files.
- **Auto-Scroll & Centering**: Lyrics scroll automatically and active lines are perfectly centered.
- **Lyric Offset Control**: Fine-tune sync issues with **+0.1s / -0.1s** buttons directly in the player.
- **Click-to-Seek**: Click any lyric line to instantly jump to that exact time.
- **Adjustable Font Size**: Use **+** / **-** hotkeys to adjust lyric size on the fly.
- **Visual Presets**: Choose from a wide variety of display styles:
  - **Standard**: Default, Big Text, Big Text (UP), Big Center (UP).
  - **Thematic**: Metal, Kids, Sad, Romantic, Tech, Gothic, Classic Serif, Monospace.
  - **Social**: 
    - **Slideshow**: Minimalist line-by-line (Great for Reels).
    - **Subtitle**: Cinematic bottom-centered text (No song metadata).
    - **Just Video**: Hides text completely.

### 🎬 Professional Visual Timeline Editor
 Create complex visual stories synchronized to your music.
- **Full Editing Suite**:
  - **Undo/Redo** (Ctrl+Z / Ctrl+Y): Never worry about mistakes.
  - **Copy/Cut/Paste** (Ctrl+C / Ctrl+X / Ctrl+V): Duplicate slides easily.
  - **Snapping**: Clips snap to each other, lyric timestamps, and grid lines for pixel-perfect timing.
- **Multi-Track Capabilities**: Add Images, Videos, and Sound Effects overlaid on the main track.
- **Advanced Selection**:
  - **Shift + Click** for range selection.
  - **Ctrl + Click** for multi-selection.
- **Precise Control**:
  - **Arrow Keys**: Nudge selected clips by 0.5s.
  - **Volume Mixing**: Independent mute/volume control for every video and audio clip on the timeline.

![Timeline Editor](screenshot-timeline.jpg)

### 🎥 Content Creation & Export
- **Resolutions**: 720p (Fast) / 1080p (High Quality).
- **Aspect Ratios**: 
  - **16:9** (Landscape - YouTube)
  - **9:16** (Vertical - TikTok/Reels)
  - **1:1** (Square - Instagram)
  - **3:4** (Portrait - Instagram)
  - **2:3** (Portrait - Digital Photography)
  - **3:2** (Landscape - Classic Photo)
  - **1:2** (Tall Vertical)
  - **2:1** (Cinematic Landscape)
- **Smart Overlays**: Automatically generates metadata overlays for "Now Playing" visuals.
- **High-Fidelity Rendering**: Uses H.264 High Profile for crisp text and smooth 60fps video.

![Export Interface](screenshot-render.jpg)

### 🛠 Technical Architecture
- **Rendering Engine**: Highly optimized **Canvas 2D** pipeline. Text rendering is handled natively by the browser, ensuring perfect clarity and compatibility with all languages and writing systems.
- **OffscreenCanvas Ready**: The application structure decouples rendering logic from the UI thread (`utils/canvasRenderer.ts`). This architecture supports `OffscreenCanvas` and Web Workers, enabling potential future upgrades for background rendering or "lag-free" exports on lower-end devices.
- **WebGPU Note**: While not currently used, the modular design allows for a hybrid approach in the future (e.g., using WebGPU for background visualizers while keeping Canvas 2D for crisp text overlays).

## Keyboard Shortcuts

| Key | Function |
| :--- | :--- |
| **Space / K** | Play / Pause |
| **Arrow Left / Right** | Rewind / Forward 5s (Player) OR Nudge Slide (Editor) |
| **Arrow Up / Down**| Navigate Playlist Tracks |
| **M** | Toggle Mute |
| **R** | Toggle Repeat Mode (Off -> All -> One) |
| **J** | Next Visual Preset |
| **+ / -**| Increase / Decrease Lyric Font Size |
| **S** | Stop & Reset |
| **L** | Toggle Playlist View |
| **H** | Toggle UI Auto-Hide Inhibit |
| **T** | Open/Close Timeline Editor |
| **I** | Toggle Info Header |
| **P** | Toggle Player Controls |
| **F** | Toggle Fullscreen |
| **Delete** | Remove selected Playlist Item or Visual Slide |
| **Ctrl + Z / Y** | Undo / Redo (Editor) |
| **Ctrl + C / V** | Copy / Paste (Editor) |
| **Escape** | Abort Video Rendering |

## Installation

This application is built with React + Vite and requires **Node.js** to run.

1.  **Prerequisites**: Install **Node.js** (LTS version recommended).
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Start the Server**:
    ```bash
    npm run dev
    ```
4.  **Launch**: Open `http://localhost:5173` in Chrome or Edge.

## How to Use

1. **Build a Playlist**: 
    - Click **"Add Audio & Lyrics"** in the Playlist panel.
    - Select multiple MP3s and LRCs at once. The app will pair them automatically.
2. **Design Visuals**: 
    - Press **T** to open the Timeline.
    - Drag & Drop media or use "Import Media".
    - Use **Ctrl+C / Ctrl+V** to duplicate sequences.
3. **Export Video**:
    - Choose your resolution and aspect ratio (e.g., **9:16** for TikTok).
    - Click the **Video Camera** icon.
    - Wait for the render to complete (Video plays in real-time).

---

## Panduan Pengguna (Bahasa Indonesia)

### Fitur Utama Baru
- **Playlist Pintar**: Masukkan banyak file sekaligus. Aplikasi otomatis memasangkan lagu dengan lirik (`.lrc`/`.srt`) yang bernama sama.
- **Sorting Fleksibel**: Urutkan playlist berdasarkan Artis, Judul, Album (Bolak-balik Ascending/Descending), atau acak.
- **Kontrol Akurasi**: Atur offset lirik (maju/mundur 0.1s) jika teks kurang pas dengan suara.
- **Timeline Canggih**: Sekarang dengan fitur **Undo/Redo**, **Copy-Paste** slide, dan **Snapping** otomatis agar visual pas dengan ketukan lirik.
- **Shortcut Baru**: Tekan **M** untuk Mute, **R** untuk Repeat, **L** untuk Playlist, dan **+/-** untuk ukuran huruf.

### Cara Install & Jalan
1.  Pastikan sudah install **Node.js**.
2.  Buka terminal di folder project:
    ```bash
    npm install
    npm run dev
    ```
3.  Buka browser di `http://localhost:5173`.

### Alur Kerja
1.  **Playlist**: Masukkan semua aset lagu dan lirik. Gunakan panah Atas/Bawah untuk ganti lagu.
2.  **Visual**:
    - Tekan **T** untuk menu Visual.
    - Masukkan gambar/video background.
    - Gunakan **Ctrl+Z** jika salah edit.
    - Shift+Klik untuk pilih banyak slide.
3.  **Export**:
    - Pilih rasio yang tersedia (**16:9, 9:16, 1:1, 3:4, 2:3, 3:2, 1:2, 2:1**).
    - Klik tombol Video 🎥.
    - Jangan ganti tab browser sampai selesai.
