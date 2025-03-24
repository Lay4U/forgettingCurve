import { writable, derived, get } from 'svelte/store';
import { db } from '$lib/firebase';
import { user } from './authStore';
import { 
  doc, 
  collection, 
  getDoc, 
  setDoc,
  updateDoc, 
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  where,
  getDocs
} from 'firebase/firestore';

// 스토어 생성
export const gameData = writable(null);
export const leaderboard = writable([]);
export const gameDataLoading = writable(true);
export const recentAchievements = writable([]);
export const recentBadges = writable([]);
export const streakInfo = writable({ lastLogin: null, streakDays: 0, streakBonus: 0 });
export const gameNotifications = writable([]);

// leaderboardData 변수도 leaderboard와 동일하게 export (호환성 유지)
export const leaderboardData = leaderboard;
// userRanking 변수도 export (호환성 유지)
export const userRanking = writable({ rank: '??', totalUsers: 0 });

// xpToNextLevel 변수도 export (gameData의 xpToNextLevel 값 사용)
export const xpToNextLevel = derived(gameData, $gameData => {
  if (!$gameData) return 100;
  return $gameData.xpToNextLevel || 100;
});

// 게임 데이터 초기화
export async function initializeGameData() {
  const currentUser = get(user);
  if (!currentUser) return null;
  
  const userId = currentUser.uid;
  
  // 게임 데이터 가져오기/초기화
  const gameDataRef = doc(db, 'gameData', userId);
  
  try {
    const gameDataDoc = await getDoc(gameDataRef);
    
    // 사용자 게임 데이터가 없으면 생성
    if (!gameDataDoc.exists()) {
      const initialGameData = {
        userId,
        displayName: currentUser.displayName || '익명 사용자',
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        totalXp: 0,
        badges: [],
        achievements: [],
        stats: {
          materialsCreated: 0,
          reviewsCompleted: 0,
          daysActive: 1,
          totalStudyTime: 0
        },
        streakInfo: {
          lastLogin: serverTimestamp(),
          streakDays: 1,
          currentStreak: 1,
          longestStreak: 1
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(gameDataRef, initialGameData);
      gameData.set(initialGameData);
    } else {
      gameData.set(gameDataDoc.data());
      
      // 스트릭 정보 가져와서 처리
      const userData = gameDataDoc.data();
      const lastLogin = userData.streakInfo?.lastLogin?.toDate() || new Date();
      const today = new Date();
      
      // 날짜만 비교하기 위해 시간 정보 제거
      const lastLoginDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // 날짜 차이 계산 (밀리초 -> 일)
      const timeDiff = todayDate.getTime() - lastLoginDate.getTime();
      const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      
      let streakDays = userData.streakInfo?.streakDays || 0;
      let streakBonus = 0;
      
      // 어제 로그인했으면 스트릭 증가
      if (dayDiff === 1) {
        streakDays++;
        streakBonus = Math.min(5, streakDays) * 5; // 최대 5일까지 보너스, 하루당 5 XP
        
        // 스트릭 업데이트
        await updateDoc(gameDataRef, {
          'streakInfo.lastLogin': serverTimestamp(),
          'streakInfo.streakDays': streakDays,
          'streakInfo.currentStreak': streakDays,
          'streakInfo.longestStreak': Math.max(streakDays, userData.streakInfo?.longestStreak || 0),
          updatedAt: serverTimestamp()
        });
        
        // 스트릭 보너스 XP 추가
        if (streakBonus > 0) {
          await addXP(streakBonus, '연속 학습 보너스');
        }
      } 
      // 오늘 이미 로그인한 경우
      else if (dayDiff === 0) {
        streakDays = userData.streakInfo?.streakDays || 0;
      } 
      // 하루 이상 로그인하지 않은 경우 스트릭 초기화
      else if (dayDiff > 1) {
        streakDays = 1; // 오늘부터 다시 시작
        
        // 스트릭 초기화
        await updateDoc(gameDataRef, {
          'streakInfo.lastLogin': serverTimestamp(),
          'streakInfo.streakDays': 1,
          'streakInfo.currentStreak': 1,
          updatedAt: serverTimestamp()
        });
      }
      
      streakInfo.set({ 
        lastLogin, 
        streakDays, 
        streakBonus 
      });
    }
    
    // 최근 업적 필터링 (최근 7일)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // 최근 업적 필터링
    const achievements = get(gameData)?.achievements || [];
    const recent = achievements
      .filter(ach => new Date(ach.date) > oneWeekAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
      
    recentAchievements.set(recent);
    
    // 최근 획득한 배지 필터링
    const badges = get(gameData)?.badges || [];
    const recentBadgesData = badges
      .filter(badge => badge.isNew)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
      
    recentBadges.set(recentBadgesData);
    
    // 리더보드 데이터 불러오기
    await loadLeaderboard();
    
    // 실시간 구독 설정
    const unsubscribe = onSnapshot(gameDataRef, (doc) => {
      if (doc.exists()) {
        gameData.set(doc.data());
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('게임 데이터 초기화 오류:', error);
    return null;
  }
}

// XP 추가 함수
export async function addXP(amount, reason) {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const userId = currentUser.uid;
  const currentGameData = get(gameData);
  
  if (!currentGameData) return;
  
  const gameDataRef = doc(db, 'gameData', userId);
  
  // 현재 XP 계산
  const currentXp = currentGameData.xp || 0;
  const currentLevel = currentGameData.level || 1;
  const xpToNextLevel = currentGameData.xpToNextLevel || 100;
  const totalXp = currentGameData.totalXp || 0;
  
  // 새 XP 계산
  const newXp = currentXp + amount;
  const newTotalXp = totalXp + amount;
  
  // 레벨업 확인
  let newLevel = currentLevel;
  let remainingXp = newXp;
  let newXpToNextLevel = xpToNextLevel;
  let didLevelUp = false;
  
  // 레벨업 계산
  while (remainingXp >= newXpToNextLevel) {
    remainingXp -= newXpToNextLevel;
    newLevel++;
    newXpToNextLevel = 100 * newLevel; // 레벨당 필요 XP 증가
    didLevelUp = true;
  }
  
  // 업데이트 데이터
  const updateData = {
    xp: remainingXp,
    totalXp: newTotalXp,
    updatedAt: serverTimestamp()
  };
  
  // 레벨업된 경우
  if (didLevelUp) {
    updateData.level = newLevel;
    updateData.xpToNextLevel = newXpToNextLevel;
    
    // 레벨업 업적 추가
    const achievement = {
      type: 'levelup',
      title: '레벨 업!',
      description: `레벨 ${newLevel}에 도달했습니다.`,
      date: new Date().toISOString(),
      xp: amount
    };
    
    updateData.achievements = [...(currentGameData.achievements || []), achievement];
    
    // 레벨업 알림 추가
    addGameNotification({
      type: 'levelup',
      title: '레벨 업!',
      message: `레벨 ${newLevel}에 도달했습니다!`,
      icon: '⬆️'
    });
    
    // 레벨 기반 배지 확인
    checkAndAddLevelBadges(newLevel);
  } else {
    // XP 획득 업적 추가
    const achievement = {
      type: 'xp',
      title: 'XP 획득',
      description: `${reason}으로 ${amount} XP를 획득했습니다.`,
      date: new Date().toISOString(),
      xp: amount
    };
    
    updateData.achievements = [...(currentGameData.achievements || []), achievement];
    
    // XP 획득 알림 추가
    addGameNotification({
      type: 'xp',
      title: 'XP 획득!',
      message: `${reason}으로 ${amount} XP를 획득했습니다!`,
      icon: '✨'
    });
  }
  
  // Firestore 업데이트
  await updateDoc(gameDataRef, updateData);
  
  return didLevelUp ? newLevel : null;
}

// 학습 자료 생성 시 XP 및 통계 업데이트
export async function updateMaterialCreated() {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const userId = currentUser.uid;
  const gameDataRef = doc(db, 'gameData', userId);
  
  // 통계 업데이트
  await updateDoc(gameDataRef, {
    'stats.materialsCreated': increment(1),
    updatedAt: serverTimestamp()
  });
  
  // XP 추가
  await addXP(20, '학습 자료 생성');
  
  // 배지 확인
  checkAndAddMaterialBadges();
}

// 복습 완료 시 XP 및 통계 업데이트
export async function updateReviewCompleted() {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const userId = currentUser.uid;
  const gameDataRef = doc(db, 'gameData', userId);
  
  // 통계 업데이트
  await updateDoc(gameDataRef, {
    'stats.reviewsCompleted': increment(1),
    updatedAt: serverTimestamp()
  });
  
  // XP 추가
  await addXP(10, '복습 완료');
  
  // 배지 확인
  checkAndAddReviewBadges();
}

// 레벨 기반 배지 확인 및 추가
async function checkAndAddLevelBadges(level) {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const levelBadges = [
    { level: 5, id: 'level5', name: '학습 초보', icon: '🌱', description: '레벨 5에 도달했습니다.' },
    { level: 10, id: 'level10', name: '열심히 공부 중', icon: '📚', description: '레벨 10에 도달했습니다.' },
    { level: 20, id: 'level20', name: '지식 탐험가', icon: '🧠', description: '레벨 20에 도달했습니다.' },
    { level: 30, id: 'level30', name: '학습 마스터', icon: '🎓', description: '레벨 30에 도달했습니다.' },
    { level: 50, id: 'level50', name: '지식의 현자', icon: '🦉', description: '레벨 50에 도달했습니다.' },
  ];
  
  const matchingBadge = levelBadges.find(badge => badge.level === level);
  
  if (matchingBadge) {
    await addBadge(matchingBadge);
  }
}

// 학습 자료 생성 관련 배지 확인 및 추가
async function checkAndAddMaterialBadges() {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const currentGameData = get(gameData);
  if (!currentGameData) return;
  
  const materialsCount = currentGameData.stats?.materialsCreated || 0;
  
  const materialBadges = [
    { count: 1, id: 'material1', name: '첫 암기장', icon: '📝', description: '첫 번째 학습 자료를 생성했습니다.' },
    { count: 10, id: 'material10', name: '부지런한 저자', icon: '✍️', description: '10개의 학습 자료를 생성했습니다.' },
    { count: 50, id: 'material50', name: '다작 저자', icon: '📚', description: '50개의 학습 자료를 생성했습니다.' },
    { count: 100, id: 'material100', name: '지식 창고', icon: '📖', description: '100개의 학습 자료를 생성했습니다.' },
  ];
  
  const matchingBadge = materialBadges.find(badge => badge.count === materialsCount);
  
  if (matchingBadge) {
    await addBadge(matchingBadge);
  }
}

// 복습 완료 관련 배지 확인 및 추가
async function checkAndAddReviewBadges() {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const currentGameData = get(gameData);
  if (!currentGameData) return;
  
  const reviewsCount = currentGameData.stats?.reviewsCompleted || 0;
  
  const reviewBadges = [
    { count: 1, id: 'review1', name: '복습 시작', icon: '🔄', description: '첫 번째 복습을 완료했습니다.' },
    { count: 10, id: 'review10', name: '복습 습관', icon: '📆', description: '10번의 복습을 완료했습니다.' },
    { count: 50, id: 'review50', name: '복습의 달인', icon: '🧠', description: '50번의 복습을 완료했습니다.' },
    { count: 100, id: 'review100', name: '망각과의 전쟁', icon: '⚔️', description: '100번의 복습을 완료했습니다.' },
  ];
  
  const matchingBadge = reviewBadges.find(badge => badge.count === reviewsCount);
  
  if (matchingBadge) {
    await addBadge(matchingBadge);
  }
}

// 스트릭 관련 배지 확인 및 추가
export async function checkAndAddStreakBadges() {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const currentGameData = get(gameData);
  if (!currentGameData) return;
  
  const streakDays = currentGameData.streakInfo?.streakDays || 0;
  
  const streakBadges = [
    { days: 3, id: 'streak3', name: '꾸준함의 시작', icon: '🔥', description: '3일 연속으로 학습했습니다.' },
    { days: 7, id: 'streak7', name: '한 주 완성', icon: '📅', description: '7일 연속으로 학습했습니다.' },
    { days: 14, id: 'streak14', name: '2주 달성', icon: '🔥🔥', description: '14일 연속으로 학습했습니다.' },
    { days: 30, id: 'streak30', name: '한 달 성공', icon: '🏆', description: '30일 연속으로 학습했습니다.' },
  ];
  
  const matchingBadge = streakBadges.find(badge => badge.days === streakDays);
  
  if (matchingBadge) {
    await addBadge(matchingBadge);
  }
}

// 배지 추가 함수
export async function addBadge(badgeData) {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const userId = currentUser.uid;
  const currentGameData = get(gameData);
  
  if (!currentGameData) return;
  
  const gameDataRef = doc(db, 'gameData', userId);
  
  // 이미 획득한 배지 체크
  const existingBadges = currentGameData.badges || [];
  if (existingBadges.some(badge => badge.id === badgeData.id)) {
    return false;
  }
  
  const newBadge = {
    ...badgeData,
    date: new Date().toISOString(),
    isNew: true
  };
  
  // 배지 추가
  await updateDoc(gameDataRef, {
    badges: [...existingBadges, newBadge],
    updatedAt: serverTimestamp()
  });
  
  // 배지 획득 업적 추가
  const achievement = {
    type: 'badge',
    title: '배지 획득',
    description: `'${badgeData.name}' 배지를 획득했습니다.`,
    date: new Date().toISOString(),
    badgeId: badgeData.id
  };
  
  await updateDoc(gameDataRef, {
    achievements: [...(currentGameData.achievements || []), achievement],
    updatedAt: serverTimestamp()
  });
  
  // 배지 획득 알림 추가
  addGameNotification({
    type: 'badge',
    title: '새 배지 획득!',
    message: `'${badgeData.name}' 배지를 획득했습니다.`,
    icon: badgeData.icon
  });
  
  // 최근 배지 스토어 업데이트
  const recentBadgesData = get(recentBadges) || [];
  recentBadges.set([newBadge, ...recentBadgesData]);
  
  // 배지 획득 XP 추가
  await addXP(30, '배지 획득');
  
  return true;
}

// 배지 확인 완료
export async function markBadgeAsSeen(badgeId) {
  const currentUser = get(user);
  if (!currentUser) return;
  
  const userId = currentUser.uid;
  const currentGameData = get(gameData);
  
  if (!currentGameData) return;
  
  const gameDataRef = doc(db, 'gameData', userId);
  
  // 배지 업데이트
  const updatedBadges = (currentGameData.badges || []).map(badge => {
    if (badge.id === badgeId) {
      return { ...badge, isNew: false };
    }
    return badge;
  });
  
  await updateDoc(gameDataRef, {
    badges: updatedBadges,
    updatedAt: serverTimestamp()
  });
  
  // 최근 배지 스토어 업데이트
  const updatedRecentBadges = get(recentBadges).filter(badge => badge.id !== badgeId);
  recentBadges.set(updatedRecentBadges);
}

// 리더보드 로드
export async function loadLeaderboard() {
  try {
    gameDataLoading.set(true);
    
    const leaderboardQuery = query(
      collection(db, 'gameData'),
      orderBy('totalXp', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(leaderboardQuery);
    const data = snapshot.docs.map((doc, index) => {
      const userData = doc.data();
      return {
        userId: userData.userId,
        displayName: userData.displayName || '익명 사용자',
        level: userData.level || 1,
        xp: userData.totalXp || 0,
        rank: index + 1
      };
    });
    
    leaderboard.set(data);
    
    // 현재, 사용자 랭킹 가져오기
    const currentUserId = get(user)?.uid;
    if (currentUserId) {
      const userInLeaderboard = data.find(item => item.userId === currentUserId);
      
      // 사용자가 리더보드에 없으면 랭킹 직접 계산
      if (!userInLeaderboard) {
        const currentUserXp = get(gameData)?.totalXp || 0;
        
        const rankQuery = query(
          collection(db, 'gameData'),
          where('totalXp', '>', currentUserXp)
        );
        
        const rankSnapshot = await getDocs(rankQuery);
        const userRank = rankSnapshot.size + 1;
        
        // 사용자 랭킹 추가
        const userData = get(gameData);
        leaderboard.update(lb => [
          ...lb,
          {
            userId: currentUserId,
            displayName: userData?.displayName || '익명 사용자',
            level: userData?.level || 1,
            xp: userData?.totalXp || 0,
            rank: userRank,
            isCurrentUser: true
          }
        ]);
      }
    }
  } catch (error) {
    console.error('리더보드 로딩 오류:', error);
  } finally {
    gameDataLoading.set(false);
  }
}

// 게임 알림 추가
export function addGameNotification(notification) {
  const id = Date.now() + Math.random().toString(36).substr(2, 5);
  const newNotification = {
    id,
    ...notification,
    timestamp: new Date()
  };
  
  gameNotifications.update(notifications => [newNotification, ...notifications]);
  
  return id;
}

// 게임 알림 제거
export function removeGameNotification(id) {
  gameNotifications.update(notifications => 
    notifications.filter(notification => notification.id !== id)
  );
}

// getUserRanking export 추가
export const getUserRanking = async (userId) => {
  if (!userId) return null;
  
  try {
    // 현재 리더보드 데이터 가져오기
    let currentLeaderboardData;
    const unsubLeaderboard = leaderboard.subscribe(value => {
      currentLeaderboardData = value;
    });
    unsubLeaderboard();
    
    // 아직 리더보드 데이터가 없으면 로드
    if (!currentLeaderboardData || currentLeaderboardData.length === 0) {
      await loadLeaderboard();
      
      const newUnsubLeaderboard = leaderboard.subscribe(value => {
        currentLeaderboardData = value;
      });
      newUnsubLeaderboard();
    }
    
    // 사용자 순위 찾기
    const userIndex = currentLeaderboardData.findIndex(user => user.userId === userId);
    
    if (userIndex === -1) {
      return { rank: '??', totalUsers: currentLeaderboardData.length };
    }
    
    return { 
      rank: userIndex + 1, 
      totalUsers: currentLeaderboardData.length 
    };
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    return { rank: '??', totalUsers: 0 };
  }
};

// levelProgress export 추가
export const levelProgress = derived(gameData, $gameData => {
  if (!$gameData) return 0;
  
  const xp = $gameData.xp || 0;
  const xpToNextLevel = $gameData.xpToNextLevel || 100;
  
  // 백분율로 변환 (0-100)
  return Math.min(100, Math.floor((xp / xpToNextLevel) * 100));
}); 