# Immersive Audio Player

A modern, single-page web application that transforms your music listening into a visual experience. Supports synchronized lyrics, custom visual storytelling, and high-quality video export for social media content creation.

![Immersive Audio Player Main Screen](screenshot-main-screen.jpg)

## Key Features

### 🎧 Advanced Audio Player
- **Universal Format Support**: Plays standard web audio formats (MP3, WAV, OGG, etc.).
- **Smart Metadata**: Automatically extracts Cover Art, Title, and Artist using `jsmediatags`.
- **Immersive Mode**: UI controls automatically fade out when idle for a distraction-free experience.

### 📝 Synchronized Lyrics
- **Dual Format Support**: Compatible with both `.lrc` (Karaoke style) and `.srt` (Subtitle style) files.
- **Auto-Scroll**: Lyrics scroll automatically in sync with the music.
- **Click-to-Seek**: Click any lyric line to instantly jump to that exact time in the song.
- **Visual Presets**: Choose from multiple display styles:
  - **Default**: Modern, centered, balanced.
  - **Big Text**: Large, left-aligned, high impact (Great for short videos).
  - **Big Text (UP)**: Uppercase variation of Big Text for bold statements.
  - **Big Center**: Large, centered, uppercase text.
  - **Metal**: Intense, jagged font for rock/metal vibes.
  - **Kids**: Playful, rounded font with soft shadows.
  - **Sad**: Handwritten style, ideal for emotional or acoustic tracks.
  - **Romantic**: Elegant script font with a soft glow.
  - **Tech**: Futuristic, digital font with a cyan glow.
  - **Gothic**: Old English style blackletter font.
  - **Classic Serif**: Elegant, italicized serif font for a cinematic feel.
  - **Monospace**: Clean code-style font.
  - **Testing**: Alternate centered layout optimized for video export.
  - **Testing (UP)**: Uppercase variation of the Testing preset.
  - **Slideshow**: Small, line-by-line lyrics (Web) / Single line (Export).
  - **Just Video**: Hides lyrics on export, showing only the background video.

### 🎬 Visual Timeline Editor
- **Create Stories**: Drag and drop images or videos to create a background slideshow synchronized to specific timestamps.
- **Timeline Interface**: Intuitive interface to move, resize, and snap slides to lyrics or audio duration.
- **Advanced Selection**:
  - **Single Click**: Select a slide.
  - **Shift + Click**: Select multiple slides.
  - **Select All**: Quick button to select all items.
- **Precise Control**:
  - **Arrow Keys (Left/Right)**: Move selected slides by 0.5s.
  - **Duration Input**: Manually type duration (MM:SS) for exact timing.
- **Video Support**:
  - **Volume Control**: Mute/Unmute or adjust volume for video slides directly on the timeline.
- **Zoom Controls**: Zoom in/out of the timeline for precise editing.

![Timeline Editor](screenshot-timeline.jpg)

### 🎥 Content Creation & Export
Turn your audio and visuals into shareable videos directly in the browser.
- **Resolutions**: 
  - **720p** (HD - Faster render, smaller file size)
  - **1080p** (Full HD - High quality)
- **Aspect Ratios**:
  - **16:9**: Classic Landscape (YouTube, Desktop)
  - **9:16**: Vertical (TikTok, Instagram Reels, YouTube Shorts)
  - **3:4**: Vertical (Instagram Feed, Facebook)
  - **1:1**: Square (Instagram Post, Facebook)
- **Smart Overlays**: Automatically renders a professional metadata overlay (Cover Art + Text).
  - *Landscape*: Top-left alignment.
  - *Portrait (9:16/3:4/1:1)*: Top-center alignment.

## Keyboard Shortcuts

| Key | Function |
| :--- | :--- |
| **Space / K** | Play / Pause |
| **Arrow Left** | Rewind 5 seconds |
| **Arrow Right** | Forward 5 seconds |
| **S** | Stop & Reset |
| **L** | Toggle Loop |
| **F** | Toggle Fullscreen |
| **H** | Toggle "Hold UI" (Prevents auto-hide) |
| **T** | Open/Close Timeline Editor |
| **I** | Toggle Info Header |
| **P** | Toggle Player Controls |

## Installation

This application is built with React + Vite and requires **Node.js** to run.

1.  **Prerequisites**: Install **Node.js** (LTS version recommended).
2.  **Install Dependencies**: Open a terminal in the project folder and run:
    ```bash
    npm install
    ```
3.  **Start the Server**: Run the development server:
    ```bash
    npm run dev
    ```
4.  **Launch**: Open your browser (Chrome/Edge recommended) and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## How to Use

1. **Import Audio**: Click the **Music Note** icon to select an audio file from your device.
2. **Import Lyrics**: Click the **File** icon to load a matching `.lrc` or `.srt` file.
3. **Design Visuals**: 
   - Press **T** or click the **Timeline** 🎞️ icon.
   - Click "Add Images" to populate the timeline.
   - Drag images to position them; drag the edges to adjust duration.
4. **Export Video**:
   - Select your target resolution (e.g., 1080p) and aspect ratio (e.g., 9:16) in the bottom bar.
   - Click the **Video** icon.
   - *Important*: The audio will play in real-time to capture the video. Keep the tab active until rendering finishes.

## Browser Compatibility

Video export relies on modern browser APIs (`MediaRecorder` and `captureStream`). 
- **Recommended**: Google Chrome, Microsoft Edge, or other Chromium-based browsers.
- **Note**: Firefox and Safari may have varying levels of support for specific video export features.

---

## Panduan Pengguna (Bahasa Indonesia)

Berikut adalah panduan lengkap penggunaan aplikasi mulai dari instalasi hingga export video.

### 1. Persiapan & Instalasi
Aplikasi ini berbasis web modern (React + Vite) dan membutuhkan **Node.js** untuk dijalankan.

1.  **Install Node.js**: Pastikan komputer Anda sudah terinstall Node.js (versi LTS atau terbaru).
2.  **Siapkan Project**: Buka folder project ini.
3.  **Install Dependencies**:
    Buka terminal (Command Prompt atau PowerShell) di dalam folder project, lalu ketik perintah berikut dan tekan Enter:
    ```bash
    npm install
    ```
    Tunggu hingga proses download selesai.

### 2. Menjalankan Aplikasi
Setelah instalasi berhasil, jalankan aplikasi dengan perintah:
```bash
npm run dev
```
Terminal akan menampilkan alamat server lokal (biasanya `http://localhost:5173`). Buka link tersebut di browser Anda (disarankan menggunakan **Google Chrome** atau **Edge**).

### 3. Cara Penggunaan Langkah demi Langkah

#### Langkah 1: Masukkan Lagu & Lirik
1.  Klik ikon **Nada Musik** 🎵 di menu bawah untuk memilih file lagu dari komputer Anda (MP3, WAV, dll).
2.  Klik ikon **Dokumen** 📄 untuk memasukkan file lirik (`.lrc` atau `.srt`).
    *   *Catatan*: Pastikan file lirik memiliki timing yang sinkron dengan lagu Anda.

#### Langkah 2: Edit Visual (Timeline)
Anda bisa menambahkan gambar background yang berubah-ubah sesuai durasi lagu.
1.  Klik ikon **Timeline** 🎞️ atau tekan tombol **T** di keyboard untuk membuka Timeline Editor.
2.  Klik **"Add Images"** untuk memilih gambar atau video yang ingin dimasukkan.
3.  **Seleksi & Navigasi**:
    *   Klik satu kali untuk memilih item.
    *   Tahan **Shift + Klik** untuk memilih banyak item sekaligus.
    *   Gunakan tombol **Panah Kiri/Kanan** di keyboard untuk menggeser item terpilih (0.5 detik).
4.  **Atur Posisi & Durasi**:
    *   Drag & drop untuk memindahkan.
    *   Tarik ujung kiri/kanan untuk mengubah durasi.
    *   Ketik durasi manual (MM:SS) pada input box untuk presisi tinggi.
5.  **Kontrol Video**: Untuk slide video, Anda bisa mengatur volume atau mute audio bawaan video tersebut.
6.  **Pilih Preset Lirik**: Di bagian kiri bawah, pilih gaya tampilan lirik yang diinginkan (contoh: *Big Text*, *Slideshow* untuk tampilan minimalis).

#### Langkah 3: Export Video
Setelah puas dengan tampilan:
1.  Di menu bawah, pilih **Resolusi** (720p atau 1080p).
2.  Pilih **Rasio Video** sesuai tujuan upload:
    *   **16:9**: YouTube / Layar Lebar.
    *   **9:16**: TikTok / Shoots / Reels.
    *   **3:4**: Instagram Feed / Facebook.
    *   **1:1**: Instagram Post / Facebook.
3.  Klik ikon **Video/Kamera** 🎥 untuk memulai export.
4.  **PENTING**: Lagu akan berputar dari awal. **Jangan tutup atau minimalkan tab browser** selama proses ini berlangsung hingga file video otomatis terunduh.
