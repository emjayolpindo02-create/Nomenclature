import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import provisionedConfig from '../../firebase-applet-config.json';
import { cleanEnvValue, isFileProtocol } from './appInfo';

const viteEnv: Record<string, unknown> =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env === 'object' &&
  import.meta.env !== null
    ? (import.meta.env as Record<string, unknown>)
    : {};

function pickEnvOrProvisioned(envKey: string, fallback: string): string {
  const raw = cleanEnvValue(viteEnv[envKey]);
  if (!raw || raw === 'PASTE_API_KEY_HERE') {
    return fallback || '';
  }
  return raw;
}

const rawEnvApiKey = cleanEnvValue(viteEnv.VITE_FIREBASE_API_KEY);
const hasPlaceholderEnvKey = rawEnvApiKey === 'PASTE_API_KEY_HERE';

export const FIREBASE_CONFIG = {
  apiKey: pickEnvOrProvisioned('VITE_FIREBASE_API_KEY', provisionedConfig.apiKey),
  authDomain: pickEnvOrProvisioned('VITE_FIREBASE_AUTH_DOMAIN', provisionedConfig.authDomain),
  projectId: pickEnvOrProvisioned('VITE_FIREBASE_PROJECT_ID', provisionedConfig.projectId),
  storageBucket: pickEnvOrProvisioned(
    'VITE_FIREBASE_STORAGE_BUCKET',
    provisionedConfig.storageBucket
  ),
  messagingSenderId: pickEnvOrProvisioned(
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    provisionedConfig.messagingSenderId
  ),
  appId: pickEnvOrProvisioned('VITE_FIREBASE_APP_ID', provisionedConfig.appId),
};

export const FIRESTORE_DATABASE_ID =
  cleanEnvValue(viteEnv.VITE_FIREBASE_DATABASE_ID) ||
  provisionedConfig.firestoreDatabaseId ||
  '(default)';

export const IS_USING_ENV_API_KEY = Boolean(rawEnvApiKey && !hasPlaceholderEnvKey);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let firebaseInitError: string | null = null;

try {
  if (FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && !isFileProtocol()) {
    firebaseApp = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp, FIRESTORE_DATABASE_ID);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  }
} catch (err) {
  firebaseInitError =
    err instanceof Error ? err.message : 'Firebase failed to initialize in this environment.';
}

export { firebaseApp, firebaseAuth, firebaseDb, googleProvider, firebaseInitError };

export function isFirebaseReady(): boolean {
  return Boolean(firebaseApp && firebaseAuth && firebaseDb);
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const currentUser = firebaseAuth?.currentUser;
  const errMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  return errInfo;
}

export async function testConnection(): Promise<boolean> {
  if (!firebaseDb) return false;
  try {
    await getDocFromServer(doc(firebaseDb, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}
