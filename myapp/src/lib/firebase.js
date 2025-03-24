// Firebase 초기화
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 설정
const firebaseConfig = {
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
let analytics = null;

// 브라우저 환경에서만 analytics 초기화
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Firebase 서비스
export const auth = getAuth(app);
export const db = getFirestore(app);
export { analytics };
export default app; 