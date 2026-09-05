# Quality Testing — HealthTalk

## 1. Tujuan Testing

Dokumen ini digunakan sebagai acuan manual testing untuk memastikan HealthTalk berjalan dengan benar sebagai software end-to-end, mulai dari autentikasi, navigasi, konsultasi, penyimpanan riwayat, pengolahan resep dengan OCR, sampai keamanan dan konsistensi data.

Testing tidak hanya memeriksa kualitas AI, tetapi juga memeriksa apakah user dapat menyelesaikan setiap workflow tanpa error, apakah data tersimpan dengan benar, apakah akses antar-user terlindungi, dan apakah setiap perubahan status tercermin dengan benar pada aplikasi.

---

# 2. Test Environment

| Item | Nilai |
|---|---|
| Application | HealthTalk |
| Platform | Web / Mobile Web |
| Browser | Chrome / Firefox / Edge |
| Authentication | Google SSO |
| Test Type | Manual Testing |
| Primary Language | Bahasa Indonesia |
| Test Data | Akun Google valid, data konsultasi, gambar resep |

---

# 3. Test Priority

| Priority | Keterangan |
|---|---|
| **P0** | Wajib lulus. Jika gagal, workflow utama dianggap gagal. |
| **P1** | Penting. Fitur masih dapat didemokan, tetapi harus diperbaiki. |
| **P2** | Minor / improvement. Tidak menghambat core journey. |

---

# 4. Authentication & Session Testing

## AUTH-01 | Login dengan Google SSO dan akun valid

**Precondition**
- User belum login.
- User memiliki akun Google yang valid.
- Koneksi internet tersedia.

**Step**
1. Buka aplikasi HealthTalk.
2. Klik tombol `Login`, `Masuk`, atau CTA yang mengarah ke login.
3. Pilih `Continue with Google`.
4. Pilih akun Google yang valid.
5. Ikuti instruksi autentikasi Google jika muncul.

**Expected Result**
- Google berhasil melakukan autentikasi.
- User kembali ke HealthTalk.
- Session user dibuat.
- User diarahkan ke halaman utama / halaman awal aplikasi sesuai flow yang dirancang.
- Tidak muncul error autentikasi.

**Priority:** P0

---

## AUTH-02 | Login dengan akun Google yang baru pertama kali digunakan

**Precondition**
- Akun Google belum pernah digunakan untuk login ke HealthTalk.

**Step**
1. Buka halaman login.
2. Klik `Continue with Google`.
3. Pilih akun Google yang belum pernah login ke HealthTalk.
4. Selesaikan autentikasi.

**Expected Result**
- User berhasil masuk tanpa melalui halaman register.
- Sistem membuat / menginisialisasi data user secara otomatis bila diperlukan.
- User diarahkan ke aplikasi.
- Tidak muncul form pendaftaran tambahan.

**Priority:** P0

---

## AUTH-03 | Login kembali dengan akun Google yang sudah pernah digunakan

**Precondition**
- Akun Google sudah pernah digunakan untuk HealthTalk.
- User sudah memiliki riwayat konsultasi atau data lainnya.

**Step**
1. Logout dari aplikasi.
2. Buka kembali halaman login.
3. Login dengan akun Google yang sama.

**Expected Result**
- User masuk ke akun yang sama.
- Riwayat konsultasi sebelumnya tetap tersedia.
- Riwayat resep sebelumnya tetap tersedia.
- Tidak dibuat akun atau data user duplikat.

**Priority:** P0

---

## AUTH-04 | Membatalkan proses login Google

**Precondition**
- User belum login.

**Step**
1. Buka halaman login.
2. Klik `Continue with Google`.
3. Pada halaman Google, pilih `Cancel`, `Back`, atau batalkan proses login.

**Expected Result**
- User tidak masuk ke HealthTalk.
- User kembali ke halaman login / halaman sebelumnya.
- Tidak ada session aktif yang terbentuk.
- Tidak ada data user baru yang dibuat.

**Priority:** P0

---

## AUTH-05 | Gagal login karena koneksi internet terputus

**Precondition**
- User belum login.

**Step**
1. Buka halaman login.
2. Klik `Continue with Google`.
3. Putuskan koneksi internet sebelum proses selesai.

**Expected Result**
- Login gagal secara aman.
- Tidak terjadi blank page.
- Tidak terjadi crash.
- User memperoleh pesan error yang dapat dipahami.
- User dapat mencoba login kembali setelah koneksi tersedia.

**Priority:** P1

---

## AUTH-06 | Logout dari aplikasi

**Precondition**
- User sudah login.

**Step**
1. Buka halaman `Profile`.
2. Klik `Logout`.
3. Konfirmasi logout bila confirmation dialog tersedia.

**Expected Result**
- Session user berakhir.
- User diarahkan ke halaman login / landing page.
- Data pribadi user tidak lagi ditampilkan sebagai user aktif.

**Priority:** P0

---

## AUTH-07 | Mengakses halaman protected setelah logout

**Precondition**
- User sudah logout.
- Diketahui URL halaman yang memang membutuhkan login, misalnya `Health Records`.

**Step**
1. Pastikan user sudah logout.
2. Masukkan URL halaman protected secara langsung pada address bar.
3. Akses halaman tersebut.

**Expected Result**
- Halaman protected tidak dapat diakses.
- User diarahkan ke login atau mendapatkan pesan unauthorized.
- Isi data kesehatan tidak terlihat.

**Priority:** P0

---

## AUTH-08 | Session tetap aktif setelah refresh

**Precondition**
- User sudah login.

**Step**
1. Buka Home.
2. Refresh browser.

**Expected Result**
- User tetap login sesuai kebijakan session aplikasi.
- User tidak diarahkan ke login tanpa alasan.
- Data yang sebelumnya dapat diakses tetap tersedia.

**Priority:** P0

---

## AUTH-09 | Session expired

**Precondition**
- User sudah login.
- Mekanisme expiry/refresh token tersedia.

**Step**
1. Simulasikan atau tunggu sampai session/access token expired.
2. Akses halaman protected atau melakukan request baru.

**Expected Result**
- Sistem meminta autentikasi ulang atau melakukan token refresh sesuai desain.
- Data protected tidak diberikan kepada session yang tidak valid.
- Tidak terjadi loop redirect yang tidak berujung.

**Priority:** P1

---

# 5. Routing & Navigation Testing

## ROUTE-01 | Navigasi utama

**Precondition**
- User sudah login.

**Step**
1. Buka Home.
2. Klik `Consultation`.
3. Klik `Health Records`.
4. Klik `Prescription`.
5. Klik `Profile`.
6. Kembali ke Home.

**Expected Result**
- Setiap menu membuka halaman yang benar.
- Tidak ada route yang salah.
- Tidak ada halaman blank.
- State user tetap terjaga ketika berpindah halaman.

**Priority:** P0

---

## ROUTE-02 | Mengakses path yang tidak terdaftar saat logout

**Precondition**
- User sudah logout.

**Step**
1. Buka address bar.
2. Masukkan path yang tidak terdaftar, misalnya `/testing123`.
3. Tekan Enter.

**Expected Result**
- Aplikasi menampilkan halaman `Not Found` / `404`.
- Tidak menampilkan halaman internal secara tidak sengaja.

**Priority:** P1

---

## ROUTE-03 | Mengakses path yang tidak terdaftar saat login

**Precondition**
- User sudah login.

**Step**
1. Masukkan path yang tidak terdaftar, misalnya `/testing123`.
2. Tekan Enter.

**Expected Result**
- Aplikasi tetap menampilkan `Not Found` / `404`.
- Login status tidak berubah.
- User tidak diarahkan secara keliru ke halaman protected lain.

**Priority:** P1

---

## ROUTE-04 | Mengakses halaman protected melalui URL langsung saat login

**Precondition**
- User sudah login.
- URL halaman protected diketahui.

**Step**
1. Salin URL `Health Records`.
2. Buka URL tersebut melalui address bar.

**Expected Result**
- Halaman terbuka.
- Hanya data milik user aktif yang ditampilkan.

**Priority:** P0

---

## ROUTE-05 | Tombol Back browser

**Precondition**
- User sudah login.

**Step**
1. Buka Home.
2. Masuk ke Consultation.
3. Masuk ke halaman Summary.
4. Tekan tombol Back browser.

**Expected Result**
- User kembali ke halaman sebelumnya secara logis.
- Tidak terjadi return ke halaman yang tidak relevan.
- Tidak kehilangan session.

**Priority:** P1

---

# 6. Home & Dashboard Testing

## HOME-01 | Tampilan user baru

**Precondition**
- User login untuk pertama kali.
- Belum memiliki consultation history.
- Belum memiliki prescription history.

**Step**
1. Buka Home.

**Expected Result**
- Home berhasil ditampilkan.
- Tersedia CTA `Start Consultation`.
- Empty state ditampilkan secara jelas untuk data yang belum tersedia.
- Tidak ada card kosong yang rusak.

**Priority:** P0

---

## HOME-02 | Menampilkan konsultasi terbaru

**Precondition**
- User sudah menyelesaikan minimal satu konsultasi.

**Step**
1. Buka Home.

**Expected Result**
- Konsultasi terbaru tampil.
- Tanggal/waktu dan status sesuai data aktual.
- Klik item mengarah ke record yang benar.

**Priority:** P1

---

## HOME-03 | Menampilkan resep terbaru

**Precondition**
- User telah menyelesaikan proses upload dan OCR resep.

**Step**
1. Buka Home.

**Expected Result**
- Resep terbaru tampil jika memang dirancang muncul di Home.
- Data yang ditampilkan sesuai prescription record user.

**Priority:** P1

---

# 7. Consultation Testing

## CON-01 | Membuat sesi konsultasi baru

**Precondition**
- User sudah login.

**Step**
1. Buka Home.
2. Klik `Start Consultation`.

**Expected Result**
- Session konsultasi baru dibuat.
- User masuk ke halaman konsultasi.
- Session memiliki identifier unik jika sistem menggunakannya.
- Tidak mengambil session milik user lain.

**Priority:** P0

---

## CON-02 | Memberikan izin microphone

**Precondition**
- User berada pada voice consultation.

**Step**
1. Ketika browser meminta permission microphone, pilih `Allow`.

**Expected Result**
- Voice interaction dapat digunakan.
- Status microphone tampil aktif jika UI menyediakan status tersebut.

**Priority:** P0

---

## CON-03 | Menolak izin microphone

**Precondition**
- User berada pada voice consultation.

**Step**
1. Saat permission muncul, pilih `Block` / `Deny`.

**Expected Result**
- Aplikasi tidak crash.
- User mendapatkan informasi bahwa microphone diperlukan.
- Tersedia tindakan untuk mencoba kembali.

**Priority:** P0

---

## CON-04 | Voice consultation normal

**Precondition**
- Microphone telah diizinkan.
- Session aktif.

**Test Data**
> "Saya demam dan batuk sejak tiga hari."

**Step**
1. Tekan / aktifkan voice interaction.
2. Ucapkan kalimat test data.
3. Tunggu sistem memproses input.

**Expected Result**
- Input diterima.
- Transcript muncul atau tersimpan sesuai desain.
- Sistem menghasilkan response.
- Response dapat diperdengarkan kembali.

**Priority:** P0

---

## CON-05 | Percakapan multi-turn

**Precondition**
- Session aktif.

**Test Data**
1. "Saya demam."
2. "Sudah tiga hari."
3. "Saya juga batuk."

**Step**
1. Sampaikan pesan pertama.
2. Tunggu response.
3. Sampaikan pesan kedua.
4. Tunggu response.
5. Sampaikan pesan ketiga.

**Expected Result**
- Ketiga pesan berada pada session yang sama.
- Sistem mempertahankan konteks percakapan.
- Informasi baru ditambahkan tanpa menghapus informasi sebelumnya.

**Priority:** P0

---

## CON-06 | Percakapan dengan jeda

**Precondition**
- Session aktif.

**Step**
1. Bicara beberapa detik.
2. Diam beberapa detik.
3. Lanjutkan bicara.

**Expected Result**
- Sistem tidak mengakhiri input secara prematur atau memecah kalimat secara tidak wajar sesuai perilaku yang dirancang.
- Percakapan tetap berjalan.

**Priority:** P1

---

## CON-07 | User mengakhiri konsultasi

**Precondition**
- Ada percakapan yang sudah berlangsung.

**Step**
1. Klik `End Consultation`.
2. Konfirmasi jika ada confirmation dialog.

**Expected Result**
- Session berubah dari active menjadi completed/completing.
- Proses pembuatan summary dimulai.
- User diarahkan ke hasil konsultasi ketika summary selesai.

**Priority:** P0

---

## CON-08 | User membatalkan proses keluar dari konsultasi

**Precondition**
- Konsultasi sedang aktif.

**Step**
1. Klik tombol keluar/back/close.
2. Ketika confirmation muncul, pilih `Cancel`.

**Expected Result**
- User tetap berada di consultation.
- Session tidak diakhiri.
- Percakapan tidak hilang.

**Priority:** P1

---

## CON-09 | Keluar dari halaman saat konsultasi masih berlangsung

**Precondition**
- Session aktif.

**Step**
1. Coba refresh atau menutup halaman.

**Expected Result**
- Sistem memberi warning jika fitur tersebut didukung.
- Session tidak diam-diam dianggap selesai kecuali memang policy aplikasi menentukan demikian.

**Priority:** P1

---

# 8. Health Context & Summary Testing

## SUM-01 | Membuat consultation summary dari sesi normal

**Precondition**
- User menyelesaikan konsultasi dengan informasi yang cukup.

**Step**
1. End Consultation.
2. Tunggu proses summary selesai.

**Expected Result**
Summary menampilkan informasi yang relevan, misalnya:
- keluhan utama;
- gejala;
- durasi;
- informasi relevan;
- preliminary assessment;
- evidence yang dibahas;
- next step.

**Priority:** P0

---

## SUM-02 | Informasi yang tidak disebutkan tidak boleh muncul sebagai fakta

**Precondition**
- User hanya mengatakan:
> "Saya demam."

**Step**
1. Lakukan konsultasi.
2. End Consultation.
3. Buka summary.

**Expected Result**
- `Symptoms` dapat berisi demam.
- Informasi yang tidak pernah disampaikan user tidak boleh muncul sebagai fakta.
- Field yang belum diketahui ditampilkan sebagai `Tidak disebutkan`, `Unknown`, atau `null` sesuai desain.

**Priority:** P0

---

## SUM-03 | Summary dapat dibuka kembali

**Precondition**
- Summary sudah selesai dibuat.

**Step**
1. Tutup halaman.
2. Buka kembali `Health Records`.
3. Pilih consultation record tadi.

**Expected Result**
- Summary yang sama dapat dibuka kembali.
- Data tidak hilang setelah refresh/re-login.

**Priority:** P0

---

## SUM-04 | Summary tidak berubah setelah user logout dan login kembali

**Precondition**
- User sudah memiliki summary.

**Step**
1. Logout.
2. Login kembali menggunakan akun Google yang sama.
3. Buka Health Records.

**Expected Result**
- Summary masih tersedia.
- Data sama dengan sebelum logout.

**Priority:** P0

---

# 9. Health Record Testing

## REC-01 | Consultation tersimpan sebagai health record

**Precondition**
- Consultation berhasil selesai.

**Step**
1. Buka `Health Records`.

**Expected Result**
- Consultation baru muncul sebagai record.
- Record memiliki identitas/tanggal/status yang benar.

**Priority:** P0

---

## REC-02 | Membuka detail health record

**Precondition**
- Minimal satu record tersedia.

**Step**
1. Buka `Health Records`.
2. Klik salah satu record.

**Expected Result**
- Detail record yang dipilih tampil.
- Tidak tertukar dengan record lain.

**Priority:** P0

---

## REC-03 | Filter / pencarian record

**Precondition**
- User memiliki beberapa record.

**Step**
1. Buka `Health Records`.
2. Masukkan kata kunci yang sesuai dengan salah satu record.

**Expected Result**
- Record relevan tampil.
- Record yang tidak relevan tidak mengganggu hasil.
- Jika tidak ditemukan, empty state ditampilkan.

**Priority:** P1

---

## REC-04 | Membuka record dengan parameter/id yang tidak valid

**Precondition**
- User login.

**Step**
1. Buka URL record yang memang menggunakan parameter/id.
2. Ubah id/parameter menjadi nilai acak seperti `dh23940`.

**Expected Result**
- Aplikasi tidak menampilkan record lain.
- Menampilkan `Not Found` / `Record tidak ditemukan`.
- Tidak membocorkan informasi internal database.

**Priority:** P0

---

## REC-05 | User tidak dapat melihat health record milik user lain

**Precondition**
- User A memiliki Record A.
- User B memiliki Record B.

**Step**
1. Login sebagai User A.
2. Dapatkan URL / identifier Record B.
3. Coba akses URL tersebut.

**Expected Result**
- Access ditolak.
- Record B tidak ditampilkan.
- Tidak ada data sensitif user B yang bocor.

**Priority:** P0

---

## REC-06 | Menghapus health record

**Precondition**
- User memiliki record.

**Step**
1. Buka detail record.
2. Klik `Delete`.
3. Konfirmasi penghapusan.

**Expected Result**
- Record hilang dari daftar.
- Record tidak dapat dibuka kembali sesuai deletion policy.
- Aplikasi memberikan pesan sukses.

**Priority:** P1

---

## REC-07 | Membatalkan penghapusan health record

**Precondition**
- User memiliki record.

**Step**
1. Klik `Delete`.
2. Pilih `Cancel`.

**Expected Result**
- Record tetap tersedia.

**Priority:** P1

---

# 10. Doctor Handoff Testing

## DOC-01 | Membuka summary untuk dibawa ke dokter

**Precondition**
- Consultation summary tersedia.

**Step**
1. Buka summary.
2. Klik `Share`, `View for Doctor`, atau CTA sejenis.

**Expected Result**
- Summary dalam format yang mudah dibaca tampil.
- Informasi penting terlihat jelas.
- Tidak ada informasi user lain yang ikut muncul.

**Priority:** P0

---

## DOC-02 | Membedakan assessment AI dan informasi dokter

**Precondition**
- Summary memiliki preliminary assessment.
- Doctor validation/diagnosis tersedia dalam prototype.

**Step**
1. Buka health record.
2. Periksa bagian preliminary assessment.
3. Periksa bagian doctor validation/diagnosis.

**Expected Result**
- Keduanya memiliki label sumber yang berbeda.
- Preliminary assessment tidak ditampilkan sebagai diagnosis final.
- Informasi dokter memiliki status/provenance sebagai informasi dari dokter.

**Priority:** P0

---

# 11. Prescription Upload Testing

## RX-01 | Membuka halaman prescription

**Precondition**
- User login.

**Step**
1. Klik `Prescription`.

**Expected Result**
- Halaman prescription terbuka.
- Tersedia opsi upload/take photo sesuai implementasi.

**Priority:** P0

---

## RX-02 | Upload foto resep dengan format valid

**Precondition**
- User berada pada halaman prescription.
- Memiliki file JPG/PNG valid.

**Step**
1. Klik `Upload Image`.
2. Pilih file resep.
3. Tunggu preview muncul.

**Expected Result**
- File berhasil diupload.
- Preview gambar tampil dengan benar.
- Tombol proses tersedia.

**Priority:** P0

---

## RX-03 | Upload file dengan format tidak didukung

**Step**
1. Klik `Upload Image`.
2. Pilih file dengan format yang tidak didukung.

**Expected Result**
- Upload ditolak.
- Muncul pesan format file tidak didukung.
- Aplikasi tidak crash.

**Priority:** P1

---

## RX-04 | Upload file melebihi ukuran maksimum

**Step**
1. Pilih file dengan ukuran di atas batas yang ditentukan.

**Expected Result**
- Upload ditolak.
- User mendapat informasi ukuran maksimum.

**Priority:** P1

---

## RX-05 | Menghapus foto sebelum OCR

**Precondition**
- Foto resep sudah dipilih.

**Step**
1. Klik `Remove` / `Delete Image`.

**Expected Result**
- Preview hilang.
- User dapat memilih file lain.
- Tidak ada proses OCR yang berjalan untuk file yang dihapus.

**Priority:** P1

---

# 12. Prescription OCR Testing

## OCR-01 | OCR resep dengan gambar jelas

**Precondition**
- Foto resep jelas.
- Seluruh resep terlihat.

**Test Data**
Gunakan resep contoh yang memang berisi nama obat dan aturan penggunaan.

**Step**
1. Upload resep.
2. Klik proses / scan.
3. Tunggu hasil OCR.

**Expected Result**
- OCR selesai.
- Nama obat yang terbaca ditampilkan.
- Informasi dosis/frekuensi/instruksi ditampilkan jika memang tertulis dan berhasil dikenali.
- Hasil dapat diperiksa oleh user.

**Priority:** P0

---

## OCR-02 | OCR resep dengan gambar buram

**Precondition**
- Siapkan foto resep yang sengaja blur.

**Step**
1. Upload foto.
2. Jalankan OCR.

**Expected Result**
- Sistem mendeteksi bahwa kualitas gambar tidak memadai atau hasil confidence rendah.
- User diminta mengunggah foto yang lebih jelas.
- Sistem tidak menampilkan hasil tebakan sebagai informasi pasti.

**Priority:** P0

---

## OCR-03 | OCR resep sebagian terbaca

**Precondition**
- Foto resep memiliki sebagian tulisan yang jelas dan sebagian tidak jelas.

**Step**
1. Upload foto.
2. Jalankan OCR.

**Expected Result**
- Field yang berhasil dibaca ditampilkan.
- Field yang tidak yakin ditandai `Needs Verification` / warning.
- Tidak semua field dipaksa terisi.

**Priority:** P0

---

## OCR-04 | OCR mengekstrak nama obat

**Step**
1. Upload resep dengan nama obat yang jelas.
2. Jalankan OCR.

**Expected Result**
- Nama obat yang terbaca muncul pada prescription item yang sesuai.

**Priority:** P0

---

## OCR-05 | OCR mengekstrak dosis

**Step**
1. Gunakan resep dengan dosis yang jelas.
2. Jalankan OCR.

**Expected Result**
- Dosis terbaca disimpan pada field dosis.
- Dosis tidak dipindahkan menjadi frekuensi atau field lain.

**Priority:** P0

---

## OCR-06 | OCR mengekstrak frekuensi

**Step**
1. Gunakan resep dengan instruksi seperti `3x sehari`.
2. Jalankan OCR.

**Expected Result**
- Frekuensi terbaca pada field frequency/instruction yang sesuai.

**Priority:** P0

---

## OCR-07 | OCR menangani lebih dari satu obat

**Precondition**
- Resep memiliki minimal dua item obat.

**Step**
1. Upload resep.
2. Jalankan OCR.

**Expected Result**
- Masing-masing obat dibuat sebagai prescription item terpisah.
- Dosis/instruksi tidak tercampur antar obat.

**Priority:** P0

---

## OCR-08 | OCR tidak menemukan obat

**Precondition**
- Upload gambar yang bukan resep atau tidak mengandung informasi obat yang dapat dibaca.

**Expected Result**
- Sistem memberi informasi bahwa tidak ada resep/obat yang dapat dikenali.
- Tidak membuat medication record palsu.

**Priority:** P0

---

# 13. Prescription Verification Testing

## VER-01 | User mengonfirmasi hasil OCR

**Precondition**
- OCR menghasilkan prescription items.

**Step**
1. Review hasil OCR.
2. Klik `Confirm`.

**Expected Result**
- Hasil berubah menjadi status verified/confirmed sesuai desain.
- Record tersimpan sebagai data yang telah diverifikasi user.

**Priority:** P0

---

## VER-02 | User mengedit hasil OCR

**Precondition**
- OCR menghasilkan kesalahan pada salah satu field.

**Step**
1. Klik `Edit`.
2. Ubah nilai salah, misalnya `Amoxcillin` menjadi `Amoxicillin`.
3. Simpan.

**Expected Result**
- Nilai baru tersimpan.
- Nilai tersebut tidak lagi menggunakan hasil OCR lama.
- Status/provenance menunjukkan bahwa data telah dikonfirmasi/diedit user jika sistem menyimpan provenance.

**Priority:** P0

---

## VER-03 | User melakukan retake photo

**Precondition**
- Hasil OCR tidak jelas.

**Step**
1. Klik `Retake Photo`.
2. Upload gambar baru.

**Expected Result**
- Sistem menjalankan OCR terhadap gambar baru.
- Hasil baru tidak tercampur dengan hasil gambar lama.

**Priority:** P1

---

## VER-04 | User menolak hasil OCR

**Precondition**
- OCR menghasilkan data yang diragukan.

**Step**
1. Pilih opsi reject/cancel/needs verification yang tersedia.

**Expected Result**
- Data tidak ditandai verified.
- User tetap dapat memperbaiki atau mengunggah ulang.

**Priority:** P1

---

# 14. Disease & Medication Record Testing

Tujuan bagian ini adalah memastikan resep tidak hanya dibaca, tetapi hasil yang sudah diproses menjadi bagian dari konteks kesehatan user untuk penggunaan selanjutnya.

## MED-01 | Menyimpan data obat dari resep

**Precondition**
- Prescription telah berhasil diproses.
- Hasil OCR telah diverifikasi.

**Step**
1. Konfirmasi hasil prescription.
2. Buka detail prescription.

**Expected Result**
- Medication record tersimpan.
- Nama obat sesuai hasil yang dikonfirmasi.
- Dosis dan instruksi sesuai data terverifikasi.

**Priority:** P0

---

## MED-02 | Menyimpan informasi penyakit/kondisi dari hasil konsultasi dan resep

**Precondition**
- User telah memiliki health record dan prescription record.
- Sistem memiliki field untuk kondisi/penyakit.

**Step**
1. Selesaikan konsultasi.
2. Simpan health summary.
3. Upload dan verifikasi prescription.
4. Buka health record.

**Expected Result**
- Informasi kondisi/penyakit yang memang diketahui dari sumber yang valid tersimpan sebagai bagian dari health context.
- Informasi diagnosis dokter, bila tersedia, dibedakan dari preliminary assessment AI.
- Obat yang diresepkan terhubung ke prescription/health journey yang sesuai.

**Priority:** P0

---

## MED-03 | Tidak mengubah obat menjadi diagnosis secara otomatis

**Precondition**
- Prescription memiliki satu atau beberapa obat.

**Step**
1. Buka medication record.
2. Periksa health condition / diagnosis yang tersimpan.

**Expected Result**
- Sistem tidak menyatakan sebuah penyakit sebagai diagnosis hanya berdasarkan nama obat.
- Diagnosis hanya berasal dari data yang memang memiliki sumber diagnosis yang sah, misalnya dokter.

**Priority:** P0

---

## MED-04 | Riwayat obat muncul pada health context berikutnya

**Precondition**
- User telah memverifikasi prescription sebelumnya.

**Step**
1. Mulai consultation baru.
2. Jika sistem menampilkan previous health context, periksa apakah medication history tersedia.

**Expected Result**
- Data obat sebelumnya tersedia sesuai policy produk.
- Data berasal dari akun user yang sama.
- Informasi tidak tercampur dengan user lain.

**Priority:** P1

---

# 15. Medication Information Testing

## MEDINFO-01 | Menampilkan informasi obat yang berhasil dikenali

**Precondition**
- Medication telah diverifikasi.

**Step**
1. Buka detail obat.

**Expected Result**
Informasi yang tersedia ditampilkan dengan jelas, misalnya:
- nama obat;
- dosis sesuai resep;
- frekuensi sesuai resep;
- instruksi sesuai resep;
- informasi umum mengenai kegunaan obat.

**Priority:** P0

---

## MEDINFO-02 | Obat tidak teridentifikasi

**Precondition**
- Prescription item tidak dapat dipetakan dengan yakin ke medication entity.

**Step**
1. Buka detail prescription item.

**Expected Result**
- Sistem menampilkan bahwa informasi belum dapat ditemukan/diverifikasi.
- Tidak mengarang nama atau khasiat obat.

**Priority:** P0

---

## MEDINFO-03 | Informasi obat tidak mengubah resep dokter

**Precondition**
- Resep dokter berisi dosis/frekuensi tertentu.

**Step**
1. Buka medication detail.
2. Bandingkan dengan prescription.

**Expected Result**
- Informasi dosis/frekuensi tetap sesuai resep.
- Sistem tidak mengganti regimen secara otomatis.
- Penjelasan tidak tampil sebagai rekomendasi prescribing baru.

**Priority:** P0

---

# 16. Search & Parameter Security Testing

## SEARCH-01 | Search pada health record dengan parameter valid

**Precondition**
- User memiliki beberapa health record.

**Step**
1. Buka `Health Records`.
2. Gunakan search dengan kata kunci yang sesuai.

**Expected Result**
- Hasil yang relevan ditampilkan.

**Priority:** P1

---

## SEARCH-02 | Search dengan parameter acak

**Step**
1. Buka `Health Records`.
2. Masukkan `dh23940`.

**Expected Result**
- Jika tidak ada record yang cocok, tampilkan empty state / `Tidak ditemukan`.
- Tidak menampilkan record random.

**Priority:** P0

---

## SEARCH-03 | Parameter record diganti dengan ID user lain

**Precondition**
- User A login.
- Diketahui ID record milik User B.

**Step**
1. Ubah parameter record menjadi ID milik User B.
2. Submit / akses URL.

**Expected Result**
- Data User B tidak ditampilkan.
- Sistem memberikan 403/404 atau pesan `Tidak ditemukan` sesuai security policy.

**Priority:** P0

---

## SEARCH-04 | Parameter prescription diganti dengan ID yang tidak valid

**Step**
1. Buka salah satu prescription.
2. Ubah parameter/identifier menjadi `dh23940`.

**Expected Result**
- Prescription tidak ditemukan.
- Tidak menampilkan prescription lain.
- Tidak ada stack trace / error internal yang muncul ke user.

**Priority:** P0

---

# 17. UI, Form & State Testing

## UI-01 | Loading state saat request berlangsung

**Step**
1. Jalankan consultation, summary, atau OCR.
2. Amati UI selama request berlangsung.

**Expected Result**
- Loading state ditampilkan.
- User mengetahui bahwa proses sedang berjalan.
- Tombol penting tidak dapat ditekan berkali-kali jika berpotensi membuat duplicate request.

**Priority:** P1

---

## UI-02 | Double click pada action utama

**Step**
1. Klik tombol `Start Consultation`, `Confirm`, atau `Upload` dua kali dengan cepat.

**Expected Result**
- Sistem tidak membuat duplicate session/record secara tidak sengaja.

**Priority:** P0

---

## UI-03 | Error message user-friendly

**Step**
1. Simulasikan kegagalan API.
2. Amati pesan yang muncul.

**Expected Result**
- User menerima pesan yang dapat dimengerti.
- Tidak menampilkan stack trace, SQL error, token, atau internal exception.

**Priority:** P0

---

## UI-04 | Long text tidak merusak layout

**Step**
1. Gunakan hasil konsultasi dengan transcript/summary panjang.
2. Buka detail record.

**Expected Result**
- Text wrap dengan benar.
- Tidak overflow.
- Tidak menutupi button atau navigation.

**Priority:** P1

---

## UI-05 | Responsive mobile

**Step**
1. Uji aplikasi pada viewport sekitar 375×812, 390×844, dan 430×932.
2. Buka Home, Consultation, Summary, Health Records, Prescription.

**Expected Result**
- Tidak ada horizontal overflow.
- Button dapat ditekan.
- Text terbaca.
- Navigation tidak bertumpuk.

**Priority:** P0

---

# 18. Network & Error Handling Testing

## ERR-01 | Network terputus saat consultation

**Step**
1. Mulai consultation.
2. Putuskan koneksi internet saat session aktif.

**Expected Result**
- User melihat status koneksi/error.
- Aplikasi tidak crash.
- Session tidak dianggap sukses jika request belum selesai.
- Tersedia mekanisme retry/reconnect jika memang dirancang.

**Priority:** P0

---

## ERR-02 | Network terputus saat membuat summary

**Step**
1. End consultation.
2. Putuskan koneksi sebelum summary selesai.

**Expected Result**
- Summary tidak dianggap berhasil jika belum selesai.
- User mendapatkan status error.
- User dapat retry tanpa membuat duplicate summary.

**Priority:** P0

---

## ERR-03 | Network terputus saat OCR

**Step**
1. Upload prescription.
2. Putuskan koneksi saat OCR berlangsung.

**Expected Result**
- Sistem memberikan status gagal / retry.
- Tidak menyimpan prescription result yang incomplete sebagai verified.

**Priority:** P0

---

## ERR-04 | Refresh saat proses berjalan

**Step**
1. Mulai OCR atau summary generation.
2. Refresh browser.

**Expected Result**
- Sistem menangani state dengan jelas.
- Tidak membuat duplicate processing.
- Jika proses sudah selesai di backend, result dapat diambil kembali.

**Priority:** P1

---

# 19. Security & Privacy Testing

## SEC-01 | User hanya dapat mengakses data miliknya

**Precondition**
- User A dan User B memiliki data masing-masing.

**Step**
1. Login sebagai User A.
2. Coba akses record, prescription, atau summary milik User B.

**Expected Result**
- Semua akses ditolak.
- Tidak ada data User B yang ditampilkan.

**Priority:** P0

---

## SEC-02 | Sensitive data tidak tampil pada URL

**Step**
1. Buka health record.
2. Periksa address bar.

**Expected Result**
- URL tidak mengandung transcript atau data kesehatan sensitif secara plaintext.
- Jika ada identifier, identifier tersebut tidak secara langsung mengungkap isi data.

**Priority:** P1

---

## SEC-03 | Health record disimpan secara terenkripsi

**Precondition**
- Implementasi menyatakan sensitive health record dienkripsi at rest.

**Step**
1. Inspect storage/database pada environment development/test.
2. Cari sample consultation record.

**Expected Result**
- Field sensitif tidak tersimpan sebagai plaintext jika encryption-at-rest/application-level encryption memang menjadi requirement.

**Priority:** P0

---

## SEC-04 | Prescription image diperlakukan sebagai data sensitif

**Step**
1. Upload prescription image.
2. Periksa storage/file access policy.

**Expected Result**
- File tidak dapat diakses oleh user lain.
- File tidak dipublikasikan sebagai public asset tanpa proteksi.

**Priority:** P0

---

## SEC-05 | Logout mengakhiri akses protected resource

**Precondition**
- User sudah login.

**Step**
1. Simpan state/session sebelum logout.
2. Logout.
3. Coba membuka health record melalui halaman/API yang sebelumnya dapat diakses.

**Expected Result**
- Akses ditolak setelah logout.

**Priority:** P0

---

# 20. Data Consistency Testing

## DATA-01 | Consultation hanya menghasilkan satu summary

**Precondition**
- Satu consultation session selesai.

**Step**
1. End consultation.
2. Refresh halaman beberapa kali.
3. Buka Health Records.

**Expected Result**
- Tidak ada duplicate summary untuk satu session kecuali memang dirancang memiliki versioning.

**Priority:** P0

---

## DATA-02 | Satu prescription tidak menjadi duplicate record akibat double submit

**Step**
1. Upload satu resep.
2. Klik process/confirm dua kali dengan cepat.
3. Buka Prescription History.

**Expected Result**
- Tidak ada duplicate prescription record yang tidak diinginkan.

**Priority:** P0

---

## DATA-03 | Edit OCR memperbarui data yang benar

**Precondition**
- Prescription memiliki item yang sudah di-OCR.

**Step**
1. Edit salah satu field.
2. Save.
3. Refresh.
4. Buka kembali prescription.

**Expected Result**
- Nilai yang diedit tetap tersimpan.
- Field lain tidak berubah.

**Priority:** P0

---

## DATA-04 | Record tetap konsisten setelah logout/login

**Step**
1. Buat consultation.
2. Buat prescription.
3. Logout.
4. Login kembali dengan akun yang sama.

**Expected Result**
- Semua data tetap tersedia.
- Relasi antar data tetap benar.

**Priority:** P0

---

# 21. End-to-End Testing

## E2E-01 | Full HealthTalk Journey — Happy Path

**Precondition**
- User memiliki akun Google valid.
- Semua service yang diperlukan aktif.

**Step**
1. Login menggunakan Google SSO.
2. Buka Home.
3. Klik `Start Consultation`.
4. Izinkan microphone.
5. Ucapkan:
   > "Saya demam dan batuk sejak tiga hari."
6. Lanjutkan beberapa turn percakapan.
7. Akhiri consultation.
8. Tunggu summary selesai.
9. Buka Health Record.
10. Buka summary.
11. Tampilkan summary untuk dibawa ke dokter.
12. Simulasikan doctor validation/diagnosis bila tersedia.
13. Buka Prescription.
14. Upload foto resep.
15. Jalankan OCR.
16. Review hasil OCR.
17. Edit salah satu field jika diperlukan.
18. Confirm prescription.
19. Buka medication information.
20. Kembali ke Health Records.

**Expected Result**
Seluruh journey berhasil:

```text
Login ✓
  ↓
Consultation ✓
  ↓
Health Context ✓
  ↓
Evidence Response ✓
  ↓
Summary ✓
  ↓
Secure Record ✓
  ↓
Doctor Validation ✓
  ↓
Prescription Upload ✓
  ↓
OCR ✓
  ↓
Verification ✓
  ↓
Medication Information ✓
```

Tidak ada context yang hilang, data antar tahap tetap terhubung, dan user dapat menyelesaikan journey tanpa workaround manual dari developer.

**Priority:** P0

---

## E2E-02 | Full Journey dengan OCR gagal

**Step**
1. Login.
2. Selesaikan consultation.
3. Generate summary.
4. Upload foto resep buram.
5. Jalankan OCR.
6. Retake photo.
7. Upload foto baru yang jelas.
8. Jalankan OCR kembali.
9. Verify result.

**Expected Result**
- Kegagalan OCR pertama tidak merusak session.
- Hasil OCR kedua tidak tercampur dengan hasil pertama.
- User dapat menyelesaikan proses.

**Priority:** P0

---

## E2E-03 | Full Journey dengan logout/login di tengah proses

**Step**
1. Login.
2. Selesaikan consultation.
3. Pastikan summary tersimpan.
4. Logout.
5. Login kembali menggunakan akun Google yang sama.
6. Buka Health Records.
7. Lanjutkan ke Prescription.

**Expected Result**
- Data consultation tetap tersedia.
- Data prescription yang sudah tersimpan tetap tersedia.
- User tetap berada pada account yang benar.

**Priority:** P0

---

## E2E-04 | Isolasi data antar-user

**Precondition**
- User A memiliki consultation dan prescription.
- User B memiliki consultation dan prescription.

**Step**
1. Login sebagai User A.
2. Periksa seluruh history.
3. Logout.
4. Login sebagai User B.
5. Periksa seluruh history.

**Expected Result**
- User A hanya melihat data A.
- User B hanya melihat data B.
- Tidak ada cross-user data leakage.

**Priority:** P0

---

# 22. Regression Testing

Regression dilakukan setelah perubahan besar pada fitur atau engine.

## REG-01 | Perubahan health intelligence tidak merusak consultation

**Step**
1. Jalankan consultation normal.
2. Generate summary.
3. Periksa health record.

**Expected Result**
- Workflow lama tetap berjalan.

**Priority:** P0

---

## REG-02 | Perubahan OCR tidak merusak prescription history

**Step**
1. Gunakan prescription lama.
2. Buka history.
3. Buka detail.

**Expected Result**
- Data lama tetap dapat dibuka.

**Priority:** P0

---

## REG-03 | Perubahan authentication tidak merusak akses history

**Step**
1. Login menggunakan Google SSO.
2. Buka Health Records.
3. Buka Prescription.

**Expected Result**
- Semua protected data tetap dapat diakses oleh owner.

**Priority:** P0

---

# 23. Acceptance Checklist

## Authentication

- [ ] Google SSO login berhasil.
- [ ] Tidak ada registration flow.
- [ ] First-time Google account dapat masuk langsung.
- [ ] Existing Google account masuk ke data yang sama.
- [ ] Logout berhasil.
- [ ] Protected page tidak dapat diakses setelah logout.

## Consultation

- [ ] Session dapat dibuat.
- [ ] Microphone permission bekerja.
- [ ] Voice input berhasil.
- [ ] Conversation multi-turn bekerja.
- [ ] User dapat mengakhiri consultation.
- [ ] Summary berhasil dibuat.

## Health Record

- [ ] Consultation tersimpan.
- [ ] Record dapat dibuka kembali.
- [ ] Record tetap ada setelah logout/login.
- [ ] Record user lain tidak dapat diakses.
- [ ] Parameter/id invalid tidak menampilkan data lain.

## Prescription

- [ ] Prescription dapat diupload.
- [ ] Format file divalidasi.
- [ ] OCR berhasil untuk gambar valid.
- [ ] OCR gagal dengan aman untuk gambar buruk.
- [ ] Multi-medication dapat diproses.
- [ ] User dapat memverifikasi hasil.
- [ ] User dapat mengedit hasil OCR.

## Health Context

- [ ] Data kondisi/penyakit memiliki sumber yang jelas.
- [ ] Doctor diagnosis dibedakan dari AI preliminary assessment.
- [ ] Medication record tersimpan.
- [ ] Prescription terhubung ke health journey yang tepat.

## Security

- [ ] User hanya dapat mengakses data sendiri.
- [ ] Sensitive data terlindungi.
- [ ] Prescription image tidak public.
- [ ] Logout memutus akses.

## End-to-End

- [ ] Full journey dapat diselesaikan tanpa intervention developer.
- [ ] Tidak ada data yang hilang antar tahap.
- [ ] Tidak ada duplicate record.
- [ ] Error dapat dipulihkan.

---

# 24. Bug Reporting Format

Setiap bug yang ditemukan sebaiknya dicatat dengan format berikut:

```text
Bug ID:

Title:

Module:

Severity:

Priority:

Environment:

Precondition:

Steps to Reproduce:
1.
2.
3.

Expected Result:

Actual Result:

Evidence:
- Screenshot
- Screen recording
- Console log (jika diperlukan)

Status:
OPEN / IN PROGRESS / FIXED / RETEST / CLOSED

Reporter:

Assignee:
```

---

# 25. Severity

| Severity | Definisi | Contoh |
|---|---|---|
| **S1 Critical** | Produk/journey utama tidak dapat digunakan atau ada security issue serius | User A dapat melihat health record User B |
| **S2 High** | Core feature gagal | Consultation tidak bisa dimulai, OCR tidak bisa memproses resep sama sekali |
| **S3 Medium** | Feature masih dapat digunakan dengan workaround | Summary salah menampilkan satu field |
| **S4 Low** | Minor visual/content issue | Alignment, typo, spacing |

---

# 26. Final End-to-End Definition of Done

HealthTalk dapat dinyatakan siap didemokan apabila user dapat menjalankan workflow berikut tanpa bantuan developer:

```text
Google SSO
   ↓
Home
   ↓
Start Consultation
   ↓
Voice Conversation
   ↓
Health Understanding
   ↓
Evidence-Based Response
   ↓
End Consultation
   ↓
Consultation Summary
   ↓
Secure Health Record
   ↓
Doctor Validation
   ↓
Prescription Upload
   ↓
OCR
   ↓
Verification
   ↓
Medication Information
   ↓
Health History
```

Selain happy path, minimal scenario berikut harus lulus:

```text
✓ Logout / re-login
✓ Protected route
✓ Cross-user access denial
✓ Invalid record parameter
✓ OCR blurry image
✓ OCR partial result
✓ Network failure
✓ Duplicate submission prevention
✓ Data persistence
✓ Responsive mobile UI
```

**Final principle:**

> **Test the product as a user, then test the boundaries as an attacker, then test the complete journey as one system.**
