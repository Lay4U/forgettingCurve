<script>
  import { onMount, onDestroy } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { 
    getUserNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead,
    requestNotificationPermission
  } from '$lib/services/notificationService';
  
  export let isOpen = false;
  
  let notifications = [];
  let loading = true;
  let error = null;
  let unreadCount = 0;
  let refreshInterval;
  
  const handleToggle = () => {
    isOpen = !isOpen;
    if (isOpen && unreadCount > 0) {
      handleMarkAllAsRead();
    }
  };
  
  const handleClickOutside = (event) => {
    const menu = document.querySelector('.notifications-menu');
    if (isOpen && menu && !menu.contains(event.target) && 
        !event.target.closest('.notifications-toggle')) {
      isOpen = false;
    }
  };
  
  const loadNotifications = async () => {
    if (!$user) return;
    
    try {
      loading = true;
      error = null;
      
      notifications = await getUserNotifications($user.uid);
      unreadCount = notifications.filter(n => !n.read).length;
    } catch (err) {
      console.error('알림 로딩 에러:', err);
      error = '알림을 불러오는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };
  
  const handleMarkAsRead = async (notificationId) => {
    if (!$user) return;
    
    try {
      await markNotificationAsRead($user.uid, notificationId);
      
      // 로컬 상태 업데이트
      notifications = notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      
      unreadCount = notifications.filter(n => !n.read).length;
    } catch (err) {
      console.error('알림 읽음 표시 에러:', err);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    if (!$user) return;
    
    try {
      await markAllNotificationsAsRead($user.uid);
      
      // 로컬 상태 업데이트
      notifications = notifications.map(n => ({ ...n, read: true }));
      unreadCount = 0;
    } catch (err) {
      console.error('알림 전체 읽음 표시 에러:', err);
    }
  };
  
  const handleNotificationClick = (notification) => {
    // 읽음 표시
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // 알림 타입에 따른 라우팅
    if (notification.type === 'review_reminder' && notification.data?.materialId) {
      window.location.href = `/study/${notification.data.materialId}`;
    } else if (notification.type === 'daily_summary') {
      window.location.href = '/dashboard';
    }
    
    // 메뉴 닫기
    isOpen = false;
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diff / (1000 * 60));
    const diffHours = Math.floor(diff / (1000 * 60 * 60));
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return '방금 전';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}분 전`;
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`;
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };
  
  // 알림 권한 요청
  const requestPermission = async () => {
    const permissionGranted = await requestNotificationPermission();
    if (permissionGranted) {
      // 알림 권한 획득 성공시 사용자 설정 업데이트 가능
    }
  };
  
  onMount(() => {
    loadNotifications();
    document.addEventListener('click', handleClickOutside);
    
    // 1분마다 알림 갱신
    refreshInterval = setInterval(loadNotifications, 60000);
    
    // 알림 권한 확인 및 요청
    if ('Notification' in window && Notification.permission !== 'granted') {
      requestPermission();
    }
  });
  
  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });
  
  // 사용자 변경시 알림 새로고침
  $: if ($user) {
    loadNotifications();
  }
</script>

<div class="notifications-container">
  <button 
    class="notifications-toggle" 
    on:click={handleToggle}
    aria-label="알림"
  >
    <span class="notification-icon">🔔</span>
    {#if unreadCount > 0}
      <span class="unread-badge">{unreadCount}</span>
    {/if}
  </button>
  
  {#if isOpen}
    <div class="notifications-menu">
      <div class="menu-header">
        <h3>알림</h3>
        {#if notifications.some(n => !n.read)}
          <button class="mark-all-read-button" on:click={handleMarkAllAsRead}>
            모두 읽음으로 표시
          </button>
        {/if}
      </div>
      
      {#if loading && notifications.length === 0}
        <div class="notifications-loading">
          <div class="loading-spinner"></div>
          <p>알림을 불러오는 중...</p>
        </div>
      {:else if error}
        <div class="notifications-error">
          <p>{error}</p>
          <button class="retry-button" on:click={loadNotifications}>
            다시 시도
          </button>
        </div>
      {:else if notifications.length === 0}
        <div class="empty-notifications">
          <div class="empty-icon">🔔</div>
          <p>알림이 없습니다</p>
        </div>
      {:else}
        <ul class="notifications-list">
          {#each notifications as notification}
            <li 
              class="notification-item {notification.read ? 'read' : 'unread'}"
              on:click={() => handleNotificationClick(notification)}
            >
              <div class="notification-icon-container">
                {#if notification.type === 'review_reminder'}
                  <span class="notification-type-icon">📚</span>
                {:else if notification.type === 'daily_summary'}
                  <span class="notification-type-icon">📆</span>
                {:else}
                  <span class="notification-type-icon">📝</span>
                {/if}
              </div>
              <div class="notification-content">
                <div class="notification-title">
                  {notification.title}
                </div>
                <div class="notification-message">
                  {notification.message}
                </div>
                <div class="notification-time">
                  {formatDate(notification.createdAt)}
                </div>
              </div>
              {#if !notification.read}
                <div class="unread-indicator"></div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</div>

<style>
  .notifications-container {
    position: relative;
  }
  
  .notifications-toggle {
    background: none;
    border: none;
    cursor: pointer;
    position: relative;
    padding: 0.5rem;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--dark-color);
  }
  
  .unread-badge {
    position: absolute;
    top: 0;
    right: 0;
    background-color: var(--danger-color);
    color: white;
    border-radius: 50%;
    font-size: 0.7rem;
    min-width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.25rem;
    font-weight: bold;
  }
  
  .notifications-menu {
    position: absolute;
    top: 100%;
    right: 0;
    width: 320px;
    max-height: 400px;
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .menu-header h3 {
    margin: 0;
    font-size: 1rem;
  }
  
  .mark-all-read-button {
    background: none;
    border: none;
    color: var(--primary-color);
    font-size: 0.85rem;
    padding: 0;
    cursor: pointer;
    text-decoration: underline;
  }
  
  .notifications-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    max-height: 350px;
  }
  
  .notification-item {
    display: flex;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    position: relative;
    transition: background-color 0.2s;
  }
  
  .notification-item:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  .notification-item.unread {
    background-color: rgba(74, 109, 167, 0.05);
  }
  
  .notification-icon-container {
    margin-right: 0.75rem;
    display: flex;
    align-items: center;
  }
  
  .notification-type-icon {
    font-size: 1.5rem;
  }
  
  .notification-content {
    flex: 1;
  }
  
  .notification-title {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  
  .notification-message {
    font-size: 0.9rem;
    color: var(--secondary-color);
    margin-bottom: 0.25rem;
  }
  
  .notification-time {
    font-size: 0.8rem;
    color: var(--secondary-color);
  }
  
  .unread-indicator {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    transform: translateY(-50%);
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: var(--primary-color);
  }
  
  .notifications-loading, .notifications-error, .empty-notifications {
    padding: 2rem;
    text-align: center;
    color: var(--secondary-color);
  }
  
  .loading-spinner {
    display: inline-block;
    width: 30px;
    height: 30px;
    border: 3px solid rgba(74, 109, 167, 0.3);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 0.5rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .retry-button {
    margin-top: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.85rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }
  
  .empty-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    opacity: 0.5;
  }
</style> 