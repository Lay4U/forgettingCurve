import { db } from '$lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

// 사용자 설정 가져오기
export const getUserSettings = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // 이전 형식의 복습 간격을 새 형식으로 변환
      if (userData.reviewIntervals && !Array.isArray(userData.reviewIntervals)) {
        // 이전 형식의 복습 간격이 있으면 medium으로 사용
        userData.reviewIntervals = userData.reviewIntervals.medium || [0, 1, 7, 30];
      } else if (!userData.reviewIntervals) {
        // 복습 간격이 없으면 기본값 사용
        userData.reviewIntervals = [0, 1, 7, 30];
      }
      
      return userData;
    } else {
      // 사용자 문서가 없으면 기본값 반환
      return {
        uid: userId,
        reviewIntervals: [0, 1, 7, 30], // 당일, 1일, 1주일, 30일
        memoryFactor: 1.0, // 개인화된 기억력 계수 (기본값: 1.0)
        preferredStudyTime: '09:00',
        notificationsEnabled: true,
        emailNotifications: false,
        pushNotifications: false
      };
    }
  } catch (error) {
    console.error('사용자 설정 로딩 에러:', error);
    throw error;
  }
};

// 사용자 설정 업데이트
export const updateUserSettings = async (userId, settingsData) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, settingsData);
    
    // 업데이트된 사용자 설정 반환
    const updatedDoc = await getDoc(userDocRef);
    return updatedDoc.data();
  } catch (error) {
    console.error('사용자 설정 업데이트 에러:', error);
    throw error;
  }
};

// 복습 주기 계산 (개인화된 알고리즘)
export const calculateReviewIntervals = async (userId, difficulty = 3, importanceLevel = 3) => {
  try {
    // 사용자 설정 가져오기
    const userSettings = await getUserSettings(userId);
    
    // 기본 복습 주기
    const baseIntervals = userSettings.reviewIntervals || [0, 1, 7, 30];
    const memoryFactor = userSettings.memoryFactor || 1.0;
    
    // 개인화 계수 계산 (난이도와 중요도에 따라 조정)
    // 난이도가 높을수록 더 자주 복습, 중요도가 높을수록 더 자주 복습
    const difficultyFactor = 1 + (difficulty - 3) * 0.1; // 난이도 1~5에 따라 0.8~1.2 사이 값
    const importanceFactor = 1 - (importanceLevel - 3) * 0.05; // 중요도 1~5에 따라 1.1~0.9 사이 값
    
    // 개인화된 복습 주기 계산
    const personalizedIntervals = baseIntervals.map(interval => {
      if (interval === 0) return 0; // 당일 복습은 항상 0일로 유지
      
      // 기본 간격 * 기억력 계수 * 난이도 계수 * 중요도 계수
      const adjustedInterval = Math.round(interval * memoryFactor * difficultyFactor * importanceFactor);
      // 최소 1일은 보장 (0일이 아닌 경우)
      return Math.max(1, adjustedInterval);
    });
    
    return personalizedIntervals;
  } catch (error) {
    console.error('복습 주기 계산 에러:', error);
    // 오류 발생 시 기본 주기 반환
    return [0, 1, 7, 30];
  }
};

// 복습 완료 후 기억력 계수 업데이트
export const updateMemoryFactor = async (userId, memoryRating) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      let memoryFactor = userData.memoryFactor || 1.0;
      const completedReviews = userData.completedReviews || 0;
      
      // memoryRating에 따라 계수 조정 (1: 잘 기억 못함, 5: 완벽히 기억)
      // 잘 기억 못하면 계수 증가 (더 자주 복습), 잘 기억하면 계수 감소 (더 적게 복습)
      const adjustment = (3 - memoryRating) * 0.02; // -0.04 ~ 0.04 사이 값
      
      // 복습이 많을수록 변화폭을 작게 (안정화)
      const stabilizationFactor = Math.min(1, 10 / (completedReviews + 10));
      
      // 새 기억력 계수 계산 (범위: 0.5 ~ 1.5)
      const newMemoryFactor = Math.min(1.5, Math.max(0.5, memoryFactor + adjustment * stabilizationFactor));
      
      // 사용자 데이터 업데이트
      await updateDoc(userDocRef, {
        memoryFactor: newMemoryFactor,
        completedReviews: completedReviews + 1
      });
      
      return newMemoryFactor;
    }
    
    return 1.0; // 사용자 문서가 없으면 기본값 반환
  } catch (error) {
    console.error('기억력 계수 업데이트 에러:', error);
    throw error;
  }
}; 