import { db } from '$lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  increment,
  serverTimestamp, 
  collection,
  query,
  where, 
  orderBy,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';

// 배지 정보
const BADGES = {
  // 학습 관련 배지
  FIRST_STUDY: {
    id: 'first-study',
    name: '첫 학습',
    description: '첫 번째 학습 자료를 등록했습니다',
    icon: '📚'
  },
  STUDY_MASTER: {
    id: 'study-master',
    name: '학습 마스터',
    description: '50개 이상의 학습 자료를 등록했습니다',
    icon: '🎓'
  },
  
  // 복습 관련 배지
  REVIEW_KING: {
    id: 'review-king',
    name: '복습왕',
    description: '100회 이상 복습을 완료했습니다',
    icon: '👑'
  },
  PERFECT_REVIEW: {
    id: 'perfect-review',
    name: '완벽한 복습',
    description: '10개 이상의 복습을 모두 일정에 맞게 완료했습니다',
    icon: '✅'
  },
  
  // 연속 학습 배지
  STREAK_7: {
    id: 'streak-7',
    name: '7일 연속 학습',
    description: '7일 연속으로 학습 또는 복습을 진행했습니다',
    icon: '🔥'
  },
  STREAK_30: {
    id: 'streak-30',
    name: '한 달 연속 학습',
    description: '30일 연속으로 학습 또는 복습을 진행했습니다',
    icon: '🏆'
  },
  
  // 그룹 활동 배지
  GROUP_CREATOR: {
    id: 'group-creator',
    name: '그룹 창설자',
    description: '첫 학습 그룹을 생성했습니다',
    icon: '👨‍👩‍👧‍👦'
  },
  SOCIAL_BUTTERFLY: {
    id: 'social-butterfly',
    name: '소셜 버터플라이',
    description: '5개 이상의 그룹에 가입했습니다',
    icon: '🦋'
  },
  SHARING_IS_CARING: {
    id: 'sharing-is-caring',
    name: '공유는 배려입니다',
    description: '10개 이상의 학습 자료를 그룹에 공유했습니다',
    icon: '🤝'
  }
};

// 레벨 경험치 테이블
const LEVEL_XP = [
  0,      // 레벨 1
  100,    // 레벨 2
  300,    // 레벨 3
  600,    // 레벨 4
  1000,   // 레벨 5
  1500,   // 레벨 6
  2100,   // 레벨 7
  2800,   // 레벨 8
  3600,   // 레벨 9
  4500,   // 레벨 10
  5500,   // 레벨 11
  6600,   // 레벨 12
  7800,   // 레벨 13
  9100,   // 레벨 14
  10500,  // 레벨 15
  12000,  // 레벨 16
  13600,  // 레벨 17
  15300,  // 레벨 18
  17100,  // 레벨 19
  19000   // 레벨 20
];

// 경험치 획득 액션 및 보상
const XP_REWARDS = {
  CREATE_STUDY: 10,          // 학습 자료 생성
  COMPLETE_REVIEW: 5,        // 복습 완료
  CREATE_GROUP: 20,          // 그룹 생성
  JOIN_GROUP: 5,             // 그룹 가입
  SHARE_MATERIAL: 3,         // 자료 공유
  DAILY_LOGIN: 2,            // 일일 로그인
  STREAK_BONUS: 5,           // 연속 학습 보너스 (일일)
  STREAK_MILESTONE_7: 30,    // 7일 연속 학습 마일스톤
  STREAK_MILESTONE_30: 100,  // 30일 연속 학습 마일스톤
  BADGE_EARNED: 15           // 배지 획득
};

// 사용자의 게이미피케이션 정보 초기화
export const initializeUserGameData = async (userId, displayName) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // 이미 게임 데이터가 있는 경우 초기화하지 않음
      if (userData.gameData) {
        return userData.gameData;
      }
    }
    
    const initialGameData = {
      level: 1,
      xp: 0,
      totalXp: 0,
      streakDays: 0,
      lastActivityDate: serverTimestamp(),
      badges: [],
      achievements: [],
      stats: {
        studiesCreated: 0,
        reviewsCompleted: 0,
        groupsCreated: 0,
        groupsJoined: 0,
        materialsShared: 0,
        loginDays: 1
      }
    };
    
    await updateDoc(userRef, {
      gameData: initialGameData
    });
    
    // 랭킹 테이블에 사용자 추가
    const rankingData = {
      userId,
      displayName: displayName || '익명',
      level: 1,
      totalXp: 0,
      updatedAt: serverTimestamp()
    };
    
    const rankingRef = doc(db, 'rankings', userId);
    await updateDoc(rankingRef, rankingData);
    
    return initialGameData;
  } catch (error) {
    console.error('게임 데이터 초기화 오류:', error);
    throw error;
  }
};

// 사용자 게임 데이터 가져오기
export const getUserGameData = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    const userData = userDoc.data();
    
    // 게임 데이터가 없는 경우 초기화
    if (!userData.gameData) {
      return await initializeUserGameData(userId, userData.displayName);
    }
    
    return userData.gameData;
  } catch (error) {
    console.error('게임 데이터 조회 오류:', error);
    throw error;
  }
};

// 경험치 획득 및 레벨 업데이트
export const addExperience = async (userId, action, amount = null) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    const userData = userDoc.data();
    const gameData = userData.gameData || await initializeUserGameData(userId, userData.displayName);
    
    // 액션에 따른 XP 보상 계산
    let xpAmount = amount;
    if (!xpAmount && XP_REWARDS[action]) {
      xpAmount = XP_REWARDS[action];
    }
    
    if (!xpAmount) {
      throw new Error('알 수 없는 액션 또는 경험치 양입니다.');
    }
    
    // 현재 XP 및 총 XP 업데이트
    const newTotalXp = gameData.totalXp + xpAmount;
    
    // 레벨 계산
    let newLevel = gameData.level;
    while (newLevel < LEVEL_XP.length && newTotalXp >= LEVEL_XP[newLevel]) {
      newLevel++;
    }
    
    // 현재 레벨의 XP 계산 (레벨업 이후)
    const currentLevelMinXp = newLevel > 1 ? LEVEL_XP[newLevel - 2] : 0;
    const nextLevelXp = newLevel <= LEVEL_XP.length ? LEVEL_XP[newLevel - 1] : Infinity;
    const currentLevelXp = newTotalXp - currentLevelMinXp;
    const levelProgress = (currentLevelXp / (nextLevelXp - currentLevelMinXp)) * 100;
    
    // 레벨업 여부 확인
    const didLevelUp = newLevel > gameData.level;
    
    // 게임 데이터 업데이트
    const updatedGameData = {
      level: newLevel,
      xp: currentLevelXp,
      totalXp: newTotalXp,
      lastActivityDate: serverTimestamp()
    };
    
    await updateDoc(userRef, {
      'gameData.level': updatedGameData.level,
      'gameData.xp': updatedGameData.xp,
      'gameData.totalXp': updatedGameData.totalXp,
      'gameData.lastActivityDate': updatedGameData.lastActivityDate
    });
    
    // 랭킹 테이블 업데이트
    const rankingRef = doc(db, 'rankings', userId);
    await updateDoc(rankingRef, {
      level: newLevel,
      totalXp: newTotalXp,
      updatedAt: serverTimestamp()
    });
    
    return {
      ...updatedGameData,
      levelProgress,
      didLevelUp
    };
  } catch (error) {
    console.error('경험치 추가 오류:', error);
    throw error;
  }
};

// 사용자 통계 업데이트
export const updateUserStats = async (userId, statName, incrementValue = 1) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // stats 필드의 해당 통계 값 증가
    await updateDoc(userRef, {
      [`gameData.stats.${statName}`]: increment(incrementValue)
    });
    
    return true;
  } catch (error) {
    console.error('통계 업데이트 오류:', error);
    throw error;
  }
};

// 배지 획득 확인 및 부여
export const checkAndAwardBadges = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    const userData = userDoc.data();
    
    if (!userData.gameData) {
      await initializeUserGameData(userId, userData.displayName);
      return [];
    }
    
    const gameData = userData.gameData;
    const stats = gameData.stats;
    const currentBadges = gameData.badges || [];
    const newBadges = [];
    
    // 이미 획득한 배지 ID 목록
    const earnedBadgeIds = currentBadges.map(badge => badge.id);
    
    // 학습 배지 체크
    if (stats.studiesCreated >= 1 && !earnedBadgeIds.includes(BADGES.FIRST_STUDY.id)) {
      newBadges.push(BADGES.FIRST_STUDY);
    }
    
    if (stats.studiesCreated >= 50 && !earnedBadgeIds.includes(BADGES.STUDY_MASTER.id)) {
      newBadges.push(BADGES.STUDY_MASTER);
    }
    
    // 복습 배지 체크
    if (stats.reviewsCompleted >= 100 && !earnedBadgeIds.includes(BADGES.REVIEW_KING.id)) {
      newBadges.push(BADGES.REVIEW_KING);
    }
    
    // 연속 학습 배지 체크
    if (gameData.streakDays >= 7 && !earnedBadgeIds.includes(BADGES.STREAK_7.id)) {
      newBadges.push(BADGES.STREAK_7);
    }
    
    if (gameData.streakDays >= 30 && !earnedBadgeIds.includes(BADGES.STREAK_30.id)) {
      newBadges.push(BADGES.STREAK_30);
    }
    
    // 그룹 배지 체크
    if (stats.groupsCreated >= 1 && !earnedBadgeIds.includes(BADGES.GROUP_CREATOR.id)) {
      newBadges.push(BADGES.GROUP_CREATOR);
    }
    
    if (stats.groupsJoined >= 5 && !earnedBadgeIds.includes(BADGES.SOCIAL_BUTTERFLY.id)) {
      newBadges.push(BADGES.SOCIAL_BUTTERFLY);
    }
    
    if (stats.materialsShared >= 10 && !earnedBadgeIds.includes(BADGES.SHARING_IS_CARING.id)) {
      newBadges.push(BADGES.SHARING_IS_CARING);
    }
    
    // 새로운 배지가 있는 경우 저장 및 경험치 부여
    if (newBadges.length > 0) {
      // 배지에 획득 시간 추가
      const badgesToAdd = newBadges.map(badge => ({
        ...badge,
        earnedAt: new Date()
      }));
      
      // 배지 추가
      await updateDoc(userRef, {
        'gameData.badges': arrayUnion(...badgesToAdd)
      });
      
      // 배지당 경험치 부여
      for (const badge of newBadges) {
        await addExperience(userId, 'BADGE_EARNED');
      }
      
      // 업적 목록에 추가
      const achievements = badgesToAdd.map(badge => ({
        type: 'badge',
        badge: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: badge.earnedAt
      }));
      
      await updateDoc(userRef, {
        'gameData.achievements': arrayUnion(...achievements)
      });
    }
    
    return newBadges;
  } catch (error) {
    console.error('배지 확인 오류:', error);
    throw error;
  }
};

// 연속 학습 일수 체크 및 업데이트
export const checkAndUpdateStreak = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    const userData = userDoc.data();
    
    if (!userData.gameData) {
      await initializeUserGameData(userId, userData.displayName);
      return { streakDays: 1, maintained: true, streakBonus: 0 };
    }
    
    const gameData = userData.gameData;
    let lastActivityDate = gameData.lastActivityDate;
    
    // Firestore Timestamp를 JavaScript Date로 변환
    if (lastActivityDate && lastActivityDate.toDate) {
      lastActivityDate = lastActivityDate.toDate();
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // lastActivityDate가 없거나 오늘보다 이전이면 새로 설정
    if (!lastActivityDate) {
      await updateDoc(userRef, {
        'gameData.lastActivityDate': serverTimestamp(),
        'gameData.streakDays': 1
      });
      return { streakDays: 1, maintained: true, streakBonus: 0 };
    }
    
    // 날짜만 비교하기 위해 시간 정보 제거
    const lastDate = new Date(
      lastActivityDate.getFullYear(),
      lastActivityDate.getMonth(),
      lastActivityDate.getDate()
    );
    
    // 이미 오늘 활동했으면 스트릭 유지
    if (lastDate.getTime() === today.getTime()) {
      return { 
        streakDays: gameData.streakDays || 1, 
        maintained: true, 
        streakBonus: 0 
      };
    }
    
    // 어제 활동했으면 스트릭 증가
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDate.getTime() === yesterday.getTime()) {
      // 스트릭 증가 및 보너스 계산
      const newStreakDays = (gameData.streakDays || 0) + 1;
      let streakBonus = XP_REWARDS.STREAK_BONUS;
      
      // 스트릭 마일스톤 보너스
      if (newStreakDays === 7) {
        streakBonus += XP_REWARDS.STREAK_MILESTONE_7;
      } else if (newStreakDays === 30) {
        streakBonus += XP_REWARDS.STREAK_MILESTONE_30;
      }
      
      // 업데이트
      await updateDoc(userRef, {
        'gameData.lastActivityDate': serverTimestamp(),
        'gameData.streakDays': newStreakDays
      });
      
      // 보너스 경험치 적용
      if (streakBonus > 0) {
        await addExperience(userId, null, streakBonus);
      }
      
      return { 
        streakDays: newStreakDays, 
        maintained: true, 
        streakBonus 
      };
    } else {
      // 스트릭 끊김, 리셋
      await updateDoc(userRef, {
        'gameData.lastActivityDate': serverTimestamp(),
        'gameData.streakDays': 1
      });
      
      return { streakDays: 1, maintained: false, streakBonus: 0 };
    }
  } catch (error) {
    console.error('연속 학습 확인 오류:', error);
    throw error;
  }
};

// 랭킹 목록 가져오기
export const getLeaderboard = async (limitCount = 10) => {
  try {
    const rankingsQuery = query(
      collection(db, 'rankings'),
      orderBy('totalXp', 'desc'),
      limit(limitCount)
    );
    
    const rankingsSnapshot = await getDocs(rankingsQuery);
    const rankings = [];
    
    rankingsSnapshot.forEach((doc, index) => {
      rankings.push({
        rank: index + 1,
        userId: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      });
    });
    
    return rankings;
  } catch (error) {
    console.error('랭킹 목록 조회 오류:', error);
    throw error;
  }
};

// 사용자의 랭킹 정보 가져오기
export const getUserRanking = async (userId) => {
  try {
    // 먼저 상위 랭킹 조회
    const topRankings = await getLeaderboard(100);
    
    // 사용자가 상위 랭킹에 있는지 확인
    const userRanking = topRankings.find(r => r.userId === userId);
    
    if (userRanking) {
      return userRanking;
    }
    
    // 상위 랭킹에 없으면 사용자 정보 직접 조회
    const userRankingDoc = await getDoc(doc(db, 'rankings', userId));
    
    if (!userRankingDoc.exists()) {
      return null;
    }
    
    // 대략적인 순위 계산 (정확하지 않음)
    const userXp = userRankingDoc.data().totalXp;
    
    const higherRankQuery = query(
      collection(db, 'rankings'),
      where('totalXp', '>', userXp)
    );
    
    const higherRankSnapshot = await getDocs(higherRankQuery);
    const approximateRank = higherRankSnapshot.size + 1;
    
    return {
      rank: approximateRank,
      userId,
      ...userRankingDoc.data(),
      updatedAt: userRankingDoc.data().updatedAt?.toDate() || new Date()
    };
  } catch (error) {
    console.error('사용자 랭킹 조회 오류:', error);
    throw error;
  }
}; 