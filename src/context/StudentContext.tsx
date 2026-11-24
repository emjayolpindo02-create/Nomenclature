import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { StudentIdentity } from '../types/chemistry';
import {
  hasStorageFailure,
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  subscribeStorageFailure,
} from '../utils/safeStorage';

const STUDENT_IDENTITY_STORAGE_KEY = 'ilab_student_identity_v1';

export function loadSavedStudentIdentity(): StudentIdentity | null {
  try {
    const raw = safeGetItem(STUDENT_IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudentIdentity>;
    const fullName = typeof parsed.fullName === 'string' ? parsed.fullName.trim() : '';
    const section = typeof parsed.section === 'string' ? parsed.section.trim() : '';
    if (!fullName || !section) return null;
    return {
      fullName,
      section,
      savedAtIso:
        typeof parsed.savedAtIso === 'string' && parsed.savedAtIso
          ? parsed.savedAtIso
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

interface StudentContextType {
  studentIdentity: StudentIdentity | null;
  needsIdentitySetup: boolean;
  identityModalOpen: boolean;
  storageUnavailable: boolean;
  openIdentityModal: () => void;
  closeIdentityModal: () => void;
  saveStudentIdentity: (fullName: string, section: string) => { ok: boolean; error?: string };
  clearStudentIdentity: () => void;
}

const StudentContext = createContext<StudentContextType | null>(null);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studentIdentity, setStudentIdentity] = useState<StudentIdentity | null>(() =>
    loadSavedStudentIdentity()
  );
  const [identityModalOpen, setIdentityModalOpen] = useState<boolean>(false);
  const [storageUnavailable, setStorageUnavailable] = useState<boolean>(() =>
    hasStorageFailure()
  );

  useEffect(() => {
    setStorageUnavailable(hasStorageFailure());
    return subscribeStorageFailure((failed) => setStorageUnavailable(failed));
  }, []);

  const needsIdentitySetup = Boolean(
    !studentIdentity || !studentIdentity.fullName.trim() || !studentIdentity.section.trim()
  );

  const openIdentityModal = useCallback(() => {
    setIdentityModalOpen(true);
  }, []);

  const closeIdentityModal = useCallback(() => {
    setIdentityModalOpen(false);
  }, []);

  const saveStudentIdentity = useCallback(
    (rawFullName: string, rawSection: string): { ok: boolean; error?: string } => {
      const fullName = rawFullName.trim();
      const section = rawSection.trim();
      if (!fullName) {
        return { ok: false, error: 'Please enter your Full Name.' };
      }
      if (!section) {
        return { ok: false, error: 'Please enter your Section (for example: 3F).' };
      }
      const next: StudentIdentity = {
        fullName,
        section,
        savedAtIso: new Date().toISOString(),
      };
      setStudentIdentity(next);
      try {
        safeSetItem(STUDENT_IDENTITY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // safeStorage falls back to in-memory store without throwing
      }
      setIdentityModalOpen(false);
      return { ok: true };
    },
    []
  );

  const clearStudentIdentity = useCallback(() => {
    setStudentIdentity(null);
    try {
      safeRemoveItem(STUDENT_IDENTITY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return (
    <StudentContext.Provider
      value={{
        studentIdentity,
        needsIdentitySetup,
        identityModalOpen,
        storageUnavailable,
        openIdentityModal,
        closeIdentityModal,
        saveStudentIdentity,
        clearStudentIdentity,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent must be used inside a StudentProvider');
  return ctx;
};
