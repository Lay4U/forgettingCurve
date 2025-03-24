<script>
  import { onMount } from 'svelte';
  import { user, isAuthenticated } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { gameData, levelProgress } from '$lib/stores/gameStore';
  import { useGameSystem } from '$lib/hooks/useGameSystem';
  import { clickOutside } from '$lib/actions/clickOutside';
  
  // 게임 시스템 초기화
  const { 
    connectToLifecycle, 
    calculateLevelProgress, 
    calculateUserRank 
  } = useGameSystem();
  
  let profileMenuOpen = false;
  let mobileMenuOpen = false;
  let darkMode = false;
  
  // 다크모드 설정
  onMount(() => {
    if (browser) {
      darkMode = localStorage.getItem('darkMode') === 'true' || 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // 다크모드 적용
      applyTheme();
      
      // 게임 시스템 초기화
      if ($user) {
        connectToLifecycle();
      }
    }
  });
  
  // 다크모드 토글
  function toggleDarkMode() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    applyTheme();
  }
  
  // 다크모드 적용
  function applyTheme() {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
  
  // 프로필 메뉴 토글
  function toggleProfileMenu() {
    profileMenuOpen = !profileMenuOpen;
  }
  
  // 모바일 메뉴 토글
  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
  
  // 메뉴 닫기
  function closeMenus() {
    profileMenuOpen = false;
    mobileMenuOpen = false;
  }
  
  // 로그아웃
  async function handleLogout() {
    // 로그아웃 처리 로직
    await signOut();
    closeMenus();
    goto('/login');
  }
  
  // 현재 메뉴 상태 확인
  $: currentPath = $page.url.pathname;
  $: isActive = (path) => currentPath.startsWith(path);
  
  // 레벨 및 경험치 계산
  $: levelProgressValue = $gameData ? calculateLevelProgress($gameData.xp, $gameData.xpToNextLevel) : 0;
</script>

<nav class="bg-white shadow-md dark:bg-gray-800 fixed w-full z-20 top-0 left-0">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <div class="flex items-center">
        <!-- 로고 -->
        <a href="/" class="flex-shrink-0 flex items-center" on:click={closeMenus}>
          <img class="h-8 w-auto" src="/images/logo.svg" alt="기억의 곡선 로고" />
          <span class="ml-2 text-xl font-bold text-blue-600 dark:text-blue-400">기억의 곡선</span>
        </a>
        
        <!-- 메인 메뉴 (데스크톱) -->
        <div class="hidden md:ml-6 md:flex md:space-x-4">
          {#if $isAuthenticated}
            <a 
              href="/dashboard" 
              class="px-3 py-2 rounded-md text-sm font-medium {isActive('/dashboard') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            >
              대시보드
            </a>
            <a 
              href="/materials" 
              class="px-3 py-2 rounded-md text-sm font-medium {isActive('/materials') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            >
              학습 자료
            </a>
            <a 
              href="/review" 
              class="px-3 py-2 rounded-md text-sm font-medium {isActive('/review') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            >
              복습
            </a>
            <a 
              href="/groups" 
              class="px-3 py-2 rounded-md text-sm font-medium {isActive('/groups') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            >
              그룹
            </a>
          {:else}
            <a 
              href="/about" 
              class="px-3 py-2 rounded-md text-sm font-medium {isActive('/about') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            >
              소개
            </a>
            <a 
              href="/features" 
              class="px-3 py-2 rounded-md text-sm font-medium {isActive('/features') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            >
              주요 기능
            </a>
          {/if}
        </div>
      </div>
      
      <!-- 우측 영역 (프로필, 다크모드 등) -->
      <div class="flex items-center">
        <!-- 다크모드 토글 -->
        <button 
          type="button" 
          class="ml-3 p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
          on:click={toggleDarkMode}
        >
          {#if darkMode}
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          {:else}
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          {/if}
        </button>
        
        <!-- 게임 레벨 표시 (로그인 시) -->
        {#if $isAuthenticated && $gameData}
          <div class="hidden md:flex ml-4 items-center">
            <a href="/profile" class="flex items-center group relative">
              <div class="relative">
                <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden text-blue-600 dark:text-blue-300 font-bold">
                  {$gameData.level || 1}
                </div>
                
                <!-- 레벨 진행 원형 -->
                <svg class="absolute inset-0 h-8 w-8" viewBox="0 0 36 36">
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
                    stroke-dashoffset={100 - levelProgressValue}
                    stroke-linecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
              </div>
              
              <!-- 툴팁 -->
              <div class="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 absolute z-30 top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 rounded-md shadow-lg p-3 pointer-events-none border dark:border-gray-700">
                <div class="font-medium text-gray-900 dark:text-white mb-1">
                  레벨 {$gameData.level || 1}
                </div>
                <div class="mb-2 text-xs">
                  총 XP: {$gameData.totalXp?.toLocaleString() || 0}
                </div>
                <div class="text-xs">
                  다음 레벨까지: {$gameData.xp || 0} / {$gameData.xpToNextLevel || 100} XP
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                  <div 
                    class="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full" 
                    style="width: {levelProgressValue}%"
                  ></div>
                </div>
              </div>
            </a>
            
            <!-- 연속 학습 스트릭 -->
            {#if $gameData.streakInfo?.streakDays > 0}
              <a href="/profile" class="flex items-center ml-2 group relative">
                <div class="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium flex items-center">
                  <span class="mr-1">🔥</span>
                  <span>{$gameData.streakInfo.streakDays}</span>
                </div>
                
                <!-- 툴팁 -->
                <div class="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 absolute z-30 top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 rounded-md shadow-lg p-3 pointer-events-none border dark:border-gray-700">
                  <div class="font-medium text-gray-900 dark:text-white mb-1">
                    연속 학습 {$gameData.streakInfo.streakDays}일!
                  </div>
                  <div class="text-xs">꾸준히 학습하면 더 많은 XP와 배지를 얻을 수 있습니다.</div>
                </div>
              </a>
            {/if}
          </div>
        {/if}
        
        <!-- 프로필 메뉴 (로그인 시) -->
        {#if $isAuthenticated}
          <div class="ml-3 relative" use:clickOutside on:click_outside={() => profileMenuOpen = false}>
            <div>
              <button 
                type="button" 
                class="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:focus:ring-offset-gray-800"
                id="user-menu-button"
                on:click={toggleProfileMenu}
              >
                <span class="sr-only">프로필 메뉴 열기</span>
                <div class="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">
                  {$user?.displayName?.charAt(0) || $user?.email?.charAt(0) || 'U'}
                </div>
              </button>
            </div>
            
            <!-- 프로필 드롭다운 메뉴 -->
            {#if profileMenuOpen}
              <div 
                class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                role="menu"
              >
                <!-- 사용자 정보 -->
                <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {$user?.displayName || '이름 없음'}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {$user?.email || ''}
                  </div>
                </div>
                
                <!-- 게임 정보 -->
                {#if $gameData}
                  <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                    <div class="flex justify-between items-center">
                      <div class="text-xs font-medium text-gray-500 dark:text-gray-400">레벨</div>
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {$gameData.level || 1}
                      </div>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                      <div class="text-xs font-medium text-gray-500 dark:text-gray-400">경험치</div>
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {$gameData.totalXp?.toLocaleString() || 0} XP
                      </div>
                    </div>
                  </div>
                {/if}
                
                <!-- 메뉴 아이템 -->
                <a 
                  href="/profile" 
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                  role="menuitem"
                  on:click={closeMenus}
                >
                  내 프로필
                </a>
                <a 
                  href="/leaderboard" 
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                  role="menuitem"
                  on:click={closeMenus}
                >
                  랭킹
                </a>
                <a 
                  href="/settings" 
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600"
                  role="menuitem"
                  on:click={closeMenus}
                >
                  설정
                </a>
                <button 
                  class="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                  role="menuitem"
                  on:click={handleLogout}
                >
                  로그아웃
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <!-- 로그인/회원가입 버튼 -->
          <div class="hidden md:flex md:items-center">
            <a 
              href="/login" 
              class="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              on:click={closeMenus}
            >
              로그인
            </a>
            <a 
              href="/register" 
              class="ml-4 px-3 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
              on:click={closeMenus}
            >
              회원가입
            </a>
          </div>
        {/if}
        
        <!-- 모바일 메뉴 버튼 -->
        <div class="flex md:hidden ml-3">
          <button 
            type="button" 
            class="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            on:click={toggleMobileMenu}
          >
            <span class="sr-only">메뉴 열기</span>
            {#if mobileMenuOpen}
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            {:else}
              <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 모바일 메뉴 -->
  {#if mobileMenuOpen}
    <div class="md:hidden bg-white dark:bg-gray-800 shadow-lg border-t dark:border-gray-700">
      <div class="px-2 pt-2 pb-3 space-y-1">
        {#if $isAuthenticated}
          <!-- 로그인 시 메뉴 -->
          <a 
            href="/dashboard" 
            class="block px-3 py-2 rounded-md text-base font-medium {isActive('/dashboard') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            on:click={closeMenus}
          >
            대시보드
          </a>
          <a 
            href="/materials" 
            class="block px-3 py-2 rounded-md text-base font-medium {isActive('/materials') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            on:click={closeMenus}
          >
            학습 자료
          </a>
          <a 
            href="/review" 
            class="block px-3 py-2 rounded-md text-base font-medium {isActive('/review') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            on:click={closeMenus}
          >
            복습
          </a>
          <a 
            href="/groups" 
            class="block px-3 py-2 rounded-md text-base font-medium {isActive('/groups') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            on:click={closeMenus}
          >
            그룹
          </a>
          
          <!-- 게임 요소 모바일 -->
          {#if $gameData}
            <div class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <!-- 게임 프로필로 이동 -->
              <a 
                href="/profile" 
                class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/30"
                on:click={closeMenus}
              >
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden text-blue-600 dark:text-blue-300 font-bold mr-3">
                    {$gameData.level || 1}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">레벨 {$gameData.level || 1}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">XP: {$gameData.xp || 0} / {$gameData.xpToNextLevel || 100}</div>
                  </div>
                </div>
                <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
              
              <!-- 랭킹으로 이동 -->
              <a 
                href="/leaderboard" 
                class="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/30"
                on:click={closeMenus}
              >
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 text-xl mr-3">
                    🏆
                  </div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">랭킹 보기</div>
                </div>
                <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          {/if}
          
          <!-- 사용자 메뉴 -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <div class="flex items-center px-3">
              <div class="flex-shrink-0">
                <div class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-lg">
                  {$user?.displayName?.charAt(0) || $user?.email?.charAt(0) || 'U'}
                </div>
              </div>
              <div class="ml-3">
                <div class="text-base font-medium text-gray-800 dark:text-white">
                  {$user?.displayName || '이름 없음'}
                </div>
                <div class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                  {$user?.email || ''}
                </div>
              </div>
            </div>
            
            <div class="mt-3 space-y-1">
              <a 
                href="/profile" 
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30"
                on:click={closeMenus}
              >
                내 프로필
              </a>
              <a 
                href="/settings" 
                class="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30"
                on:click={closeMenus}
              >
                설정
              </a>
              <button 
                class="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                on:click={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </div>
        {:else}
          <!-- 비로그인 시 메뉴 -->
          <a 
            href="/about" 
            class="block px-3 py-2 rounded-md text-base font-medium {isActive('/about') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            on:click={closeMenus}
          >
            소개
          </a>
          <a 
            href="/features" 
            class="block px-3 py-2 rounded-md text-base font-medium {isActive('/features') ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/30'}"
            on:click={closeMenus}
          >
            주요 기능
          </a>
          <div class="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center px-3">
              <a 
                href="/login" 
                class="block w-full py-2 px-4 rounded-md text-base font-medium text-center text-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                on:click={closeMenus}
              >
                로그인
              </a>
            </div>
            <div class="mt-3 px-3">
              <a 
                href="/register" 
                class="block w-full py-2 px-4 rounded-md text-base font-medium text-center text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                on:click={closeMenus}
              >
                회원가입
              </a>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</nav>

<!-- 네비게이션 공간 확보 -->
<div class="h-16"></div> 