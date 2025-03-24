<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { 
    getTodayReviews, 
    updateReviewStatus,
    getUpcomingReviews,
    getReviewStatistics
  } from '$lib/services/studyService';
  import { getUserSettings } from '$lib/services/userSettingsService';

  let todayReviews = [];
  let upcomingReviews = [];
  let statistics = null;
  let userSettings = null;
  let loading = true;
  let error = '';
  
  // 현재 표시하는 상세 자료
  let activeReviewId = null;
  
  // 복습 평가 정보
  let memoryRating = 3;
  let reviewMemo = '';

  // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  $: if ($user === null && loading === false) {
    goto('/login');
  }

  onMount(async () => {
    if ($user) {
      await loadDashboardData();
    } else {
      loading = false;
    }
  });

  const loadDashboardData = async () => {
    try {
      loading = true;
      error = '';
      
      // 모든 데이터를 병렬로 로딩
      const [todayData, upcomingData, statsData, settingsData] = await Promise.all([
        getTodayReviews($user.uid),
        getUpcomingReviews($user.uid, 7), // 다음 7일간의 복습 항목
        getReviewStatistics($user.uid),
        getUserSettings($user.uid)
      ]);
      
      todayReviews = todayData;
      upcomingReviews = upcomingData;
      statistics = statsData;
      userSettings = settingsData;
    } catch (err) {
      console.error('대시보드 데이터 로딩 에러:', err);
      error = '데이터를 불러오는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };

  const handleReviewComplete = async (materialId, reviewId) => {
    try {
      await updateReviewStatus(materialId, reviewId, {
        status: 'completed',
        completedDate: new Date(),
        memoryRating,
        memo: reviewMemo
      });
      
      // 복습 완료 후 데이터 갱신
      await loadDashboardData();
      
      // 평가 정보 리셋
      memoryRating = 3;
      reviewMemo = '';
      activeReviewId = null;
    } catch (err) {
      console.error('복습 완료 처리 에러:', err);
      error = '복습 완료 처리 중 오류가 발생했습니다.';
    }
  };
  
  const openReviewForm = (reviewId) => {
    activeReviewId = reviewId;
    memoryRating = 3;
    reviewMemo = '';
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // 오늘 날짜 처리
  const today = new Date();
  today.setHours(0, 0, 0, 0);
</script>

<div class="dashboard-container">
  <div class="dashboard-header">
    <h1>오늘의 복습</h1>
    {#if $user}
      <p class="welcome-message">안녕하세요, <span class="user-name">{$user.displayName}</span>님!</p>
    {/if}
  </div>
  
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <div class="error-icon">!</div>
      <p>{error}</p>
      <button class="btn btn-primary mt-3" on:click={loadDashboardData}>다시 시도</button>
    </div>
  {:else}
    <!-- 통계 정보 -->
    {#if statistics}
      <div class="stats-grid">
        <div class="stat-card card">
          <div class="stat-value">{statistics.totalMaterials}</div>
          <div class="stat-label">총 학습 항목</div>
        </div>
        
        <div class="stat-card card">
          <div class="stat-value">{statistics.completedReviews}</div>
          <div class="stat-label">완료한 복습</div>
        </div>
        
        <div class="stat-card card">
          <div class="stat-value">{statistics.pendingReviews}</div>
          <div class="stat-label">예정된 복습</div>
        </div>
        
        <div class="stat-card card">
          <div class="stat-value">
            {Number.isNaN(statistics.completionRate) ? '0' : statistics.completionRate}%
          </div>
          <div class="stat-label">복습 완료율</div>
        </div>
      </div>
    {/if}
    
    <!-- 오늘의 복습 항목 -->
    <h2 class="section-title">오늘 복습할 항목</h2>
    {#if todayReviews.length === 0}
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>오늘 복습할 항목이 없습니다.</h3>
        <p>학습 내용을 등록하고 복습 일정을 관리해보세요!</p>
        <a href="/study" class="btn btn-primary mt-3">학습 자료 등록하기</a>
      </div>
    {:else}
      <div class="reviews-list">
        {#each todayReviews as item}
          <div class="review-card card">
            <div class="card-header review-header">
              <h3>{item.material.title}</h3>
            </div>
            <div class="card-body">
              <div class="review-content">{item.material.content}</div>
              
              <div class="reviews-actions mt-3">
                {#each item.reviews as review}
                  {#if activeReviewId === review.reviewId}
                    <div class="review-form card">
                      <div class="form-group">
                        <label>기억 평가 - 얼마나 잘 기억나셨나요?</label>
                        <div class="memory-rating">
                          {#each [1, 2, 3, 4, 5] as rating}
                            <button 
                              class="rating-btn {memoryRating === rating ? 'active' : ''}" 
                              on:click={() => memoryRating = rating}
                            >
                              {rating}
                            </button>
                          {/each}
                        </div>
                        <div class="rating-labels">
                          <span>기억 안남</span>
                          <span>완벽히 기억</span>
                        </div>
                      </div>
                      
                      <div class="form-group">
                        <label for="reviewMemo">메모 (선택사항)</label>
                        <textarea 
                          id="reviewMemo" 
                          class="form-control review-memo" 
                          rows="2"
                          placeholder="복습에 대한 메모를 남겨보세요"
                          bind:value={reviewMemo}
                        ></textarea>
                      </div>
                      
                      <div class="review-form-actions">
                        <button 
                          class="btn btn-primary"
                          on:click={() => handleReviewComplete(item.material.id, review.reviewId)}
                        >
                          완료하기
                        </button>
                        <button 
                          class="btn btn-secondary ml-2"
                          on:click={() => activeReviewId = null}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  {:else}
                    <div class="review-item">
                      <button 
                        class="btn {review.status === 'completed' ? 'btn-success' : 'btn-primary'}"
                        on:click={() => review.status === 'completed' ? null : openReviewForm(review.reviewId)}
                        disabled={review.status === 'completed'}
                      >
                        {#if review.status === 'completed'}
                          <span class="check-icon">✓</span> 완료됨
                        {:else}
                          복습 평가하기
                        {/if}
                      </button>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
    
    <!-- 다가오는 복습 항목 -->
    <h2 class="section-title mt-5">다가오는 복습 일정</h2>
    {#if upcomingReviews.length === 0}
      <div class="empty-state">
        <p>앞으로 7일 동안 예정된 복습 일정이 없습니다.</p>
      </div>
    {:else}
      <div class="upcoming-list">
        {#each upcomingReviews as item}
          {#each item.reviews as review}
            <div class="upcoming-card card">
              <div class="card-body">
                <div class="upcoming-date">
                  {formatDate(review.scheduledDate)}
                </div>
                <div class="upcoming-title">
                  {item.material.title}
                </div>
              </div>
            </div>
          {/each}
        {/each}
      </div>
    {/if}
  {/if}
  
  <div class="quick-actions mt-5">
    <h2 class="section-title">바로가기</h2>
    <div class="actions-grid grid">
      <a href="/study" class="action-card card">
        <div class="card-body">
          <div class="action-icon">📝</div>
          <h3>학습 자료 관리</h3>
          <p>새 학습 내용을 등록하거나 기존 학습 자료를 관리하세요.</p>
        </div>
      </a>
      
      <a href="/subjects" class="action-card card">
        <div class="card-body">
          <div class="action-icon">📚</div>
          <h3>과목 관리</h3>
          <p>과목을 추가하고 관리하세요.</p>
        </div>
      </a>
      
      <a href="/settings" class="action-card card">
        <div class="card-body">
          <div class="action-icon">⚙️</div>
          <h3>설정</h3>
          <p>개인화된 복습 설정과 사용자 정보를 관리하세요.</p>
        </div>
      </a>
    </div>
  </div>
</div>

<style>
  .dashboard-container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .dashboard-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }
  
  .welcome-message {
    color: var(--secondary-color);
    font-size: 1.1rem;
  }
  
  .user-name {
    color: var(--primary-color);
    font-weight: 600;
  }
  
  .section-title {
    margin-top: 2rem;
    margin-bottom: 1.5rem;
    font-weight: 600;
    color: var(--dark-color);
  }
  
  /* 통계 카드 스타일 */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    text-align: center;
    padding: 1.5rem 1rem;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .stat-card:hover {
    transform: translateY(-5px);
  }
  
  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    color: var(--secondary-color);
    font-size: 0.9rem;
  }
  
  .review-card {
    margin-bottom: 1.5rem;
    border-left: 4px solid var(--primary-color);
  }
  
  .review-header {
    background-color: rgba(74, 109, 167, 0.05);
  }
  
  .review-content {
    white-space: pre-line;
    margin-bottom: 1.25rem;
    line-height: 1.6;
    font-size: 1.05rem;
  }
  
  .reviews-actions {
    display: flex;
    gap: 1rem;
  }
  
  .review-form {
    width: 100%;
    padding: 1rem;
    margin-top: 1rem;
    background-color: #f9f9f9;
  }
  
  .memory-rating {
    display: flex;
    gap: 0.5rem;
    margin: 1rem 0 0.5rem;
    justify-content: center;
  }
  
  .rating-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background-color: white;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  
  .rating-btn.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  
  .rating-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--secondary-color);
    margin-bottom: 1rem;
  }
  
  .review-form-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  
  .check-icon {
    display: inline-block;
    margin-right: 0.25rem;
  }
  
  .loading-state, .empty-state, .error-message {
    text-align: center;
    padding: 3rem;
    background-color: var(--light-color);
    border-radius: 0.5rem;
    margin: 2rem 0;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 4px solid rgba(74, 109, 167, 0.3);
    border-radius: 50%;
    border-top-color: var(--primary-color);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .empty-icon, .error-icon, .action-icon {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  
  .error-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background-color: var(--danger-color);
    color: white;
    border-radius: 50%;
    font-weight: bold;
  }
  
  /* 다가오는 복습 목록 스타일 */
  .upcoming-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .upcoming-card {
    position: relative;
    border-top: 3px solid var(--info-color);
  }
  
  .upcoming-date {
    font-size: 0.9rem;
    color: var(--info-color);
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .upcoming-title {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .actions-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  }
  
  .action-card {
    text-align: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  
  .action-card:hover {
    transform: translateY(-8px);
    text-decoration: none;
  }
  
  .mt-3 {
    margin-top: 1rem;
  }
  
  .mt-5 {
    margin-top: 2.5rem;
  }
  
  .ml-2 {
    margin-left: 0.5rem;
  }
  
  @media (max-width: 768px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .actions-grid, .upcoming-list {
      grid-template-columns: 1fr;
    }
    
    .reviews-actions {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .review-form-actions {
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .review-form-actions .btn {
      width: 100%;
    }
    
    .ml-2 {
      margin-left: 0;
      margin-top: 0.5rem;
    }
  }
  
  .review-memo {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
    padding: 0.5rem;
    resize: vertical;
    min-height: 60px;
    font-size: 0.9rem;
  }
</style> 