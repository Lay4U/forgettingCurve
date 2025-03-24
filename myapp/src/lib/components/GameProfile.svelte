<!-- GameProfile.svelte -->
<script>
  import { onMount } from 'svelte';
  import { 
    gameData, 
    levelProgress, 
    xpToNextLevel, 
    streakInfo, 
    userRanking,
    leaderboard 
  } from '$lib/stores/gameStore';
  
  export let userId;
  export let displayName = '';
  
  // 배지를 표시할 개수 제한 (최대 표시 개수)
  let badgeLimit = 6;
  let showAllBadges = false;
  
  $: visibleBadges = showAllBadges && $gameData?.badges 
    ? $gameData.badges 
    : $gameData?.badges?.slice(0, badgeLimit) || [];
    
  $: hasMoreBadges = $gameData?.badges?.length > badgeLimit;
  
  const formatDate = (date) => {
    if (!date) return '';
    
    if (typeof date === 'object' && date.toDate) {
      date = date.toDate();
    }
    
    if (date instanceof Date) {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    return '';
  };
</script>

<div class="game-profile bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
  <!-- 프로필 헤더 -->
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-1">학습 프로필</h2>
    <p class="text-gray-600 dark:text-gray-300 text-sm">
      에빙하우스의 망각 곡선을 활용한 효율적인 학습을 통해 레벨을 올려보세요!
    </p>
  </div>
  
  {#if $gameData}
    <!-- 레벨 정보 -->
    <div class="flex items-center mb-6">
      <div class="relative flex-shrink-0">
        <div class="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
          <span class="text-2xl font-bold text-blue-600 dark:text-blue-300">
            {$gameData.level}
          </span>
        </div>
        
        <!-- 레벨 진행 원형 -->
        <svg class="absolute inset-0 h-16 w-16" viewBox="0 0 36 36">
          <circle 
            cx="18" 
            cy="18" 
            r="16" 
            fill="none" 
            class="stroke-current text-gray-200 dark:text-gray-700"
            stroke-width="3"
          />
          <circle 
            cx="18" 
            cy="18" 
            r="16" 
            fill="none" 
            class="stroke-current text-blue-500 dark:text-blue-400"
            stroke-width="3" 
            stroke-dasharray="100" 
            stroke-dashoffset={100 - $levelProgress}
            stroke-linecap="round"
            transform="rotate(-90 18 18)"
          />
        </svg>
      </div>
      
      <div class="ml-4 flex-1">
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">LV. {$gameData.level}</span>
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
            {$gameData.xp} / 
            {typeof $xpToNextLevel === 'string' ? $xpToNextLevel : $gameData.xp + $xpToNextLevel} XP
          </span>
        </div>
        
        <!-- 레벨 진행 막대 -->
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div 
            class="bg-blue-500 dark:bg-blue-400 h-2.5 rounded-full" 
            style="width: {$levelProgress}%"
          ></div>
        </div>
        
        <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {#if typeof $xpToNextLevel === 'string'}
            최대 레벨에 도달했습니다!
          {:else}
            다음 레벨까지 {$xpToNextLevel} XP 필요
          {/if}
        </div>
      </div>
    </div>
    
    <!-- 통계 및 현황 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <!-- 연속 학습 -->
      <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
        <div class="flex justify-center">
          <span class="text-2xl">🔥</span>
        </div>
        <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
          {$streakInfo.streakDays || $gameData.streakDays || 0}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">연속 학습일</div>
      </div>
      
      <!-- 학습 자료 수 -->
      <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
        <div class="flex justify-center">
          <span class="text-2xl">📚</span>
        </div>
        <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {$gameData.stats?.studiesCreated || 0}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">학습 자료</div>
      </div>
      
      <!-- 완료한 복습 -->
      <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
        <div class="flex justify-center">
          <span class="text-2xl">✅</span>
        </div>
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">
          {$gameData.stats?.reviewsCompleted || 0}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">완료한 복습</div>
      </div>
      
      <!-- 랭킹 -->
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
        <div class="flex justify-center">
          <span class="text-2xl">🏆</span>
        </div>
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {$userRanking?.rank || '-'}
        </div>
        <div class="text-xs text-gray-600 dark:text-gray-400">내 랭킹</div>
      </div>
    </div>
    
    <!-- 배지 섹션 -->
    <div class="mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-gray-800 dark:text-white">획득한 배지</h3>
        {#if hasMoreBadges}
          <button 
            on:click={() => showAllBadges = !showAllBadges} 
            class="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline"
          >
            {showAllBadges ? '접기' : '모두 보기'}
          </button>
        {/if}
      </div>
      
      {#if visibleBadges.length > 0}
        <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
          {#each visibleBadges as badge}
            <div class="badge-item text-center group relative">
              <div class="flex justify-center mb-2">
                <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
                  {badge.icon}
                </div>
              </div>
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate px-1">
                {badge.name}
              </div>
              
              <!-- 배지 정보 툴팁 -->
              <div class="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 rounded-md shadow-lg p-3 pointer-events-none border dark:border-gray-700">
                <div class="font-medium text-gray-900 dark:text-white mb-1">
                  {badge.name}
                </div>
                <p class="mb-2 text-xs">
                  {badge.description}
                </p>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  획득일: {formatDate(badge.earnedAt)}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="text-center py-8 border border-dashed rounded-lg border-gray-300 dark:border-gray-600">
          <p class="text-gray-500 dark:text-gray-400">아직 획득한 배지가 없습니다</p>
          <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">학습과 복습을 통해 배지를 획득해보세요!</p>
        </div>
      {/if}
    </div>
    
    <!-- 최근 업적 -->
    {#if $gameData.achievements && $gameData.achievements.length > 0}
      <div>
        <h3 class="text-lg font-medium text-gray-800 dark:text-white mb-4">최근 업적</h3>
        
        <div class="space-y-3">
          {#each $gameData.achievements.slice(0, 5) as achievement}
            <div class="flex items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
              <div class="flex-shrink-0 text-xl mr-3">
                {achievement.icon}
              </div>
              <div class="flex-1">
                <div class="font-medium text-gray-900 dark:text-white">
                  {achievement.name}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {achievement.description}
                </div>
              </div>
              <div class="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                {formatDate(achievement.earnedAt)}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="text-center py-8">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
      <p class="text-gray-500 dark:text-gray-400">게임 프로필 로딩 중...</p>
    </div>
  {/if}
</div> 