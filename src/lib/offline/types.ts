export type OfflineSyncStatus = 'draft' | 'completed_local' | 'pending' | 'running' | 'failed' | 'synced';

export interface OfflineExamAnswerPayload {
  questionId: string;
  selectedOptionId?: string;
}

export interface OfflineAttemptPayload {
  offlineAttemptId: string;
  studentName: string;
  schoolId: string;
  grade: number;
  examId: string;
  sessionType: 'EXAM';
  deviceId?: string;
  startedAt?: string;
  completedAt?: string;
  examSnapshotVersion?: string;
}

export type OfflineSyncSessionPayload = OfflineAttemptPayload;

export interface OfflineSyncExamPayload {
  offlineAttemptId: string;
  sessionId?: string;
  examId: string;
  examSnapshotVersion?: string;
  examSnapshotPayload?: unknown;
  completedAt?: string;
  answers: OfflineExamAnswerPayload[];
}

export interface CachedExamManifestItem {
  id: string;
  title: string;
  grade: number;
  storyTitle: string;
  isActive: boolean;
  totalPoints: string;
  updatedAt: string;
}

export interface OfflineCacheManifest {
  generatedAt: string;
  schools: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  exams: CachedExamManifestItem[];
}

export interface CachedExamRecord {
  examId: string;
  version: string;
  downloadedAt: string;
  payload: unknown;
}

export interface CachedSchoolsRecord {
  key: 'schools';
  version: string;
  downloadedAt: string;
  schools: OfflineCacheManifest['schools'];
  expectedExamIds: string[];
}

export interface OfflineAttemptRecord extends OfflineAttemptPayload {
  currentQuestionIndex: number;
  showStory: boolean;
  status: OfflineSyncStatus;
  syncedSessionId?: string;
  syncError?: string;
   requiresReview?: boolean;
   reviewReason?: string;
  syncedAt?: string;
  lastSyncAttemptAt?: string;
  lastSyncResult?: 'success' | 'error';
  lastSavedAt: string;
}

export interface OfflineAnswerRecord extends OfflineExamAnswerPayload {
  offlineAttemptId: string;
  savedAt: string;
}

export interface SyncQueueJob {
  id: string;
  offlineAttemptId: string;
  type: 'SYNC_EXAM';
  status: Exclude<OfflineSyncStatus, 'draft' | 'completed_local'>;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}
