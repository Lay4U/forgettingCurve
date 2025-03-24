<!-- GameNotifications.svelte -->
<script>
  import { gameNotifications, removeGameNotification } from '$lib/stores/gameStore';
  import { fly, fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  
  export let maxShown = 3;
  
  // 최대 표시 개수 제한
  $: visibleNotifications = $gameNotifications.slice(0, maxShown);
  
  // 자동으로 알림 닫기
  const autoClose = (id) => {
    const timeout = setTimeout(() => {
      removeGameNotification(id);
    }, 5000); // 5초 후 자동으로 닫힘
    
    return () => clearTimeout(timeout);
  };
</script>

<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-72">
  {#each visibleNotifications as notification (notification.id)}
    <div
      class="notification bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      animate:flip={{ duration: 300 }}
      in:fly={{ y: 50, duration: 300 }}
      out:fade={{ duration: 200 }}
      use:autoClose={notification.id}
    >
      <div class="flex items-start p-3">
        <!-- 아이콘 -->
        <div class="flex-shrink-0 mr-3">
          {#if notification.type === 'badge'}
            <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-2xl">
              {notification.icon || '🏆'}
            </div>
          {:else if notification.type === 'levelup'}
            <div class="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center text-2xl">
              {notification.icon || '⬆️'}
            </div>
          {:else if notification.type === 'streak'}
            <div class="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center text-2xl">
              {notification.icon || '🔥'}
            </div>
          {:else}
            <div class="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-2xl">
              {notification.icon || '📣'}
            </div>
          {/if}
        </div>
        
        <!-- 알림 내용 -->
        <div class="flex-1">
          <h4 class="font-medium text-gray-900 dark:text-white text-sm">
            {notification.title}
          </h4>
          <p class="text-gray-600 dark:text-gray-300 text-xs mt-1">
            {notification.message}
          </p>
        </div>
        
        <!-- 닫기 버튼 -->
        <button
          class="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          on:click={() => removeGameNotification(notification.id)}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 진행 바 (자동으로 닫히는 시간) -->
      <div class="h-1 bg-blue-100 dark:bg-blue-900 w-full">
        <div class="h-1 bg-blue-500 dark:bg-blue-400 animate-shrink-width"></div>
      </div>
    </div>
  {/each}
</div>

<style>
  @keyframes shrink-width {
    from { width: 100%; }
    to { width: 0%; }
  }
  
  .animate-shrink-width {
    animation: shrink-width 5s linear forwards;
  }
</style> 