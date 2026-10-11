import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  serverTimestamp,
  collection,
} from 'firebase/firestore';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import {
  SchoolSpmbConfig,
  ApplicationRecord,
  StatusLookupRecord,
  UploadedDocumentData,
  AdminUserRecord,
} from '../types/spmb';

function sanitizeId(raw: string, maxLen = 64): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned.slice(0, maxLen) || 'ID0001';
}

function truncateStr(val: unknown, maxLen: number, fallback = '-'): string {
  const s = typeof val === 'string' ? val.trim() : String(val ?? '').trim();
  if (!s) return fallback;
  return s.slice(0, maxLen);
}

export async function logAdminActivity(
  action: string,
  target: string,
  details: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const logId = `LOG_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `activity_logs/${logId}`;
  try {
    await setDoc(doc(db, 'activity_logs', logId), {
      actorUid: sanitizeId(currentUser.uid, 128),
      actorEmail: truncateStr(currentUser.email || 'admin@sch.id', 200),
      action: truncateStr(action, 120),
      target: truncateStr(target, 200),
      details: truncateStr(details, 1000),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('Activity log warning:', error);
    // Do not interrupt primary workflow if activity log fails
    void path;
  }
}

export async function saveSchoolSpmbConfig(
  config: SchoolSpmbConfig,
  changeSummary = 'Memperbarui konfigurasi sekolah & SPMB'
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Anda harus masuk sebagai Admin untuk menyimpan pengaturan.');
  }
  const path = 'public_config/school_spmb';
  const payloadJson = JSON.stringify(config).slice(0, 449000);
  try {
    await setDoc(doc(db, 'public_config', 'school_spmb'), {
      schoolName: truncateStr(config.schoolName, 200, "SMA Ma'arif 05 Padang Ratu"),
      shortName: truncateStr(config.shortName, 100, "SMA Ma'arif 05"),
      npsn: truncateStr(config.npsn, 30, '10802055'),
      academicYear: truncateStr(config.academicYear, 30, '2027/2028'),
      registrationOpen: Boolean(config.registrationOpen),
      startDate: truncateStr(config.startDate, 40, '2027-01-15'),
      endDate: truncateStr(config.endDate, 40, '2027-07-10'),
      announcementDate: truncateStr(config.announcementDate, 40, '2027-07-12'),
      regPrefix: sanitizeId(config.regPrefix || 'SPMB2027', 30),
      payloadJson,
      updatedBy: sanitizeId(currentUser.uid, 128),
      updatedAt: serverTimestamp(),
    });
    await logAdminActivity('Simpan Pengaturan Sekolah/SPMB', 'public_config/school_spmb', changeSummary);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function generateUniqueRegNumber(prefix: string): string {
  const cleanPrefix = sanitizeId(prefix || 'SPMB2027', 16).toUpperCase();
  const now = new Date();
  const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${cleanPrefix}-${monthDay}${randomDigits}`;
}

export async function submitOnlineRegistration(
  rawFormValues: Record<string, string>,
  uploadedDocs: UploadedDocumentData[],
  config: SchoolSpmbConfig
): Promise<{ application: ApplicationRecord; lookup: StatusLookupRecord }> {
  const regNumber = generateUniqueRegNumber(config.regPrefix);
  const cleanNisn = sanitizeId(rawFormValues.nisn || '0000000000', 32);
  const lookupKey = `${regNumber}_${cleanNisn}`;
  const submittedDate = new Date().toISOString().split('T')[0];

  const docVerificationMap: Record<string, string> = {};
  uploadedDocs.forEach((d) => {
    docVerificationMap[d.docId] = 'Belum Diperiksa';
  });

  const customFields: Record<string, string> = {};
  Object.keys(rawFormValues).forEach((k) => {
    if (k.startsWith('custom_')) {
      customFields[k] = rawFormValues[k];
    }
  });

  const docSummaryText =
    uploadedDocs.length > 0
      ? `${uploadedDocs.length} berkas diunggah (${uploadedDocs.map((d) => d.label).join(', ')})`
      : 'Belum ada berkas diunggah';

  const genderVal =
    rawFormValues.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki';

  const applicationPayload: ApplicationRecord = {
    regNumber,
    lookupKey,
    fullName: truncateStr(rawFormValues.fullName, 150),
    nik: truncateStr(rawFormValues.nik, 32),
    nisn: cleanNisn,
    gender: genderVal,
    birthPlace: truncateStr(rawFormValues.birthPlace, 100),
    birthDate: truncateStr(rawFormValues.birthDate, 30),
    religion: truncateStr(rawFormValues.religion || 'Islam', 40),
    address: truncateStr(rawFormValues.address, 400),
    village: truncateStr(rawFormValues.village, 100),
    district: truncateStr(rawFormValues.district, 100),
    regency: truncateStr(rawFormValues.regency, 100),
    province: truncateStr(rawFormValues.province, 100),
    phone: truncateStr(rawFormValues.phone, 40),
    fatherName: truncateStr(rawFormValues.fatherName, 150),
    motherName: truncateStr(rawFormValues.motherName, 150),
    parentJob: truncateStr(rawFormValues.parentJob, 150),
    parentPhone: truncateStr(rawFormValues.parentPhone, 40),
    guardianName: truncateStr(rawFormValues.guardianName, 150, '-'),
    parentAddress: truncateStr(rawFormValues.parentAddress || rawFormValues.address, 400),
    originSchool: truncateStr(rawFormValues.originSchool, 200),
    originNpsn: truncateStr(rawFormValues.originNpsn, 30, '-'),
    originAddress: truncateStr(rawFormValues.originAddress, 400),
    graduationYear: truncateStr(rawFormValues.graduationYear || '2027', 10),
    selectedProgram: truncateStr(
      rawFormValues.selectedProgram ||
        config.programs[0]?.title ||
        'Peminatan Sains & Teknologi (MIPA)',
      120
    ),
    customFieldsJson: JSON.stringify(customFields).slice(0, 49000),
    documentsJson: JSON.stringify(uploadedDocs).slice(0, 740000),
    docVerificationJson: JSON.stringify(docVerificationMap).slice(0, 19000),
    status: 'Menunggu Verifikasi',
    revisionNotes: '-',
    submittedDate,
  };

  const lookupPayload: StatusLookupRecord = {
    regNumber,
    nisn: cleanNisn,
    studentName: applicationPayload.fullName,
    birthPlace: applicationPayload.birthPlace,
    birthDate: applicationPayload.birthDate,
    originSchool: applicationPayload.originSchool,
    selectedProgram: applicationPayload.selectedProgram,
    status: 'Menunggu Verifikasi',
    revisionNotes: '-',
    docSummary: truncateStr(docSummaryText, 1000),
    submittedDate,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'applications', regNumber), {
    ...applicationPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'status_lookups', lookupKey), {
    ...lookupPayload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return { application: applicationPayload, lookup: lookupPayload };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `applications/${regNumber}`);
  }
}

export async function checkStatusByRegNumberAndNisn(
  regNumberInput: string,
  nisnInput: string
): Promise<StatusLookupRecord | null> {
  const cleanReg = sanitizeId(regNumberInput.toUpperCase(), 64);
  const cleanNisn = sanitizeId(nisnInput, 32);
  const lookupKey = `${cleanReg}_${cleanNisn}`;
  const path = `status_lookups/${lookupKey}`;

  try {
    const snap = await getDoc(doc(db, 'status_lookups', lookupKey));
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as StatusLookupRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateApplicationAndLookupByAdmin(
  existingApp: ApplicationRecord,
  updates: Partial<ApplicationRecord>,
  actionTitle: string
): Promise<void> {
  const merged: ApplicationRecord = {
    ...existingApp,
    ...updates,
  };
  const cleanNisn = sanitizeId(merged.nisn, 32);
  const newLookupKey = `${merged.regNumber}_${cleanNisn}`;

  let parsedDocs: UploadedDocumentData[] = [];
  let parsedVerifications: Record<string, string> = {};
  try {
    parsedDocs = JSON.parse(merged.documentsJson || '[]');
    parsedVerifications = JSON.parse(merged.docVerificationJson || '{}');
  } catch {
    // ignore parse error
  }
  const validCount = Object.values(parsedVerifications).filter((v) => v === 'Valid').length;
  const docSummary =
    parsedDocs.length > 0
      ? `${parsedDocs.length} berkas diunggah · ${validCount} berkas terverifikasi valid`
      : 'Belum ada berkas diunggah';

  const batch = writeBatch(db);
  const appRef = doc(db, 'applications', merged.regNumber);

  batch.update(appRef, {
    lookupKey: newLookupKey,
    fullName: truncateStr(merged.fullName, 150),
    nik: truncateStr(merged.nik, 32),
    nisn: cleanNisn,
    gender: merged.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    birthPlace: truncateStr(merged.birthPlace, 100),
    birthDate: truncateStr(merged.birthDate, 30),
    religion: truncateStr(merged.religion, 40),
    address: truncateStr(merged.address, 400),
    village: truncateStr(merged.village, 100),
    district: truncateStr(merged.district, 100),
    regency: truncateStr(merged.regency, 100),
    province: truncateStr(merged.province, 100),
    phone: truncateStr(merged.phone, 40),
    fatherName: truncateStr(merged.fatherName, 150),
    motherName: truncateStr(merged.motherName, 150),
    parentJob: truncateStr(merged.parentJob, 150),
    parentPhone: truncateStr(merged.parentPhone, 40),
    guardianName: truncateStr(merged.guardianName, 150),
    parentAddress: truncateStr(merged.parentAddress, 400),
    originSchool: truncateStr(merged.originSchool, 200),
    originNpsn: truncateStr(merged.originNpsn, 30),
    originAddress: truncateStr(merged.originAddress, 400),
    graduationYear: truncateStr(merged.graduationYear, 10),
    selectedProgram: truncateStr(merged.selectedProgram, 120),
    customFieldsJson: merged.customFieldsJson || '{}',
    documentsJson: merged.documentsJson || '[]',
    docVerificationJson: merged.docVerificationJson || '{}',
    status: merged.status,
    revisionNotes: truncateStr(merged.revisionNotes, 2000, '-'),
    submittedDate: truncateStr(merged.submittedDate, 40),
    updatedAt: serverTimestamp(),
  });

  const lookupRef = doc(db, 'status_lookups', newLookupKey);
  batch.update(lookupRef, {
    nisn: cleanNisn,
    studentName: truncateStr(merged.fullName, 150),
    birthPlace: truncateStr(merged.birthPlace, 100),
    birthDate: truncateStr(merged.birthDate, 30),
    originSchool: truncateStr(merged.originSchool, 200),
    selectedProgram: truncateStr(merged.selectedProgram, 120),
    status: merged.status,
    revisionNotes: truncateStr(merged.revisionNotes, 2000, '-'),
    docSummary: truncateStr(docSummary, 1000),
    submittedDate: truncateStr(merged.submittedDate, 40),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    await logAdminActivity(
      actionTitle,
      `applications/${merged.regNumber}`,
      `${merged.fullName} -> Status: ${merged.status}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `applications/${merged.regNumber}`);
  }
}

export async function deleteApplicationByAdmin(app: ApplicationRecord): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'applications', app.regNumber));
  batch.delete(doc(db, 'status_lookups', app.lookupKey));
  try {
    await batch.commit();
    await logAdminActivity(
      'Hapus Data Pendaftar',
      `applications/${app.regNumber}`,
      `Menghapus pendaftar ${app.fullName} (${app.regNumber})`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `applications/${app.regNumber}`);
  }
}

export async function saveAdminUserRecord(adminRec: AdminUserRecord): Promise<void> {
  const cleanUid = sanitizeId(adminRec.uid, 128);
  const path = `admins/${cleanUid}`;
  try {
    await setDoc(doc(db, 'admins', cleanUid), {
      uid: cleanUid,
      email: truncateStr(adminRec.email, 200),
      displayName: truncateStr(adminRec.displayName, 150),
      role: adminRec.role,
      active: Boolean(adminRec.active),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await logAdminActivity(
      'Tambah/Perbarui Akun Admin',
      path,
      `${adminRec.displayName} (${adminRec.email}) - ${adminRec.role}`
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedSampleApplicants(config: SchoolSpmbConfig): Promise<number> {
  const samples = [
    {
      regNumber: `${sanitizeId(config.regPrefix, 16)}-0101`,
      fullName: 'Ahmad Fauzan Al-Farizi',
      nik: '1802011405120001',
      nisn: '0123456781',
      gender: 'Laki-laki' as const,
      birthPlace: 'Padang Ratu',
      birthDate: '2012-05-14',
      religion: 'Islam',
      address: 'Jl. KH. Hasyim Asy\'ari RT 002 RW 001 Kampung Padang Ratu',
      village: 'Padang Ratu',
      district: 'Padang Ratu',
      regency: 'Lampung Tengah',
      province: 'Lampung',
      phone: '081279112233',
      fatherName: 'H. Mulyono',
      motherName: 'Hj. Siti Aminah',
      parentJob: 'Wiraswasta',
      parentPhone: '081279112200',
      originSchool: "MTs Ma'arif 02 Padang Ratu",
      originNpsn: '10816421',
      originAddress: 'Kec. Padang Ratu, Kab. Lampung Tengah',
      graduationYear: '2027',
      selectedProgram: 'Peminatan Sains & Teknologi (MIPA)',
      status: 'Diterima' as const,
      revisionNotes: 'Seluruh berkas persyaratan lengkap dan terverifikasi valid.',
    },
    {
      regNumber: `${sanitizeId(config.regPrefix, 16)}-0102`,
      fullName: 'Siti Nurhaliza Rahmawati',
      nik: '1802012208120002',
      nisn: '0123456782',
      gender: 'Perempuan' as const,
      birthPlace: 'Surabaya, Padang Ratu',
      birthDate: '2012-08-22',
      religion: 'Islam',
      address: 'Dusun III Kampung Surabaya RT 004 RW 002',
      village: 'Surabaya',
      district: 'Padang Ratu',
      regency: 'Lampung Tengah',
      province: 'Lampung',
      phone: '085366778899',
      fatherName: 'Supriyadi',
      motherName: 'Nurhayati',
      parentJob: 'Petani',
      parentPhone: '085366778800',
      originSchool: 'SMP Negeri 1 Padang Ratu',
      originNpsn: '10802011',
      originAddress: 'Padang Ratu, Lampung Tengah',
      graduationYear: '2027',
      selectedProgram: 'Program Unggulan Tahfidz & Kitab Kuning',
      status: 'Terverifikasi' as const,
      revisionNotes: 'Berkas lengkap, menunggu pengumuman penetapan akhir.',
    },
    {
      regNumber: `${sanitizeId(config.regPrefix, 16)}-0103`,
      fullName: 'Muhammad Rizky Pratama',
      nik: '1802010311120003',
      nisn: '0123456783',
      gender: 'Laki-laki' as const,
      birthPlace: 'Mojokerto, Padang Ratu',
      birthDate: '2012-11-03',
      religion: 'Islam',
      address: 'Kampung Mojokerto RT 001 RW 003 Kec. Padang Ratu',
      village: 'Mojokerto',
      district: 'Padang Ratu',
      regency: 'Lampung Tengah',
      province: 'Lampung',
      phone: '082188990011',
      fatherName: 'Bambang Sutrisno',
      motherName: 'Sri Wahyuni',
      parentJob: 'Pedagang',
      parentPhone: '082188990022',
      originSchool: 'SMP Ma\'arif 05 Padang Ratu',
      originNpsn: '10802088',
      originAddress: 'Padang Ratu, Lampung Tengah',
      graduationYear: '2027',
      selectedProgram: 'Peminatan Sosial & Ekonomi Kreatif (IPS)',
      status: 'Perlu Perbaikan Data' as const,
      revisionNotes: 'Mohon unggah ulang foto Kartu Keluarga (KK) karena bagian nomor NIK kurang jelas terbaca.',
    },
  ];

  const submittedDate = new Date().toISOString().split('T')[0];

  for (const item of samples) {
    const lookupKey = `${item.regNumber}_${item.nisn}`;
    const sampleDocs: UploadedDocumentData[] = [
      {
        docId: 'doc_photo',
        label: 'Pas Foto Resmi Terbaru (3x4)',
        name: 'pas_foto_3x4.jpg',
        type: 'image/jpeg',
        size: 84200,
        dataUrl: config.logoUrl,
        uploadedAt: new Date().toISOString(),
      },
      {
        docId: 'doc_kk',
        label: 'Kartu Keluarga (KK)',
        name: 'kartu_keluarga.jpg',
        type: 'image/jpeg',
        size: 142000,
        dataUrl: config.buildingPhotoUrl,
        uploadedAt: new Date().toISOString(),
      },
    ];
    const verifMap = {
      doc_photo: 'Valid',
      doc_kk: item.status === 'Perlu Perbaikan Data' ? 'Perlu Perbaikan' : 'Valid',
    };

    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'applications'), item.regNumber), {
      regNumber: item.regNumber,
      lookupKey,
      fullName: item.fullName,
      nik: item.nik,
      nisn: item.nisn,
      gender: item.gender,
      birthPlace: item.birthPlace,
      birthDate: item.birthDate,
      religion: item.religion,
      address: item.address,
      village: item.village,
      district: item.district,
      regency: item.regency,
      province: item.province,
      phone: item.phone,
      fatherName: item.fatherName,
      motherName: item.motherName,
      parentJob: item.parentJob,
      parentPhone: item.parentPhone,
      guardianName: '-',
      parentAddress: item.address,
      originSchool: item.originSchool,
      originNpsn: item.originNpsn,
      originAddress: item.originAddress,
      graduationYear: item.graduationYear,
      selectedProgram: item.selectedProgram,
      customFieldsJson: '{}',
      documentsJson: JSON.stringify(sampleDocs),
      docVerificationJson: JSON.stringify(verifMap),
      status: item.status,
      revisionNotes: item.revisionNotes,
      submittedDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(collection(db, 'status_lookups'), lookupKey), {
      regNumber: item.regNumber,
      nisn: item.nisn,
      studentName: item.fullName,
      birthPlace: item.birthPlace,
      birthDate: item.birthDate,
      originSchool: item.originSchool,
      selectedProgram: item.selectedProgram,
      status: item.status,
      revisionNotes: item.revisionNotes,
      docSummary: '2 berkas diunggah (Pas Foto, Kartu Keluarga)',
      submittedDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  }

  await logAdminActivity(
    'Muat Data Contoh Pendaftar',
    'applications',
    `Menambahkan ${samples.length} data pendaftar contoh untuk pengujian SPMB`
  );

  return samples.length;
}
