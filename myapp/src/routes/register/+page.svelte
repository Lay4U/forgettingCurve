<script>
  import { register } from '$lib/services/authService';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/authStore';

  let displayName = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let error = '';
  let loading = false;

  // 사용자가 이미 로그인한 경우 대시보드로 리다이렉트
  $: if ($user) {
    goto('/dashboard');
  }

  const handleRegister = async () => {
    if (!displayName || !email || !password || !confirmPassword) {
      error = '모든 필드를 입력해주세요.';
      return;
    }

    if (password !== confirmPassword) {
      error = '비밀번호가 일치하지 않습니다.';
      return;
    }

    if (password.length < 6) {
      error = '비밀번호는 최소 6자 이상이어야 합니다.';
      return;
    }

    try {
      loading = true;
      error = '';
      await register(email, password, displayName);
      goto('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        error = '이미 사용 중인 이메일 주소입니다.';
      } else if (err.code === 'auth/invalid-email') {
        error = '유효하지 않은 이메일 형식입니다.';
      } else if (err.code === 'auth/weak-password') {
        error = '보안에 취약한 비밀번호입니다. 더 강력한 비밀번호를 사용해주세요.';
      } else {
        error = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
      }
    } finally {
      loading = false;
    }
  };
</script>

<div class="auth-container">
  <div class="card">
    <div class="card-header">
      <h2 class="text-center">회원가입</h2>
    </div>
    <div class="card-body">
      <form on:submit|preventDefault={handleRegister}>
        {#if error}
          <div class="error-message mb-3" role="alert">
            {error}
          </div>
        {/if}
        
        <div class="form-group">
          <label for="displayName">이름</label>
          <input 
            type="text" 
            id="displayName"
            class="form-control" 
            placeholder="이름을 입력하세요"
            bind:value={displayName}
            disabled={loading}
            required
          />
        </div>
        
        <div class="form-group">
          <label for="email">이메일</label>
          <input 
            type="email" 
            id="email"
            class="form-control" 
            placeholder="이메일 주소를 입력하세요"
            bind:value={email}
            disabled={loading}
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">비밀번호</label>
          <input 
            type="password" 
            id="password"
            class="form-control" 
            placeholder="비밀번호를 입력하세요 (6자 이상)"
            bind:value={password}
            disabled={loading}
            required
            minlength="6"
          />
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">비밀번호 확인</label>
          <input 
            type="password" 
            id="confirmPassword"
            class="form-control" 
            placeholder="비밀번호를 다시 입력하세요"
            bind:value={confirmPassword}
            disabled={loading}
            required
          />
        </div>
        
        <div class="mt-4">
          <button 
            type="submit" 
            class="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </div>
        
        <div class="mt-3 text-center">
          <p>이미 계정이 있으신가요? <a href="/login">로그인</a></p>
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  .error-message {
    padding: 0.5rem;
    background-color: rgba(220, 53, 69, 0.1);
    color: var(--danger-color);
    border-radius: 0.25rem;
    margin-bottom: 1rem;
  }

  .w-full {
    width: 100%;
  }

  .text-center {
    text-align: center;
  }

  .mb-3 {
    margin-bottom: 1rem;
  }

  .mt-3 {
    margin-top: 1rem;
  }

  .mt-4 {
    margin-top: 1.5rem;
  }
</style> 