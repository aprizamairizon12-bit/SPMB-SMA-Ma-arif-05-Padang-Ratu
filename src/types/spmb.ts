export type ApplicationStatus =
  | 'Menunggu Verifikasi'
  | 'Perlu Perbaikan Data'
  | 'Terverifikasi'
  | 'Diterima'
  | 'Tidak Diterima';

export type DocVerifyStatus = 'Belum Diperiksa' | 'Valid' | 'Perlu Perbaikan';

export interface FormFieldConfig {
  id: string;
  group: 'student' | 'parent' | 'school';
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  enabled: boolean;
  placeholder?: string;
  options?: string[];
  isSystemCore?: boolean;
}

export interface DocumentRequirementConfig {
  id: string;
  label: string;
  description: string;
  required: boolean;
  enabled: boolean;
  acceptedFormats: string;
}

export interface PublicSectionConfig {
  id: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  order: number;
  type:
    | 'hero'
    | 'profile_history'
    | 'vision_mission'
    | 'programs'
    | 'facilities'
    | 'extracurriculars'
    | 'gallery'
    | 'requirements_flow'
    | 'schedule'
    | 'announcements'
    | 'contact'
    | 'custom';
  customContent?: string;
}

export interface ScheduleItem {
  id: string;
  phaseName: string;
  dateRange: string;
  description: string;
  isActive: boolean;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  date: string;
  category: string;
  content: string;
  isImportant: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Gedung & Ruang Kelas' | 'Laboratorium & Fasilitas' | 'Kegiatan & Prestasi' | 'Video Profil' | ' Pendidik & Tenaga Kependidikan';
  mediaType: 'image' | 'video';
  url: string;
  caption: string;
}

export interface ProgramItem {
  id: string;
  title: string;
  code: string;
  description: string;
  highlights: string;
}

export interface FacilityItem {
  id: string;
  name: string;
  description: string;
  condition: string;
  imageUrl?: string;
}

export interface ExtracurricularItem {
  id: string;
  name: string;
  category: string;
  schedule: string;
  achievement: string;
}

export interface AchievementItem {
  id: string;
  title: string;
  level: string;
  year: string;
  organizer: string;
}

export interface SchoolSpmbConfig {
  // Identitas Sekolah (Bagian E)
  schoolName: string;
  shortName: string;
  npsn: string;
  foundationName: string;
  accreditation: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  postalCode: string;
  phone: string;
  whatsapp: string;
  email: string;
  principalName: string;
  principalNip: string;
  principalWelcome: string;
  committeeHeadName: string;
  committeeContactPhone: string;
  serviceHours: string;
  logoUrl: string;
  principalPhotoUrl: string;
  staffPhotoUrl: string;
  buildingPhotoUrl: string;
  classroomPhotoUrl: string;
  history: string;
  profileSummary: string;
  vision: string;
  missions: string[];
  additionalInfo: string;
  mapEmbedUrl: string;
  mapCoordinatesText: string;
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
  socialTiktok: string;

  // Pengaturan SPMB (Bagian F)
  academicYear: string;
  registrationOpen: boolean;
  startDate: string;
  endDate: string;
  announcementDate: string;
  regPrefix: string;
  freeRegistrationNotice: string;
  confirmationMessage: string;
  selectionAnnouncementNote: string;
  bannerHeadline: string;
  bannerSubheadline: string;
  bannerImageUrl: string;

  // Daftar Koleksi Dinamis
  requirementsList: string[];
  registrationSteps: { stepNumber: string; title: string; description: string }[];
  programs: ProgramItem[];
  facilities: FacilityItem[];
  extracurriculars: ExtracurricularItem[];
  achievements: AchievementItem[];
  schedules: ScheduleItem[];
  announcements: AnnouncementItem[];
  gallery: GalleryItem[];
  sections: PublicSectionConfig[];
  formFields: FormFieldConfig[];
  documentRequirements: DocumentRequirementConfig[];
}

export interface UploadedDocumentData {
  docId: string;
  label: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface ApplicationRecord {
  regNumber: string;
  lookupKey: string;
  fullName: string;
  nik: string;
  nisn: string;
  gender: 'Laki-laki' | 'Perempuan';
  birthPlace: string;
  birthDate: string;
  religion: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  phone: string;
  fatherName: string;
  motherName: string;
  parentJob: string;
  parentPhone: string;
  guardianName: string;
  parentAddress: string;
  originSchool: string;
  originNpsn: string;
  originAddress: string;
  graduationYear: string;
  selectedProgram: string;
  customFieldsJson: string;
  documentsJson: string;
  docVerificationJson: string;
  status: ApplicationStatus;
  revisionNotes: string;
  submittedDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StatusLookupRecord {
  regNumber: string;
  nisn: string;
  studentName: string;
  birthPlace: string;
  birthDate: string;
  originSchool: string;
  selectedProgram: string;
  status: ApplicationStatus;
  revisionNotes: string;
  docSummary: string;
  submittedDate: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'Super Admin' | 'Ketua Panitia' | 'Verifikator';
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ActivityLogRecord {
  id?: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  target: string;
  details: string;
  createdAt?: unknown;
}
