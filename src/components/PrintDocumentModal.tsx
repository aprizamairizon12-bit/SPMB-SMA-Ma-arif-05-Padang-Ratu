import React from 'react';
import { Printer, X, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import {
  SchoolSpmbConfig,
  ApplicationRecord,
  StatusLookupRecord,
  UploadedDocumentData,
} from '../types/spmb';

interface PrintDocumentModalProps {
  mode: 'receipt' | 'full_form';
  config: SchoolSpmbConfig;
  application?: ApplicationRecord | null;
  lookup?: StatusLookupRecord | null;
  onClose: () => void;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  mode,
  config,
  application,
  lookup,
  onClose,
}) => {
  const regNumber = application?.regNumber || lookup?.regNumber || '-';
  const studentName = application?.fullName || lookup?.studentName || '-';
  const nisn = application?.nisn || lookup?.nisn || '-';
  const birthPlace = application?.birthPlace || lookup?.birthPlace || '-';
  const birthDate = application?.birthDate || lookup?.birthDate || '-';
  const originSchool = application?.originSchool || lookup?.originSchool || '-';
  const selectedProgram = application?.selectedProgram || lookup?.selectedProgram || '-';
  const status = application?.status || lookup?.status || 'Menunggu Verifikasi';
  const submittedDate = application?.submittedDate || lookup?.submittedDate || '-';
  const revisionNotes = application?.revisionNotes || lookup?.revisionNotes || '-';

  let uploadedDocs: UploadedDocumentData[] = [];
  if (application?.documentsJson) {
    try {
      uploadedDocs = JSON.parse(application.documentsJson);
    } catch {
      uploadedDocs = [];
    }
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-xl my-8 overflow-hidden">
        {/* Top Action Bar (Hidden when printing) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4 bg-emerald-950 text-white px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold">
                {mode === 'receipt'
                  ? 'Bukti Pendaftaran Resmi SPMB Online'
                  : 'Formulir Biodata Lengkap Calon Murid Baru'}
              </h3>
              <p className="text-xs text-emerald-200">
                Gunakan tombol Cetak / Simpan PDF untuk menyimpan dokumen ukuran A4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan sebagai PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-900 text-emerald-100 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <X className="w-4 h-4" />
              Tutup
            </button>
          </div>
        </div>

        {/* Printable Official Document Area */}
        <div id="printable-area" className="p-8 md:p-10 bg-white text-slate-900">
          {/* Kop Surat Resmi Sekolah */}
          <div className="flex items-center gap-5 border-b-2 border-slate-900 pb-5 mb-6">
            <img
              src={config.logoUrl}
              alt={config.schoolName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 object-contain shrink-0 rounded-lg border border-slate-200 p-1"
            />
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                {config.foundationName}
              </p>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                PANITIA SPMB {config.schoolName.toUpperCase()}
              </h1>
              <p className="text-xs text-slate-700 mt-1">
                NPSN: <span className="font-mono-tabular font-semibold">{config.npsn}</span> ·{' '}
                {config.accreditation} · Tahun Ajaran {config.academicYear}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {config.address}, Desa {config.village}, Kec. {config.district}, Kab.{' '}
                {config.regency}, Prov. {config.province} {config.postalCode}
              </p>
              <p className="text-xs text-slate-600">
                Telp/WA: {config.phone} · Email: {config.email}
              </p>
            </div>
          </div>

          {/* Judul Dokumen & Nomor Registrasi */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-50/70 border border-emerald-200 rounded-lg p-4 mb-6">
            <div>
              <p className="text-xs font-medium text-emerald-800">
                DOKUMEN RESMI SISTEM PENERIMAAN MURID BARU (SPMB) ONLINE
              </p>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {mode === 'receipt'
                  ? `TANDA BUKTI PENDAFTARAN — TA ${config.academicYear}`
                  : `FORMULIR BIODATA CALON MURID BARU — TA ${config.academicYear}`}
              </h2>
            </div>
            <div className="text-left md:text-right">
              <span className="text-xs text-slate-500 block">Nomor Pendaftaran Unik</span>
              <span className="font-mono-tabular text-lg font-bold text-emerald-900 tracking-tight">
                {regNumber}
              </span>
            </div>
          </div>

          {/* Tabel Data Utama Calon Murid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-3">
                  I. Identitas Calon Murid & Pilihan Peminatan
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-2.5 gap-x-4 text-sm">
                  <dt className="text-slate-500">Nomor Pendaftaran</dt>
                  <dd className="sm:col-span-2 font-mono-tabular font-bold text-slate-900">
                    {regNumber}
                  </dd>
                  <dt className="text-slate-500">Nama Lengkap</dt>
                  <dd className="sm:col-span-2 font-semibold text-slate-900">{studentName}</dd>
                  <dt className="text-slate-500">NISN</dt>
                  <dd className="sm:col-span-2 font-mono-tabular text-slate-900">{nisn}</dd>
                  {application && (
                    <>
                      <dt className="text-slate-500">NIK (16 Digit)</dt>
                      <dd className="sm:col-span-2 font-mono-tabular text-slate-900">
                        {application.nik}
                      </dd>
                      <dt className="text-slate-500">Jenis Kelamin / Agama</dt>
                      <dd className="sm:col-span-2 text-slate-900">
                        {application.gender} · {application.religion}
                      </dd>
                    </>
                  )}
                  <dt className="text-slate-500">Tempat, Tanggal Lahir</dt>
                  <dd className="sm:col-span-2 text-slate-900">
                    {birthPlace}, {birthDate}
                  </dd>
                  <dt className="text-slate-500">SMP / MTs Asal</dt>
                  <dd className="sm:col-span-2 text-slate-900">
                    {originSchool}
                    {application?.originNpsn && application.originNpsn !== '-'
                      ? ` (NPSN: ${application.originNpsn})`
                      : ''}
                  </dd>
                  <dt className="text-slate-500">Program / Peminatan</dt>
                  <dd className="sm:col-span-2 font-medium text-emerald-900">{selectedProgram}</dd>
                  <dt className="text-slate-500">Tanggal Terdaftar</dt>
                  <dd className="sm:col-span-2 font-mono-tabular text-slate-900">
                    {submittedDate}
                  </dd>
                </dl>
              </div>

              {application && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-3">
                    II. Alamat Domisili & Data Orang Tua / Wali
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-4 text-sm">
                    <dt className="text-slate-500">Alamat Lengkap</dt>
                    <dd className="sm:col-span-2 text-slate-900">
                      {application.address}, Desa/Kel. {application.village}, Kec.{' '}
                      {application.district}, {application.regency}, {application.province}
                    </dd>
                    <dt className="text-slate-500">Nomor Telepon Murid</dt>
                    <dd className="sm:col-span-2 font-mono-tabular text-slate-900">
                      {application.phone}
                    </dd>
                    <dt className="text-slate-500">Nama Ayah & Ibu</dt>
                    <dd className="sm:col-span-2 text-slate-900">
                      Ayah: {application.fatherName} · Ibu: {application.motherName}
                    </dd>
                    <dt className="text-slate-500">Pekerjaan & HP Ortu</dt>
                    <dd className="sm:col-span-2 text-slate-900">
                      {application.parentJob} ·{' '}
                      <span className="font-mono-tabular">{application.parentPhone}</span>
                    </dd>
                    {application.guardianName && application.guardianName !== '-' && (
                      <>
                        <dt className="text-slate-500">Nama Wali</dt>
                        <dd className="sm:col-span-2 text-slate-900">{application.guardianName}</dd>
                      </>
                    )}
                  </dl>
                </div>
              )}
            </div>

            {/* Kolom Status & Kode Verifikasi */}
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/70 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-xs text-slate-500 block">Status Pendaftaran Saat Ini</span>
                <p className="text-base font-bold text-emerald-900 mt-1">{status}</p>
                {revisionNotes && revisionNotes !== '-' && (
                  <p className="text-xs text-slate-700 mt-2 border-t border-slate-200 pt-2">
                    <span className="font-semibold">Catatan Panitia:</span> {revisionNotes}
                  </p>
                )}
              </div>

              {uploadedDocs.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-1.5">
                    Rekap Berkas Terunggah ({uploadedDocs.length}):
                  </span>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {uploadedDocs.map((d) => (
                      <li key={d.docId} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate">{d.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>TERVERIFIKASI SISTEM ONLINE</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-mono-tabular">
                  Kunci Verifikasi: {regNumber}_{nisn}
                </p>
              </div>
            </div>
          </div>

          {/* Keterangan Gratis 100% */}
          <div className="border border-emerald-300 bg-emerald-50/60 rounded-lg p-3.5 mb-8 text-xs text-emerald-950">
            <p className="font-bold">
              KEBIJAKAN RESMI: PENDAFTARAN MURID BARU GRATIS 100% (TANPA BIAYA)
            </p>
            <p className="mt-0.5 text-slate-700">
              {config.freeRegistrationNotice} Simpan tanda bukti ini untuk keperluan verifikasi dan
              daftar ulang di {config.schoolName}.
            </p>
          </div>

          {/* Tanda Tangan */}
          <div className="grid grid-cols-2 gap-8 text-xs text-slate-700 pt-2">
            <div>
              <p>Calon Murid Pendaftar,</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900 underline">{studentName}</p>
              <p className="font-mono-tabular text-slate-500">NISN: {nisn}</p>
            </div>
            <div className="text-right">
              <p>
                {config.district}, {submittedDate}
              </p>
              <p>Ketua Panitia SPMB {config.shortName},</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900 underline">{config.committeeHeadName}</p>
              <p className="text-slate-500">Panitia SPMB TA {config.academicYear}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
