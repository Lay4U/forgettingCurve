<!-- Leaderboard.svelte -->
<script>
  import { leaderboard, gameDataLoading, userRanking } from '$lib/stores/gameStore';
  import { user } from '$lib/stores/authStore';
  
  // 내 랭킹이 상위 랭킹에 표시되는지 확인
  $: myRankInTopList = $leaderboard.some(r => r.userId === $user?.uid);
</script>

<div class="leaderboard bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white">학습 리더보드</h2>
    <div class="text-sm text-gray-500 dark:text-gray-400">상위 10명</div>
  </div>
  
  {#if $gameDataLoading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
    </div>
  {:else if $leaderboard && $leaderboard.length > 0}
    <div class="space-y-2">
      <!-- 상위 랭킹 목록 -->
      {#each $leaderboard as rankData, index}
        <div class="flex items-center p-3 rounded-lg {rankData.userId === $user?.uid ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}">
          <!-- 순위 -->
          <div class="flex-shrink-0 w-8 text-center">
            {#if index < 3}
              <span class="text-xl">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
              </span>
            {:else}
              <span class="font-semibold text-gray-500 dark:text-gray-400">
                {index + 1}
              </span>
            {/if}
          </div>
          
          <!-- 사용자 정보 -->
          <div class="flex-1 ml-3">
            <div class="font-medium text-gray-900 dark:text-white">
              {rankData.displayName || '익명'}
              {rankData.userId === $user?.uid ? ' (나)' : ''}
            </div>
          </div>
          
          <!-- 레벨과 경험치 -->
          <div class="flex items-center gap-3">
            <div class="text-center">
              <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm text-blue-600 dark:text-blue-300 font-semibold">
                {rankData.level}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">레벨</div>
            </div>
            
            <div class="text-right">
              <div class="font-semibold text-gray-800 dark:text-gray-200">{rankData.totalXp.toLocaleString()}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">XP</div>
            </div>
          </div>
        </div>
      {/each}
      
      <!-- 내 순위가 상위 10위 밖인 경우 표시 -->
      {#if !myRankInTopList && $userRanking}
        <div class="my-4 border-t border-dashed border-gray-200 dark:border-gray-700 pt-4">
          <div class="flex items-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <!-- 순위 -->
            <div class="flex-shrink-0 w-8 text-center">
              <span class="font-semibold text-gray-500 dark:text-gray-400">
                {$userRanking.rank}
              </span>
            </div>
            
            <!-- 사용자 정보 -->
            <div class="flex-1 ml-3">
              <div class="font-medium text-gray-900 dark:text-white">
                {$userRanking.displayName || '익명'} (나)
              </div>
            </div>
            
            <!-- 레벨과 경험치 -->
            <div class="flex items-center gap-3">
              <div class="text-center">
                <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm text-blue-600 dark:text-blue-300 font-semibold">
                  {$userRanking.level}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">레벨</div>
              </div>
              
              <div class="text-right">
                <div class="font-semibold text-gray-800 dark:text-gray-200">{$userRanking.totalXp.toLocaleString()}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">XP</div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="text-center py-12 text-gray-500 dark:text-gray-400">
      <p>랭킹 정보가 없습니다</p>
      <p class="text-sm mt-2">학습과 복습을 통해 경험치를 획득해보세요!</p>
    </div>
  {/if}
</div> 