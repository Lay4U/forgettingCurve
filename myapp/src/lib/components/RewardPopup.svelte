<!-- RewardPopup.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  
  export let badge = null;
  export let xp = 0;
  export let levelUp = false;
  export let newLevel = 0;
  export let streakDays = 0;
  
  const dispatch = createEventDispatcher();
  
  const close = () => {
    dispatch('close');
  };
  
  let confetti = [];
  
  // 축하 효과 (간단한 컨페티)
  onMount(() => {
    const count = 100;
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    
    for (let i = 0; i < count; i++) {
      confetti.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        duration: Math.random() * 4 + 3
      });
    }
  });
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
  <div 
    class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden relative"
    transition:scale={{ duration: 300, start: 0.8 }}
  >
    <!-- 컨페티 효과 -->
    {#each confetti as piece}
      <div 
        class="absolute rounded-full"
        style="
          left: {piece.x}%; 
          top: {piece.y}%; 
          width: {piece.size}px; 
          height: {piece.size}px; 
          background-color: {piece.color};
          transform: rotate({piece.rotation}deg);
          animation: fallDown {piece.duration}s linear forwards;
        "
      ></div>
    {/each}
    
    <!-- 보상 내용 -->
    <div class="p-6 text-center">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        {#if badge}
          새 배지 획득!
        {:else if levelUp}
          레벨 업!
        {:else if streakDays > 0}
          {streakDays}일 연속 학습!
        {:else}
          보상 획득!
        {/if}
      </h2>
      
      {#if badge}
        <div class="mb-6 inline-block">
          <div class="w-24 h-24 mx-auto bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-5xl mb-3">
            {badge.icon}
          </div>
          <div class="text-xl font-semibold text-gray-900 dark:text-white mb-2">{badge.name}</div>
          <div class="text-gray-600 dark:text-gray-300 mb-3">{badge.description}</div>
          <div class="text-blue-600 dark:text-blue-400 font-medium">+{15} XP</div>
        </div>
      {/if}
      
      {#if levelUp}
        <div class="mb-6 inline-block">
          <div class="mb-6 flex justify-center items-center">
            <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xl font-bold text-blue-600 dark:text-blue-300 relative">
              {newLevel - 1}
              <div class="absolute -right-8 top-1/2 transform -translate-y-1/2">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
              </div>
            </div>
            <div class="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-xl font-bold text-green-600 dark:text-green-300 ml-12">
              {newLevel}
            </div>
          </div>
          <div class="text-xl font-semibold text-gray-900 dark:text-white mb-2">레벨 업 달성!</div>
          <div class="text-gray-600 dark:text-gray-300 mb-3">레벨 {newLevel}에 도달했습니다</div>
        </div>
      {/if}
      
      {#if streakDays > 0}
        <div class="mb-6 inline-block">
          <div class="w-24 h-24 mx-auto bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center text-5xl mb-3">
            🔥
          </div>
          <div class="text-xl font-semibold text-gray-900 dark:text-white mb-2">{streakDays}일 연속 학습!</div>
          <div class="text-gray-600 dark:text-gray-300 mb-3">꾸준한 학습이 성공의 열쇠입니다</div>
          
          {#if streakDays === 7 || streakDays === 30}
            <div class="text-blue-600 dark:text-blue-400 font-medium">
              특별 보너스: +{streakDays === 7 ? 30 : 100} XP
            </div>
          {:else}
            <div class="text-blue-600 dark:text-blue-400 font-medium">스트릭 보너스: +5 XP</div>
          {/if}
        </div>
      {/if}
      
      {#if xp > 0 && !badge && !levelUp && !streakDays}
        <div class="mb-6 inline-block">
          <div class="w-24 h-24 mx-auto bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-3">
            <span class="text-3xl font-bold text-yellow-600 dark:text-yellow-400">+{xp}</span>
          </div>
          <div class="text-xl font-semibold text-gray-900 dark:text-white mb-2">경험치 획득!</div>
          <div class="text-gray-600 dark:text-gray-300 mb-3">학습 활동으로 경험치를 얻었습니다</div>
        </div>
      {/if}
      
      <button 
        on:click={close}
        class="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md px-6 py-2 font-medium transition-colors duration-200"
      >
        확인
      </button>
    </div>
  </div>
</div>

<style>
  @keyframes fallDown {
    0% {
      transform: translateY(-10px) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
</style> 