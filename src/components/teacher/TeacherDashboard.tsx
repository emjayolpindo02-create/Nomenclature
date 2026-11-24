import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  GraduationCap,
  Lock,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Unlock,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProgress } from '../../context/ProgressContext';
import { TOPICS } from '../../data/topics';
import { evaluateTopicAccess, getManilaDateKey } from '../../engine/topicAccess';
import {
  approveAllInSection,
  approveStudent,
  blockStudent,
  removeStudent,
  resetStudentProgress,
  saveTopicsSettings,
  subscribeToAllStudents,
  unlockTopicForStudentNow,
} from '../../services/firebaseService';
import {
  StudentProfile,
  TopicId,
  TopicTeacherRule,
  TopicsSettingsDoc,
} from '../../types/chemistry';

function msToDateTimeLocalValue(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateTimeLocalToMs(val: string): number | null {
  if (!val.trim()) return null;
  const parsed = Date.parse(val);
  return Number.isNaN(parsed) ? null : parsed;
}

export const TeacherDashboard: React.FC = () => {
  const { firebaseUser, isTeacher, openSignInModal } = useAuth();
  const { topicsSettings } = useProgress();

  const [activeTab, setActiveTab] = useState<'students' | 'topics'>('students');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'score-desc' | 'score-asc' | 'name-asc'>('score-desc');
  const [expandedStudentUid, setExpandedStudentUid] = useState<string | null>(null);
  const [bulkSectionTarget, setBulkSectionTarget] = useState<string>('');
  const [busyUid, setBusyUid] = useState<string | null>(null);

  // Editable topics settings draft
  const [draftSettings, setDraftSettings] = useState<TopicsSettingsDoc>(topicsSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [customSectionInput, setCustomSectionInput] = useState<Record<string, string>>({});

  useEffect(() => {
    setDraftSettings(topicsSettings);
  }, [topicsSettings]);

  useEffect(() => {
    if (!isTeacher) return;
    setLoadingStudents(true);
    const unsub = subscribeToAllStudents(
      (list) => {
        setStudents(list);
        setLoadingStudents(false);
      },
      (errMsg) => {
        setActionError(errMsg);
        setLoadingStudents(false);
      }
    );
    return () => unsub();
  }, [isTeacher]);

  const sectionsList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.section.trim()) set.add(s.section.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  useEffect(() => {
    if (!bulkSectionTarget && sectionsList.length > 0) {
      setBulkSectionTarget(sectionsList[0]);
    }
  }, [sectionsList, bulkSectionTarget]);

  const computeAverageScore = (s: StudentProfile): number => {
    const scores = TOPICS.map((t) => s.progress[t.id]?.bestScore ?? 0).filter((n) => n > 0);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students
      .filter((s) => {
        if (sectionFilter !== 'ALL' && s.section.trim().toLowerCase() !== sectionFilter.toLowerCase()) {
          return false;
        }
        if (!q) return true;
        return (
          s.displayName.toLowerCase().includes(q) ||
          s.section.toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.displayName.localeCompare(b.displayName);
        const avgA = computeAverageScore(a);
        const avgB = computeAverageScore(b);
        return sortBy === 'score-desc' ? avgB - avgA : avgA - avgB;
      });
  }, [students, searchQuery, sectionFilter, sortBy]);

  const pendingStudents = filteredStudents.filter((s) => !s.approved && !s.blocked);
  const approvedOrBlockedStudents = filteredStudents.filter((s) => s.approved || s.blocked);

  const showNotice = (msg: string) => {
    setActionError(null);
    setActionNotice(msg);
    window.setTimeout(() => setActionNotice(null), 3500);
  };

  const handleDownloadCsv = () => {
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };
    const headers = [
      'Name',
      'Section',
      'Email',
      'Approved',
      'Blocked',
      'Topics Passed',
      'Average Score (%)',
      ...TOPICS.map((t) => `${t.title} Score (%)`),
      ...TOPICS.map((t) => `${t.title} Passed Date`),
    ];
    const rows = filteredStudents.map((s) => {
      const passedCount = TOPICS.filter((t) => s.progress[t.id]?.passed).length;
      return [
        escapeCsv(s.displayName),
        escapeCsv(s.section),
        escapeCsv(s.email || 'Guest/Anonymous'),
        escapeCsv(s.approved ? 'Yes' : 'Pending'),
        escapeCsv(s.blocked ? 'Blocked' : 'Active'),
        passedCount,
        computeAverageScore(s),
        ...TOPICS.map((t) => s.progress[t.id]?.bestScore ?? 0),
        ...TOPICS.map((t) =>
          s.progress[t.id]?.passedAtMs ? getManilaDateKey(s.progress[t.id].passedAtMs!) : ''
        ),
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ilab-students-${getManilaDateKey(Date.now())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updateTopicRule = (topicId: TopicId, patch: Partial<TopicTeacherRule>) => {
    setDraftSettings((prev) => ({
      ...prev,
      topics: {
        ...prev.topics,
        [topicId]: {
          ...(prev.topics[topicId] || {}),
          ...patch,
        },
      },
    }));
  };

  const toggleRuleArrayItem = (
    topicId: TopicId,
    field: 'lockedSections' | 'unlockedSections' | 'lockedStudentUids' | 'unlockedStudentUids',
    value: string
  ) => {
    const cleanVal = value.trim();
    if (!cleanVal) return;
    const rule = draftSettings.topics[topicId] || {};
    const existing = rule[field] || [];
    const has = existing.some((item) => item.toLowerCase() === cleanVal.toLowerCase());
    const nextList = has
      ? existing.filter((item) => item.toLowerCase() !== cleanVal.toLowerCase())
      : [...existing, cleanVal];
    updateTopicRule(topicId, { [field]: nextList });
  };

  const handleSaveTopicsSettings = async () => {
    setSavingSettings(true);
    setActionError(null);
    try {
      await saveTopicsSettings({
        maxRetriesPerDay: draftSettings.maxRetriesPerDay,
        topics: draftSettings.topics,
        updatedBy: firebaseUser?.uid,
      });
      showNotice('Topic controls and daily retry settings saved.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to save topic controls.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (!isTeacher) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#f4f9fe] border border-[#dbe9f4] flex items-center justify-center text-[#0284c7]">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[#1f3a56]">Teacher Dashboard</h1>
        <p className="text-sm text-[#3b5775] leading-relaxed">
          Sign in with your verified Google teacher account to approve students, manage sections, export CSV scores, and lock or unlock topics.
        </p>
        <button
          type="button"
          onClick={() => openSignInModal({ mode: 'teacher' })}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-sm cursor-pointer"
        >
          <GraduationCap className="w-4 h-4" />
          <span>Teacher Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12 text-[#1f3a56]">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#ffffff] border border-[#dbe9f4] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] flex items-center justify-center text-[#0284c7]">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#1f3a56]">
              Teacher Dashboard
            </h1>
          </div>
          <p className="text-xs text-[#3b5775]">
            Approve student accounts, monitor scores, and control topic schedules in real time.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-2 bg-[#f4f9fe] p-1 rounded-2xl border border-[#dbe9f4]">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'students'
                ? 'bg-[#0284c7] text-white shadow-xs'
                : 'text-[#1f3a56] hover:bg-[#ffffff]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({students.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('topics')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'topics'
                ? 'bg-[#0284c7] text-white shadow-xs'
                : 'text-[#1f3a56] hover:bg-[#ffffff]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Topics ({TOPICS.length})</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold">
          {actionError}
        </div>
      )}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          {actionNotice}
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Controls Toolbar + Daily Retries Cap */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#526d88] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or section..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs text-[#1f3a56]"
                />
              </div>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56]"
              >
                <option value="ALL">All Sections</option>
                {sectionsList.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'score-desc' | 'score-asc' | 'name-asc')
                }
                className="px-3 py-2 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56]"
              >
                <option value="score-desc">Sort: Highest Score</option>
                <option value="score-asc">Sort: Lowest Score</option>
                <option value="name-asc">Sort: Name (A–Z)</option>
              </select>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV</span>
              </button>
            </div>

            {/* Max Retries Per Day + Approve All in Section */}
            <div className="pt-3 border-t border-[#dbe9f4] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <label htmlFor="max-retries-input" className="font-bold text-[#1f3a56]">
                  Max retries per topic per day:
                </label>
                <input
                  id="max-retries-input"
                  type="number"
                  min={0}
                  max={50}
                  value={draftSettings.maxRetriesPerDay}
                  onChange={(e) =>
                    setDraftSettings((prev) => ({
                      ...prev,
                      maxRetriesPerDay: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                    }))
                  }
                  className="w-20 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] font-mono font-bold text-[#1f3a56]"
                />
                <span className="text-[11px] text-[#3b5775]">(0 = unlimited)</span>
                <button
                  type="button"
                  onClick={() => void handleSaveTopicsSettings()}
                  disabled={savingSettings}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingSettings ? 'Saving...' : 'Save limit'}</span>
                </button>
              </div>

              {pendingStudents.length > 0 && bulkSectionTarget && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={bulkSectionTarget}
                    onChange={(e) => setBulkSectionTarget(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs font-semibold text-[#1f3a56]"
                  >
                    {sectionsList.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={async () => {
                      const count = await approveAllInSection(students, bulkSectionTarget);
                      showNotice(`Approved ${count} student(s) in section ${bulkSectionTarget}.`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Approve all in {bulkSectionTarget}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {loadingStudents ? (
            <div className="p-8 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] text-center text-sm text-[#3b5775]">
              Loading student roster...
            </div>
          ) : (
            <>
              {/* Pending Approval Section */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#3b5775] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Waiting for Approval ({pendingStudents.length})</span>
                </h2>

                {pendingStudents.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] text-xs text-[#3b5775]">
                    No pending student sign-ups right now.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pendingStudents.map((student) => (
                      <div
                        key={student.uid}
                        className="p-4 rounded-2xl bg-[#ffffff] border-2 border-amber-300 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-[#1f3a56] truncate">
                            {student.displayName}
                          </div>
                          <div className="text-xs text-[#3b5775]">
                            Section: <strong>{student.section}</strong> •{' '}
                            {student.isAnonymous ? 'Anonymous' : student.email || 'Google'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={busyUid === student.uid}
                            onClick={async () => {
                              setBusyUid(student.uid);
                              try {
                                await approveStudent(student.uid, true);
                                showNotice(`Approved ${student.displayName}.`);
                              } finally {
                                setBusyUid(null);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyUid === student.uid}
                            onClick={async () => {
                              setBusyUid(student.uid);
                              try {
                                await removeStudent(student.uid);
                                showNotice(`Removed ${student.displayName}.`);
                              } finally {
                                setBusyUid(null);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approved & Active Students */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#3b5775] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0284c7]" />
                  <span>Class Roster ({approvedOrBlockedStudents.length})</span>
                </h2>

                {approvedOrBlockedStudents.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] text-center text-xs text-[#3b5775]">
                    No approved students match your current filter.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvedOrBlockedStudents.map((student) => {
                      const isExpanded = expandedStudentUid === student.uid;
                      const avg = computeAverageScore(student);
                      const passedCount = TOPICS.filter((t) => student.progress[t.id]?.passed).length;

                      return (
                        <div
                          key={student.uid}
                          className={`rounded-2xl border shadow-xs transition overflow-hidden ${
                            student.blocked
                              ? 'bg-rose-50/70 border-rose-200'
                              : 'bg-[#ffffff] border-[#dbe9f4]'
                          }`}
                        >
                          <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-base text-[#1f3a56]">
                                  {student.displayName}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg bg-[#f4f9fe] border border-[#dbe9f4] text-[11px] font-bold">
                                  {student.section}
                                </span>
                                {student.blocked && (
                                  <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-200 text-[11px] font-bold">
                                    Blocked
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#3b5775] mt-0.5">
                                Passed {passedCount}/{TOPICS.length} topics • Average: <strong>{avg}%</strong>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStudentUid(isExpanded ? null : student.uid)
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#f4f9fe] hover:bg-[#eaf3fc] border border-[#dbe9f4] text-xs font-bold text-[#1f3a56] cursor-pointer"
                              >
                                <span>Topics Detail</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await blockStudent(student.uid, !student.blocked);
                                  showNotice(
                                    student.blocked
                                      ? `Unblocked ${student.displayName}.`
                                      : `Blocked ${student.displayName}.`
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] hover:bg-amber-50 border border-[#dbe9f4] text-xs font-bold text-[#1f3a56] cursor-pointer"
                                title={student.blocked ? 'Unblock student' : 'Block student'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>{student.blocked ? 'Unblock' : 'Block'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await resetStudentProgress(student.uid);
                                  showNotice(`Reset progress for ${student.displayName}.`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] hover:bg-amber-50 border border-[#dbe9f4] text-xs font-bold text-[#1f3a56] cursor-pointer"
                                title="Reset student progress"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  await removeStudent(student.uid);
                                  showNotice(`Removed ${student.displayName}.`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold cursor-pointer"
                                title="Remove student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 border-t border-[#dbe9f4] bg-[#f4f9fe] space-y-2">
                              {TOPICS.map((topic) => {
                                const entry = student.progress[topic.id];
                                const access = evaluateTopicAccess(topic.id, {
                                  studentProfile: student,
                                  topicsSettings,
                                  isTeacher: false,
                                });
                                return (
                                  <div
                                    key={topic.id}
                                    className="p-3 rounded-xl bg-[#ffffff] border border-[#dbe9f4] flex flex-wrap items-center justify-between gap-2 text-xs"
                                  >
                                    <div>
                                      <div className="font-bold text-[#1f3a56]">
                                        {topic.order}. {topic.title}
                                      </div>
                                      <div className="text-[11px] text-[#3b5775]">
                                        {entry
                                          ? `Best: ${entry.bestScore}% (${entry.attempts} attempts) • ${
                                              entry.passedAtMs
                                                ? `Passed ${getManilaDateKey(entry.passedAtMs)}`
                                                : 'Not yet passed'
                                            }`
                                          : 'No attempts yet'}{' '}
                                        •{' '}
                                        <strong>
                                          {access.unlocked
                                            ? 'Unlocked'
                                            : access.lockLabel || 'Locked'}
                                        </strong>
                                      </div>
                                    </div>

                                    {!access.unlocked && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await unlockTopicForStudentNow(
                                            topicsSettings,
                                            topic.id,
                                            student.uid,
                                            firebaseUser?.uid || ''
                                          );
                                          showNotice(
                                            `Unlocked "${topic.title}" now for ${student.displayName}.`
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-bold cursor-pointer"
                                      >
                                        <Unlock className="w-3 h-3" />
                                        <span>Unlock now</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TOPICS TAB */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-xs flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#3b5775] max-w-xl leading-relaxed">
              Teacher Lock always wins over Early Unlock and student progress. Use these controls to lock/unlock topics for everyone, sections, or individual students, or set optional open/close times.
            </p>
            <button
              type="button"
              onClick={() => void handleSaveTopicsSettings()}
              disabled={savingSettings}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save All Topic Controls'}</span>
            </button>
          </div>

          {TOPICS.map((topic) => {
            const rule: TopicTeacherRule = draftSettings.topics[topic.id] || {};
            return (
              <div
                key={topic.id}
                className="p-5 rounded-2xl bg-[#ffffff] border border-[#dbe9f4] shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#1f3a56]">
                      {topic.order}. {topic.title}
                    </h3>
                    <p className="text-xs text-[#3b5775]">{topic.description}</p>
                  </div>

                  {/* Global Mode */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateTopicRule(topic.id, {
                          lockedForEveryone: false,
                          unlockedForEveryone: false,
                        })
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        !rule.lockedForEveryone && !rule.unlockedForEveryone
                          ? 'bg-[#0284c7] text-white border-[#0284c7]'
                          : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
                      }`}
                    >
                      Auto Rule
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateTopicRule(topic.id, {
                          lockedForEveryone: true,
                          unlockedForEveryone: false,
                        })
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        rule.lockedForEveryone
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>Lock Everyone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateTopicRule(topic.id, {
                          lockedForEveryone: false,
                          unlockedForEveryone: true,
                        })
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                        rule.unlockedForEveryone
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-[#ffffff] text-[#1f3a56] border-[#dbe9f4] hover:bg-[#f4f9fe]'
                      }`}
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Unlock Everyone</span>
                    </button>
                  </div>
                </div>

                {/* Schedule Window */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#dbe9f4] text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-[#3b5775] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Optional Open Date/Time</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={msToDateTimeLocalValue(rule.openAtMs)}
                        onChange={(e) =>
                          updateTopicRule(topic.id, { openAtMs: dateTimeLocalToMs(e.target.value) })
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56]"
                      />
                      {rule.openAtMs && (
                        <button
                          type="button"
                          onClick={() => updateTopicRule(topic.id, { openAtMs: null })}
                          className="px-2 py-1.5 rounded-lg bg-[#ffffff] border border-[#dbe9f4] hover:bg-[#f4f9fe] text-[11px] font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#3b5775] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Optional Close Date/Time</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="datetime-local"
                        value={msToDateTimeLocalValue(rule.closeAtMs)}
                        onChange={(e) =>
                          updateTopicRule(topic.id, {
                            closeAtMs: dateTimeLocalToMs(e.target.value),
                          })
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-[#1f3a56]"
                      />
                      {rule.closeAtMs && (
                        <button
                          type="button"
                          onClick={() => updateTopicRule(topic.id, { closeAtMs: null })}
                          className="px-2 py-1.5 rounded-lg bg-[#ffffff] border border-[#dbe9f4] hover:bg-[#f4f9fe] text-[11px] font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Overrides */}
                <div className="pt-2 border-t border-[#dbe9f4] space-y-2 text-xs">
                  <div className="font-bold text-[#1f3a56]">Section Overrides</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={customSectionInput[topic.id] || ''}
                      onChange={(e) =>
                        setCustomSectionInput((prev) => ({
                          ...prev,
                          [topic.id]: e.target.value,
                        }))
                      }
                      placeholder="Add section (e.g. 3F)"
                      className="px-2.5 py-1.5 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4] text-xs text-[#1f3a56] w-40"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const sec = (customSectionInput[topic.id] || '').trim();
                        if (!sec) return;
                        toggleRuleArrayItem(topic.id, 'unlockedSections', sec);
                        setCustomSectionInput((prev) => ({ ...prev, [topic.id]: '' }));
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold cursor-pointer"
                    >
                      + Unlock Section
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sec = (customSectionInput[topic.id] || '').trim();
                        if (!sec) return;
                        toggleRuleArrayItem(topic.id, 'lockedSections', sec);
                        setCustomSectionInput((prev) => ({ ...prev, [topic.id]: '' }));
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold cursor-pointer"
                    >
                      + Lock Section
                    </button>

                    {(rule.unlockedSections || []).map((sec) => (
                      <button
                        key={`u-${sec}`}
                        type="button"
                        onClick={() => toggleRuleArrayItem(topic.id, 'unlockedSections', sec)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                        title="Click to remove unlock override"
                      >
                        Unlocked: {sec} ×
                      </button>
                    ))}
                    {(rule.lockedSections || []).map((sec) => (
                      <button
                        key={`l-${sec}`}
                        type="button"
                        onClick={() => toggleRuleArrayItem(topic.id, 'lockedSections', sec)}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                        title="Click to remove lock override"
                      >
                        Locked: {sec} ×
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Student Overrides */}
                {approvedOrBlockedStudents.length > 0 && (
                  <div className="pt-2 border-t border-[#dbe9f4] space-y-2 text-xs">
                    <div className="font-bold text-[#1f3a56]">Selected Students Overrides</div>
                    <div className="flex flex-wrap gap-2">
                      {approvedOrBlockedStudents.map((st) => {
                        const isLocked = (rule.lockedStudentUids || []).includes(st.uid);
                        const isUnlocked = (rule.unlockedStudentUids || []).includes(st.uid);
                        return (
                          <div
                            key={st.uid}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-[#f4f9fe] border border-[#dbe9f4]"
                          >
                            <span className="font-semibold text-[11px]">
                              {st.displayName} ({st.section})
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRuleArrayItem(topic.id, 'unlockedStudentUids', st.uid)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                isUnlocked
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[#ffffff] text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              Unlock
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleRuleArrayItem(topic.id, 'lockedStudentUids', st.uid)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                isLocked
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-[#ffffff] text-rose-800 border border-rose-200'
                              }`}
                            >
                              Lock
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
