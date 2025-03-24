<script>
  import { login, googleLogin } from '$lib/services/authService';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/authStore';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;
  let googleLoading = false;

  // 사용자가 이미 로그인한 경우 대시보드로 리다이렉트
  $: if ($user) {
    goto('/dashboard');
  }

  const handleLogin = async () => {
    if (!email || !password) {
      error = '이메일과 비밀번호를 모두 입력해주세요.';
      return;
    }

    try {
      loading = true;
      error = '';
      await login(email, password);
      goto('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        error = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (err.code === 'auth/too-many-requests') {
        error = '로그인 시도가 너무 많습니다. 잠시 후에 다시 시도해주세요.';
      } else {
        error = '로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
      }
    } finally {
      loading = false;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      googleLoading = true;
      error = '';
      await googleLogin();
      goto('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        error = '로그인 창이 닫혔습니다. 다시 시도해주세요.';
      } else {
        error = '구글 로그인 중 오류가 발생했습니다. 다시 시도해주세요.';
      }
    } finally {
      googleLoading = false;
    }
  };
</script>

<div class="auth-container">
  <div class="login-card">
    <div class="card-header">
      <div class="app-logo">
        <img src="/logo.png" alt="로고" class="logo-image" />
        <h1 class="app-title">기억력 학습 도우미</h1>
      </div>
      <h2 class="auth-title">로그인</h2>
      <p class="auth-subtitle">계정에 로그인하여 맞춤화된 학습 경험을 시작하세요</p>
    </div>
    
    <div class="card-body">
      {#if error}
        <div class="error-message" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
          </svg>
          {error}
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleLogin}>
        <div class="form-group">
          <label for="email">이메일</label>
          <div class="input-wrapper">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
            </svg>
            <input 
              type="email" 
              id="email"
              class="styled-input" 
              placeholder="이메일 주소"
              bind:value={email}
              disabled={loading}
              required
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="password">비밀번호</label>
          <div class="input-wrapper">
            <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
            <input 
              type="password" 
              id="password"
              class="styled-input" 
              placeholder="비밀번호"
              bind:value={password}
              disabled={loading}
              required
            />
          </div>
        </div>
        
        <div class="forgot-password">
          <a href="/reset-password">비밀번호를 잊으셨나요?</a>
        </div>
        
        <div class="auth-buttons">
          <button 
            type="submit" 
            class="btn btn-primary login-button"
            disabled={loading}
          >
            {#if loading}
              <span class="loader"></span>
              로그인 중...
            {:else}
              이메일로 로그인
            {/if}
          </button>
          
          <div class="or-divider">
            <span>또는</span>
          </div>
          
          <button 
            type="button" 
            class="btn btn-google"
            on:click={handleGoogleLogin}
            disabled={googleLoading}
          >
            {#if googleLoading}
              <span class="loader"></span>
              처리 중...
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 계속하기
            {/if}
          </button>
        </div>
        
        <div class="auth-footer">
          <p>계정이 없으신가요? <a href="/register" class="register-link">회원가입</a></p>
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  .auth-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 2rem;
  }

  .login-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 450px;
    padding: 2rem;
    transition: all 0.3s ease;
  }

  .app-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .logo-image {
    width: 70px;
    height: 70px;
    margin-bottom: 0.5rem;
  }

  .app-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin: 0;
  }

  .auth-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: #333;
    margin: 0 0 0.5rem 0;
    text-align: center;
  }

  .auth-subtitle {
    font-size: 0.95rem;
    color: #666;
    margin: 0 0 1.5rem 0;
    text-align: center;
  }

  .card-body {
    padding: 1rem 0;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background-color: rgba(220, 53, 69, 0.1);
    color: var(--danger-color);
    border-left: 4px solid var(--danger-color);
    border-radius: 4px;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: #555;
    margin-bottom: 0.5rem;
  }

  .input-wrapper {
    position: relative;
  }

  .input-icon {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: #aaa;
  }

  .styled-input {
    width: 100%;
    padding: 1rem 1rem 1rem 2.8rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  .styled-input:focus {
    border-color: var(--primary-color);
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.1);
  }

  .forgot-password {
    text-align: right;
    margin-bottom: 1.5rem;
  }

  .forgot-password a {
    font-size: 0.9rem;
    color: var(--primary-color);
    text-decoration: none;
    transition: all 0.2s;
  }

  .forgot-password a:hover {
    text-decoration: underline;
  }

  .auth-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .btn {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: var(--primary-dark-color);
  }

  .btn-google {
    background-color: white;
    color: #444;
    border: 1px solid #ddd;
  }

  .btn-google:hover:not(:disabled) {
    background-color: #f5f5f5;
  }

  .or-divider {
    display: flex;
    align-items: center;
    text-align: center;
    margin: 0.5rem 0;
    color: #999;
  }

  .or-divider::before,
  .or-divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #eee;
  }

  .or-divider span {
    padding: 0 10px;
    font-size: 0.9rem;
  }

  .auth-footer {
    text-align: center;
    font-size: 0.9rem;
    color: #666;
  }

  .register-link {
    color: var(--primary-color);
    font-weight: 600;
    text-decoration: none;
  }

  .register-link:hover {
    text-decoration: underline;
  }

  .loader {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
    margin-right: 0.5rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 576px) {
    .login-card {
      padding: 1.5rem;
    }
  }
</style> 