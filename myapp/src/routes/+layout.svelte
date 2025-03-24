<script>
	import '../app.css';
	import { onMount } from 'svelte';
	import { user, isLoading, isAdmin, logout } from '$lib/stores/authStore';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import NotificationsMenu from '$lib/components/NotificationsMenu.svelte';
  
  let isUserMenuOpen = false;
  
  const toggleUserMenu = () => {
    isUserMenuOpen = !isUserMenuOpen;
  };
  
  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    goto('/login');
  };
  
  const isActive = (path) => {
    return $page.url.pathname.startsWith(path);
  };
</script>

<svelte:head>
	<title>망각곡선 학습 도우미</title>
	<meta name="description" content="에빙하우스의 망각 곡선을 활용한 학습 관리 애플리케이션" />
</svelte:head>

<div class="app">
	<header class="main-header">
		<nav class="container flex justify-between items-center">
			<a href="/" class="logo">망각곡선</a>
			
			{#if $isLoading}
				<div class="loading-indicator">로딩 중...</div>
			{:else if $user}
				<div class="nav-links">
					<a href="/dashboard" class="nav-link {isActive('/dashboard') ? 'active' : ''}">대시보드</a>
					<a href="/study" class="nav-link {isActive('/study') ? 'active' : ''}">학습 자료</a>
					<a href="/subjects" class="nav-link {isActive('/subjects') ? 'active' : ''}">과목 관리</a>
					<a href="/settings" class="nav-link {isActive('/settings') ? 'active' : ''}">설정</a>
					
          <div class="notifications-container">
            <NotificationsMenu />
          </div>
          
          <div class="user-menu-container">
            <button class="user-menu-toggle" on:click={toggleUserMenu}>
              <div class="user-avatar">
                {#if $user.photoURL}
                  <img src={$user.photoURL} alt="프로필 이미지" />
                {:else}
                  <div class="avatar-placeholder">
                    {$user.displayName ? $user.displayName[0].toUpperCase() : '?'}
                  </div>
                {/if}
              </div>
            </button>
            
            {#if isUserMenuOpen}
              <div class="user-dropdown-menu">
                <div class="user-info">
                  <div class="user-name">{$user.displayName || '사용자'}</div>
                  <div class="user-email">{$user.email}</div>
                </div>
                <div class="menu-items">
                  <a href="/profile" class="menu-item">프로필</a>
                  <a href="/settings" class="menu-item">설정</a>
                  {#if $isAdmin}
                    <a href="/admin" class="menu-item">관리자</a>
                  {/if}
                  <a href="#" class="menu-item menu-item-danger" on:click={handleLogout}>로그아웃</a>
                </div>
              </div>
            {/if}
          </div>
				</div>
			{:else}
				<div class="nav-links">
					<a href="/login" class="nav-link">로그인</a>
					<a href="/register" class="nav-link btn btn-primary text-white">회원가입</a>
				</div>
			{/if}
		</nav>
	</header>

	<main class="container py-4">
		<slot />
	</main>

	<footer class="py-4 mt-auto">
		<div class="container text-center">
			<p>© {new Date().getFullYear()} 망각곡선 학습 도우미</p>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
	}

	.main-header {
		background-color: white;
		border-bottom: 1px solid var(--border-color);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		padding: 1.2rem 0;
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.logo {
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--primary-color);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.logo:hover {
		color: #3a5585;
		text-decoration: none;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

  .nav-link.btn-primary {
    color: white;
  }
  
	.nav-link {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--dark-color);
		text-decoration: none;
		padding: 0.5rem 0.75rem;
		border-radius: 0.25rem;
		transition: all 0.2s ease;
	}

	.nav-link:hover {
		color: var(--primary-color);
		background-color: rgba(74, 109, 167, 0.05);
		text-decoration: none;
	}
  
  .nav-link.active {
    color: var(--primary-color);
    background-color: rgba(74, 109, 167, 0.1);
    font-weight: 600;
  }

	.nav-link.logout {
		color: var(--danger-color);
	}

	.nav-link.logout:hover {
		background-color: rgba(220, 53, 69, 0.05);
	}

	.loading-indicator {
		font-size: 1.1rem;
		color: var(--secondary-color);
	}

	footer {
		border-top: 1px solid var(--border-color);
		padding: 1.5rem 0;
		color: var(--secondary-color);
	}
  
  /* 알림 메뉴 스타일 */
  .notifications-container {
    position: relative;
    margin-left: 0.5rem;
  }
  
  /* 사용자 메뉴 스타일 */
  .user-menu-container {
    position: relative;
    margin-left: 0.5rem;
  }
  
  .user-menu-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
  }
  
  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: var(--primary-color);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-weight: 600;
  }
  
  .user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .user-dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.5rem;
    width: 240px;
    background-color: white;
    border-radius: 0.5rem;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    overflow: hidden;
  }
  
  .user-info {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .user-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  
  .user-email {
    font-size: 0.9rem;
    color: var(--secondary-color);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .menu-items {
    padding: 0.5rem 0;
  }
  
  .menu-item {
    display: block;
    padding: 0.75rem 1rem;
    color: var(--dark-color);
    text-decoration: none;
    transition: background-color 0.2s;
  }
  
  .menu-item:hover {
    background-color: #f5f5f5;
    text-decoration: none;
  }
  
  .menu-item-danger {
    color: var(--danger-color);
  }
  
  .menu-item-danger:hover {
    background-color: rgba(220, 53, 69, 0.05);
  }
  
  /* 반응형 스타일 */
  @media (max-width: 768px) {
    .nav-links {
      gap: 0.5rem;
    }
    
    .nav-link {
      font-size: 1rem;
      padding: 0.4rem 0.6rem;
    }
  }
</style>
