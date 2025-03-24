<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { getReviewsForToday, updateReviewStatus } from '$lib/services/reviewService';
  import { useGameSystem } from '$lib/hooks/useGameSystem';
  import GameNotifications from '$lib/components/GameNotifications.svelte';
  import RewardPopup from '$lib/components/RewardPopup.svelte';
  
  // 게이미피케이션 시스템 초기화
  const {
    gameData,
    recentBadges,
    recordReviewCompleted,
    earnXP,
    connectToLifecycle
  } = useGameSystem();
  
  // 컴포넌트 라이프사이클에 게임 시스템 연결
  connectToLifecycle();
  
  // 배지 팝업 상태
  let showBadgePopup = false;
  let currentBadge = null;
  let showXpPopup = false;
  let earnedXp = 0;
  
  let loading = true;
  let error = '';
  let reviewItems = [];
  let currentItemIndex = 0;
  let showAnswer = false;
  let recallQuality = null;
  
  // 로그인 상태 확인
  onMount(async () => {
    if (!$user) {
      goto('/login');
      return;
    }
    
    await loadReviews();
    
    // 배지 상태 구독
    const unsubscribeBadges = recentBadges.subscribe(badges => {
      if (badges && badges.length > 0 && !showBadgePopup && !showXpPopup) {
        currentBadge = badges[0];
        showBadgePopup = true;
      }
    });
    
    return () => {
      unsubscribeBadges();
    };
  });
  
  // 오늘의 복습 항목 로드
  async function loadReviews() {
    try {
      loading = true;
      error = '';
      
      reviewItems = await getReviewsForToday($user.uid);
      
      if (reviewItems.length === 0) {
        error = '오늘 복습할 항목이 없습니다.';
      }
      
    } catch (err) {
      console.error('복습 로딩 에러:', err);
      error = '복습 항목을 불러오는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  }
  
  // 답변 표시
  function handleShowAnswer() {
    showAnswer = true;
  }
  
  // 회상 품질 평가 및 다음 항목으로 이동
  async function handleRecallQuality(quality) {
    if (!reviewItems[currentItemIndex]) return;
    
    const reviewId = reviewItems[currentItemIndex].id;
    recallQuality = quality;
    
    try {
      // 복습 상태 업데이트
      await updateReviewStatus(reviewId, quality);
      
      // 게임 시스템에 복습 완료 기록
      await recordReviewCompleted();
      
      // 회상 품질에 따른 추가 XP
      let bonusXp = 0;
      if (quality >= 4) {
        bonusXp = quality - 3;
        await earnXP(bonusXp, '정확한 회상');
        
        // XP 획득 팝업 표시
        if (bonusXp > 0 && !showBadgePopup) {
          earnedXp = bonusXp;
          showXpPopup = true;
        }
      }
      
      // 잠시 후 다음 항목으로 이동
      setTimeout(() => {
        if (currentItemIndex < reviewItems.length - 1) {
          currentItemIndex++;
          showAnswer = false;
          recallQuality = null;
        } else {
          // 모든 복습 완료
          reviewItems = [];
          error = '오늘의 복습을 모두 완료했습니다! 내일 다시 방문해주세요.';
        }
      }, 1500);
      
    } catch (err) {
      console.error('복습 상태 업데이트 에러:', err);
      error = '복습 상태를 업데이트하는 중 오류가 발생했습니다.';
    }
  }
  
  // 배지 팝업 닫기
  const handleBadgePopupClose = () => {
    showBadgePopup = false;
    
    // 다음 배지가 있으면 표시
    const badges = $recentBadges;
    if (badges.length > 1) {
      $recentBadges = badges.slice(1);
    } else {
      $recentBadges = [];
    }
  };
  
  // XP 팝업 닫기
  const handleXpPopupClose = () => {
    showXpPopup = false;
  };
</script>

<svelte:head>
  <title>오늘의 복습 | 기억의 곡선</title>
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">오늘의 복습</h1>
  
  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 dark:bg-red-900 dark:text-red-200 dark:border-red-800">
      {error}
    </div>
  {/if}
  
  {#if loading}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    </div>
  {:else if reviewItems.length > 0 && currentItemIndex < reviewItems.length}
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4">
      <div class="flex justify-between items-center mb-4">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          복습 {currentItemIndex + 1} / {reviewItems.length}
        </span>
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {new Date(reviewItems[currentItemIndex].nextReviewDate).toLocaleDateString('ko-KR')}
        </span>
      </div>
      
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {reviewItems[currentItemIndex].material.title}
      </h2>
      
      <div class="mb-6">
        <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">질문:</h3>
        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          {reviewItems[currentItemIndex].material.content}
        </div>
      </div>
      
      {#if !showAnswer}
        <button 
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
          on:click={handleShowAnswer}
        >
          답변 보기
        </button>
      {:else}
        <div class="mb-6">
          <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">답변:</h3>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            {reviewItems[currentItemIndex].material.answer || "답변이 없습니다."}
          </div>
        </div>
        
        {#if recallQuality === null}
          <div class="mt-6">
            <h3 class="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2 text-center">
              회상 품질을 평가해주세요
            </h3>
            <div class="grid grid-cols-5 gap-2 mt-4">
              <button
                class="flex flex-col items-center justify-center p-3 bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors dark:bg-red-900/50 dark:hover:bg-red-900 dark:text-red-200"
                on:click={() => handleRecallQuality(1)}
              >
                <span class="text-2xl mb-1">😣</span>
                <span class="text-sm">전혀 기억 안남</span>
              </button>
              <button
                class="flex flex-col items-center justify-center p-3 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-md transition-colors dark:bg-orange-900/50 dark:hover:bg-orange-900 dark:text-orange-200"
                on:click={() => handleRecallQuality(2)}
              >
                <span class="text-2xl mb-1">😕</span>
                <span class="text-sm">어렴풋이 기억</span>
              </button>
              <button
                class="flex flex-col items-center justify-center p-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors dark:bg-yellow-900/50 dark:hover:bg-yellow-900 dark:text-yellow-200"
                on:click={() => handleRecallQuality(3)}
              >
                <span class="text-2xl mb-1">😐</span>
                <span class="text-sm">애매하게 기억</span>
              </button>
              <button
                class="flex flex-col items-center justify-center p-3 bg-lime-100 hover:bg-lime-200 text-lime-800 rounded-md transition-colors dark:bg-lime-900/50 dark:hover:bg-lime-900 dark:text-lime-200"
                on:click={() => handleRecallQuality(4)}
              >
                <span class="text-2xl mb-1">🙂</span>
                <span class="text-sm">거의 기억</span>
              </button>
              <button
                class="flex flex-col items-center justify-center p-3 bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors dark:bg-green-900/50 dark:hover:bg-green-900 dark:text-green-200"
                on:click={() => handleRecallQuality(5)}
              >
                <span class="text-2xl mb-1">😄</span>
                <span class="text-sm">완벽히 기억</span>
              </button>
            </div>
          </div>
        {:else}
          <div class="flex justify-center my-6">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        {/if}
      {/if}
    </div>
    
    <div class="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600">
      <p class="text-sm">
        <span class="font-bold">TIP:</span> 회상 품질이 높을수록 다음 복습 간격이 길어지고, 낮을수록 짧아집니다. 
        정확한 평가가 효과적인 학습에 도움이 됩니다.
      </p>
    </div>
  {/if}
</div>

<!-- 게임 알림 -->
<GameNotifications />

<!-- 배지 획득 팝업 -->
{#if showBadgePopup && currentBadge}
  <RewardPopup badge={currentBadge} on:close={handleBadgePopupClose} />
{/if}

<!-- XP 획득 팝업 -->
{#if showXpPopup}
  <RewardPopup xp={earnedXp} on:close={handleXpPopupClose} />
{/if} 