import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import {
  Lock,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  LogIn,
  KeyRound,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { DEFAULT_SCHOOL_SPMB_CONFIG } from './data/defaultConfig';
import {
  SchoolSpmbConfig,
  ApplicationRecord,
  AdminUserRecord,
  ActivityLogRecord,
} from './types/spmb';
import { PublicPortal } from './components/PublicPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { saveSchoolSpmbConfig } from './services/spmbService';

const BOOTSTRAPPED_ADMIN_EMAIL = 'aprizamairizon12@gmail.com';

export default function App() {
  const [config, setConfig] = useState<SchoolSpmbConfig>(DEFAULT_SCHOOL_SPMB_CONFIG);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');

  // Admin real-time collections
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);

  // Admin Login Form State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 1. Subscribe to Public School & SPMB Config
  useEffect(() => {
    const configRef = doc(db, 'public_config', 'school_spmb');
    const unsub = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.payloadJson) {
            try {
              const parsed = JSON.parse(data.payloadJson) as SchoolSpmbConfig;
              setConfig({ ...DEFAULT_SCHOOL_SPMB_CONFIG, ...parsed });
            } catch {
              // keep default if malformed
            }
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'public_config/school_spmb');
      }
    );
    return () => unsub();
  }, []);

  // 2. Listen to Firebase Authentication State & Check Admin Role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        setIsAuthorizedAdmin(false);
        setAuthReady(true);
        return;
      }

      if (user.emailVerified && user.email === BOOTSTRAPPED_ADMIN_EMAIL) {
        setIsAuthorizedAdmin(true);
        setAuthReady(true);
        // Ensure initial config exists in Firestore
        try {
          const snap = await getDoc(doc(db, 'public_config', 'school_spmb'));
          if (!snap.exists()) {
            await saveSchoolSpmbConfig(
              DEFAULT_SCHOOL_SPMB_CONFIG,
              'Inisialisasi awal konfigurasi SPMB SMA Ma\'arif 05 Padang Ratu'
            );
          }
        } catch {
          // ignore initial check error
        }
        return;
      }

      // Check if user UID exists in /admins/{uid}
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAuthorizedAdmin(Boolean(user.emailVerified && adminDoc.exists()));
      } catch {
        setIsAuthorizedAdmin(false);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 3. Attach Real-Time Listeners for Admin Collections when Authorized
  useEffect(() => {
    if (!authReady || !currentUser || !isAuthorizedAdmin) {
      setApplications([]);
      setAdmins([]);
      setActivityLogs([]);
      return;
    }

    const unsubApps = onSnapshot(
      collection(db, 'applications'),
      (snap) => {
        const list: ApplicationRecord[] = [];
        snap.forEach((d) => list.push(d.data() as ApplicationRecord));
        setApplications(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'applications');
      }
    );

    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        const list: AdminUserRecord[] = [];
        snap.forEach((d) => list.push(d.data() as AdminUserRecord));
        setAdmins(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'admins');
      }
    );

    const unsubLogs = onSnapshot(
      collection(db, 'activity_logs'),
      (snap) => {
        const list: ActivityLogRecord[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as ActivityLogRecord) }));
        setActivityLogs(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'activity_logs');
      }
    );

    return () => {
      unsubApps();
      unsubAdmins();
      unsubLogs();
    };
  }, [authReady, currentUser, isAuthorizedAdmin]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setResetSuccessMsg(null);
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Gagal masuk dengan Google Authentication.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetSuccessMsg(null);
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Gagal masuk. Gunakan tombol Login Google atau pastikan Email/Password telah diaktifkan di Firebase Console.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePasswordReset = async () => {
    setAuthError(null);
    setResetSuccessMsg(null);
    if (!emailInput.trim()) {
      setAuthError('Masukkan alamat email admin terlebih dahulu pada kolom Email.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, emailInput.trim());
      setResetSuccessMsg(`Tautan reset kata sandi telah dikirim ke ${emailInput.trim()}.`);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Gagal mengirim email reset kata sandi.'
      );
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setViewMode('public');
  };

  if (viewMode === 'admin') {
    if (currentUser && isAuthorizedAdmin) {
      return (
        <AdminDashboard
          user={currentUser}
          config={config}
          onConfigChange={setConfig}
          applications={applications}
          admins={admins}
          activityLogs={activityLogs}
          onBackToPublic={() => setViewMode('public')}
          onLogout={handleLogout}
        />
      );
    }

    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMode('public')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Halaman Publik</span>
            </button>
            <span className="text-xs font-mono-tabular text-emerald-800 font-semibold">
              TA {config.academicYear}
            </span>
          </div>

          <div className="flex items-center gap-3.5">
            <img
              src={config.logoUrl}
              alt={config.schoolName}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-lg border border-slate-200 p-1 object-contain shrink-0"
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Autentikasi Panitia Resmi
              </p>
              <h1 className="text-xl font-bold text-slate-900">
                Dashboard Admin SPMB
              </h1>
              <p className="text-xs text-slate-500">{config.schoolName}</p>
            </div>
          </div>

          {currentUser && !isAuthorizedAdmin && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
              <p className="font-bold">Akun Belum Terdaftar Sebagai Admin Panitia</p>
              <p>
                Anda masuk sebagai <strong>{currentUser.email}</strong> (UID:{' '}
                <span className="font-mono-tabular">{currentUser.uid}</span>), namun akun ini
                belum memiliki otorisasi Admin. Silakan masuk dengan akun Super Admin (
                <span className="font-mono-tabular">{BOOTSTRAPPED_ADMIN_EMAIL}</span>) atau
                daftarkan UID di atas melalui menu Manajemen Akun Pengguna.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded bg-amber-800 text-white font-semibold cursor-pointer"
              >
                Ganti Akun Google
              </button>
            </div>
          )}

          {authError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {resetSuccessMsg && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              {resetSuccessMsg}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              disabled={isLoggingIn}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-bold bg-emerald-900 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>
                {isLoggingIn ? 'Memverifikasi...' : 'Masuk dengan Akun Google Admin'}
              </span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase">
                Atau Email Panitia
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <form onSubmit={handleEmailPasswordLogin} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email Admin Panitia
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@smamaarif05.sch.id"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Kata Sandi
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  required
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-medium cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Reset Kata Sandi</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login Email</span>
                </button>
              </div>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
            <span>
              Dilindungi oleh Firebase Authentication & Zero-Trust Cloud Firestore Security
              Rules.
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicPortal
      config={config}
      onOpenAdmin={() => setViewMode('admin')}
      isAdminLoggedIn={Boolean(currentUser && isAuthorizedAdmin)}
    />
  );
}
