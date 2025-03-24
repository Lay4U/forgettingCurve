<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { gameData, leaderboardData } from '$lib/stores/gameStore';
  import { useGameSystem } from '$lib/hooks/useGameSystem';
  import { fade, scale } from 'svelte/transition';
  
  // 게임 시스템 사용
  const { loadLeaderboard, calculateUserRank } = useGameSystem();
  
  let isLoading = true;
  let currentUserRank = null;
  let rankFilters = ['전체', '주간', '월간'];
  let selectedFilter = '전체';
  let searchTerm = '';
  
  // 필터링된 리더보드 데이터
  $: filteredLeaderboard = $leaderboardData
    ? $leaderboardData
        .filter(userData => 
          !searchTerm || 
          userData.displayName?.toLowerCase()?.includes(searchTerm.toLowerCase())
        )
    : [];
  
  // 현재 사용자 랭킹 확인
  $: {
    if ($user && $gameData) {
      currentUserRank = {
        ...$gameData,
        displayName: $user.displayName,
        uid: $user.uid,
        photoURL: $user.photoURL,
        rank: $gameData.rank
      };
    }
  }
  
  // 현재 사용자가 리더보드에 포함되었는지 확인
  $: isCurrentUserInTop = $user && filteredLeaderboard.some(u => u.uid === $user.uid);
  
  onMount(async () => {
    isLoading = true;
    
    try {
      // 리더보드 데이터 로드
      await loadLeaderboard();
    } catch (error) {
      console.error("리더보드 데이터 로드 중 오류 발생:", error);
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>랭킹 | 기억의 곡선</title>
  <meta name="description" content="학습 활동을 통해 얻은 경험치로 다른 사용자들과 경쟁하세요." />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <div class="mb-8 text-center">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">학습 랭킹</h1>
    <p class="text-gray-600 dark:text-gray-300">꾸준한 학습을 통해 상위 랭킹에 도전해보세요!</p>
  </div>
  
  <!-- 상위 3명 표시 -->
  {#if !isLoading && filteredLeaderboard.length >= 3}
    <div class="flex justify-center items-end mb-12 max-w-3xl mx-auto" in:fade={{ duration: 300, delay: 150 }}>
      <!-- 2등 -->
      <div class="mx-4 pb-4" in:scale={{ duration: 300, delay: 300, start: 0.8 }}>
        <div class="relative flex flex-col items-center">
          <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 text-3xl">🥈</div>
          <div class="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 border-4 border-gray-300 dark:border-gray-500 flex items-center justify-center overflow-hidden">
            {#if filteredLeaderboard[1].photoURL}
              <img src={filteredLeaderboard[1].photoURL} alt="프로필" class="w-full h-full object-cover" />
            {:else}
              <div class="text-2xl font-bold text-gray-500 dark:text-gray-400">{filteredLeaderboard[1].displayName?.charAt(0) || 'U'}</div>
            {/if}
          </div>
          <div class="mt-2 text-center">
            <div class="font-bold text-gray-900 dark:text-white">{filteredLeaderboard[1].displayName}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Lv {filteredLeaderboard[1].level || 1}</div>
            <div class="text-sm font-semibold text-blue-600 dark:text-blue-400">{filteredLeaderboard[1].totalXp.toLocaleString()} XP</div>
          </div>
        </div>
      </div>
      
      <!-- 1등 -->
      <div class="mx-4 z-10" in:scale={{ duration: 300, delay: 200, start: 0.8 }}>
        <div class="relative flex flex-col items-center">
          <div class="absolute -top-10 left-1/2 transform -translate-x-1/2 text-4xl animate-pulse">👑</div>
          <div class="w-28 h-28 rounded-full bg-yellow-100 dark:bg-yellow-900/30 border-4 border-yellow-400 dark:border-yellow-500 flex items-center justify-center overflow-hidden shadow-lg">
            {#if filteredLeaderboard[0].photoURL}
              <img src={filteredLeaderboard[0].photoURL} alt="프로필" class="w-full h-full object-cover" />
            {:else}
              <div class="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{filteredLeaderboard[0].displayName?.charAt(0) || 'U'}</div>
            {/if}
          </div>
          <div class="mt-3 text-center">
            <div class="font-bold text-xl text-gray-900 dark:text-white">{filteredLeaderboard[0].displayName}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Lv {filteredLeaderboard[0].level || 1}</div>
            <div class="text-base font-semibold text-yellow-600 dark:text-yellow-400">{filteredLeaderboard[0].totalXp.toLocaleString()} XP</div>
          </div>
        </div>
      </div>
      
      <!-- 3등 -->
      <div class="mx-4 pb-8" in:scale={{ duration: 300, delay: 400, start: 0.8 }}>
        <div class="relative flex flex-col items-center">
          <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 text-3xl">🥉</div>
          <div class="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 border-4 border-amber-700 dark:border-amber-800 flex items-center justify-center overflow-hidden">
            {#if filteredLeaderboard[2].photoURL}
              <img src={filteredLeaderboard[2].photoURL} alt="프로필" class="w-full h-full object-cover" />
            {:else}
              <div class="text-2xl font-bold text-amber-700 dark:text-amber-600">{filteredLeaderboard[2].displayName?.charAt(0) || 'U'}</div>
            {/if}
          </div>
          <div class="mt-2 text-center">
            <div class="font-bold text-gray-900 dark:text-white">{filteredLeaderboard[2].displayName}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">Lv {filteredLeaderboard[2].level || 1}</div>
            <div class="text-sm font-semibold text-amber-700 dark:text-amber-600">{filteredLeaderboard[2].totalXp.toLocaleString()} XP</div>
          </div>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- 필터 및 검색 -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-6">
    <div class="p-4 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center space-x-2 mb-4 md:mb-0">
        {#each rankFilters as filter}
          <button 
            class="px-3 py-1 rounded-full text-sm {selectedFilter === filter 
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            on:click={() => selectedFilter = filter}
          >
            {filter}
          </button>
        {/each}
      </div>
      
      <div class="w-full md:w-auto relative">
        <input 
          type="text" 
          placeholder="사용자 검색..." 
          bind:value={searchTerm}
          class="w-full md:w-64 px-4 py-2 pl-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
    
    <!-- 리더보드 목록 -->
    {#if isLoading}
      <div class="p-8 flex justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    {:else if filteredLeaderboard.length === 0}
      <div class="p-8 text-center">
        <p class="text-gray-500 dark:text-gray-400">랭킹 정보가 없습니다.</p>
      </div>
    {:else}
      <div class="divide-y divide-gray-200 dark:divide-gray-700">
        {#each filteredLeaderboard as userData, index (userData.uid)}
          <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150 {userData.uid === $user?.uid ? 'bg-blue-50 dark:bg-blue-900/10' : ''}" in:fade={{ duration: 300, delay: 50 * (index % 10) }}>
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <div class="w-10 text-center font-semibold text-gray-500 dark:text-gray-400">
                  {#if index === 0}
                    <span class="text-yellow-500 dark:text-yellow-400 text-xl">🥇</span>
                  {:else if index === 1}
                    <span class="text-gray-400 dark:text-gray-300 text-xl">🥈</span>
                  {:else if index === 2}
                    <span class="text-amber-700 dark:text-amber-600 text-xl">🥉</span>
                  {:else}
                    {index + 1}
                  {/if}
                </div>
                <div class="ml-4 flex items-center">
                  <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                    {#if userData.photoURL}
                      <img src={userData.photoURL} alt="프로필" class="w-full h-full object-cover" />
                    {:else}
                      <div class="text-blue-600 dark:text-blue-300 font-bold">{userData.displayName?.charAt(0) || 'U'}</div>
                    {/if}
                  </div>
                  <div class="ml-4">
                    <div class="font-medium text-gray-900 dark:text-white flex items-center">
                      {userData.displayName || '이름 없음'}
                      {#if userData.uid === $user?.uid}
                        <span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">나</span>
                      {/if}
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                        Lv {userData.level || 1}
                      </div>
                      
                      {#if userData.streakInfo?.streakDays > 0}
                        <div class="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium flex items-center">
                          <span class="mr-1">🔥</span>
                          <span>{userData.streakInfo.streakDays}일</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="text-right">
                <div class="font-semibold text-gray-900 dark:text-white">{userData.totalXp?.toLocaleString() || 0}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">XP</div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
    
    <!-- 내 랭킹 정보 (상위 리스트에 없을 경우) -->
    {#if currentUserRank && !isCurrentUserInTop && $user}
      <div class="mt-4 border-t-2 border-gray-200 dark:border-gray-700">
        <div class="p-4 bg-blue-50 dark:bg-blue-900/10" in:fade={{ duration: 300 }}>
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="w-10 text-center font-semibold text-gray-500 dark:text-gray-400">
                {currentUserRank.rank || '?'}
              </div>
              <div class="ml-4 flex items-center">
                <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden">
                  {#if $user.photoURL}
                    <img src={$user.photoURL} alt="프로필" class="w-full h-full object-cover" />
                  {:else}
                    <div class="text-blue-600 dark:text-blue-300 font-bold">{$user.displayName?.charAt(0) || 'U'}</div>
                  {/if}
                </div>
                <div class="ml-4">
                  <div class="font-medium text-gray-900 dark:text-white flex items-center">
                    {$user.displayName || '이름 없음'}
                    <span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">나</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium">
                      Lv {currentUserRank.level || 1}
                    </div>
                    
                    {#if currentUserRank.streakInfo?.streakDays > 0}
                      <div class="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium flex items-center">
                        <span class="mr-1">🔥</span>
                        <span>{currentUserRank.streakInfo.streakDays}일</span>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            </div>
            
            <div class="text-right">
              <div class="font-semibold text-gray-900 dark:text-white">{currentUserRank.totalXp?.toLocaleString() || 0}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">XP</div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- 학습 팁 -->
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-6 p-6">
    <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">랭킹 올리기 팁</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <div class="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="font-medium text-gray-900 dark:text-white">매일 학습하기</div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">매일 학습을 진행하면 연속 학습 보너스로 추가 XP를 획득할 수 있습니다. 학습 스트릭을 유지하세요!</p>
      </div>
      
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <div class="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
          </div>
          <div class="font-medium text-gray-900 dark:text-white">양질의 자료 만들기</div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">잘 구성된 학습 자료를 만들면 더 높은 복습 품질을 유지할 수 있고, 복습 평가에서 높은 점수를 받으면 더 많은 XP를 획득합니다.</p>
      </div>
      
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <div class="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </div>
          <div class="font-medium text-gray-900 dark:text-white">그룹 활동 참여하기</div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">그룹에서 학습 자료를 공유하고 토론에 참여하면 추가 XP를 획득할 수 있습니다. 사회적 학습으로 더 많은 보상을 얻으세요.</p>
      </div>
      
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div class="flex items-center mb-2">
          <div class="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="font-medium text-gray-900 dark:text-white">배지 수집하기</div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">다양한 학습 활동을 통해 배지를 획득하세요. 특별한 배지는 상당한 양의 보너스 XP를 제공합니다.</p>
      </div>
    </div>
  </div>
</div> 