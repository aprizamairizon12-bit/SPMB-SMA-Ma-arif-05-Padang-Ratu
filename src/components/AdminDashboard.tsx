import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Users,
  UserCheck,
  FileCheck2,
  CheckSquare,
  MessageSquareWarning,
  Award,
  Printer,
  FileSpreadsheet,
  Download,
  PieChart,
  UserCog,
  Building2,
  LayoutTemplate,
  FormInput,
  FolderUp,
  CalendarClock,
  Image as ImageIcon,
  Megaphone,
  PhoneCall,
  ShieldAlert,
  DatabaseBackup,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  Upload,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  SchoolSpmbConfig,
  ApplicationRecord,
  ApplicationStatus,
  AdminUserRecord,
  ActivityLogRecord,
  UploadedDocumentData,
  DocVerifyStatus,
} from '../types/spmb';
import {
  saveSchoolSpmbConfig,
  updateApplicationAndLookupByAdmin,
  deleteApplicationByAdmin,
  saveAdminUserRecord,
  seedSampleApplicants,
} from '../services/spmbService';
import { sendPasswordResetEmail, auth, processAndUploadDocument } from '../firebase';
import { PrintDocumentModal } from './PrintDocumentModal';

interface AdminDashboardProps {
  user: User;
  config: SchoolSpmbConfig;
  onConfigChange: (newConfig: SchoolSpmbConfig) => void;
  applications: ApplicationRecord[];
  admins: AdminUserRecord[];
  activityLogs: ActivityLogRecord[];
  onBackToPublic: () => void;
  onLogout: () => void;
}

type AdminMenuId =
  | '1_statistik'
  | '2_pendaftar'
  | '3_biodata'
  | '4_verifikasi'
  | '5_status'
  | '6_catatan'
  | '7_pengumuman_hasil'
  | '8_cetak_bukti'
  | '9_cetak_formulir'
  | '10_ekspor'
  | '11_laporan'
  | '12_akun'
  | '13_pengaturan_sekolah'
  | '14_halaman_web'
  | '15_formulir'
  | '16_dokumen'
  | '17_jadwal'
  | '18_banner_galeri'
  | '19_pengumuman_info'
  | '20_kontak'
  | '21_keamanan'
  | '22_cadangan';

const MENU_ITEMS: { id: AdminMenuId; number: string; label: string; group: string; icon: React.FC<{ className?: string }> }[] = [
  { id: '1_statistik', number: '01', label: 'Dashboard Statistik', group: 'Data & Seleksi SPMB', icon: BarChart3 },
  { id: '2_pendaftar', number: '02', label: 'Data Seluruh Pendaftar', group: 'Data & Seleksi SPMB', icon: Users },
  { id: '3_biodata', number: '03', label: 'Detail Biodata Calon Murid', group: 'Data & Seleksi SPMB', icon: UserCheck },
  { id: '4_verifikasi', number: '04', label: 'Verifikasi Berkas', group: 'Data & Seleksi SPMB', icon: FileCheck2 },
  { id: '5_status', number: '05', label: 'Status Pendaftaran', group: 'Data & Seleksi SPMB', icon: CheckSquare },
  { id: '6_catatan', number: '06', label: 'Catatan Perbaikan Data', group: 'Data & Seleksi SPMB', icon: MessageSquareWarning },
  { id: '7_pengumuman_hasil', number: '07', label: 'Pengumuman Hasil Seleksi', group: 'Data & Seleksi SPMB', icon: Award },
  { id: '8_cetak_bukti', number: '08', label: 'Cetak Bukti Pendaftaran', group: 'Dokumen & Laporan', icon: Printer },
  { id: '9_cetak_formulir', number: '09', label: 'Cetak Formulir Pendaftaran', group: 'Dokumen & Laporan', icon: FileSpreadsheet },
  { id: '10_ekspor', number: '10', label: 'Ekspor Excel dan CSV', group: 'Dokumen & Laporan', icon: Download },
  { id: '11_laporan', number: '11', label: 'Laporan Statistik', group: 'Dokumen & Laporan', icon: PieChart },
  { id: '12_akun', number: '12', label: 'Manajemen Akun Pengguna', group: 'Pengaturan & Sistem', icon: UserCog },
  { id: '13_pengaturan_sekolah', number: '13', label: 'Pengaturan Sekolah (Lengkap)', group: 'Pengaturan & Sistem', icon: Building2 },
  { id: '14_halaman_web', number: '14', label: 'Pengaturan Halaman Website', group: 'Pengaturan & Sistem', icon: LayoutTemplate },
  { id: '15_formulir', number: '15', label: 'Pengaturan Formulir', group: 'Pengaturan & Sistem', icon: FormInput },
  { id: '16_dokumen', number: '16', label: 'Pengaturan Dokumen Persyaratan', group: 'Pengaturan & Sistem', icon: FolderUp },
  { id: '17_jadwal', number: '17', label: 'Pengaturan Jadwal SPMB', group: 'Pengaturan & Sistem', icon: CalendarClock },
  { id: '18_banner_galeri', number: '18', label: 'Pengaturan Banner & Galeri', group: 'Pengaturan & Sistem', icon: ImageIcon },
  { id: '19_pengumuman_info', number: '19', label: 'Pengaturan Pengumuman', group: 'Pengaturan & Sistem', icon: Megaphone },
  { id: '20_kontak', number: '20', label: 'Pengaturan Kontak Sekolah', group: 'Pengaturan & Sistem', icon: PhoneCall },
  { id: '21_keamanan', number: '21', label: 'Pengaturan Akses & Keamanan', group: 'Pengaturan & Sistem', icon: ShieldAlert },
  { id: '22_cadangan', number: '22', label: 'Cadangan Data & Panduan Hosting', group: 'Pengaturan & Sistem', icon: DatabaseBackup },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  user,
  config,
  onConfigChange,
  applications,
  admins,
  activityLogs,
  onBackToPublic,
  onLogout,
}) => {
  const [activeMenu, setActiveMenu] = useState<AdminMenuId>('1_statistik');
  const [draftConfig, setDraftConfig] = useState<SchoolSpmbConfig>(config);
  const [selectedRegNumber, setSelectedRegNumber] = useState<string>(
    applications[0]?.regNumber || ''
  );

  // Search, Filter, Sort, Pagination for Applicants
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'name_asc' | 'reg_asc'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Feedback & Busy states
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmDeleteReg, setConfirmDeleteReg] = useState<string | null>(null);
  const [printModalState, setPrintModalState] = useState<{
    mode: 'receipt' | 'full_form';
    app: ApplicationRecord;
  } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<UploadedDocumentData | null>(null);

  // Sub-forms for adding dynamic items
  const [newAdminForm, setNewAdminForm] = useState({
    uid: '',
    email: '',
    displayName: '',
    role: 'Verifikator' as AdminUserRecord['role'],
  });
  const [newFieldForm, setNewFieldForm] = useState({
    label: '',
    group: 'student' as 'student' | 'parent' | 'school',
    type: 'text' as 'text' | 'number' | 'date' | 'select' | 'textarea',
    required: false,
  });
  const [newDocReqForm, setNewDocReqForm] = useState({
    label: '',
    description: '',
    required: false,
  });
  const [newSectionForm, setNewSectionForm] = useState({
    title: '',
    subtitle: '',
    customContent: '',
  });
  const [newScheduleForm, setNewScheduleForm] = useState({
    phaseName: '',
    dateRange: '',
    description: '',
  });
  const [newAnnouncementForm, setNewAnnouncementForm] = useState({
    title: '',
    category: 'Pengumuman Panitia',
    date: new Date().toISOString().split('T')[0],
    content: '',
    isImportant: true,
  });
  const [newGalleryForm, setNewGalleryForm] = useState({
    title: '',
    category: 'Kegiatan & Prestasi' as const,
    mediaType: 'image' as 'image' | 'video',
    url: '',
    caption: '',
  });

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const selectedApplicant = useMemo(() => {
    return (
      applications.find((a) => a.regNumber === selectedRegNumber) ||
      applications[0] ||
      null
    );
  }, [applications, selectedRegNumber]);

  const [editableApplicant, setEditableApplicant] = useState<ApplicationRecord | null>(null);

  React.useEffect(() => {
    if (selectedApplicant) {
      setEditableApplicant(selectedApplicant);
    }
  }, [selectedApplicant]);

  // Filtered and Sorted Applicants
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
        if (genderFilter !== 'ALL' && app.gender !== genderFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            app.fullName.toLowerCase().includes(q) ||
            app.regNumber.toLowerCase().includes(q) ||
            app.nisn.toLowerCase().includes(q) ||
            app.originSchool.toLowerCase().includes(q) ||
            app.village.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
        if (sortBy === 'reg_asc') return a.regNumber.localeCompare(b.regNumber);
        return b.regNumber.localeCompare(a.regNumber);
      });
  }, [applications, statusFilter, genderFilter, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = applications.length;
    const menunggu = applications.filter((a) => a.status === 'Menunggu Verifikasi').length;
    const perbaikan = applications.filter((a) => a.status === 'Perlu Perbaikan Data').length;
    const terverifikasi = applications.filter((a) => a.status === 'Terverifikasi').length;
    const diterima = applications.filter((a) => a.status === 'Diterima').length;
    const tidakDiterima = applications.filter((a) => a.status === 'Tidak Diterima').length;
    const laki = applications.filter((a) => a.gender === 'Laki-laki').length;
    const perempuan = applications.filter((a) => a.gender === 'Perempuan').length;

    const byProgram: Record<string, number> = {};
    const bySchool: Record<string, number> = {};
    applications.forEach((a) => {
      byProgram[a.selectedProgram] = (byProgram[a.selectedProgram] || 0) + 1;
      bySchool[a.originSchool] = (bySchool[a.originSchool] || 0) + 1;
    });

    return {
      total,
      menunggu,
      perbaikan,
      terverifikasi,
      diterima,
      tidakDiterima,
      laki,
      perempuan,
      byProgram,
      bySchool,
    };
  }, [applications]);

  const handleSaveConfigToFirestore = async (
    updatedConfig: SchoolSpmbConfig = draftConfig,
    summary = 'Menyimpan pembaruan konfigurasi sekolah & SPMB'
  ) => {
    setIsSaving(true);
    try {
      await saveSchoolSpmbConfig(updatedConfig, summary);
      onConfigChange(updatedConfig);
      setDraftConfig(updatedConfig);
      showToast(
        'success',
        'Perubahan berhasil disimpan ke Cloud Firestore dan langsung tampil di Halaman Publik.'
      );
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUploadForConfig = async (
    fieldKey:
      | 'logoUrl'
      | 'principalPhotoUrl'
      | 'staffPhotoUrl'
      | 'buildingPhotoUrl'
      | 'classroomPhotoUrl'
      | 'bannerImageUrl',
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    setIsSaving(true);
    try {
      const uploaded = await processAndUploadDocument(files[0], 'SCHOOL_ASSET', fieldKey);
      const next = { ...draftConfig, [fieldKey]: uploaded.dataUrl };
      setDraftConfig(next);
      await saveSchoolSpmbConfig(next, `Mengubah foto/gambar ${fieldKey}`);
      onConfigChange(next);
      showToast('success', 'Gambar berhasil diunggah dan diperbarui.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateApplicant = async (
    app: ApplicationRecord,
    updates: Partial<ApplicationRecord>,
    label: string
  ) => {
    setIsSaving(true);
    try {
      await updateApplicationAndLookupByAdmin(app, updates, label);
      showToast('success', `Data "${app.fullName}" berhasil diperbarui di database.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal memperbarui data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApplicant = async (app: ApplicationRecord) => {
    setIsSaving(true);
    try {
      await deleteApplicationByAdmin(app);
      setConfirmDeleteReg(null);
      showToast('success', `Data pendaftar ${app.fullName} (${app.regNumber}) telah dihapus.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'No_Pendaftaran',
      'Nama_Lengkap',
      'NIK',
      'NISN',
      'Jenis_Kelamin',
      'Tempat_Lahir',
      'Tanggal_Lahir',
      'Agama',
      'Telepon_Murid',
      'Alamat',
      'Desa',
      'Kecamatan',
      'Kabupaten',
      'Provinsi',
      'Nama_Ayah',
      'Nama_Ibu',
      'Pekerjaan_Ortu',
      'HP_Ortu',
      'Sekolah_Asal',
      'NPSN_Asal',
      'Tahun_Lulus',
      'Program_Pilihan',
      'Status_Seleksi',
      'Catatan_Panitia',
      'Tanggal_Daftar',
    ];
    const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = applications.map((a) =>
      [
        a.regNumber,
        a.fullName,
        a.nik,
        a.nisn,
        a.gender,
        a.birthPlace,
        a.birthDate,
        a.religion,
        a.phone,
        a.address,
        a.village,
        a.district,
        a.regency,
        a.province,
        a.fatherName,
        a.motherName,
        a.parentJob,
        a.parentPhone,
        a.originSchool,
        a.originNpsn,
        a.graduationYear,
        a.selectedProgram,
        a.status,
        a.revisionNotes,
        a.submittedDate,
      ]
        .map(escapeCsv)
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_SPMB_${config.shortName.replace(/\s+/g, '_')}_2027_2028.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Berkas CSV berhasil diunduh.');
  };

  const handleExportExcel = () => {
    const tableRows = applications
      .map(
        (a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${a.regNumber}</td>
        <td>${a.fullName}</td>
        <td>'${a.nik}</td>
        <td>'${a.nisn}</td>
        <td>${a.gender}</td>
        <td>${a.birthPlace}, ${a.birthDate}</td>
        <td>${a.religion}</td>
        <td>'${a.phone}</td>
        <td>${a.address}, ${a.village}, ${a.district}, ${a.regency}</td>
        <td>${a.fatherName}</td>
        <td>${a.motherName}</td>
        <td>${a.parentJob}</td>
        <td>'${a.parentPhone}</td>
        <td>${a.originSchool}</td>
        <td>${a.graduationYear}</td>
        <td>${a.selectedProgram}</td>
        <td>${a.status}</td>
        <td>${a.revisionNotes}</td>
        <td>${a.submittedDate}</td>
      </tr>`
      )
      .join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8" /></head>
      <body>
        <h3>REKAPITULASI PENDAFTAR SPMB ${config.schoolName.toUpperCase()} TA ${config.academicYear}</h3>
        <table border="1">
          <thead>
            <tr style="background:#064E3B;color:#FFFFFF;font-weight:bold;">
              <th>No</th><th>No. Pendaftaran</th><th>Nama Lengkap</th><th>NIK</th><th>NISN</th>
              <th>JK</th><th>TTL</th><th>Agama</th><th>HP Murid</th><th>Alamat Lengkap</th>
              <th>Nama Ayah</th><th>Nama Ibu</th><th>Pekerjaan Ortu</th><th>HP Ortu</th>
              <th>SMP/MTs Asal</th><th>Tahun Lulus</th><th>Program Pilihan</th><th>Status</th>
              <th>Catatan</th><th>Tgl Daftar</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Excel_SPMB_${config.shortName.replace(/\s+/g, '_')}_2027_2028.xls`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Berkas Microsoft Excel (.xls) berhasil diunduh.');
  };

  const handleBackupJsonExport = () => {
    const backupObject = {
      exportedAt: new Date().toISOString(),
      schoolName: config.schoolName,
      academicYear: config.academicYear,
      config: draftConfig,
      applications,
    };
    const blob = new Blob([JSON.stringify(backupObject, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cadangan_Penuh_SPMB_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Cadangan data JSON berhasil diunduh.');
  };

  const handleBackupJsonRestore = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const text = await files[0].text();
      const parsed = JSON.parse(text);
      if (parsed.config && parsed.config.schoolName) {
        await handleSaveConfigToFirestore(
          parsed.config,
          'Memulihkan konfigurasi sekolah & SPMB dari berkas cadangan JSON'
        );
      } else {
        showToast('error', 'Format berkas cadangan JSON tidak valid.');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal membaca berkas JSON.');
    }
  };

  const currentMenuMeta = MENU_ITEMS.find((m) => m.id === activeMenu) || MENU_ITEMS[0];

  const renderApplicantSelectorBar = () => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600">
          Pilih Calon Murid Pendaftar yang Dikelola:
        </label>
        <p className="text-xs text-slate-500">
          Total {applications.length} calon murid terdaftar di Cloud Firestore
        </p>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={selectedApplicant?.regNumber || ''}
          onChange={(e) => setSelectedRegNumber(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-emerald-700 focus:outline-none min-w-[260px]"
        >
          {applications.length === 0 ? (
            <option value="">-- Belum ada pendaftar --</option>
          ) : (
            applications.map((a) => (
              <option key={a.regNumber} value={a.regNumber}>
                {a.regNumber} — {a.fullName} ({a.status})
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAF8] text-slate-900">
      {/* Sidebar Navigation (22 Menus) */}
      <aside className="w-72 bg-emerald-950 text-emerald-50 flex flex-col border-r border-emerald-900 shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="p-5 border-b border-emerald-900 flex items-center gap-3">
          <img
            src={config.logoUrl}
            alt="Logo"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-lg bg-white p-1 object-contain shrink-0"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-400 truncate">
              PANEL ADMIN SPMB {config.academicYear}
            </p>
            <p className="text-sm font-bold text-white truncate">{config.shortName}</p>
          </div>
        </div>

        <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
          {['Data & Seleksi SPMB', 'Dokumen & Laporan', 'Pengaturan & Sistem'].map((groupName) => (
            <div key={groupName}>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-emerald-400/90 mb-2">
                {groupName}
              </p>
              <div className="space-y-0.5">
                {MENU_ITEMS.filter((item) => item.group === groupName).map((item) => {
                  const Icon = item.icon;
                  const active = activeMenu === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveMenu(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                        active
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-emerald-100 hover:bg-emerald-900/80 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="font-mono-tabular opacity-75">{item.number}.</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-emerald-900 space-y-2 bg-emerald-950">
          <div className="text-xs text-emerald-200 truncate">
            Admin: <span className="font-semibold text-white">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToPublic}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Halaman Publik</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-950/80 text-red-200 rounded-lg hover:bg-red-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract for Workspace */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
            <span className="font-semibold text-slate-900 whitespace-nowrap">
              Dashboard Panitia
            </span>
            <span aria-hidden="true">/</span>
            <span className="text-slate-500 whitespace-nowrap">{currentMenuMeta.group}</span>
            <span aria-hidden="true">/</span>
            <span className="font-bold text-emerald-900 truncate">
              {currentMenuMeta.number}. {currentMenuMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onBackToPublic}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Lihat Website Publik
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveConfigToFirestore(draftConfig)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-900 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </header>

        {/* Notification Toast */}
        {toastMessage && (
          <div
            className={`mx-6 mt-4 p-4 rounded-xl border flex items-center justify-between gap-4 text-sm ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{toastMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-xs underline cursor-pointer shrink-0"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Workspace Content */}
        <main className="p-6 max-w-6xl w-full mx-auto space-y-6">
          {/* 1. DASHBOARD STATISTIK */}
          {activeMenu === '1_statistik' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-6">
                <div>
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Ringkasan Eksekutif SPMB {config.academicYear}
                  </p>
                  <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
                    {config.schoolName}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Status Pendaftaran:{' '}
                    <span className="font-semibold text-slate-900">
                      {config.registrationOpen ? 'Dibuka' : 'Ditutup'}
                    </span>{' '}
                    · Biaya Pendaftaran: <span className="font-semibold text-emerald-800">GRATIS 100%</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      try {
                        const count = await seedSampleApplicants(config);
                        showToast(
                          'success',
                          `Berhasil memuat ${count} data pendaftar contoh ke Cloud Firestore.`
                        );
                      } catch (err) {
                        showToast(
                          'error',
                          err instanceof Error ? err.message : 'Gagal memuat sampel.'
                        );
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-emerald-800 text-emerald-900 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Muat Data Pendaftar Contoh (Uji Coba)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMenu('2_pendaftar')}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Kelola Data Pendaftar
                  </button>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 block">Total Pendaftar</span>
                  <span className="font-mono-tabular text-2xl font-bold text-slate-900 mt-1 block">
                    {stats.total}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 block">Menunggu Verifikasi</span>
                  <span className="font-mono-tabular text-2xl font-bold text-slate-800 mt-1 block">
                    {stats.menunggu}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 block">Perlu Perbaikan</span>
                  <span className="font-mono-tabular text-2xl font-bold text-amber-700 mt-1 block">
                    {stats.perbaikan}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 block">Terverifikasi</span>
                  <span className="font-mono-tabular text-2xl font-bold text-emerald-700 mt-1 block">
                    {stats.terverifikasi}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 block">Diterima</span>
                  <span className="font-mono-tabular text-2xl font-bold text-emerald-900 mt-1 block">
                    {stats.diterima}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <span className="text-xs text-slate-500 block">Tidak Diterima</span>
                  <span className="font-mono-tabular text-2xl font-bold text-red-700 mt-1 block">
                    {stats.tidakDiterima}
                  </span>
                </div>
              </div>

              {/* Distribution Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-slate-900 mb-4">
                    Distribusi Pilihan Program / Peminatan
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.byProgram).length === 0 ? (
                      <p className="text-xs text-slate-500">Belum ada data pendaftar.</p>
                    ) : (
                      Object.entries(stats.byProgram).map(([prog, count]) => (
                        <div key={prog} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-800">{prog}</span>
                            <span className="font-mono-tabular font-bold text-slate-900">
                              {count} murid
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-800"
                              style={{
                                width: `${Math.min(100, Math.round((count / Math.max(1, stats.total)) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-slate-900 mb-4">
                    Komposisi Jenis Kelamin & Asal Sekolah Terbanyak
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-200 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 block">Murid Laki-laki</span>
                      <span className="font-mono-tabular text-lg font-bold text-slate-900">
                        {stats.laki} orang
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Murid Perempuan</span>
                      <span className="font-mono-tabular text-lg font-bold text-slate-900">
                        {stats.perempuan} orang
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {Object.entries(stats.bySchool).map(([sch, count]) => (
                      <div key={sch} className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-700">{sch}</span>
                        <span className="font-mono-tabular font-semibold text-slate-900">
                          {count} pendaftar
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. DATA SELURUH PENDAFTAR */}
          {activeMenu === '2_pendaftar' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Daftar Seluruh Calon Murid Pendaftar ({filteredApplications.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Gunakan pencarian, filter status, pengurutan, dan aksi cepat di bawah ini
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                    >
                      Unduh CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="px-3.5 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
                    >
                      Unduh Excel (.xls)
                    </button>
                  </div>
                </div>

                {/* Search & Filter Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                  <div className="relative sm:col-span-2">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Cari nama, nomor pendaftaran, NISN, sekolah asal..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-emerald-700 focus:outline-none"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="ALL">Semua Status Seleksi</option>
                    <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
                    <option value="Perlu Perbaikan Data">Perlu Perbaikan Data</option>
                    <option value="Terverifikasi">Terverifikasi</option>
                    <option value="Diterima">Diterima</option>
                    <option value="Tidak Diterima">Tidak Diterima</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'newest' | 'name_asc' | 'reg_asc')
                    }
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="newest">Urutkan: Terbaru</option>
                    <option value="name_asc">Urutkan: Nama (A-Z)</option>
                    <option value="reg_asc">Urutkan: No. Pendaftaran</option>
                  </select>
                </div>
              </div>

              {/* High-Density Data Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">No. Pendaftaran</th>
                        <th className="py-3 px-4">Nama Calon Murid</th>
                        <th className="py-3 px-4">NISN / JK</th>
                        <th className="py-3 px-4">SMP / MTs Asal</th>
                        <th className="py-3 px-4">Program Pilihan</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {paginatedApplications.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500">
                            Belum ada data pendaftar yang sesuai dengan filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedApplications.map((app) => (
                          <tr key={app.regNumber} className="hover:bg-slate-50/90">
                            <td className="py-3 px-4 font-mono-tabular font-bold text-emerald-900 whitespace-nowrap">
                              {app.regNumber}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {app.fullName}
                            </td>
                            <td className="py-3 px-4 font-mono-tabular text-slate-600 whitespace-nowrap">
                              {app.nisn} · {app.gender === 'Laki-laki' ? 'L' : 'P'}
                            </td>
                            <td className="py-3 px-4 text-slate-700">{app.originSchool}</td>
                            <td className="py-3 px-4 text-slate-700">{app.selectedProgram}</td>
                            <td className="py-3 px-4 font-semibold whitespace-nowrap">
                              <span
                                className={
                                  app.status === 'Diterima'
                                    ? 'text-emerald-700'
                                    : app.status === 'Tidak Diterima'
                                    ? 'text-red-700'
                                    : app.status === 'Perlu Perbaikan Data'
                                    ? 'text-amber-700'
                                    : 'text-slate-800'
                                }
                              >
                                {app.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRegNumber(app.regNumber);
                                  setActiveMenu('3_biodata');
                                }}
                                className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Detail
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRegNumber(app.regNumber);
                                  setActiveMenu('4_verifikasi');
                                }}
                                className="px-2.5 py-1 rounded border border-emerald-700 text-emerald-900 hover:bg-emerald-50 cursor-pointer"
                              >
                                Verifikasi
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPrintModalState({ mode: 'receipt', app })
                                }
                                className="px-2.5 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                Cetak
                              </button>
                              {confirmDeleteReg === app.regNumber ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteApplicant(app)}
                                  className="px-2.5 py-1 rounded bg-red-600 text-white font-bold cursor-pointer"
                                >
                                  Konfirmasi Hapus?
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteReg(app.regNumber)}
                                  className="px-2 py-1 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                  Hapus
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    Halaman <strong className="font-mono-tabular">{currentPage}</strong> dari{' '}
                    <strong className="font-mono-tabular">{totalPages}</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
                    >
                       Berikutnya
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. DETAIL BIODATA CALON MURID */}
          {activeMenu === '3_biodata' && (
            <div>
              {renderApplicantSelectorBar()}
              {editableApplicant ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Biodata Lengkap: {editableApplicant.fullName}
                      </h2>
                      <p className="text-xs text-slate-500 font-mono-tabular">
                        No. Pendaftaran: {editableApplicant.regNumber} · Terdaftar:{' '}
                        {editableApplicant.submittedDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() =>
                        handleUpdateApplicant(
                          editableApplicant,
                          editableApplicant,
                          'Memperbarui Biodata Calon Murid'
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan Biodata</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Nama Lengkap Calon Murid
                      </label>
                      <input
                        type="text"
                        value={editableApplicant.fullName}
                        onChange={(e) =>
                          setEditableApplicant({ ...editableApplicant, fullName: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">NIK (16 Digit)</label>
                      <input
                        type="text"
                        value={editableApplicant.nik}
                        onChange={(e) =>
                          setEditableApplicant({ ...editableApplicant, nik: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">NISN</label>
                      <input
                        type="text"
                        value={editableApplicant.nisn}
                        onChange={(e) =>
                          setEditableApplicant({ ...editableApplicant, nisn: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        value={editableApplicant.birthPlace}
                        onChange={(e) =>
                          setEditableApplicant({
                            ...editableApplicant,
                            birthPlace: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={editableApplicant.birthDate}
                        onChange={(e) =>
                          setEditableApplicant({
                            ...editableApplicant,
                            birthDate: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nomor Telepon</label>
                      <input
                        type="text"
                        value={editableApplicant.phone}
                        onChange={(e) =>
                          setEditableApplicant({ ...editableApplicant, phone: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">Alamat Lengkap</label>
                      <input
                        type="text"
                        value={editableApplicant.address}
                        onChange={(e) =>
                          setEditableApplicant({ ...editableApplicant, address: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Desa / Kecamatan
                      </label>
                      <input
                        type="text"
                        value={editableApplicant.village}
                        onChange={(e) =>
                          setEditableApplicant({ ...editableApplicant, village: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nama Ayah</label>
                      <input
                        type="text"
                        value={editableApplicant.fatherName}
                        onChange={(e) =>
                          setEditableApplicant({
                            ...editableApplicant,
                            fatherName: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Nama Ibu</label>
                      <input
                        type="text"
                        value={editableApplicant.motherName}
                        onChange={(e) =>
                          setEditableApplicant({
                            ...editableApplicant,
                            motherName: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Nomor HP Orang Tua
                      </label>
                      <input
                        type="text"
                        value={editableApplicant.parentPhone}
                        onChange={(e) =>
                          setEditableApplicant({
                            ...editableApplicant,
                            parentPhone: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        SMP / MTs Asal
                      </label>
                      <input
                        type="text"
                        value={editableApplicant.originSchool}
                        onChange={(e) =>
                          setEditableApplicant({
                            ...editableApplicant,
                            originSchool: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        NPSN Sekolah Asal
                      </label>
                      <input
                        type="text"
                        value={editableApplicant.originNpsn}
                        onChange={(e) =>
                          setEditableApplicant({
                            ...editableApplicant,
                            originNpsn: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        Program / Peminatan Pilihan
                      </label>
                      <input
                        type="text"
                        value={editableApplicant.selectedProgram}
                        onChange={(e) =>
                          setEditableApplicant({
                            ...editableApplicant,
                            selectedProgram: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Pilih calon murid terlebih dahulu.</p>
              )}
            </div>
          )}

          {/* 4. VERIFIKASI BERKAS */}
          {activeMenu === '4_verifikasi' && (
            <div>
              {renderApplicantSelectorBar()}
              {selectedApplicant && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Pemeriksaan & Verifikasi Dokumen: {selectedApplicant.fullName}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Periksa keabsahan setiap berkas unggahan dan tetapkan status verifikasi
                    </p>
                  </div>

                  {(() => {
                    let docs: UploadedDocumentData[] = [];
                    let verifMap: Record<string, DocVerifyStatus> = {};
                    try {
                      docs = JSON.parse(selectedApplicant.documentsJson || '[]');
                      verifMap = JSON.parse(selectedApplicant.docVerificationJson || '{}');
                    } catch {
                      docs = [];
                    }

                    if (docs.length === 0) {
                      return (
                        <p className="text-sm text-slate-500 py-4">
                          Calon murid ini belum mengunggah berkas dokumen.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {docs.map((docItem) => {
                          const currentState = verifMap[docItem.docId] || 'Belum Diperiksa';
                          return (
                            <div
                              key={docItem.docId}
                              className="p-4 rounded-xl border border-slate-200 bg-[#F8FAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-4">
                                {docItem.dataUrl.startsWith('data:image') ||
                                docItem.type.startsWith('image') ? (
                                  <img
                                    src={docItem.dataUrl}
                                    alt={docItem.label}
                                    referrerPolicy="no-referrer"
                                    className="w-16 h-16 rounded-lg object-cover border border-slate-300 bg-white shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg border border-slate-300 bg-white flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                    BERKAS
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">
                                    {docItem.label}
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    Nama file: {docItem.name} · Status:{' '}
                                    <span className="font-semibold text-emerald-900">
                                      {currentState}
                                    </span>
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewDoc(docItem)}
                                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Lihat Berkas Ukuran Penuh</span>
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {(['Valid', 'Perlu Perbaikan', 'Belum Diperiksa'] as DocVerifyStatus[]).map(
                                  (st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => {
                                        const nextMap = { ...verifMap, [docItem.docId]: st };
                                        handleUpdateApplicant(
                                          selectedApplicant,
                                          { docVerificationJson: JSON.stringify(nextMap) },
                                          `Verifikasi berkas ${docItem.label} -> ${st}`
                                        );
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                        currentState === st
                                          ? 'bg-emerald-900 text-white'
                                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {st}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* 5. STATUS PENDAFTARAN & 6. CATATAN PERBAIKAN DATA */}
          {(activeMenu === '5_status' || activeMenu === '6_catatan') && (
            <div>
              {renderApplicantSelectorBar()}
              {editableApplicant && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Pengaturan Status Pendaftaran & Catatan Perbaikan Data
                    </h2>
                    <p className="text-xs text-slate-500">
                      Perubahan di sini langsung diperbarui pada kartu Cek Status Calon Murid ({editableApplicant.regNumber})
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Pilih Status Pendaftaran Calon Murid:
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {(
                        [
                          'Menunggu Verifikasi',
                          'Perlu Perbaikan Data',
                          'Terverifikasi',
                          'Diterima',
                          'Tidak Diterima',
                        ] as ApplicationStatus[]
                      ).map((statusOption) => (
                        <button
                          key={statusOption}
                          type="button"
                          onClick={() =>
                            setEditableApplicant({
                              ...editableApplicant,
                              status: statusOption,
                            })
                          }
                          className={`px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                            editableApplicant.status === statusOption
                              ? 'bg-emerald-900 text-white border-emerald-900'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {statusOption}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Catatan Perbaikan Data / Pesan Verifikasi untuk Calon Murid:
                    </label>
                    <textarea
                      rows={4}
                      value={editableApplicant.revisionNotes}
                      onChange={(e) =>
                        setEditableApplicant({
                          ...editableApplicant,
                          revisionNotes: e.target.value,
                        })
                      }
                      placeholder="Contoh: Mohon unggah ulang foto KK yang lebih jelas, atau Seluruh berkas telah lengkap dan valid."
                      className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      handleUpdateApplicant(
                        editableApplicant,
                        {
                          status: editableApplicant.status,
                          revisionNotes: editableApplicant.revisionNotes,
                        },
                        `Mengubah status pendaftaran menjadi ${editableApplicant.status}`
                      )
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Status & Catatan Perbaikan</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 7. PENGUMUMAN HASIL SELEKSI */}
          {activeMenu === '7_pengumuman_hasil' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Pengaturan Pengumuman Hasil Seleksi SPMB {draftConfig.academicYear}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Tanggal Pengumuman Resmi
                    </label>
                    <input
                      type="date"
                      value={draftConfig.announcementDate}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, announcementDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Pesan Instruksi Daftar Ulang Gratis (Bagi yang Diterima)
                    </label>
                    <textarea
                      rows={3}
                      value={draftConfig.selectionAnnouncementNote}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          selectionAnnouncementNote: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 p-3 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveConfigToFirestore(
                      draftConfig,
                      'Memperbarui pesan & jadwal pengumuman hasil seleksi'
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  Simpan Pesan Pengumuman Seleksi
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Penetapan Cepat Hasil Seleksi Calon Murid
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                        <th className="py-2.5 px-3">No. Pendaftaran</th>
                        <th className="py-2.5 px-3">Nama Calon Murid</th>
                        <th className="py-2.5 px-3">Asal Sekolah</th>
                        <th className="py-2.5 px-3">Status Saat Ini</th>
                        <th className="py-2.5 px-3 text-right">Tetapkan Keputusan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {applications.map((app) => (
                        <tr key={app.regNumber}>
                          <td className="py-2.5 px-3 font-mono-tabular font-bold">
                            {app.regNumber}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{app.fullName}</td>
                          <td className="py-2.5 px-3">{app.originSchool}</td>
                          <td className="py-2.5 px-3 font-bold">{app.status}</td>
                          <td className="py-2.5 px-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateApplicant(
                                  app,
                                  {
                                    status: 'Diterima',
                                    revisionNotes:
                                      'Selamat! Anda dinyatakan DITERIMA sebagai calon murid baru.',
                                  },
                                  'Menetapkan status Diterima'
                                )
                              }
                              className="px-3 py-1 rounded bg-emerald-800 text-white font-semibold hover:bg-emerald-700 cursor-pointer"
                            >
                              Tetapkan Diterima
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateApplicant(
                                  app,
                                  { status: 'Tidak Diterima' },
                                  'Menetapkan status Tidak Diterima'
                                )
                              }
                              className="px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 cursor-pointer"
                            >
                              Tidak Diterima
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 8. CETAK BUKTI PENDAFTARAN & 9. CETAK FORMULIR PENDAFTARAN */}
          {(activeMenu === '8_cetak_bukti' || activeMenu === '9_cetak_formulir') && (
            <div>
              {renderApplicantSelectorBar()}
              {selectedApplicant && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    {activeMenu === '8_cetak_bukti'
                      ? 'Cetak Tanda Bukti Pendaftaran Resmi (A4 / PDF)'
                      : 'Cetak Formulir Biodata Lengkap Calon Murid (A4 / PDF)'}
                  </h2>
                  <p className="text-xs text-slate-600">
                    Calon Murid Terpilih: <strong>{selectedApplicant.fullName}</strong> (
                    <span className="font-mono-tabular">{selectedApplicant.regNumber}</span>)
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setPrintModalState({
                        mode: activeMenu === '8_cetak_bukti' ? 'receipt' : 'full_form',
                        app: selectedApplicant,
                      })
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>
                      Buka & Cetak{' '}
                      {activeMenu === '8_cetak_bukti'
                        ? 'Bukti Pendaftaran'
                        : 'Formulir Lengkap'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 10. EKSPOR EXCEL DAN CSV */}
          {activeMenu === '10_ekspor' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Ekspor Data Pendaftar ke Microsoft Excel (.xls) dan CSV (.csv)
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Unduh seluruh data calon murid ({applications.length} pendaftar) untuk
                  keperluan pelaporan Dapodik, EMIS, atau arsip panitia SPMB.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Laporan Microsoft Excel (.xls)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold border border-slate-300 text-slate-800 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Berkas Data CSV (.csv)</span>
                </button>
              </div>
            </div>
          )}

          {/* 11. LAPORAN STATISTIK */}
          {activeMenu === '11_laporan' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Laporan Statistik Penerimaan Murid Baru TA {config.academicYear}
                  </h2>
                  <p className="text-xs text-slate-500">{config.schoolName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Laporan Statistik</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-bold text-slate-900 mb-3">
                    Rekapitulasi Berdasarkan Status Seleksi
                  </h3>
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-2">Menunggu Verifikasi</td>
                        <td className="py-2 text-right font-mono-tabular font-bold">
                          {stats.menunggu}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Perlu Perbaikan Data</td>
                        <td className="py-2 text-right font-mono-tabular font-bold">
                          {stats.perbaikan}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Terverifikasi</td>
                        <td className="py-2 text-right font-mono-tabular font-bold">
                          {stats.terverifikasi}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Diterima</td>
                        <td className="py-2 text-right font-mono-tabular font-bold text-emerald-800">
                          {stats.diterima}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Tidak Diterima</td>
                        <td className="py-2 text-right font-mono-tabular font-bold text-red-700">
                          {stats.tidakDiterima}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-bold text-slate-900 mb-3">
                    Rekapitulasi Berdasarkan Asal SMP / MTs
                  </h3>
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-200">
                      {Object.entries(stats.bySchool).map(([school, count]) => (
                        <tr key={school}>
                          <td className="py-2">{school}</td>
                          <td className="py-2 text-right font-mono-tabular font-bold">
                            {count} murid
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 12. MANAJEMEN AKUN PENGGUNA */}
          {activeMenu === '12_akun' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Manajemen Akun Panitia & Hak Akses Berbasis Peran (RBAC)
                </h2>
                <p className="text-xs text-slate-600">
                  Tambahkan UID pengguna Firebase Authentication untuk memberikan hak akses
                  sebagai Super Admin, Ketua Panitia, atau Verifikator.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <input
                    type="text"
                    placeholder="Firebase Auth UID"
                    value={newAdminForm.uid}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, uid: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                  />
                  <input
                    type="email"
                    placeholder="Email Google Panitia"
                    value={newAdminForm.email}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, email: e.target.value })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Nama Lengkap Panitia"
                    value={newAdminForm.displayName}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, displayName: e.target.value })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <select
                    value={newAdminForm.role}
                    onChange={(e) =>
                      setNewAdminForm({
                        ...newAdminForm,
                        role: e.target.value as AdminUserRecord['role'],
                      })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Ketua Panitia">Ketua Panitia</option>
                    <option value="Verifikator">Verifikator</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!newAdminForm.uid.trim() || !newAdminForm.email.trim()) {
                      showToast('error', 'UID dan Email wajib diisi.');
                      return;
                    }
                    await saveAdminUserRecord({
                      uid: newAdminForm.uid.trim(),
                      email: newAdminForm.email.trim(),
                      displayName: newAdminForm.displayName.trim() || 'Panitia SPMB',
                      role: newAdminForm.role,
                      active: true,
                    });
                    setNewAdminForm({
                      uid: '',
                      email: '',
                      displayName: '',
                      role: 'Verifikator',
                    });
                    showToast('success', 'Akun panitia berhasil disimpan.');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan Akun Panitia</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Daftar Akun Admin Terdaftar ({admins.length + 1})
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-950">{user.email}</span>
                      <span className="text-slate-600 ml-2">
                        (UID: <span className="font-mono-tabular">{user.uid}</span>)
                      </span>
                    </div>
                    <span className="font-bold text-emerald-900">Super Admin Utama (Aktif)</span>
                  </div>
                  {admins.map((adm) => (
                    <div
                      key={adm.uid}
                      className="p-3 rounded-lg border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{adm.displayName}</span> ·{' '}
                        <span>{adm.email}</span> ·{' '}
                        <span className="font-mono-tabular text-slate-500">UID: {adm.uid}</span>
                      </div>
                      <span className="font-semibold text-emerald-800">{adm.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 13. PENGATURAN SEKOLAH (MENU KHUSUS BAGIAN E) */}
          {activeMenu === '13_pengaturan_sekolah' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Pengaturan Seluruh Data & Identitas Sekolah
                    </h2>
                    <p className="text-xs text-slate-500">
                      Seluruh informasi di bawah ini langsung memperbarui halaman depan dan
                      kop surat resmi setelah disimpan.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      handleSaveConfigToFirestore(
                        draftConfig,
                        'Memperbarui Pengaturan Identitas & Data Sekolah'
                      )
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Seluruh Data Sekolah</span>
                  </button>
                </div>

                {/* Identitas Utama */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nama Resmi Sekolah
                    </label>
                    <input
                      type="text"
                      value={draftConfig.schoolName}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, schoolName: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nama Singkat Sekolah
                    </label>
                    <input
                      type="text"
                      value={draftConfig.shortName}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, shortName: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">NPSN</label>
                    <input
                      type="text"
                      value={draftConfig.npsn}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, npsn: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Alamat Lengkap Sekolah
                    </label>
                    <input
                      type="text"
                      value={draftConfig.address}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, address: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Desa / Kelurahan
                    </label>
                    <input
                      type="text"
                      value={draftConfig.village}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, village: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kecamatan</label>
                    <input
                      type="text"
                      value={draftConfig.district}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, district: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Kabupaten / Kota
                    </label>
                    <input
                      type="text"
                      value={draftConfig.regency}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, regency: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Provinsi & Kode Pos
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={draftConfig.province}
                        onChange={(e) =>
                          setDraftConfig({ ...draftConfig, province: e.target.value })
                        }
                        className="w-2/3 rounded-lg border border-slate-300 px-3 py-2"
                      />
                      <input
                        type="text"
                        value={draftConfig.postalCode}
                        onChange={(e) =>
                          setDraftConfig({ ...draftConfig, postalCode: e.target.value })
                        }
                        className="w-1/3 rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nama Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      value={draftConfig.principalName}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, principalName: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nama Ketua Panitia SPMB
                    </label>
                    <input
                      type="text"
                      value={draftConfig.committeeHeadName}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          committeeHeadName: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Akreditasi Sekolah
                    </label>
                    <input
                      type="text"
                      value={draftConfig.accreditation}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, accreditation: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                </div>

                {/* Unggah Foto & Logo Sekolah */}
                <div className="border-t border-slate-200 pt-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Logo & Foto Resmi Sekolah (Unggah Gambar Baru)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                    {(
                      [
                        { key: 'logoUrl', label: 'Logo Sekolah' },
                        { key: 'principalPhotoUrl', label: 'Foto Kepala Sekolah' },
                        { key: 'staffPhotoUrl', label: 'Foto Guru & Tendik' },
                        { key: 'buildingPhotoUrl', label: 'Foto Gedung Sekolah' },
                        { key: 'classroomPhotoUrl', label: 'Foto Kelas & Fasilitas' },
                      ] as const
                    ).map((item) => (
                      <div
                        key={item.key}
                        className="p-3 rounded-lg border border-slate-200 bg-[#F8FAF8] flex flex-col justify-between gap-2"
                      >
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <img
                          src={draftConfig[item.key]}
                          alt={item.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-24 object-cover rounded border border-slate-200 bg-white"
                        />
                        <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 cursor-pointer font-medium">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Ganti Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handlePhotoUploadForConfig(item.key, e.target.files)
                            }
                            className="hidden"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sejarah, Profil, Visi & Misi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Ringkasan Profil Sekolah
                    </label>
                    <textarea
                      rows={3}
                      value={draftConfig.profileSummary}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, profileSummary: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Sejarah Singkat Sekolah
                    </label>
                    <textarea
                      rows={3}
                      value={draftConfig.history}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, history: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Visi Sekolah
                    </label>
                    <textarea
                      rows={3}
                      value={draftConfig.vision}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, vision: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Misi Sekolah (Satu baris per poin misi)
                    </label>
                    <textarea
                      rows={3}
                      value={draftConfig.missions.join('\n')}
                      onChange={(e) =>
                        setDraftConfig({
                          ...draftConfig,
                          missions: e.target.value
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">
                      Informasi Tambahan & Beasiswa
                    </label>
                    <textarea
                      rows={2}
                      value={draftConfig.additionalInfo}
                      onChange={(e) =>
                        setDraftConfig({ ...draftConfig, additionalInfo: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 p-2.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 14. PENGATURAN HALAMAN WEBSITE */}
          {activeMenu === '14_halaman_web' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Pengaturan Bagian Halaman Website Publik
                    </h2>
                    <p className="text-xs text-slate-500">
                      Tambah, edit judul, urutkan posisi, sembunyikan, atau hapus bagian halaman
                      depan
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveConfigToFirestore(
                        draftConfig,
                        'Memperbarui urutan & visibilitas bagian halaman website'
                      )
                    }
                    className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                  >
                    Simpan Tata Letak Halaman
                  </button>
                </div>

                <div className="space-y-2.5">
                  {[...draftConfig.sections]
                    .sort((a, b) => a.order - b.order)
                    .map((sec, idx, arr) => (
                      <div
                        key={sec.id}
                        className="p-3.5 rounded-lg border border-slate-200 bg-[#F8FAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={sec.enabled}
                            onChange={(e) => {
                              const next = draftConfig.sections.map((s) =>
                                s.id === sec.id ? { ...s, enabled: e.target.checked } : s
                              );
                              setDraftConfig({ ...draftConfig, sections: next });
                            }}
                            className="w-4 h-4 accent-emerald-800"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => {
                                const next = draftConfig.sections.map((s) =>
                                  s.id === sec.id ? { ...s, title: e.target.value } : s
                                );
                                setDraftConfig({ ...draftConfig, sections: next });
                              }}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-semibold"
                            />
                            <input
                              type="text"
                              value={sec.subtitle}
                              onChange={(e) => {
                                const next = draftConfig.sections.map((s) =>
                                  s.id === sec.id ? { ...s, subtitle: e.target.value } : s
                                );
                                setDraftConfig({ ...draftConfig, sections: next });
                              }}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-slate-600"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              const sorted = [...draftConfig.sections].sort(
                                (a, b) => a.order - b.order
                              );
                              const prev = sorted[idx - 1];
                              if (!prev) return;
                              const next = draftConfig.sections.map((s) => {
                                if (s.id === sec.id) return { ...s, order: prev.order };
                                if (s.id === prev.id) return { ...s, order: sec.order };
                                return s;
                              });
                              setDraftConfig({ ...draftConfig, sections: next });
                            }}
                            className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() => {
                              const sorted = [...draftConfig.sections].sort(
                                (a, b) => a.order - b.order
                              );
                              const nextItem = sorted[idx + 1];
                              if (!nextItem) return;
                              const next = draftConfig.sections.map((s) => {
                                if (s.id === sec.id) return { ...s, order: nextItem.order };
                                if (s.id === nextItem.id) return { ...s, order: sec.order };
                                return s;
                              });
                              setDraftConfig({ ...draftConfig, sections: next });
                            }}
                            className="p-1.5 rounded border border-slate-300 bg-white disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          {sec.type === 'custom' && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = draftConfig.sections.filter(
                                  (s) => s.id !== sec.id
                                );
                                setDraftConfig({ ...draftConfig, sections: next });
                              }}
                              className="p-1.5 rounded text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Tambah Bagian Halaman Kustom */}
                <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
                  <h3 className="font-bold text-slate-900">Tambah Bagian Halaman Baru</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Judul Bagian (Contoh: Informasi Asrama / Pondok)"
                      value={newSectionForm.title}
                      onChange={(e) =>
                        setNewSectionForm({ ...newSectionForm, title: e.target.value })
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Subjudul Bagian"
                      value={newSectionForm.subtitle}
                      onChange={(e) =>
                        setNewSectionForm({ ...newSectionForm, subtitle: e.target.value })
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2"
                    />
                    <textarea
                      rows={3}
                      placeholder="Isi paragraf atau rincian informasi..."
                      value={newSectionForm.customContent}
                      onChange={(e) =>
                        setNewSectionForm({
                          ...newSectionForm,
                          customContent: e.target.value,
                        })
                      }
                      className="sm:col-span-2 rounded-lg border border-slate-300 p-3"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSectionForm.title.trim()) return;
                      const nextSec = {
                        id: `sec_custom_${Date.now()}`,
                        title: newSectionForm.title.trim(),
                        subtitle: newSectionForm.subtitle.trim(),
                        customContent: newSectionForm.customContent.trim(),
                        enabled: true,
                        order: draftConfig.sections.length + 1,
                        type: 'custom' as const,
                      };
                      setDraftConfig({
                        ...draftConfig,
                        sections: [...draftConfig.sections, nextSec],
                      });
                      setNewSectionForm({ title: '', subtitle: '', customContent: '' });
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Bagian ke Halaman Publik</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 15. PENGATURAN FORMULIR */}
          {activeMenu === '15_formulir' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Pengaturan Kolom Formulir Pendaftaran Online
                  </h2>
                  <p className="text-xs text-slate-500">
                    Aktifkan/nonaktifkan kolom, ubah nama label kolom, tentukan kolom wajib,
                    atau tambah kolom baru
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveConfigToFirestore(
                      draftConfig,
                      'Memperbarui konfigurasi kolom formulir pendaftaran'
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  Simpan Pengaturan Formulir
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {draftConfig.formFields.map((field) => (
                  <div
                    key={field.id}
                    className="p-3 rounded-lg border border-slate-200 bg-[#F8FAF8] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                      <input
                        type="checkbox"
                        checked={field.enabled}
                        disabled={field.isSystemCore}
                        onChange={(e) => {
                          const next = draftConfig.formFields.map((f) =>
                            f.id === field.id ? { ...f, enabled: e.target.checked } : f
                          );
                          setDraftConfig({ ...draftConfig, formFields: next });
                        }}
                        className="w-4 h-4 accent-emerald-800"
                      />
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const next = draftConfig.formFields.map((f) =>
                            f.id === field.id ? { ...f, label: e.target.value } : f
                          );
                          setDraftConfig({ ...draftConfig, formFields: next });
                        }}
                        className="flex-1 rounded border border-slate-300 bg-white px-2.5 py-1.5 font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 text-slate-700">
                        <input
                          type="checkbox"
                          checked={field.required}
                          disabled={field.isSystemCore}
                          onChange={(e) => {
                            const next = draftConfig.formFields.map((f) =>
                              f.id === field.id ? { ...f, required: e.target.checked } : f
                            );
                            setDraftConfig({ ...draftConfig, formFields: next });
                          }}
                          className="accent-emerald-800"
                        />
                        <span>Wajib Diisi</span>
                      </label>
                      {!field.isSystemCore && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = draftConfig.formFields.filter(
                              (f) => f.id !== field.id
                            );
                            setDraftConfig({ ...draftConfig, formFields: next });
                          }}
                          className="text-red-600 hover:underline cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
                <h3 className="font-bold text-slate-900">Tambah Kolom Formulir Kustom</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Nama Kolom (Contoh: Hobi / Cita-cita)"
                    value={newFieldForm.label}
                    onChange={(e) =>
                      setNewFieldForm({ ...newFieldForm, label: e.target.value })
                    }
                    className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <select
                    value={newFieldForm.group}
                    onChange={(e) =>
                      setNewFieldForm({
                        ...newFieldForm,
                        group: e.target.value as 'student' | 'parent' | 'school',
                      })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="student">Kelompok: Data Murid</option>
                    <option value="parent">Kelompok: Data Orang Tua</option>
                    <option value="school">Kelompok: Sekolah Asal</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newFieldForm.label.trim()) return;
                      const nextField = {
                        id: `custom_${Date.now()}`,
                        label: newFieldForm.label.trim(),
                        group: newFieldForm.group,
                        type: newFieldForm.type,
                        required: newFieldForm.required,
                        enabled: true,
                      };
                      setDraftConfig({
                        ...draftConfig,
                        formFields: [...draftConfig.formFields, nextField],
                      });
                      setNewFieldForm({
                        label: '',
                        group: 'student',
                        type: 'text',
                        required: false,
                      });
                    }}
                    className="px-4 py-2 font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                  >
                    + Tambah Kolom
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 16. PENGATURAN DOKUMEN PERSYARATAN */}
          {activeMenu === '16_dokumen' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Pengaturan Dokumen Persyaratan Unggahan
                  </h2>
                  <p className="text-xs text-slate-500">
                    Atur dokumen apa saja yang harus diunggah calon murid saat mendaftar
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveConfigToFirestore(
                      draftConfig,
                      'Memperbarui pengaturan dokumen persyaratan'
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  Simpan Pengaturan Dokumen
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {draftConfig.documentRequirements.map((docReq) => (
                  <div
                    key={docReq.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-[#F8FAF8] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={docReq.enabled}
                        onChange={(e) => {
                          const next = draftConfig.documentRequirements.map((d) =>
                            d.id === docReq.id ? { ...d, enabled: e.target.checked } : d
                          );
                          setDraftConfig({ ...draftConfig, documentRequirements: next });
                        }}
                        className="w-4 h-4 accent-emerald-800"
                      />
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={docReq.label}
                          onChange={(e) => {
                            const next = draftConfig.documentRequirements.map((d) =>
                              d.id === docReq.id ? { ...d, label: e.target.value } : d
                            );
                            setDraftConfig({ ...draftConfig, documentRequirements: next });
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 font-bold"
                        />
                        <input
                          type="text"
                          value={docReq.description}
                          onChange={(e) => {
                            const next = draftConfig.documentRequirements.map((d) =>
                              d.id === docReq.id ? { ...d, description: e.target.value } : d
                            );
                            setDraftConfig({ ...draftConfig, documentRequirements: next });
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-slate-600"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 font-semibold">
                      <input
                        type="checkbox"
                        checked={docReq.required}
                        onChange={(e) => {
                          const next = draftConfig.documentRequirements.map((d) =>
                            d.id === docReq.id ? { ...d, required: e.target.checked } : d
                          );
                          setDraftConfig({ ...draftConfig, documentRequirements: next });
                        }}
                        className="accent-emerald-800"
                      />
                      <span>Wajib Diunggah</span>
                    </label>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Nama Dokumen Tambahan"
                  value={newDocReqForm.label}
                  onChange={(e) =>
                    setNewDocReqForm({ ...newDocReqForm, label: e.target.value })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="Keterangan format/syarat berkas"
                  value={newDocReqForm.description}
                  onChange={(e) =>
                    setNewDocReqForm({ ...newDocReqForm, description: e.target.value })
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newDocReqForm.label.trim()) return;
                    setDraftConfig({
                      ...draftConfig,
                      documentRequirements: [
                        ...draftConfig.documentRequirements,
                        {
                          id: `doc_custom_${Date.now()}`,
                          label: newDocReqForm.label.trim(),
                          description:
                            newDocReqForm.description.trim() || 'Unggah foto atau PDF berkas.',
                          required: false,
                          enabled: true,
                          acceptedFormats: 'image/*,.pdf',
                        },
                      ],
                    });
                    setNewDocReqForm({ label: '', description: '', required: false });
                  }}
                  className="px-4 py-2 font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                >
                  + Tambah Dokumen Persyaratan
                </button>
              </div>
            </div>
          )}

          {/* 17. PENGATURAN JADWAL SPMB */}
          {activeMenu === '17_jadwal' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Pengaturan Jadwal & Konfigurasi SPMB
                  </h2>
                  <p className="text-xs text-slate-500">
                    Kelola tahun ajaran, status buka/tutup pendaftaran, format nomor, dan
                    tahapan jadwal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveConfigToFirestore(
                      draftConfig,
                      'Memperbarui jadwal & status pendaftaran SPMB'
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  Simpan Jadwal SPMB
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tahun Ajaran SPMB
                  </label>
                  <input
                    type="text"
                    value={draftConfig.academicYear}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, academicYear: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Format Awalan Nomor Pendaftaran
                  </label>
                  <input
                    type="text"
                    value={draftConfig.regPrefix}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, regPrefix: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Status Pendaftaran Online
                  </label>
                  <select
                    value={draftConfig.registrationOpen ? 'OPEN' : 'CLOSED'}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        registrationOpen: e.target.value === 'OPEN',
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white font-semibold"
                  >
                    <option value="OPEN">DIBUKA (Calon Murid Dapat Mendaftar)</option>
                    <option value="CLOSED">DITUTUP SEMENTARA</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tanggal Mulai Pendaftaran
                  </label>
                  <input
                    type="date"
                    value={draftConfig.startDate}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, startDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tanggal Berakhir Pendaftaran
                  </label>
                  <input
                    type="date"
                    value={draftConfig.endDate}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, endDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tanggal Pengumuman Hasil
                  </label>
                  <input
                    type="date"
                    value={draftConfig.announcementDate}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, announcementDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <h3 className="font-bold text-slate-900">Rincian Tahapan Jadwal SPMB</h3>
                {draftConfig.schedules.map((sch) => (
                  <div
                    key={sch.id}
                    className="p-3 rounded-lg border border-slate-200 bg-[#F8FAF8] flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {sch.phaseName} ({sch.dateRange})
                      </p>
                      <p className="text-slate-600">{sch.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftConfig({
                          ...draftConfig,
                          schedules: draftConfig.schedules.filter((s) => s.id !== sch.id),
                        })
                      }
                      className="text-red-600 hover:underline cursor-pointer shrink-0"
                    >
                      Hapus
                    </button>
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Nama Tahapan"
                    value={newScheduleForm.phaseName}
                    onChange={(e) =>
                      setNewScheduleForm({ ...newScheduleForm, phaseName: e.target.value })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Rentang Tanggal"
                    value={newScheduleForm.dateRange}
                    onChange={(e) =>
                      setNewScheduleForm({ ...newScheduleForm, dateRange: e.target.value })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Keterangan"
                    value={newScheduleForm.description}
                    onChange={(e) =>
                      setNewScheduleForm({
                        ...newScheduleForm,
                        description: e.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newScheduleForm.phaseName.trim()) return;
                      setDraftConfig({
                        ...draftConfig,
                        schedules: [
                          ...draftConfig.schedules,
                          {
                            id: `sch_${Date.now()}`,
                            phaseName: newScheduleForm.phaseName.trim(),
                            dateRange: newScheduleForm.dateRange.trim(),
                            description: newScheduleForm.description.trim(),
                            isActive: true,
                          },
                        ],
                      });
                      setNewScheduleForm({ phaseName: '', dateRange: '', description: '' });
                    }}
                    className="px-4 py-2 font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                  >
                    + Tambah Jadwal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 18. PENGATURAN BANNER DAN GALERI */}
          {activeMenu === '18_banner_galeri' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Pengaturan Banner SPMB & Galeri Foto/Video
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveConfigToFirestore(
                      draftConfig,
                      'Memperbarui Banner SPMB & Galeri Sekolah'
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  Simpan Banner & Galeri
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Judul Utama Banner SPMB
                  </label>
                  <input
                    type="text"
                    value={draftConfig.bannerHeadline}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, bannerHeadline: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Pesan Jaminan Pendaftaran Gratis 100%
                  </label>
                  <input
                    type="text"
                    value={draftConfig.freeRegistrationNotice}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        freeRegistrationNotice: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Subjudul Banner SPMB
                  </label>
                  <textarea
                    rows={2}
                    value={draftConfig.bannerSubheadline}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, bannerSubheadline: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 p-2.5"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
                <h3 className="font-bold text-slate-900">
                  Daftar Dokumentasi Galeri ({draftConfig.gallery.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {draftConfig.gallery.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 rounded-lg border border-slate-200 bg-[#F8FAF8] flex flex-col justify-between gap-2"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{g.title}</p>
                        <p className="text-slate-500">{g.caption}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftConfig({
                            ...draftConfig,
                            gallery: draftConfig.gallery.filter((item) => item.id !== g.id),
                          })
                        }
                        className="text-red-600 hover:underline text-left cursor-pointer"
                      >
                        Hapus dari Galeri
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Judul Foto / Video"
                    value={newGalleryForm.title}
                    onChange={(e) =>
                      setNewGalleryForm({ ...newGalleryForm, title: e.target.value })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="URL Gambar / Embed Video"
                    value={newGalleryForm.url}
                    onChange={(e) =>
                      setNewGalleryForm({ ...newGalleryForm, url: e.target.value })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Keterangan singkat"
                    value={newGalleryForm.caption}
                    onChange={(e) =>
                      setNewGalleryForm({ ...newGalleryForm, caption: e.target.value })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newGalleryForm.title.trim()) return;
                      setDraftConfig({
                        ...draftConfig,
                        gallery: [
                          ...draftConfig.gallery,
                          {
                            id: `gal_${Date.now()}`,
                            title: newGalleryForm.title.trim(),
                            category: newGalleryForm.category,
                            mediaType: newGalleryForm.mediaType,
                            url: newGalleryForm.url.trim() || draftConfig.buildingPhotoUrl,
                            caption: newGalleryForm.caption.trim(),
                          },
                        ],
                      });
                      setNewGalleryForm({
                        title: '',
                        category: 'Kegiatan & Prestasi',
                        mediaType: 'image',
                        url: '',
                        caption: '',
                      });
                    }}
                    className="px-4 py-2 font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                  >
                    + Tambah Item Galeri
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 19. PENGATURAN PENGUMUMAN */}
          {activeMenu === '19_pengumuman_info' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Pengaturan Siaran Pengumuman Resmi
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveConfigToFirestore(
                      draftConfig,
                      'Memperbarui daftar pengumuman resmi'
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  Simpan Pengumuman
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {draftConfig.announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 rounded-lg border border-slate-200 bg-[#F8FAF8] flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {ann.title} ({ann.date})
                      </p>
                      <p className="text-slate-600 mt-1">{ann.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftConfig({
                          ...draftConfig,
                          announcements: draftConfig.announcements.filter(
                            (a) => a.id !== ann.id
                          ),
                        })
                      }
                      className="text-red-600 hover:underline shrink-0 cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
                <h3 className="font-bold text-slate-900">Buat Pengumuman Resmi Baru</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Judul Pengumuman"
                    value={newAnnouncementForm.title}
                    onChange={(e) =>
                      setNewAnnouncementForm({
                        ...newAnnouncementForm,
                        title: e.target.value,
                      })
                    }
                    className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    type="text"
                    placeholder="Tanggal (Contoh: 20 Maret 2027)"
                    value={newAnnouncementForm.date}
                    onChange={(e) =>
                      setNewAnnouncementForm({
                        ...newAnnouncementForm,
                        date: e.target.value,
                      })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <textarea
                    rows={3}
                    placeholder="Isi pengumuman lengkap..."
                    value={newAnnouncementForm.content}
                    onChange={(e) =>
                      setNewAnnouncementForm({
                        ...newAnnouncementForm,
                        content: e.target.value,
                      })
                    }
                    className="sm:col-span-3 rounded-lg border border-slate-300 p-3"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newAnnouncementForm.title.trim()) return;
                    setDraftConfig({
                      ...draftConfig,
                      announcements: [
                        {
                          id: `ann_${Date.now()}`,
                          title: newAnnouncementForm.title.trim(),
                          category: newAnnouncementForm.category,
                          date: newAnnouncementForm.date,
                          content: newAnnouncementForm.content.trim(),
                          isImportant: true,
                        },
                        ...draftConfig.announcements,
                      ],
                    });
                    setNewAnnouncementForm({
                      title: '',
                      category: 'Pengumuman Panitia',
                      date: new Date().toISOString().split('T')[0],
                      content: '',
                      isImportant: true,
                    });
                  }}
                  className="px-4 py-2 font-semibold bg-slate-900 text-white rounded-lg cursor-pointer"
                >
                  + Tambah Pengumuman
                </button>
              </div>
            </div>
          )}

          {/* 20. PENGATURAN KONTAK SEKOLAH */}
          {activeMenu === '20_kontak' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Pengaturan Kontak Panitia, Media Sosial & Peta Lokasi
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveConfigToFirestore(
                      draftConfig,
                      'Memperbarui informasi kontak sekolah & panitia SPMB'
                    )
                  }
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                >
                  Simpan Kontak Sekolah
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nomor Telepon Resmi Sekolah
                  </label>
                  <input
                    type="text"
                    value={draftConfig.phone}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, phone: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Nomor WhatsApp Layanan Panitia
                  </label>
                  <input
                    type="text"
                    value={draftConfig.whatsapp}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, whatsapp: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Email Resmi Sekolah
                  </label>
                  <input
                    type="email"
                    value={draftConfig.email}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Jam Pelayanan Sekretariat SPMB
                  </label>
                  <input
                    type="text"
                    value={draftConfig.serviceHours}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, serviceHours: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    URL Embed Peta Lokasi Google Maps
                  </label>
                  <input
                    type="text"
                    value={draftConfig.mapEmbedUrl}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, mapEmbedUrl: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono-tabular"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 21. PENGATURAN AKSES DAN KEAMANAN */}
          {activeMenu === '21_keamanan' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Pengaturan Keamanan, Reset Kata Sandi & Audit Log Aktivitas
                </h2>
                <p className="text-xs text-slate-600">
                  Seluruh data pribadi calon murid dilindungi oleh Firestore Security Rules
                  (PII Isolation) dan hanya dapat dibaca oleh akun Admin terverifikasi.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!user.email) return;
                      try {
                        await sendPasswordResetEmail(auth, user.email);
                        showToast(
                          'success',
                          `Tautan reset kata sandi aman telah dikirim ke email ${user.email}.`
                        );
                      } catch (err) {
                        showToast(
                          'error',
                          err instanceof Error
                            ? err.message
                            : 'Gagal mengirim email reset kata sandi.'
                        );
                      }
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                  >
                    Kirim Tautan Reset Kata Sandi ke {user.email}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Catatan Aktivitas Admin (Audit Log Real-Time)
                </h3>
                <div className="space-y-2 text-xs max-h-80 overflow-y-auto">
                  {activityLogs.length === 0 ? (
                    <p className="text-slate-500">Belum ada log aktivitas tercatat.</p>
                  ) : (
                    activityLogs.map((log, i) => (
                      <div
                        key={log.id || i}
                        className="p-3 rounded-lg border border-slate-200 bg-[#F8FAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-emerald-950">{log.action}</span> ·{' '}
                          <span className="text-slate-700">{log.details}</span>
                        </div>
                        <span className="font-mono-tabular text-slate-500 shrink-0">
                          Oleh: {log.actorEmail}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 22. CADANGAN DATA, PEMULIHAN & PANDUAN LENGKAP HOSTING */}
          {activeMenu === '22_cadangan' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Cadangan Data (Backup) dan Pemulihan (Restore) Database
                </h2>
                <p className="text-xs text-slate-600">
                  Ekspor seluruh konfigurasi sekolah dan data pendaftar ke berkas JSON, atau
                  pulihkan konfigurasi dari berkas cadangan.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackupJsonExport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-emerald-900 text-white rounded-lg cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Cadangan Penuh (.json)</span>
                  </button>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Pulihkan Konfigurasi dari Berkas JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => handleBackupJsonRestore(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 10 Panduan Lengkap Bagian J */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                  <BookOpen className="w-5 h-5 text-emerald-800" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Panduan Lengkap 10 Langkah Konfigurasi Firebase & Publikasi Hosting Gratis
                    </h3>
                    <p className="text-xs text-slate-500">
                      Dokumentasi teknis resmi Panitia SPMB {config.schoolName} TA{' '}
                      {config.academicYear}
                    </p>
                  </div>
                </div>

                <ol className="space-y-3 text-xs text-slate-700 leading-relaxed">
                  <li>
                    <strong>1. Membuat Proyek Firebase:</strong> Buka{' '}
                    <span className="font-mono-tabular">console.firebase.google.com</span>, klik{' '}
                    <em>Add Project</em>, beri nama proyek (misalnya{' '}
                    <span className="font-mono-tabular">spmb-smamaarif05-padangratu</span>), dan
                    selesaikan pembuatan proyek gratis (Spark Plan).
                  </li>
                  <li>
                    <strong>2. Mengaktifkan Layanan Autentikasi:</strong> Masuk ke menu{' '}
                    <em>Build &gt; Authentication &gt; Sign-in method</em>, aktifkan penyedia{' '}
                    <strong>Google</strong> (dan opsional Email/Password) untuk login aman
                    Panitia SPMB.
                  </li>
                  <li>
                    <strong>3. Membuat Database Cloud Firestore:</strong> Masuk ke{' '}
                    <em>Build &gt; Firestore Database</em>, klik <em>Create Database</em>, pilih
                    lokasi server terdekat (misal <span className="font-mono-tabular">asia-southeast2</span> Jakarta).
                  </li>
                  <li>
                    <strong>4. Mengatur Penyimpanan Dokumen (Storage):</strong> Buka{' '}
                    <em>Build &gt; Storage</em> untuk menyimpan berkas unggahan pas foto, KK,
                    akta, dan SKL calon murid.
                  </li>
                  <li>
                    <strong>5. Mengatur Keamanan (Security Rules):</strong> Salin isi berkas{' '}
                    <span className="font-mono-tabular">firestore.rules</span> pada proyek ini ke tab{' '}
                    <em>Rules</em> di Firestore Console, lalu klik <em>Publish</em> agar data
                    pribadi (PII) calon murid terlindungi.
                  </li>
                  <li>
                    <strong>6. Menghubungkan Aplikasi dengan Database:</strong> Salin konfigurasi
                    Web SDK Firebase ke berkas{' '}
                    <span className="font-mono-tabular">firebase-applet-config.json</span>. Pada lingkungan ini,
                    database telah terhubung secara otomatis.
                  </li>
                  <li>
                    <strong>7. Membuat Akun Admin Pertama Secara Aman:</strong> Login menggunakan
                    akun Google resmi kepala sekolah/ketua panitia, lalu tambahkan UID panitia
                    lainnya melalui menu <em>12. Manajemen Akun Pengguna</em>.
                  </li>
                  <li>
                    <strong>8. Menguji Formulir dan Dashboard:</strong> Buka halaman publik,
                    uji pengisian formulir pendaftaran online, unduh Bukti Pendaftaran PDF,
                    verifikasi di Dashboard Admin, dan uji fitur Cek Status menggunakan Nomor
                    Pendaftaran + NISN.
                  </li>
                  <li>
                    <strong>9. Mempublikasikan Aplikasi ke Hosting Gratis:</strong> Jalankan{' '}
                    <span className="font-mono-tabular">npm run build</span> lalu deploy menggunakan{' '}
                    <span className="font-mono-tabular">firebase deploy --only hosting</span> atau gunakan tombol{' '}
                    <strong>Publish / Share</strong> di pojok kanan atas platform untuk
                    mendapatkan subdomain gratis.
                  </li>
                  <li>
                    <strong>10. Membagikan Tautan Publik kepada Calon Murid:</strong> Bagikan
                    tautan publik aplikasi ini ke grup WhatsApp SMP/MTs, brosur sekolah, dan
                    media sosial resmi {config.schoolName}.
                  </li>
                </ol>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Pratinjau Dokumen Unggahan */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{previewDoc.label}</h3>
                <p className="text-xs text-slate-500">{previewDoc.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-3 py-1 text-xs font-semibold bg-slate-100 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex justify-center bg-slate-50 p-4 rounded-lg">
              <img
                src={previewDoc.dataUrl}
                alt={previewDoc.label}
                referrerPolicy="no-referrer"
                className="max-w-full h-auto rounded"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Bukti / Formulir */}
      {printModalState && (
        <PrintDocumentModal
          mode={printModalState.mode}
          config={config}
          application={printModalState.app}
          onClose={() => setPrintModalState(null)}
        />
      )}
    </div>
  );
};
