import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  AlertCircle,
  Upload,
  Printer,
  Phone,
  Mail,
  MapPin,
  Calendar,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  Lock,
  ExternalLink,
} from 'lucide-react';
import {
  SchoolSpmbConfig,
  UploadedDocumentData,
  ApplicationRecord,
  StatusLookupRecord,
  PublicSectionConfig,
} from '../types/spmb';
import { processAndUploadDocument } from '../firebase';
import {
  submitOnlineRegistration,
  checkStatusByRegNumberAndNisn,
} from '../services/spmbService';
import { PrintDocumentModal } from './PrintDocumentModal';

interface PublicPortalProps {
  config: SchoolSpmbConfig;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
}

export const PublicPortal: React.FC<PublicPortalProps> = ({
  config,
  onOpenAdmin,
  isAdminLoggedIn,
}) => {
  const [activeView, setActiveView] = useState<'home' | 'register' | 'status'>('home');

  // Registration Form State
  const [formValues, setFormValues] = useState<Record<string, string>>({
    gender: 'Laki-laki',
    religion: 'Islam',
    graduationYear: '2027',
    selectedProgram: config.programs[0]?.title || 'Peminatan Sains & Teknologi (MIPA)',
    village: config.village,
    district: config.district,
    regency: config.regency,
    province: config.province,
  });
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDocumentData>>({});
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<{
    application: ApplicationRecord;
    lookup: StatusLookupRecord;
  } | null>(null);

  // Status Check State
  const [lookupRegNumber, setLookupRegNumber] = useState('');
  const [lookupNisn, setLookupNisn] = useState('');
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<StatusLookupRecord | null>(null);

  // Print Receipt Modal State
  const [printModalData, setPrintModalData] = useState<{
    application?: ApplicationRecord | null;
    lookup?: StatusLookupRecord | null;
  } | null>(null);

  const handleFieldChange = (id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
    if (formError) setFormError(null);
  };

  const handleFileSelect = async (
    docReqId: string,
    docLabel: string,
    fileList: FileList | null
  ) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (file.size > 5 * 1024 * 1024) {
      setFormError(`Ukuran berkas "${docLabel}" maksimal 5 MB.`);
      return;
    }
    setUploadingDocId(docReqId);
    setFormError(null);
    try {
      const processed = await processAndUploadDocument(file, 'TEMP_REG', docReqId);
      setUploadedDocs((prev) => ({
        ...prev,
        [docReqId]: {
          docId: docReqId,
          label: docLabel,
          ...processed,
        },
      }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal memproses berkas dokumen.');
    } finally {
      setUploadingDocId(null);
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!config.registrationOpen) {
      setFormError('Mohon maaf, pendaftaran online saat ini sedang ditutup oleh Panitia SPMB.');
      return;
    }

    // Validate required fields
    const activeFields = config.formFields.filter((f) => f.enabled);
    for (const field of activeFields) {
      if (field.required && (!formValues[field.id] || !formValues[field.id].trim())) {
        setFormError(`Kolom wajib "${field.label}" harus diisi dengan lengkap.`);
        return;
      }
    }

    // Validate NISN format
    const nisnVal = (formValues.nisn || '').trim();
    if (!/^[a-zA-Z0-9_-]{4,32}$/.test(nisnVal)) {
      setFormError('NISN hanya boleh berisi angka/huruf tanpa spasi (minimal 4 karakter).');
      return;
    }

    // Validate required documents
    const activeDocReqs = config.documentRequirements.filter((d) => d.enabled);
    for (const docReq of activeDocReqs) {
      if (docReq.required && !uploadedDocs[docReq.id]) {
        setFormError(`Dokumen wajib "${docReq.label}" belum diunggah.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const docsList = Object.values(uploadedDocs);
      const res = await submitOnlineRegistration(formValues, docsList, config);
      setSubmittedResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setFormError(
        err instanceof Error
          ? `Gagal mengirim pendaftaran: ${err.message}`
          : 'Terjadi kesalahan saat menyimpan pendaftaran ke database.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);
    setStatusResult(null);

    const cleanReg = lookupRegNumber.trim().toUpperCase();
    const cleanNisn = lookupNisn.trim();

    if (!cleanReg || !cleanNisn) {
      setStatusError('Masukkan Nomor Pendaftaran dan NISN untuk melakukan verifikasi.');
      return;
    }

    setIsCheckingStatus(true);
    try {
      const found = await checkStatusByRegNumberAndNisn(cleanReg, cleanNisn);
      if (!found) {
        setStatusError(
          'Data pendaftaran tidak ditemukan. Pastikan Nomor Pendaftaran dan NISN sesuai dengan Bukti Pendaftaran Anda.'
        );
      } else {
        setStatusResult(found);
      }
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : 'Gagal memeriksa status pendaftaran.'
      );
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const sortedSections = [...config.sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const renderSection = (section: PublicSectionConfig) => {
    switch (section.type) {
      case 'hero':
        return (
          <section
            key={section.id}
            className="bg-emerald-950 text-white border-b border-emerald-900"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                {/* Left Column: Proposition & Primary CTA */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-medium">
                      <span>SPMB ONLINE TAHUN AJARAN {config.academicYear}</span>
                      <span aria-hidden="true">·</span>
                      <span>NPSN {config.npsn}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {config.registrationOpen
                          ? 'PENDAFTARAN DIBUKA'
                          : 'PENDAFTARAN DITUTUP'}
                      </span>
                    </div>

                    <h1
                      className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight"
                      style={{ textWrap: 'balance' }}
                    >
                      {config.bannerHeadline}
                    </h1>

                    <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed max-w-2xl">
                      {config.bannerSubheadline}
                    </p>

                    <div className="p-4 rounded-xl bg-emerald-900/70 border border-emerald-800/80 text-sm text-emerald-50">
                      <p className="font-semibold text-amber-300">
                        Kebijakan Resmi Tanpa Biaya (100% Gratis):
                      </p>
                      <p className="mt-1 text-xs sm:text-sm text-emerald-100">
                        {config.freeRegistrationNotice}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('register');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <span>Daftar Sekarang (Gratis)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveView('status');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium bg-emerald-900 text-white border border-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Search className="w-4 h-4 text-amber-400" />
                      <span>Cek Status Pendaftaran</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Visual Campus Showcase */}
                <div className="lg:col-span-5 flex flex-col">
                  <div className="relative flex-1 min-h-[280px] rounded-xl overflow-hidden border border-emerald-800 bg-emerald-900">
                    <img
                      src={config.bannerImageUrl}
                      alt={config.schoolName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={config.logoUrl}
                          alt="Logo Sekolah"
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-lg bg-white p-1 object-contain shrink-0"
                        />
                        <div>
                          <p className="text-sm font-bold text-white">{config.schoolName}</p>
                          <p className="text-xs text-emerald-200">
                            Kec. {config.district}, Kab. {config.regency}, {config.province}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-Width Key Information Strip Below Hero Split */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-emerald-900/90">
                <div>
                  <span className="text-xs text-emerald-300 block">Periode Pendaftaran</span>
                  <span className="font-mono-tabular text-sm font-semibold text-white mt-0.5 block">
                    {config.startDate} s/d {config.endDate}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-emerald-300 block">Jadwal Pengumuman</span>
                  <span className="font-mono-tabular text-sm font-semibold text-white mt-0.5 block">
                    {config.announcementDate}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-emerald-300 block">Biaya Pendaftaran & Formulir</span>
                  <span className="font-mono-tabular text-sm font-bold text-amber-400 mt-0.5 block">
                    Rp 0,- (GRATIS 100%)
                  </span>
                </div>
                <div>
                  <span className="text-xs text-emerald-300 block">Layanan Informasi Panitia</span>
                  <span className="font-mono-tabular text-sm font-semibold text-white mt-0.5 block">
                    {config.committeeContactPhone}
                  </span>
                </div>
              </div>
            </div>
          </section>
        );

      case 'profile_history':
        return (
          <section
            key={section.id}
            id="profil"
            className="py-14 bg-white border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-10">
                <p className="text-xs font-semibold text-emerald-800 tracking-wide uppercase">
                  01. Identitas & Sejarah Satuan Pendidikan
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                      Profil {config.schoolName}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                      {config.profileSummary}
                    </p>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Sejarah Singkat</h3>
                    <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                      {config.history}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Nama Resmi</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block">
                        {config.schoolName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">NPSN / Akreditasi</span>
                      <span className="font-mono-tabular font-semibold text-slate-900 mt-0.5 block">
                        {config.npsn} · {config.accreditation}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Naungan Yayasan</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block">
                        {config.foundationName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Kepala Sekolah</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block">
                        {config.principalName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Ketua Panitia SPMB</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block">
                        {config.committeeHeadName}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Lokasi</span>
                      <span className="font-semibold text-slate-900 mt-0.5 block">
                        {config.district}, {config.regency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sambutan Kepala Sekolah */}
                <div className="lg:col-span-5 bg-[#F8FAF8] border border-slate-200 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={config.logoUrl}
                      alt={config.principalName}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-lg object-contain bg-white border border-slate-200 p-1 shrink-0"
                    />
                    <div>
                      <p className="text-xs text-emerald-800 font-semibold">
                        Sambutan Kepala Sekolah
                      </p>
                      <h3 className="text-base font-bold text-slate-900">
                        {config.principalName}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Kepala {config.schoolName}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    "{config.principalWelcome}"
                  </p>
                  {config.additionalInfo && (
                    <div className="pt-3 border-t border-slate-200 text-xs text-emerald-900">
                      <span className="font-semibold">Informasi Beasiswa & Bantuan: </span>
                      {config.additionalInfo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'vision_mission':
        return (
          <section
            key={section.id}
            className="py-14 bg-[#F8FAF8] border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-emerald-950 text-white rounded-xl p-6 sm:p-8 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      02. Visi Satuan Pendidikan
                    </p>
                    <h2 className="text-2xl font-bold mt-2">Visi Sekolah</h2>
                    <p className="text-base text-emerald-100 leading-relaxed mt-4">
                      "{config.vision}"
                    </p>
                  </div>
                  <div className="mt-8 pt-6 border-t border-emerald-800">
                    <p className="text-xs text-emerald-300 font-semibold mb-3">
                      Rekam Jejak & Prestasi Sekolah:
                    </p>
                    <div className="space-y-2.5">
                      {config.achievements.map((ach) => (
                        <div key={ach.id} className="text-xs">
                          <p className="font-semibold text-white">{ach.title}</p>
                          <p className="text-emerald-300">
                            {ach.level} · {ach.year} · {ach.organizer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Penjabaran Misi Pendidikan
                  </p>
                  <h3 className="text-xl font-bold text-slate-900 mt-1 mb-5">
                    Misi {config.schoolName}
                  </h3>
                  <ol className="space-y-4">
                    {config.missions.map((mission, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3.5 pb-4 border-b border-slate-100 last:border-none last:pb-0"
                      >
                        <span className="font-mono-tabular text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded shrink-0">
                          0{idx + 1}
                        </span>
                        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                          {mission}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </section>
        );

      case 'programs':
        return (
          <section
            key={section.id}
            id="program"
            className="py-14 bg-white border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-10">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  03. Kurikulum & Peminatan Akademik
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {config.programs.map((prog, index) => (
                  <div
                    key={prog.id}
                    className={`rounded-xl border p-6 flex flex-col justify-between ${
                      index === 0
                        ? 'bg-[#F8FAF8] border-emerald-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-emerald-800 font-mono-tabular mb-2">
                        <span>0{index + 1}</span>
                        <span aria-hidden="true">·</span>
                        <span>{prog.code}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{prog.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed mt-2.5">
                        {prog.description}
                      </p>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-500">
                      {prog.highlights}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'facilities':
        return (
          <section
            key={section.id}
            className="py-14 bg-[#F8FAF8] border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-10">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  04. Sarana & Prasarana Pendidikan
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {config.facilities.map((fac) => (
                  <div
                    key={fac.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 sm:grid-cols-12"
                  >
                    {fac.imageUrl && (
                      <div className="sm:col-span-5 min-h-[180px] bg-slate-100">
                        <img
                          src={fac.imageUrl}
                          alt={fac.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={`${
                        fac.imageUrl ? 'sm:col-span-7' : 'sm:col-span-12'
                      } p-5 flex flex-col justify-between`}
                    >
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          Kondisi Sarana: {fac.condition}
                        </div>
                        <h3 className="text-base font-bold text-slate-900">{fac.name}</h3>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                          {fac.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'extracurriculars':
        return (
          <section
            key={section.id}
            className="py-14 bg-white border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-8">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  05. Pembinaan Bakat & Kepemimpinan
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3.5 px-4">Nama Ekstrakurikuler</th>
                      <th className="py-3.5 px-4">Bidang Pembinaan</th>
                      <th className="py-3.5 px-4">Jadwal Latihan</th>
                      <th className="py-3.5 px-4">Capaian / Kegiatan Unggulan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {config.extracurriculars.map((eks) => (
                      <tr key={eks.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {eks.name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{eks.category}</td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs text-slate-600">
                          {eks.schedule}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">{eks.achievement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section
            key={section.id}
            className="py-14 bg-[#F8FAF8] border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-10">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  06. Dokumentasi Lingkungan Sekolah
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {config.gallery.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                      {item.mediaType === 'video' ? (
                        <iframe
                          src={item.url}
                          title={item.title}
                          className="w-full h-full"
                          allowFullScreen
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-slate-500">
                          {item.category} · {item.mediaType === 'video' ? 'Video' : 'Foto'}
                        </p>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {item.caption}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );

      case 'requirements_flow':
        return (
          <section
            key={section.id}
            id="alur-syarat"
            className="py-14 bg-white border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-10">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  07. Panduan Pendaftaran Calon Murid Baru
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Persyaratan */}
                <div className="lg:col-span-5 bg-[#F8FAF8] border border-slate-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Persyaratan Pendaftaran SPMB {config.academicYear}
                  </h3>
                  <ul className="space-y-3">
                    {config.requirementsList.map((req, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    <p className="text-xs font-semibold text-emerald-900">
                      Keterangan Bebas Biaya:
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Seluruh calon murid tidak dikenakan biaya formulir maupun biaya
                      pendaftaran (100% Gratis).
                    </p>
                  </div>
                </div>

                {/* Alur Pendaftaran */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {config.registrationSteps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                    >
                      <div>
                        <span className="font-mono-tabular text-xs font-bold text-emerald-800">
                          TAHAP {step.stepNumber}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          {step.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );

      case 'schedule':
        return (
          <section
            key={section.id}
            className="py-14 bg-[#F8FAF8] border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-8">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  08. Agenda Pelaksanaan SPMB
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
              </div>

              <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3.5 px-4">Tahapan Kegiatan SPMB</th>
                      <th className="py-3.5 px-4">Rentang Tanggal</th>
                      <th className="py-3.5 px-4">Keterangan Pelaksanaan</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {config.schedules.map((sch) => (
                      <tr key={sch.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {sch.phaseName}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs font-medium text-emerald-900">
                          {sch.dateRange}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{sch.description}</td>
                        <td className="py-3.5 px-4 text-xs font-semibold">
                          {sch.isActive ? (
                            <span className="text-emerald-800">Sedang Berlangsung</span>
                          ) : (
                            <span className="text-slate-500">Terjadwal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );

      case 'announcements':
        return (
          <section
            key={section.id}
            className="py-14 bg-white border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-8">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  09. Siaran Resmi Panitia SPMB
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                  {section.title}
                </h2>
                <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {config.announcements.map((ann) => (
                  <article
                    key={ann.id}
                    className="bg-[#F8FAF8] border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <span>{ann.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">{ann.date}</span>
                        {ann.isImportant && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-emerald-800">Penting</span>
                          </>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                      <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
                        {ann.content}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section
            key={section.id}
            id="kontak"
            className="py-14 bg-[#F8FAF8] border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-6 space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                      10. Sekretariat Panitia SPMB
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                      {section.title}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">Alamat Kampus Sekolah</p>
                        <p className="text-slate-600 mt-0.5">
                          {config.address}, Desa {config.village}, Kec. {config.district}, Kab.{' '}
                          {config.regency}, Provinsi {config.province} ({config.postalCode})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          Telepon & WhatsApp Panitia SPMB
                        </p>
                        <p className="text-slate-600 mt-0.5 font-mono-tabular">
                          {config.phone} / WA: {config.whatsapp} ({config.committeeHeadName})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">Email Resmi & Jam Layanan</p>
                        <p className="text-slate-600 mt-0.5">
                          {config.email} · {config.serviceHours}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Peta Lokasi {config.schoolName}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">{config.mapCoordinatesText}</p>
                  <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                    <iframe
                      src={config.mapEmbedUrl}
                      title={`Peta Lokasi ${config.schoolName}`}
                      className="w-full h-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'custom':
        return (
          <section
            key={section.id}
            className="py-12 bg-white border-b border-slate-200"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
              <p className="text-sm text-slate-500 mt-1">{section.subtitle}</p>
              <div className="mt-4 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {section.customContent}
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-slate-900">
      {/* Top Bar Contract: Strictly 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 py-3.5">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#beranda"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-base sm:text-lg font-bold tracking-tight text-emerald-950 whitespace-nowrap shrink-0"
          >
            {config.schoolName}
          </a>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#beranda"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('home');
              }}
              className={`hover:text-emerald-900 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'home' ? 'text-emerald-900 font-semibold underline underline-offset-8' : ''
              }`}
            >
              Beranda
            </a>
            <a
              href="#profil"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('home');
                setTimeout(() => {
                  document.getElementById('profil')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="hover:text-emerald-900 transition-colors whitespace-nowrap shrink-0"
            >
              Profil Sekolah
            </a>
            <a
              href="#alur-syarat"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('home');
                setTimeout(() => {
                  document.getElementById('alur-syarat')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="hover:text-emerald-900 transition-colors whitespace-nowrap shrink-0"
            >
              Persyaratan
            </a>
            <a
              href="#daftar"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('register');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-emerald-900 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'register'
                  ? 'text-emerald-900 font-semibold underline underline-offset-8'
                  : ''
              }`}
            >
              Formulir Online
            </a>
            <a
              href="#cek-status"
              onClick={(e) => {
                e.preventDefault();
                setActiveView('status');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-emerald-900 transition-colors whitespace-nowrap shrink-0 ${
                activeView === 'status'
                  ? 'text-emerald-900 font-semibold underline underline-offset-8'
                  : ''
              }`}
            >
              Cek Status
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveView('register');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-900 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Daftar Sekarang
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Workspace Mode Switcher below the fold / header */}
      <div className="bg-emerald-900/95 text-emerald-50 border-b border-emerald-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 p-1 bg-emerald-950/60 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'home'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Informasi Sekolah & SPMB
            </button>
            <button
              type="button"
              onClick={() => setActiveView('register')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'register'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Isi Formulir Pendaftaran
            </button>
            <button
              type="button"
              onClick={() => setActiveView('status')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'status'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              Cek Status & Pengumuman
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-950/80 hover:bg-emerald-950 text-amber-300 font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{isAdminLoggedIn ? 'Buka Dashboard Admin' : 'Login Admin Panitia'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === 'home' && (
          <div>{sortedSections.map((section) => renderSection(section))}</div>
        )}

        {activeView === 'register' && (
          <section className="py-10 sm:py-14">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header Formulir */}
              <div className="bg-emerald-950 text-white rounded-xl p-6 sm:p-8 mb-8 border border-emerald-900">
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-medium mb-2">
                  <span>FORMULIR RESMI SPMB {config.academicYear}</span>
                  <span aria-hidden="true">·</span>
                  <span>PENDAFTARAN GRATIS 100%</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  Formulir Pendaftaran Calon Murid Baru
                </h1>
                <p className="text-sm text-emerald-100 mt-1">
                  {config.schoolName} — Isi data di bawah ini dengan benar sesuai dokumen
                  kependudukan dan sekolah asal.
                </p>
              </div>

              {submittedResult ? (
                <div className="bg-white border border-emerald-300 rounded-xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Pendaftaran Berhasil Tersimpan di Database Online
                      </p>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                        Selamat, {submittedResult.application.fullName}!
                      </h2>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {config.confirmationMessage}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-[#F8FAF8] border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Nomor Pendaftaran Unik
                      </span>
                      <span className="font-mono-tabular text-base font-bold text-emerald-900">
                        {submittedResult.application.regNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">NISN Verifikasi</span>
                      <span className="font-mono-tabular text-base font-bold text-slate-900">
                        {submittedResult.application.nisn}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">Status Saat Ini</span>
                      <span className="text-sm font-bold text-amber-700">
                        {submittedResult.application.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPrintModalData({
                          application: submittedResult.application,
                          lookup: submittedResult.lookup,
                        })
                      }
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak / Simpan PDF Bukti Pendaftaran</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLookupRegNumber(submittedResult.application.regNumber);
                        setLookupNisn(submittedResult.application.nisn);
                        setStatusResult(submittedResult.lookup);
                        setActiveView('status');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Search className="w-4 h-4" />
                      <span>Lihat di Halaman Cek Status</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSubmittedResult(null)}
                      className="px-4 py-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Daftarkan Calon Murid Lain
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRegistrationSubmit} className="space-y-8">
                  {formError && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-900">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Perhatian</p>
                        <p className="mt-0.5">{formError}</p>
                      </div>
                    </div>
                  )}

                  {/* Kelompok 1: Data Calon Murid */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 mb-6">
                      1. Data Pribadi Calon Murid
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {config.formFields
                        .filter((f) => f.enabled && f.group === 'student')
                        .map((field) => (
                          <div
                            key={field.id}
                            className={
                              field.type === 'textarea' ? 'sm:col-span-2' : 'sm:col-span-1'
                            }
                          >
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {field.label}{' '}
                              {field.required && <span className="text-red-600">*</span>}
                            </label>
                            {field.type === 'select' ? (
                              <select
                                value={formValues[field.id] || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                required={field.required}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                              >
                                <option value="">-- Pilih {field.label} --</option>
                                {(field.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                rows={3}
                                value={formValues[field.id] || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                              />
                            ) : (
                              <input
                                type={field.type}
                                value={formValues[field.id] || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Kelompok 2: Data Orang Tua / Wali */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 mb-6">
                      2. Data Orang Tua / Wali
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {config.formFields
                        .filter((f) => f.enabled && f.group === 'parent')
                        .map((field) => (
                          <div
                            key={field.id}
                            className={
                              field.type === 'textarea' ? 'sm:col-span-2' : 'sm:col-span-1'
                            }
                          >
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {field.label}{' '}
                              {field.required && <span className="text-red-600">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                              <textarea
                                rows={2}
                                value={formValues[field.id] || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                              />
                            ) : (
                              <input
                                type={field.type}
                                value={formValues[field.id] || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Kelompok 3: Data Sekolah Asal */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 mb-6">
                      3. Data Sekolah Asal (SMP / MTs / Sederajat)
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {config.formFields
                        .filter((f) => f.enabled && f.group === 'school')
                        .map((field) => (
                          <div key={field.id}>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                              {field.label}{' '}
                              {field.required && <span className="text-red-600">*</span>}
                            </label>
                            {field.type === 'select' ? (
                              <select
                                value={formValues[field.id] || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                required={field.required}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                              >
                                {(field.options || ['2027', '2026', '2025']).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={field.type}
                                value={formValues[field.id] || ''}
                                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                placeholder={field.placeholder || ''}
                                required={field.required}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Kelompok 4: Unggah Dokumen Persyaratan */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                    <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-3 mb-2">
                      4. Unggah Dokumen Persyaratan
                    </h2>
                    <p className="text-xs text-slate-500 mb-6">
                      Unggah foto jelas atau scan dokumen asli. Privasi dokumen Anda dijamin
                      dan hanya dapat diakses oleh Panitia Verifikasi SPMB.
                    </p>

                    <div className="space-y-4">
                      {config.documentRequirements
                        .filter((d) => d.enabled)
                        .map((docReq) => {
                          const uploaded = uploadedDocs[docReq.id];
                          const isUploading = uploadingDocId === docReq.id;
                          return (
                            <div
                              key={docReq.id}
                              className="p-4 rounded-lg border border-slate-200 bg-[#F8FAF8] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900">
                                    {docReq.label}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    · {docReq.required ? 'Wajib' : 'Opsional'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600">{docReq.description}</p>
                                {uploaded && (
                                  <p className="text-xs font-medium text-emerald-800 flex items-center gap-1.5 pt-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>
                                      Terunggah: {uploaded.name} (
                                      {Math.round(uploaded.size / 1024)} KB)
                                    </span>
                                  </p>
                                )}
                              </div>

                              <div className="shrink-0">
                                <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-emerald-800 text-emerald-900 bg-white hover:bg-emerald-50 transition-colors cursor-pointer whitespace-nowrap">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>
                                    {isUploading
                                      ? 'Memproses...'
                                      : uploaded
                                      ? 'Ganti Berkas'
                                      : 'Pilih Berkas'}
                                  </span>
                                  <input
                                    type="file"
                                    accept={docReq.acceptedFormats}
                                    onChange={(e) =>
                                      handleFileSelect(
                                        docReq.id,
                                        docReq.label,
                                        e.target.files
                                      )
                                    }
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Pernyataan & Tombol Kirim */}
                  <div className="bg-emerald-950 text-white rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-amber-400">
                        Pernyataan Kebenaran Data & Pendaftaran Gratis 100%
                      </p>
                      <p className="text-xs text-emerald-100 leading-relaxed max-w-xl">
                        Dengan mengirim formulir ini, saya menyatakan bahwa data yang diisikan
                        adalah benar dan memahami bahwa pendaftaran SPMB {config.schoolName}{' '}
                        tidak dipungut biaya apa pun.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3.5 text-sm font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {isSubmitting
                        ? 'Menyimpan ke Database...'
                        : 'Kirim Formulir Pendaftaran'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {activeView === 'status' && (
          <section className="py-10 sm:py-14">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verifikasi Privasi Terlindungi</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Cek Status Pendaftaran & Pengumuman Hasil Seleksi
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Demi menjaga kerahasiaan data pribadi calon murid, masukkan kombinasi{' '}
                  <span className="font-semibold text-slate-900">Nomor Pendaftaran</span> dan{' '}
                  <span className="font-semibold text-slate-900">NISN</span> Anda.
                </p>

                <form onSubmit={handleStatusSearch} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Nomor Pendaftaran Unik
                      </label>
                      <input
                        type="text"
                        value={lookupRegNumber}
                        onChange={(e) => setLookupRegNumber(e.target.value)}
                        placeholder={`Contoh: ${config.regPrefix}-0101`}
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono-tabular uppercase text-slate-900 focus:border-emerald-700 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Nomor Induk Siswa Nasional (NISN)
                      </label>
                      <input
                        type="text"
                        value={lookupNisn}
                        onChange={(e) => setLookupNisn(e.target.value)}
                        placeholder="Contoh: 0123456781"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono-tabular text-slate-900 focus:border-emerald-700 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-slate-500">
                      Contoh uji coba (jika sampel aktif):{' '}
                      <span className="font-mono-tabular font-semibold text-slate-700">
                        {config.regPrefix}-0101
                      </span>{' '}
                      / NISN:{' '}
                      <span className="font-mono-tabular font-semibold text-slate-700">
                        0123456781
                      </span>
                    </p>
                    <button
                      type="submit"
                      disabled={isCheckingStatus}
                      className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Search className="w-4 h-4" />
                      <span>
                        {isCheckingStatus
                          ? 'Memeriksa Database...'
                          : 'Periksa Status Pendaftaran'}
                      </span>
                    </button>
                  </div>
                </form>

                {statusError && (
                  <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-900 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <span>{statusError}</span>
                  </div>
                )}
              </div>

              {statusResult && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <span className="text-xs text-slate-500 block">
                        Hasil Pencarian Terverifikasi
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                        {statusResult.studentName}
                      </h2>
                      <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                        No. Pendaftaran: {statusResult.regNumber} · NISN: {statusResult.nisn}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs text-slate-500 block">Status Seleksi & Berkas</span>
                      <span
                        className={`inline-block mt-1 text-base font-bold ${
                          statusResult.status === 'Diterima'
                            ? 'text-emerald-700'
                            : statusResult.status === 'Tidak Diterima'
                            ? 'text-red-700'
                            : statusResult.status === 'Perlu Perbaikan Data'
                            ? 'text-amber-700'
                            : 'text-slate-900'
                        }`}
                      >
                        {statusResult.status}
                      </span>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Tempat, Tanggal Lahir</dt>
                      <dd className="font-medium text-slate-900 mt-0.5">
                        {statusResult.birthPlace}, {statusResult.birthDate}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Sekolah Asal (SMP/MTs)</dt>
                      <dd className="font-medium text-slate-900 mt-0.5">
                        {statusResult.originSchool}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Program / Peminatan</dt>
                      <dd className="font-medium text-emerald-900 mt-0.5">
                        {statusResult.selectedProgram}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Status Dokumen Unggahan</dt>
                      <dd className="font-medium text-slate-900 mt-0.5">
                        {statusResult.docSummary}
                      </dd>
                    </div>
                  </dl>

                  {statusResult.revisionNotes && statusResult.revisionNotes !== '-' && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-950">
                      <p className="font-bold">Catatan Verifikasi / Perbaikan dari Panitia:</p>
                      <p className="mt-1">{statusResult.revisionNotes}</p>
                    </div>
                  )}

                  {statusResult.status === 'Diterima' && (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-950">
                      <p className="font-bold">
                        Selamat! Anda Dinyatakan DITERIMA pada SPMB {config.schoolName} TA{' '}
                        {config.academicYear}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm leading-relaxed">
                        {config.selectionAnnouncementNote}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPrintModalData({ lookup: statusResult })}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak / Unduh PDF Bukti Pendaftaran</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="bg-emerald-950 text-emerald-100 border-t border-emerald-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs">
          <div className="space-y-1">
            <p className="text-sm font-bold text-white">{config.schoolName}</p>
            <p className="text-emerald-200">
              {config.address}, Kec. {config.district}, Kab. {config.regency}, Prov.{' '}
              {config.province}
            </p>
            <p className="text-amber-300 font-medium">
              Kebijakan Resmi: Pendaftaran Murid Baru Tahun Ajaran {config.academicYear} Gratis
              100% Tanpa Biaya.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-emerald-200">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="hover:text-white cursor-pointer"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => setActiveView('register')}
              className="hover:text-white cursor-pointer"
            >
              Formulir Pendaftaran
            </button>
            <button
              type="button"
              onClick={() => setActiveView('status')}
              className="hover:text-white cursor-pointer"
            >
              Cek Status
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hover:text-amber-300 cursor-pointer font-semibold"
            >
              Dashboard Admin Panitia
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Cetak Bukti Pendaftaran */}
      {printModalData && (
        <PrintDocumentModal
          mode="receipt"
          config={config}
          application={printModalData.application}
          lookup={printModalData.lookup}
          onClose={() => setPrintModalData(null)}
        />
      )}
    </div>
  );
};
