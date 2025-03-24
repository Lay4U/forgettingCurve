import { auth, db } from '$lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// 회원가입
export const register = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 사용자 프로필 업데이트
    await updateProfile(user, {
      displayName
    });

    // Firestore에 사용자 문서 생성
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName,
      createdAt: serverTimestamp(),
      defaultReviewIntervals: [1, 7, 30], // 기본 복습 일정 [1일, 7일, 30일]
    });

    return user;
  } catch (error) {
    console.error('회원가입 에러:', error);
    throw error;
  }
};

// 로그인
export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('로그인 에러:', error);
    throw error;
  }
};

// 구글 로그인
export const googleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    
    // Firestore에서 사용자 문서 확인
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    // 사용자 문서가 없으면 새로 생성 (최초 로그인)
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '사용자',
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        defaultReviewIntervals: [1, 7, 30], // 기본 복습 일정 [1일, 7일, 30일]
        provider: 'google'
      });
    }
    
    return user;
  } catch (error) {
    console.error('구글 로그인 에러:', error);
    throw error;
  }
};

// 로그아웃
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('로그아웃 에러:', error);
    throw error;
  }
};

// 비밀번호 재설정 이메일 전송
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('비밀번호 재설정 에러:', error);
    throw error;
  }
}; 