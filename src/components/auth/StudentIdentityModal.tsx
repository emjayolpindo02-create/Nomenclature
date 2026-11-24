import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, User, Users, X } from 'lucide-react';
import { useStudent } from '../../context/StudentContext';

export const StudentIdentityModal: React.FC = () => {
  const {
    studentIdentity,
    needsIdentitySetup,
    identityModalOpen,
    closeIdentityModal,
    saveStudentIdentity,
  } = useStudent();

  const [fullName, setFullName] = useState('');
  const [section, setSection] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isOpen = identityModalOpen || needsIdentitySetup;

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setFullName(studentIdentity?.fullName || '');
      setSection(studentIdentity?.section || '');
    }
  }, [isOpen, studentIdentity]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && identityModalOpen && !needsIdentitySetup) {
        closeIdentityModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [identityModalOpen, needsIdentitySetup, closeIdentityModal]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = saveStudentIdentity(fullName, section);
    if (!res.ok) {
      setError(res.error || 'Please enter your Full Name and Section.');
    }
  };

  return (
    <div
      data-testid="student-identity-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1f3a56]/25 backdrop-blur-xs"
      onClick={() => {
        if (!needsIdentitySetup) closeIdentityModal();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-identity-title"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-2xl p-6 sm:p-7 space-y-5 relative text-[#1f3a56]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] text-[#0284c7] flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="student-identity-title"
                className="font-display text-lg font-bold text-[#1f3a56]"
              >
                {needsIdentitySetup ? 'Welcome to I-LAB' : 'Update Student Details'}
              </h2>
              <p className="text-xs text-[#3b5775]">
                Enter your full name and section to track your scores on this device. Works offline.
              </p>
            </div>
          </div>

          {!needsIdentitySetup && (
            <button
              type="button"
              onClick={closeIdentityModal}
              className="p-1.5 rounded-lg text-[#3b5775] hover:bg-[#f4f9fe] cursor-pointer"
              aria-label="Close student details dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="student-fullname-input"
              className="block text-xs font-bold text-[#1f3a56]"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#526d88] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="student-fullname-input"
                data-testid="student-fullname-input"
                type="text"
                autoFocus
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Maria Santos"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#dbe9f4] bg-[#f4f9fe] text-sm text-[#1f3a56] placeholder:text-[#526d88]/70 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="student-section-input"
              className="block text-xs font-bold text-[#1f3a56]"
            >
              Section
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-[#526d88] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="student-section-input"
                data-testid="student-section-input"
                type="text"
                value={section}
                onChange={(e) => {
                  setSection(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 3F"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#dbe9f4] bg-[#f4f9fe] text-sm text-[#1f3a56] placeholder:text-[#526d88]/70 focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          <button
            type="submit"
            data-testid="student-continue-btn"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#2563eb] hover:from-[#0369a1] hover:to-[#1d4ed8] text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
