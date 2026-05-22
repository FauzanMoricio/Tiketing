# Tiket - Project Management App Guide

Dokumen ini berisi panduan lengkap mengenai teknologi, instruksi instalasi, struktur folder, skema database, dan perintah penting dalam proyek **Tiket**.

---

## 🛠️ Teknologi Yang Digunakan (Tech Stack)

Aplikasi ini dibangun menggunakan kombinasi teknologi modern berikut:
*   **Framework Utama**: Next.js 16 (menggunakan App Router & Turbopack untuk kompilasi super cepat)
*   **Library UI**: React 19 (React Server Components, Server Actions)
*   **Bahasa Pemrograman**: TypeScript
*   **Database ORM**: Prisma ORM v6 (menghubungkan Next.js ke PostgreSQL)
*   **Database**: PostgreSQL
*   **Autentikasi**: NextAuth.js v5 Beta (mendukung login Email/Password & Google/GitHub OAuth)
*   **Styling & UI**: Tailwind CSS v4 & Shadcn UI (untuk desain premium, konsisten, dan responsif)
*   **State Management**: Zustand (untuk state lokal Kanban drag-and-drop & status Sidebar)

---

## ⚙️ Persiapan & Langkah Instalasi (Setup & Installation)

Jika Anda baru saja mengunduh (*download*) berkas proyek ini, ikuti langkah-langkah di bawah ini untuk menjalankannya secara lokal:

### 1. Prasyarat Sistem (Prerequisites)
Pastikan komputer Anda sudah terinstal:
*   **Node.js** (Versi 20 ke atas direkomendasikan)
*   **PostgreSQL** (Server database harus dalam kondisi berjalan)

### 2. Langkah Instalasi

1.  **Ekstrak / Kloning** berkas kode proyek Tiket ke komputer Anda.
2.  **Instal Dependensi**: Buka terminal di root folder proyek, lalu jalankan:
    ```bash
    npm install
    ```
3.  **Buat File Environment (`.env`)**:
    *   Duplikat file `.env` (atau buat file baru bernama `.env` di root folder proyek).
    *   Atur variabel lingkungan berikut:
        ```env
        # Hubungkan ke database PostgreSQL lokal Anda (format: postgresql://username:password@localhost:5432/nama_db)
        DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/tiket_db"
        
        # Kunci rahasia untuk enkripsi sesi login (buat string acak bebas)
        AUTH_SECRET="kunci-acak-rahasia-sesi-anda-12345"
        
        # (Opsional) OAuth jika ingin fitur login Google/GitHub aktif:
        GOOGLE_CLIENT_ID="google_client_id_anda"
        GOOGLE_CLIENT_SECRET="google_client_secret_anda"
        GITHUB_CLIENT_ID="github_client_id_anda"
        GITHUB_CLIENT_SECRET="github_client_secret_anda"
        ```
4.  **Singkronisasi Skema Database**:
    Jalankan perintah berikut agar Prisma membuat tabel-tabel di database PostgreSQL Anda secara otomatis:
    ```bash
    npx prisma db push
    ```
5.  **Pengisian Data Awal (Seed Data)**:
    Masukkan pengguna bawaan (`moris@tiket.dev` & `fauzan@tiket.dev`) beserta data sampel Workspace ke database dengan menjalankan:
    ```bash
    npx prisma db seed
    ```
6.  **Jalankan Server Development**:
    Aplikasi siap digunakan! Jalankan perintah berikut untuk menyalakan server lokal:
    ```bash
    npm run dev
    ```
    Buka browser Anda dan akses: **`http://localhost:3000`**

---

## 📁 Peta Struktur Folder & File

### 1. `src/actions/` (Server Actions / API Backend)
Berisi fungsi *server-side* untuk manipulasi data langsung ke PostgreSQL melalui Prisma.
*   `admin.actions.ts`: Statistik admin, manipulasi akun user, update role, hapus user.
*   `auth.actions.ts`: Fungsi registrasi, login, logout, reset password, verifikasi email.
*   `discussion.actions.ts`: CRUD diskusi & reply komentar di forum internal proyek.
*   `file.actions.ts`: Pengelolaan folder & berkas proyek (unggah, buat folder, hapus).
*   `milestone.actions.ts`: CRUD pencapaian target/milestone proyek.
*   `project.actions.ts`: CRUD proyek, inisialisasi status Kanban bawaan, manajemen anggota proyek.
*   `space.actions.ts`: CRUD space (grup proyek) di dalam workspace.
*   `status.actions.ts`: CRUD kolom status Kanban.
*   `ticket.actions.ts`: CRUD tiket tugas, pemindahan kolom, penambahan lampiran, komentar, dan aktivitas log.
*   `user.actions.ts`: Pengambilan profil user, pencarian user, update setelan profil.
*   `workspace.actions.ts`: CRUD workspace, undang/hapus anggota workspace, ubah role anggota.

### 2. `src/app/` (Routing & Layouts)
Menggunakan Next.js App Router.
*   `layout.tsx` & `page.tsx`: Entry point utama aplikasi & dashboard workspace.
*   `globals.css`: File styling Tailwind CSS / vanilla CSS.
*   `middleware.ts`: Middleware autentikasi NextAuth (melindungi rute berbayar/privat).
*   **`(auth)/`**: Halaman login, register, reset password, dan verifikasi email.
*   **`admin/`**: Panel dashboard khusus admin untuk memantau pengguna dan statistik.
*   **`settings/`**: Pengaturan profil pengguna dan konfigurasi workspace.
*   **`workspace/[workspaceId]/`**:
    *   `page.tsx`: Halaman utama workspace (menampilkan daftar project di dalamnya).
    *   **`[spaceId]/[projectId]/`**:
        *   `page.tsx`: Papan Kanban utama proyek.
        *   `activity/`: Halaman audit logs riwayat perubahan tiket proyek.
        *   `discussion/`: Halaman forum diskusi proyek.
        *   `files/`: Halaman explorer file dan berkas proyek.
        *   `milestone/`: Halaman pengaturan milestone proyek.
        *   `reports/`: Halaman dashboard visual status & diagram penyebaran prioritas tiket.
        *   `timeline/`: Halaman Gantt Chart (tampilan kalender durasi tiket).
        *   `ticket/[ticketId]/`: Halaman detail tiket spesifik.

### 3. `src/features/` (Logika & Komponen Fitur)
Modul-modul fungsionalitas UI utama:
*   **`activity/`** -> `activity-stream.tsx`: List aktivitas log detail tiket.
*   **`discussion/`** -> `discussion-board.tsx`: Forum postingan diskusi proyek.
*   **`files/`** -> `files-explorer.tsx`: Manajemen berkas & pembuatan folder terstruktur.
*   **`kanban/`** -> `kanban-board.tsx`, `kanban-column.tsx`, `ticket-card.tsx`: Logika drag-and-drop tiket.
*   **`milestone/`** -> `milestone-view.tsx`: List target waktu/milestone.
*   **`project/`** -> `project-list.tsx`: Komponen manajemen project.
*   **`reports/`** -> `reports-dashboard.tsx`: Diagram persentase status & prioritas.
*   **`timeline/`** -> `timeline-view.tsx`: Kalender Gantt chart, navigasi bulan, drag/resize rentang waktu.

### 4. `src/components/` (UI & Komponen Global)
*   **`ui/`**: Komponen atom dasar dari Shadcn UI (Button, Input, Card, Dialog, dll.).
*   **`layout/`** -> `sidebar.tsx`, `top-navbar.tsx`: Navigasi utama aplikasi.
*   **`modals/`** -> `create-workspace-modal.tsx`, `create-project-modal.tsx`, dll. (diakses via modal store).
*   **`admin/`** & **`auth/`**: Komponen spesifik halaman panel admin dan autentikasi.
*   **`shared/`**: Komponen umum seperti input dialog, konfirmasi hapus, dll.

### 5. `src/store/` (State Management - Zustand)
*   `kanban-store.ts`: Menyimpan state tiket Kanban secara global agar drag-and-drop responsif secara lokal sebelum sinkronisasi backend.
*   `sidebar-store.ts`: Mengelola kondisi sidebar (ciut/lebar) di layar desktop.

### 6. `src/lib/` (Utilitas Global)
*   `prisma.ts`: Inisialisasi klien database Prisma (Singleton pattern).
*   `constants.ts`: Daftar ikon bawaan, warna default, dan status bawaan (`DEFAULT_STATUSES`).
*   `ticket-generation.ts`: Pengaman nomor seri tiket (e.g. `WEB-001`) agar tidak bentrok via transaksi database.
*   `tokens.ts`: Pembuat token acak untuk verifikasi email & 2FA.
*   `utils.ts`: Fungsi `cn` (Tailwind merge) dan `generateShortId()` (pembuat ID 5 karakter).

### 7. `src/types/`
*   `index.ts`: Definisi type TypeScript global untuk Workspace, Space, Project, Status, dan Ticket.

---

## 🗄️ Model Database (Prisma Schema)

Hubungan entitas utama dalam PostgreSQL:

*   **`User`**: Data pengguna. Memiliki relasi ke Workspace (anggota) dan Ticket (pembuat/penerima).
*   **`Workspace`** *(ID: VarChar 5)*: Lingkungan kerja utama. Memiliki banyak `Space` dan `WorkspaceMember`.
*   **`Space`** *(ID: VarChar 5)*: Kategori kerja di dalam Workspace. Memiliki banyak `Project`.
*   **`Project`** *(ID: VarChar 5)*: Wadah tugas. Berisi `Status`, `Ticket`, `Milestone`, `Discussion`, dan `Folder`. Memiliki prefix tiket sendiri (contoh: `WEB`).
*   **`Status`**: Kolom status Kanban (Backlog, To Do, In Progress, Review, Done).
*   **`Ticket`**: Kartu tugas utama. Berelasi dengan Project, Status, User (assignee), dan Milestone.
*   **`Comment` / `Attachment` / `TicketActivity`**: Data interaksi pada setiap tiket.

---

## 🔗 Sistem ID Unik (Short ID)

Untuk merapikan URL agar tidak terlalu panjang, `workspaceId`, `spaceId`, dan `projectId` menggunakan **kode unik 5 karakter** (contoh URL: `/workspace/moris/dev01/web01/ticket/WEB-005`):
*   ID dibuat acak menggunakan fungsi helper `generateShortId()` di `src/lib/utils.ts`.
*   Terdapat proteksi duplikasi (*collision check*) saat data baru disimpan.

---

## 🚀 Perintah Penting (Command Line)

Jalankan perintah ini di root terminal proyek:

*   **Menjalankan Server Dev**:
    ```bash
    npm run dev
    ```
*   **Pembersihan & Reset Database**:
    ```bash
    npx prisma db push --force-reset
    ```
*   **Mengisi Data Awal (Seeding)**:
    ```bash
    npx prisma db seed
    ```
*   **Membuka GUI Database (Studio)**:
    ```bash
    npx prisma studio
    ```
*   **Verifikasi Kode (Linting)**:
    ```bash
    npm run lint
    ```
