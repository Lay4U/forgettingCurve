import { writable } from 'svelte/store';
import { auth } from '$lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '$lib/firebase';

// 초기 상태
export const user = writable(null);
export const isLoading = writable(true);
export const isAdmin = writable(false);

// 인증 상태 변경 감지
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (firebaseUser) => {
    isLoading.set(true);
    if (firebaseUser) {
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL
      };
      user.set(userData);
      
      // 사용자의 관리자 권한 확인
      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists() && userDoc.data().isAdmin) {
          isAdmin.set(true);
        } else {
          isAdmin.set(false);
        }
      } catch (error) {
        console.error('관리자 권한 확인 에러:', error);
        isAdmin.set(false);
      }
    } else {
      user.set(null);
      isAdmin.set(false);
    }
    isLoading.set(false);
  });
}

// 로그아웃 함수
export const logout = async () => {
  try {
    await auth.signOut();
    return true;
  } catch (error) {
    console.error('로그아웃 에러:', error);
    throw error;
  }
}; 