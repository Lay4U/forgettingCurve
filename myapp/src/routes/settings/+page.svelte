<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { getUserSettings, updateUserSettings } from '$lib/services/userSettingsService';
  
  let settings = null;
  let loading = true;
  let saving = false;
  let error = '';
  let successMessage = '';
  
  // 설정 변경 여부 추적
  let settingsChanged = false;
  
  // 새로운 복습 간격 갯수 조절
  let intervalCount = 4;
  
  // 기본 설정값
  const defaultSettings = {
    reviewIntervals: [0, 1, 7, 30], // 당일, 1일, 1주일, 30일
    memoryFactor: 1.0,
    preferredStudyTime: '09:00',
    notificationsEnabled: true,
    emailNotifications: false,
    pushNotifications: false
  };
  
  // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  $: if ($user === null && loading === false) {
    goto('/login');
  }
  
  onMount(async () => {
    if ($user) {
      await loadSettings();
    } else {
      loading = false;
    }
  });
  
  const loadSettings = async () => {
    try {
      loading = true;
      error = '';
      successMessage = '';
      
      let userSettings = await getUserSettings($user.uid);
      
      // 필요한 설정이 없거나 이전 형식이면 기본값으로 설정
      if (!userSettings.reviewIntervals || Array.isArray(userSettings.reviewIntervals) === false) {
        userSettings.reviewIntervals = [...defaultSettings.reviewIntervals];
      }
      
      settings = userSettings;
      intervalCount = settings.reviewIntervals.length;
      settingsChanged = false;
    } catch (err) {
      console.error('설정 로딩 에러:', err);
      error = '설정을 불러오는 중 오류가 발생했습니다.';
      // 오류 발생 시 기본 설정 적용
      settings = { ...defaultSettings };
      intervalCount = settings.reviewIntervals.length;
    } finally {
      loading = false;
    }
  };
  
  const handleSettingsChange = () => {
    settingsChanged = true;
    successMessage = '';
  };
  
  const saveSettings = async () => {
    try {
      saving = true;
      error = '';
      successMessage = '';
      
      await updateUserSettings($user.uid, settings);
      
      successMessage = '설정이 성공적으로 저장되었습니다.';
      settingsChanged = false;
    } catch (err) {
      console.error('설정 저장 에러:', err);
      error = '설정을 저장하는 중 오류가 발생했습니다.';
    } finally {
      saving = false;
    }
  };
  
  const resetSettings = async () => {
    if (confirm('정말로 기본 설정으로 초기화하시겠습니까?')) {
      settings = { ...defaultSettings };
      intervalCount = settings.reviewIntervals.length;
      handleSettingsChange();
    }
  };
  
  // 복습 간격 횟수 변경 처리
  const handleIntervalCountChange = () => {
    const currentCount = settings.reviewIntervals.length;
    
    if (intervalCount > currentCount) {
      // 간격 추가
      const lastInterval = settings.reviewIntervals[currentCount - 1] || 30;
      const newIntervals = [...settings.reviewIntervals];
      
      for (let i = currentCount; i < intervalCount; i++) {
        newIntervals.push(lastInterval + 30); // 기본적으로 마지막 간격 + 30일 추가
      }
      
      settings.reviewIntervals = newIntervals;
    } else if (intervalCount < currentCount) {
      // 간격 제거
      settings.reviewIntervals = settings.reviewIntervals.slice(0, intervalCount);
    }
    
    handleSettingsChange();
  };
</script>

<div class="settings-container">
  <h1>설정</h1>
  
  {#if error}
    <div class="alert alert-danger mt-3 mb-3" role="alert">
      {error}
    </div>
  {/if}
  
  {#if successMessage}
    <div class="alert alert-success mt-3 mb-3" role="alert">
      {successMessage}
    </div>
  {/if}
  
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>설정을 불러오는 중...</p>
    </div>
  {:else if settings}
    <!-- 설정 내비게이션 메뉴 -->
    <div class="settings-navigation mb-4">
      <div class="nav-items">
        <a href="/settings" class="nav-item active">기본 설정</a>
        <a href="/settings/templates" class="nav-item">복습 템플릿 관리</a>
      </div>
    </div>
    
    <div class="settings-content">
      <div class="settings-section">
        <div class="section-header">
          <h2>복습 간격 설정</h2>
          <p class="text-muted">복습 일정을 위한 시간 간격을 설정하세요 (일 단위)</p>
        </div>
        <div class="section-body">
          <div class="form-group">
            <label for="intervalCount">복습 횟수</label>
            <div class="input-range-container">
              <input 
                type="range" 
                id="intervalCount" 
                min="1" 
                max="10" 
                step="1" 
                bind:value={intervalCount} 
                on:change={handleIntervalCountChange}
                class="form-control-range"
              />
              <div class="range-value">{intervalCount}회</div>
            </div>
            <small class="form-text text-muted">
              복습 횟수를 1회에서 10회 사이로 조정하세요.
            </small>
          </div>
          
          <div class="intervals-section">
            <h3>복습 간격 (일)</h3>
            <p class="text-muted">각 복습 일정 사이의 간격을 일 단위로 설정하세요. 0은 당일을 의미합니다.</p>
            
            <div class="intervals-grid">
              {#each settings.reviewIntervals as interval, index}
                <div class="interval-input">
                  <label for={`interval-${index}`}>{index + 1}차 복습</label>
                  <div class="input-group">
                    <input 
                      type="number" 
                      id={`interval-${index}`} 
                      min="0" 
                      bind:value={settings.reviewIntervals[index]} 
                      on:change={handleSettingsChange}
                      class="form-control"
                    />
                    <div class="input-group-append">
                      <span class="input-group-text">일</span>
                    </div>
                  </div>
                  <small class="interval-hint">
                    {#if settings.reviewIntervals[index] === 0}
                      당일
                    {:else if settings.reviewIntervals[index] === 1}
                      다음 날
                    {:else if settings.reviewIntervals[index] === 7}
                      1주일 후
                    {:else if settings.reviewIntervals[index] === 30}
                      1개월 후
                    {:else if settings.reviewIntervals[index] >= 365}
                      {Math.floor(settings.reviewIntervals[index] / 365)}년 후
                    {:else if settings.reviewIntervals[index] >= 30}
                      {Math.floor(settings.reviewIntervals[index] / 30)}개월 후
                    {:else if settings.reviewIntervals[index] >= 7}
                      {Math.floor(settings.reviewIntervals[index] / 7)}주일 후
                    {:else}
                      {settings.reviewIntervals[index]}일 후
                    {/if}
                  </small>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
      
      <div class="settings-section">
        <div class="section-header">
          <h2>기억 요소 설정</h2>
          <p class="text-muted">기억력 관련 설정을 조정하세요.</p>
        </div>
        <div class="section-body">
          <div class="form-group">
            <label for="memoryFactor">기억 계수 (Memory Factor)</label>
            <div class="input-range-container">
              <input 
                type="range" 
                id="memoryFactor" 
                min="0.5" 
                max="2.0" 
                step="0.1" 
                bind:value={settings.memoryFactor} 
                on:change={handleSettingsChange}
                class="form-control-range"
              />
              <div class="range-value">{settings.memoryFactor.toFixed(1)}</div>
            </div>
            <small class="form-text text-muted">
              기억 계수가 높을수록 복습 간격이 더 길어집니다. 자신의 기억력에 맞게 조정하세요.
            </small>
          </div>
          
          <div class="form-group">
            <label for="preferredStudyTime">선호하는 학습 시간</label>
            <input 
              type="time" 
              id="preferredStudyTime" 
              bind:value={settings.preferredStudyTime} 
              on:change={handleSettingsChange}
              class="form-control"
            />
            <small class="form-text text-muted">
              이 시간에 알림을 받게 됩니다 (알림이 활성화된 경우).
            </small>
          </div>
        </div>
      </div>
      
      {#if typeof Notification !== 'undefined'}
        <div class="settings-section">
          <div class="section-header">
            <h2>알림 설정</h2>
            <p class="text-muted">복습 알림 설정을 관리하세요.</p>
          </div>
          <div class="section-body">
            <div class="form-group form-check">
              <input 
                type="checkbox" 
                class="form-check-input" 
                id="notificationsEnabled" 
                bind:checked={settings.notificationsEnabled} 
                on:change={handleSettingsChange}
              />
              <label class="form-check-label" for="notificationsEnabled">알림 활성화</label>
            </div>
            
            {#if settings.notificationsEnabled}
              <div class="notification-options ml-4">
                <div class="form-group form-check">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    id="emailNotifications" 
                    bind:checked={settings.emailNotifications} 
                    on:change={handleSettingsChange}
                  />
                  <label class="form-check-label" for="emailNotifications">이메일 알림</label>
                </div>
                
                <div class="form-group form-check">
                  <input 
                    type="checkbox" 
                    class="form-check-input" 
                    id="pushNotifications" 
                    bind:checked={settings.pushNotifications} 
                    on:change={handleSettingsChange}
                  />
                  <label class="form-check-label" for="pushNotifications">푸시 알림</label>
                  <small class="form-text text-muted">
                    브라우저가 지원하는 경우에만 푸시 알림을 받을 수 있습니다.
                  </small>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
      
      <div class="settings-actions">
        <button 
          class="btn-save" 
          on:click={saveSettings} 
          disabled={saving || !settingsChanged}
        >
          {#if saving}
            <span class="spinner"></span> 저장 중...
          {:else}
            설정 저장
          {/if}
        </button>
        
        <button 
          class="btn-reset" 
          on:click={resetSettings}
          disabled={saving}
        >
          기본 설정으로 초기화
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .settings-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  .settings-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
  
  .settings-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #333;
    margin: 0;
  }
  
  .loading-state, .empty-state, .error-message {
    text-align: center;
    padding: 3rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    margin: 2rem 0;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 4px solid rgba(79, 70, 229, 0.2);
    border-radius: 50%;
    border-top-color: #4f46e5;
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
  }
  
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-right: 0.5rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .error-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    color: white;
    border-radius: 50%;
    font-weight: bold;
    margin-bottom: 1rem;
    font-size: 1.5rem;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  .settings-section {
    background: white;
    border-radius: 16px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    margin-bottom: 2rem;
    transition: transform 0.3s;
  }
  
  .section-header {
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  .section-header h2 {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    color: #333;
  }
  
  .section-body {
    padding: 1.5rem;
  }
  
  .intervals-section {
    margin-bottom: 2rem;
  }
  
  .intervals-section h3 {
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
    color: #333;
  }
  
  .intervals-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.25rem;
    margin-top: 1.25rem;
  }
  
  .interval-input label {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: block;
    color: #444;
  }
  
  .interval-hint {
    display: block;
    font-size: 0.8rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }
  
  .input-group {
    display: flex;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid #ddd;
    transition: all 0.2s;
  }
  
  .input-group:focus-within {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.25);
  }
  
  .input-group input {
    flex: 1;
    border: none;
    padding: 0.75rem;
    font-size: 0.95rem;
  }
  
  .input-group input:focus {
    outline: none;
  }
  
  .input-group-text {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background-color: #f3f4f6;
    border-left: 1px solid #ddd;
    font-weight: 600;
    color: #6b7280;
  }
  
  .input-range-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  
  .form-control-range {
    flex: 1;
    -webkit-appearance: none;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    outline: none;
  }
  
  .form-control-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    background: #4f46e5;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transition: all 0.2s;
  }
  
  .form-control-range::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    background: #4338ca;
  }
  
  .range-value {
    min-width: 50px;
    padding: 0.5rem;
    text-align: center;
    font-weight: 600;
    background: #f3f4f6;
    border-radius: 6px;
    font-size: 0.9rem;
  }
  
  .form-group {
    margin-bottom: 1.75rem;
  }
  
  .form-group:last-child {
    margin-bottom: 0;
  }
  
  .form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #444;
    font-size: 1rem;
  }
  
  .form-group .form-text {
    margin-top: 0.5rem;
    display: block;
  }
  
  .form-check {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    padding: 0.5rem 0;
  }
  
  .form-check:last-child {
    margin-bottom: 0;
  }
  
  .form-check-input {
    width: 1.2rem;
    height: 1.2rem;
    margin-right: 0.75rem;
    accent-color: #4f46e5;
    cursor: pointer;
  }
  
  .form-check-label {
    font-size: 1rem;
    color: #333;
    cursor: pointer;
  }
  
  .alert {
    padding: 1rem 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
  }
  
  .alert-success {
    background-color: #dcfce7;
    color: #166534;
    border-left: 4px solid #22c55e;
  }
  
  .check-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background-color: #22c55e;
    color: white;
    border-radius: 50%;
    margin-right: 0.75rem;
    font-weight: bold;
  }
  
  .settings-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2.5rem;
    margin-bottom: 2rem;
  }
  
  .btn-save {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
  }
  
  .btn-save:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
  }
  
  .btn-save:disabled {
    background: #9ca3af;
    box-shadow: none;
    cursor: not-allowed;
  }
  
  .btn-reset {
    background: white;
    color: #4b5563;
    border: 1px solid #d1d5db;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-reset:hover:not(:disabled) {
    background: #f9fafb;
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .btn-reset:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .ml-3 {
    margin-left: 1rem;
  }
  
  .ml-4 {
    margin-left: 1.5rem;
  }
  
  .mt-3 {
    margin-top: 1rem;
  }
  
  .mt-4 {
    margin-top: 1.5rem;
  }
  
  .text-muted {
    color: #6b7280 !important;
    font-size: 0.95rem;
  }
  
  @media (max-width: 768px) {
    .intervals-grid {
      grid-template-columns: 1fr 1fr;
    }
    
    .settings-actions {
      flex-direction: column;
    }
    
    .settings-actions button {
      width: 100%;
    }
    
    .ml-3 {
      margin-left: 0;
      margin-top: 1rem;
    }
  }
  
  @media (max-width: 480px) {
    .intervals-grid {
      grid-template-columns: 1fr;
    }
  }
  
  .settings-navigation {
    margin-bottom: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .nav-items {
    display: flex;
    gap: 1rem;
  }
  
  .nav-item {
    padding: 0.75rem 1rem;
    text-decoration: none;
    color: var(--secondary-color);
    font-weight: 500;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  
  .nav-item:hover {
    color: var(--primary-color);
  }
  
  .nav-item.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
  }
</style> 