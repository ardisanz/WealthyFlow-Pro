# Panduan Lengkap Build & Distribusi APK - WealthyFlow Pro

Dokumen ini berisi panduan langkah demi langkah untuk mengubah proyek web Anda menjadi file **APK** (Android Package) dan membagikannya agar orang lain dapat mengunduh serta menginstalnya di HP Android mereka.

---

## Langkah 1: Sinkronisasi Kode Terkini (Sudah Selesai)
Sebelum membangun APK, semua aset web terbaru (`index.html`, `script.js`, `style.css`, dll.) harus dikompilasi dan disalin ke dalam folder proyek Android Capacitor.
Kami baru saja berhasil menjalankan perintah sinkronisasi untuk Anda:
```bash
npm.cmd run sync
```
> [!NOTE]
> Semua kode, desain, dan logika terbaru dari aplikasi Anda sudah disinkronkan ke dalam folder `android`. Proyek siap untuk di-build menjadi APK.

---

## Langkah 2: Membangun (Build) File APK

Karena sistem Windows Anda saat ini belum memiliki konfigurasi path Java (`JAVA_HOME`) secara global di terminal VS Code, cara termudah dan paling direkomendasikan adalah menggunakan **Android Studio**.

### Metode A: Menggunakan Android Studio (Sangat Direkomendasikan & Paling Mudah)
Android Studio sudah dilengkapi dengan Java JDK dan Android SDK internal, sehingga Anda tidak perlu melakukan konfigurasi manual yang rumit.

1. **Buka Android Studio** di laptop Anda.
2. Klik **Open** (atau *File -> Open*).
3. Arahkan dan pilih folder **`android`** yang ada di dalam proyek Anda:
   `f:\Vscode\TO DO LIST\android`
4. Tunggu beberapa menit hingga Gradle selesai melakukan proses sinkronisasi (proses ini otomatis, pastikan laptop Anda terhubung ke internet). Anda akan melihat status bar di bawah selesai memproses.
5. Di menu bagian atas Android Studio, klik:
   **`Build`** ➔ **`Build Bundle(s) / APK(s)`** ➔ **`Build APK(s)`**
6. Android Studio akan mulai mengompilasi aplikasi Anda.
7. Setelah selesai (biasanya 1–3 menit), akan muncul notifikasi balon di pojok kanan bawah bertuliskan **"APK(s) generated successfully..."**.
8. Klik tulisan **`locate`** di notifikasi tersebut untuk membuka Windows Explorer langsung ke folder tempat file APK berada.
   * Lokasi manual file APK Anda adalah:
     `f:\Vscode\TO DO LIST\android\app\build\outputs\apk\debug\app-debug.apk`

---

## Langkah 3: Cara Distribusi agar Bisa Didownload Orang Lain

Setelah mendapatkan file **`app-debug.apk`**, Anda bisa membagikannya dengan beberapa cara berikut:

### 1. Menggunakan GitHub Releases (Sangat Profesional)
Karena proyek Anda sudah terhubung dengan repositori GitHub `ardisanz/WealthyFlow-Pro`, ini adalah cara terbaik:
1. Push semua perubahan kode terbaru Anda ke GitHub (melalui VS Code git commit & push).
2. Buka browser dan pergi ke halaman repositori Anda:
   `https://github.com/ardisanz/WealthyFlow-Pro`
3. Di sisi kanan halaman, cari bagian **Releases** lalu klik **Create a new release** (atau *Draft a new release*).
4. Isi data berikut:
   * **Choose a tag:** Ketik versi baru, misalnya `v1.0.0` lalu klik *Create new tag*.
   * **Release title:** Ketik judul rilis, misalnya `WealthyFlow Pro v1.0.0 Beta`.
   * **Describe this release:** Tulis deskripsi singkat tentang aplikasi Anda.
5. Di bagian bawah terdapat area untuk mengunggah file (drag & drop). **Seret dan letakkan file `app-debug.apk` Anda ke area tersebut.**
6. Tunggu hingga proses unggah selesai.
7. Klik tombol **Publish release**.
8. **Selesai!** Sekarang Anda bisa menyalin link halaman rilis tersebut dan membagikannya ke orang lain. Mereka cukup mengeklik file APK di halaman tersebut untuk mengunduhnya.

### 2. Menggunakan Google Drive atau Cloud Storage Lainnya
Jika ingin membagikan secara cepat tanpa melalui GitHub:
1. Upload file `app-debug.apk` ke **Google Drive**, **Dropbox**, atau **MediaFire**.
2. Klik kanan pada file yang sudah di-upload di Google Drive, pilih **Dapatkan Link (Get Link)**.
3. **PENTING:** Ubah akses umum dari *Dibatasi (Restricted)* menjadi **"Siapa saja yang memiliki link" (Anyone with the link can view/download)**.
4. Salin link tersebut dan bagikan ke teman atau pengguna Anda lewat WhatsApp, Telegram, atau media sosial.

### 3. Mengirim Langsung Lewat WhatsApp / Telegram
* Anda bisa langsung mengirimkan file `app-debug.apk` melalui WhatsApp Web atau aplikasi Telegram Desktop seperti Anda mengirim dokumen biasa. Penerima tinggal mengunduh dan mengekliknya langsung dari ruang obrolan untuk menginstal.

---

## Langkah 4: Petunjuk Instalasi untuk Pengguna (Penting!)

Karena APK yang di-build saat ini adalah versi **Debug** (belum didaftarkan secara berbayar ke Google Play Store), sistem keamanan Android akan mendeteksinya sebagai aplikasi dari sumber yang tidak dikenal.

Beri tahu orang yang mengunduh untuk melakukan langkah ini saat menginstal:
1. Buka file APK yang sudah didownload.
2. Jika muncul peringatan **"Blocked by Play Protect"** atau **"Aplikasi tidak dikenal"**:
   * Klik **Details** (Detail) atau **More Info**.
   * Klik tombol **"Install Anyway"** (Tetap Instal).
3. Jika Android meminta izin untuk **"Install apps from unknown sources"** (Instal aplikasi dari sumber tidak dikenal) untuk browser atau file manager:
   * Aktifkan izin tersebut (geser tombol ke kanan), lalu lanjutkan instalasi.
