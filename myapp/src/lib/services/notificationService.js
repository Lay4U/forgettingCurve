import { db } from '$lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDocs, 
  getDoc,
  updateDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { getUserSettings } from './userSettingsService';

// Firebase Cloud Messaging (FCM) 토큰 저장
export const saveUserFCMToken = async (userId, token) => {
  try {
    const userTokensRef = doc(db, 'users', userId, 'tokens', token);
    await setDoc(userTokensRef, {
      token,
      createdAt: serverTimestamp(),
      platform: getPlatformInfo()
    });
    return true;
  } catch (error) {
    console.error('FCM 토큰 저장 에러:', error);
    throw error;
  }
};

// 사용자의 모든 FCM 토큰 가져오기
export const getUserFCMTokens = async (userId) => {
  try {
    const userTokensRef = collection(db, 'users', userId, 'tokens');
    const snapshot = await getDocs(userTokensRef);
    return snapshot.docs.map(doc => doc.data().token);
  } catch (error) {
    console.error('FCM 토큰 조회 에러:', error);
    throw error;
  }
};

// 알림 기록 저장
export const saveNotification = async (userId, notification) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const notificationWithTimestamp = {
      ...notification,
      createdAt: serverTimestamp(),
      read: false
    };
    const docRef = await addDoc(notificationsRef, notificationWithTimestamp);
    return { id: docRef.id, ...notificationWithTimestamp };
  } catch (error) {
    console.error('알림 저장 에러:', error);
    throw error;
  }
};

// 사용자의 모든 알림 가져오기
export const getUserNotifications = async (userId, limit = 20) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  } catch (error) {
    console.error('알림 조회 에러:', error);
    throw error;
  }
};

// 알림을 읽음으로 표시
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
    return true;
  } catch (error) {
    console.error('알림 읽음 표시 에러:', error);
    throw error;
  }
};

// 모든 알림을 읽음으로 표시
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const q = query(notificationsRef, where('read', '==', false));
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('알림 전체 읽음 표시 에러:', error);
    throw error;
  }
};

// 웹 푸시 알림 허용 요청
export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined') return false;
  
  if (!('Notification' in window)) {
    console.log('이 브라우저는 알림을 지원하지 않습니다.');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// 웹 푸시 알림 보내기 (클라이언트 사이드)
export const sendWebNotification = (title, options = {}) => {
  if (typeof window === 'undefined') return false;
  
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }
  
  try {
    const notification = new Notification(title, {
      icon: '/favicon.png',
      ...options
    });
    
    if (options.onClick) {
      notification.onclick = options.onClick;
    }
    
    return true;
  } catch (error) {
    console.error('웹 알림 발송 에러:', error);
    return false;
  }
};

// 현재 플랫폼 정보 가져오기
const getPlatformInfo = () => {
  // 서버 사이드 렌더링 시 기본값 반환
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { platform: 'Unknown', os: 'Unknown', browser: 'Unknown' };
  }
  
  const userAgent = navigator.userAgent;
  let platform = 'Unknown';
  let os = 'Unknown';
  
  if (/Android/i.test(userAgent)) {
    os = 'Android';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    os = 'iOS';
  } else if (/Windows/i.test(userAgent)) {
    os = 'Windows';
  } else if (/Mac/i.test(userAgent)) {
    os = 'Mac';
  } else if (/Linux/i.test(userAgent)) {
    os = 'Linux';
  }
  
  if (/Mobile/i.test(userAgent) || /iPhone|iPad|iPod|Android/i.test(userAgent)) {
    platform = 'Mobile';
  } else {
    platform = 'Desktop';
  }
  
  const browser = getBrowser();
  
  return { platform, os, browser };
};

// 브라우저 정보 가져오기
const getBrowser = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'Unknown';
  }
  
  const userAgent = navigator.userAgent;
  
  if (/Chrome/i.test(userAgent) && !/Chromium|Edge/i.test(userAgent)) {
    return 'Chrome';
  } else if (/Firefox/i.test(userAgent)) {
    return 'Firefox';
  } else if (/Safari/i.test(userAgent) && !/Chrome|Chromium/i.test(userAgent)) {
    return 'Safari';
  } else if (/Edge/i.test(userAgent)) {
    return 'Edge';
  } else if (/Opera|OPR/i.test(userAgent)) {
    return 'Opera';
  } else {
    return 'Unknown';
  }
};

// 복습 알림 생성 (앱 내 알림 + 웹 푸시)
export const createReviewReminder = async (userId, studyMaterial, reviewDate) => {
  try {
    // 사용자 설정 확인
    const userSettings = await getUserSettings(userId);
    
    if (!userSettings.notificationsEnabled) {
      return false;
    }
    
    const notification = {
      type: 'review_reminder',
      title: '복습 알림',
      message: `'${studyMaterial.title}' 자료 복습 시간입니다.`,
      data: {
        materialId: studyMaterial.id,
        reviewDate: reviewDate
      }
    };
    
    // 앱 내 알림 저장
    await saveNotification(userId, notification);
    
    // 웹 푸시 알림 (사용자가 현재 접속 중인 경우)
    if (typeof window !== 'undefined' && userSettings.pushNotifications && 
        'Notification' in window && Notification.permission === 'granted') {
      sendWebNotification(notification.title, {
        body: notification.message,
        tag: `review_${studyMaterial.id}`,
        data: notification.data,
        onClick: function() {
          window.focus();
          this.close();
          window.location.href = `/study/${studyMaterial.id}`;
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('복습 알림 생성 에러:', error);
    throw error;
  }
};

// 이메일 알림 요청 (서버리스 함수로 실행됨)
export const requestEmailNotification = async (userId, notification) => {
  try {
    const userSettings = await getUserSettings(userId);
    
    if (!userSettings.emailNotifications) {
      return false;
    }
    
    // Cloud Function 트리거
    const emailRequestRef = collection(db, 'emailNotifications');
    await addDoc(emailRequestRef, {
      userId,
      notification,
      createdAt: serverTimestamp(),
      status: 'pending'
    });
    
    return true;
  } catch (error) {
    console.error('이메일 알림 요청 에러:', error);
    return false;
  }
};

// 일일 복습 요약 알림 생성
export const createDailyReviewSummary = async (userId, reviewCount) => {
  if (reviewCount === 0) return false;
  
  try {
    const notification = {
      type: 'daily_summary',
      title: '오늘의 복습 요약',
      message: `오늘 예정된 복습이 ${reviewCount}건 있습니다.`,
      data: {
        reviewCount
      }
    };
    
    // 앱 내 알림 저장
    await saveNotification(userId, notification);
    
    // 웹 푸시 알림
    const userSettings = await getUserSettings(userId);
    
    if (userSettings.pushNotifications && Notification.permission === 'granted') {
      sendWebNotification(notification.title, {
        body: notification.message,
        tag: `daily_summary_${new Date().toISOString().slice(0, 10)}`,
        onClick: function() {
          window.focus();
          this.close();
          window.location.href = '/dashboard';
        }
      });
    }
    
    // 이메일 알림
    if (userSettings.emailNotifications) {
      await requestEmailNotification(userId, notification);
    }
    
    return true;
  } catch (error) {
    console.error('일일 요약 알림 생성 에러:', error);
    return false;
  }
}; 