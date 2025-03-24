import { onMount, onDestroy } from 'svelte';
import { 
  initializeGameData,
  gameData,
  leaderboard,
  streakInfo, 
  recentBadges,
  recentAchievements,
  addXP,
  updateMaterialCreated,
  updateReviewCompleted,
  checkAndAddStreakBadges,
  loadLeaderboard,
  userRanking,
  gameDataLoading
} from '$lib/stores/gameStore';
import { user } from '$lib/stores/authStore';
import { get } from 'svelte/store';

/**
 * 게이미피케이션 시스템을 위한 커스텀 훅
 * @returns {Object} 게이미피케이션 시스템 제어를 위한 함수와 상태
 */
export function useGameSystem() {
  let gameDataUnsubscribe = null;
  let initialized = false;
  
  // 레벨업 계산
  const calculateLevelProgress = (xp, xpToNextLevel) => {
    if (!xp || !xpToNextLevel) return 0;
    return Math.min(100, Math.round((xp / xpToNextLevel) * 100));
  };
  
  // 다음 레벨까지 필요한 경험치 계산
  const calculateXpToNextLevel = (level) => {
    return 100 * level;
  };
  
  // 사용자 순위 계산
  const calculateUserRank = () => {
    const userData = get(gameData);
    const leaderboardData = get(leaderboard);
    
    if (!userData || !leaderboardData || leaderboardData.length === 0) {
      userRanking.set({ rank: '??', totalUsers: 0 });
      return null;
    }
    
    // 이미 리더보드에 있으면 해당 랭킹 반환
    const userInLeaderboard = leaderboardData.find(
      entry => entry.userId === userData.userId
    );
    
    if (userInLeaderboard) {
      userRanking.set({ rank: userInLeaderboard.rank, totalUsers: leaderboardData.length });
      return userInLeaderboard.rank;
    }
    
    // 현재 유저의 XP보다 높은 사용자 수 + 1 = 현재 유저의 랭킹
    const usersWithMoreXp = leaderboardData.filter(
      entry => entry.xp > userData.totalXp
    ).length;
    
    const currentRank = usersWithMoreXp + 1;
    userRanking.set({ rank: currentRank, totalUsers: leaderboardData.length });
    return currentRank;
  };
  
  // 게임 데이터 초기화
  const initialize = async () => {
    if (initialized || !get(user)) return;
    
    gameDataUnsubscribe = await initializeGameData();
    initialized = true;
    
    return gameDataUnsubscribe;
  };
  
  // 해제
  const cleanup = () => {
    if (gameDataUnsubscribe) {
      gameDataUnsubscribe();
      gameDataUnsubscribe = null;
    }
    initialized = false;
  };
  
  // 경험치 추가
  const earnXP = async (amount, reason) => {
    return await addXP(amount, reason);
  };
  
  // 학습 자료 생성 업데이트
  const recordMaterialCreated = async () => {
    return await updateMaterialCreated();
  };
  
  // 복습 완료 업데이트
  const recordReviewCompleted = async () => {
    return await updateReviewCompleted();
  };
  
  // 스트릭 배지 확인
  const checkStreakBadges = async () => {
    return await checkAndAddStreakBadges();
  };
  
  // 리더보드 새로고침
  const refreshLeaderboard = async () => {
    await loadLeaderboard();
    // 리더보드 로드 후 사용자 랭킹 계산
    calculateUserRank();
  };
  
  // 컴포넌트 라이프사이클에 자동 연결
  const connectToLifecycle = () => {
    onMount(async () => {
      await initialize();
      // 초기화 후 사용자 랭킹 계산
      calculateUserRank();
    });
    
    onDestroy(() => {
      cleanup();
    });
  };
  
  // 스토어 직접 내보내기
  return {
    // 상태
    gameData,
    leaderboard,
    streakInfo,
    recentBadges, 
    recentAchievements,
    userRanking,
    gameDataLoading,
    
    // 유틸리티 함수
    calculateLevelProgress,
    calculateXpToNextLevel,
    calculateUserRank,
    earnXP,
    recordMaterialCreated,
    recordReviewCompleted,
    checkStreakBadges,
    refreshLeaderboard,
    connectToLifecycle,
    loadLeaderboard
  };
} 