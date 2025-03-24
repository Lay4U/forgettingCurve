<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { getStudyMaterial, deleteStudyMaterial, updateReviewStatus } from '$lib/services/studyService';
  import { getSubjectById } from '$lib/services/subjectService';
  
  const studyId = $page.params.id;
  let material = null;
  let subject = null;
  let loading = true;
  let error = '';
  let deleteConfirmation = false;
  
  // 자가 테스트 관련 상태
  let testMode = false;
  let flashcardMode = false;
  let showContent = false;
  let showAnswer = false;
  
  // 복습 알림 관련 상태
  let missedReviewYesterday = false;
  let missedReviews = [];
  let upcomingReviews = [];
  let calendarView = false;
  
  // 복습 평가 모달 관련 상태
  let showReviewModal = false;
  let activeReview = null;
  let memoryRating = 3;
  let reviewNote = '';
  let processingReviewId = null;

  // 관련 학습 자료 상태
  let relatedMaterials = [];
  
  // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  $: if ($user === null && loading === false) {
    goto('/login');
  }
  
  onMount(async () => {
    if ($user) {
      await loadStudyMaterial();
    } else {
      loading = false;
    }
  });
  
  const loadStudyMaterial = async () => {
    try {
      loading = true;
      error = '';
      
      material = await getStudyMaterial(studyId);
      
      if (!material) {
        error = '학습 자료를 찾을 수 없습니다.';
        return;
      }
      
      // 과목 정보 로드
      if (material.subjectId) {
        subject = await getSubjectById(material.subjectId);
      }
      
      // 복습 일정 확인
      checkReviewSchedule();
      
    } catch (err) {
      console.error('학습 자료 로딩 에러:', err);
      error = '학습 자료를 불러오는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };
  
  // 복습 일정 확인 함수
  const checkReviewSchedule = () => {
    if (!material || !material.reviews) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    missedReviews = [];
    upcomingReviews = [];
    
    material.reviews.forEach(review => {
      const reviewDate = review.scheduledDate instanceof Date 
        ? review.scheduledDate 
        : review.scheduledDate.toDate();
      
      reviewDate.setHours(0, 0, 0, 0);
      
      // 어제 복습해야 했는지 확인
      if (reviewDate.getTime() === yesterday.getTime() && review.status !== 'completed') {
        missedReviewYesterday = true;
      }
      
      // 지난 복습들 확인
      if (reviewDate < today && review.status !== 'completed') {
        missedReviews.push({...review, date: new Date(reviewDate)});
      }
      
      // 다가오는 복습들 확인
      if (reviewDate >= today && review.status === 'pending') {
        upcomingReviews.push({...review, date: new Date(reviewDate)});
      }
    });
    
    // 날짜순으로 정렬
    missedReviews.sort((a, b) => a.date - b.date);
    upcomingReviews.sort((a, b) => a.date - b.date);
  };
  
  const toggleCalendarView = () => {
    calendarView = !calendarView;
  };
  
  // 달력 생성 함수
  const generateCalendarDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // 현재 월의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 현재 날짜
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 첫 주의 시작 날짜 (이전 달의 날짜 포함)
    const startDay = new Date(firstDay);
    startDay.setDate(1 - firstDay.getDay()); // 일요일부터 시작하도록 조정
    
    const days = [];
    const totalDays = 42; // 6주 표시 (6 * 7)
    
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDay);
      currentDate.setDate(startDay.getDate() + i);
      
      // 현재 표시 중인 날짜가 현재 달에 속하는지 여부
      const isCurrentMonth = currentDate.getMonth() === month;
      
      // 오늘인지 여부
      const isToday = currentDate.getTime() === today.getTime();
      
      // 복습 일정 확인
      let hasReview = false;
      let isMissed = false;
      let isCompleted = false;
      let reviewIndex = -1;
      
      if (material && material.reviews) {
        material.reviews.forEach((review, idx) => {
          const reviewDate = review.scheduledDate instanceof Date 
            ? review.scheduledDate 
            : review.scheduledDate.toDate();
          
          reviewDate.setHours(0, 0, 0, 0);
          
          if (reviewDate.getTime() === currentDate.getTime()) {
            hasReview = true;
            reviewIndex = idx;
            
            if (review.status === 'missed' || (reviewDate < today && review.status !== 'completed')) {
              isMissed = true;
            } else if (review.status === 'completed') {
              isCompleted = true;
            }
          }
        });
      }
      
      days.push({
        date: new Date(currentDate),
        day: currentDate.getDate(),
        current: isCurrentMonth,
        isToday,
        hasReview,
        isMissed,
        isCompleted,
        reviewIndex
      });
    }
    
    return days;
  };
  
  // 현재 날짜 기준으로 일정이 된 복습인지 확인
  const isReviewDue = (scheduledDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = scheduledDate instanceof Date 
      ? scheduledDate 
      : scheduledDate.toDate();
    dueDate.setHours(0, 0, 0, 0);
    return dueDate <= today;
  };

  // 복습 평가 모달 열기
  const openReviewModal = (review) => {
    // 복습 일정이 아직 안 된 경우 모달 열지 않음
    if (!isReviewDue(review.scheduledDate)) return;
    
    activeReview = review;
    memoryRating = 3; // 기본값 초기화
    reviewNote = '';
    showReviewModal = true;
  };
  
  // 복습 평가 모달 닫기
  const closeReviewModal = () => {
    showReviewModal = false;
    activeReview = null;
  };
  
  // 복습 완료 처리 함수
  const completeReview = async () => {
    if (!activeReview || processingReviewId) return;
    
    try {
      processingReviewId = activeReview.reviewId;
      
      // 복습 완료로 상태 업데이트
      await updateReviewStatus(studyId, activeReview.reviewId, {
        status: 'completed',
        memoryRating: memoryRating,
        difficultyRating: Math.abs(memoryRating - 6), // 기억력이 높으면 난이도는 낮게
        memo: reviewNote
      });
      
      // 성공 메시지 표시
      const successToast = document.createElement('div');
      successToast.className = 'success-toast';
      successToast.textContent = '복습이 완료되었습니다!';
      document.body.appendChild(successToast);
      
      setTimeout(() => {
        document.body.removeChild(successToast);
      }, 3000);
      
      // 모달 닫기
      closeReviewModal();
      
      // 데이터 다시 로드
      await loadStudyMaterial();
    } catch (err) {
      console.error('복습 완료 처리 에러:', err);
      error = '복습을 완료하는 중 오류가 발생했습니다.';
    } finally {
      processingReviewId = null;
    }
  };
  
  const confirmDelete = () => {
    deleteConfirmation = true;
  };
  
  const cancelDelete = () => {
    deleteConfirmation = false;
  };
  
  const handleDelete = async () => {
    try {
      loading = true;
      await deleteStudyMaterial(studyId);
      goto('/study');
    } catch (err) {
      console.error('학습 자료 삭제 에러:', err);
      error = '학습 자료를 삭제하는 중 오류가 발생했습니다.';
      loading = false;
    }
  };
  
  // 자가 테스트 관련 함수
  const toggleTestMode = () => {
    testMode = !testMode;
    showContent = false;
    flashcardMode = false;
  };
  
  const toggleFlashcardMode = () => {
    flashcardMode = !flashcardMode;
    testMode = false;
    showAnswer = false;
  };
  
  const toggleContent = () => {
    showContent = !showContent;
  };
  
  const toggleAnswer = () => {
    showAnswer = !showAnswer;
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

  // 기억도 표시 함수
  const getMemoryRatingText = (rating) => {
    if (!rating) return '평가 없음';
    
    switch(rating) {
      case 1: return '전혀 기억 안남';
      case 2: return '희미하게 기억';
      case 3: return '부분적으로 기억';
      case 4: return '대체로 기억';
      case 5: return '완벽히 기억';
      default: return '평가 없음';
    }
  };

  // 기억도에 따른 스타일 클래스 반환
  const getMemoryRatingClass = (rating) => {
    if (!rating) return '';
    
    switch(rating) {
      case 1: case 2: return 'poor-memory';
      case 3: return 'medium-memory';
      case 4: case 5: return 'good-memory';
      default: return '';
    }
  };
</script>

<div class="study-detail-container">
  <div class="study-detail-header">
    <h1>학습 자료 상세</h1>
  </div>
  
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>학습 자료를 불러오는 중...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <div class="error-icon">!</div>
      <p>{error}</p>
      <button class="btn btn-primary mt-3" on:click={loadStudyMaterial}>다시 시도</button>
    </div>
  {:else if material}
    <div class="study-modes">
      <button
        class="btn {testMode ? 'btn-primary' : 'btn-outline-primary'}"
        on:click={toggleTestMode}
      >
        <span class="mode-icon">🧠</span> 자가 테스트 모드
      </button>
      
      <button
        class="btn {flashcardMode ? 'btn-primary' : 'btn-outline-primary'}"
        on:click={toggleFlashcardMode}
      >
        <span class="mode-icon">🔄</span> 플래시카드 모드
      </button>
    </div>
    
    <!-- 복습 알림 배너 -->
    {#if missedReviewYesterday}
      <div class="review-alert">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <h3>어제 복습을 놓치셨습니다!</h3>
          <p>최적의 학습 효과를 위해 가능한 빨리 복습을 완료하세요.</p>
        </div>
      </div>
    {/if}
    
    {#if flashcardMode}
      <div class="flashcard-container">
        <div class="flashcard {showAnswer ? 'flipped' : ''}">
          <div class="flashcard-front" on:click={toggleAnswer}>
            <h2>{material.title}</h2>
            {#if subject}
              <div class="flashcard-subject">{subject.name}</div>
            {/if}
            <div class="flashcard-prompt">
              <span class="tap-prompt">클릭하여 답변 확인하기</span>
            </div>
          </div>
          <div class="flashcard-back" on:click={toggleAnswer}>
            <div class="flashcard-content">
              {material.content}
            </div>
            <div class="flashcard-prompt">
              <span class="tap-prompt">클릭하여 질문으로 돌아가기</span>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="study-detail-card card">
        <div class="card-header">
          <div class="header-content">
            <h2 class="material-title">{material.title}</h2>
            {#if subject}
              <div class="subject-badge">{subject.name}</div>
            {/if}
          </div>
          {#if material.dateStudied}
            <div class="date-studied">
              <span class="date-label">학습일:</span> {formatDate(material.dateStudied)}
            </div>
          {/if}
        </div>
        
        <div class="card-body">
          {#if testMode}
            <div class="test-mode-container">
              <div class="test-instructions">
                <div class="instructions-icon">💡</div>
                <p>지식을 테스트하세요. 내용을 기억해보고 나서 확인해보세요.</p>
              </div>
              
              <button 
                class="btn {showContent ? 'btn-outline-primary' : 'btn-primary'} btn-block" 
                on:click={toggleContent}
              >
                {showContent ? '내용 숨기기' : '내용 보기'}
              </button>
              
              {#if showContent}
                <div class="material-content show-animation">
                  {material.content}
                </div>
              {/if}
            </div>
          {:else}
            <div class="material-content">
              {material.content}
            </div>
          {/if}
          
          {#if material.difficulty || material.importanceLevel}
            <div class="material-attributes mt-4">
              {#if material.difficulty}
                <div class="attribute-item">
                  <span class="attribute-label">난이도:</span>
                  <span class="attribute-value difficulty-{material.difficulty}">
                    {#if material.difficulty === 'easy'}
                      쉬움 😊
                    {:else if material.difficulty === 'medium'}
                      보통 🤔
                    {:else if material.difficulty === 'hard'}
                      어려움 😓
                    {/if}
                  </span>
                </div>
              {/if}
              
              {#if material.importanceLevel}
                <div class="attribute-item">
                  <span class="attribute-label">중요도:</span>
                  <span class="attribute-value">
                    <div class="importance-stars">
                      {#each Array(5) as _, i}
                        <span class="star {i < material.importanceLevel ? 'filled' : ''}">★</span>
                      {/each}
                    </div>
                  </span>
                </div>
              {/if}
            </div>
          {/if}
          
          <!-- 복습 일정 표시 -->
          {#if material.reviews && material.reviews.length > 0}
            <div class="review-schedule mt-4">
              <div class="schedule-header">
                <h3>복습 일정</h3>
                <button 
                  class="btn btn-sm {calendarView ? 'btn-primary' : 'btn-outline-primary'}"
                  on:click={toggleCalendarView}
                >
                  {calendarView ? '목록 보기' : '달력 보기'}
                </button>
              </div>
              
              {#if calendarView}
                <div class="calendar-view">
                  <div class="calendar-header">
                    <div class="month-year">
                      {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                    </div>
                  </div>
                  <div class="calendar-grid">
                    <div class="weekday">일</div>
                    <div class="weekday">월</div>
                    <div class="weekday">화</div>
                    <div class="weekday">수</div>
                    <div class="weekday">목</div>
                    <div class="weekday">금</div>
                    <div class="weekday">토</div>
                    
                    {#each generateCalendarDays(new Date()) as day}
                      <div class="calendar-day {day.current ? 'current-month' : 'other-month'} {day.isToday ? 'today' : ''} {day.hasReview ? 'has-review' : ''} {day.isMissed ? 'missed-review' : ''} {day.isCompleted ? 'completed-review' : ''}">
                        <span class="day-number">{day.day}</span>
                        {#if day.hasReview && day.reviewIndex !== -1 && material && material.reviews}
                          {@const review = material.reviews[day.reviewIndex]}
                          <div class="calendar-review-info">
                            <div class="review-cycle">{day.reviewIndex + 1}차 복습</div>
                            {#if review.status === 'completed'}
                              <div class="calendar-status completed">완료됨</div>
                            {:else if day.isMissed}
                              <div class="calendar-status missed">⚠️ 놓침</div>
                            {:else}
                              {#if isReviewDue(review.scheduledDate)}
                                <button 
                                  class="calendar-review-btn"
                                  on:click={() => openReviewModal(review)}
                                  disabled={processingReviewId === review.reviewId}
                                >
                                  {#if processingReviewId === review.reviewId}
                                    <span class="spinner small"></span>
                                  {:else}
                                    평가하기
                                  {/if}
                                </button>
                              {:else}
                                <div class="calendar-status pending">예정</div>
                              {/if}
                            {/if}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                  
                  <div class="calendar-legend">
                    <div class="legend-item">
                      <div class="legend-color today"></div>
                      <div class="legend-text">오늘</div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-color has-review"></div>
                      <div class="legend-text">예정된 복습</div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-color missed-review"></div>
                      <div class="legend-text">놓친 복습</div>
                    </div>
                    <div class="legend-item">
                      <div class="legend-color completed-review"></div>
                      <div class="legend-text">완료된 복습</div>
                    </div>
                  </div>
                </div>
              {:else}
                <div class="schedule-grid">
                  {#each material.reviews as review, index}
                    <div class="schedule-item card {review.status === 'completed' ? 'completed' : review.status === 'missed' ? 'missed' : ''}">
                      <div class="schedule-header">
                        {index + 1}차 복습
                      </div>
                      <div class="schedule-date">
                        {formatDate(review.scheduledDate)}
                      </div>
                      <div class="schedule-status">
                        {#if review.status === 'completed'}
                          <span class="status-completed">✅ 완료됨</span>
                          {#if review.completedDate}
                            <div class="completed-date">
                              {formatDate(review.completedDate)}
                            </div>
                          {/if}
                          
                          <!-- 복습 평가 정보 표시 -->
                          {#if review.memoryRating}
                            <div class="review-rating">
                              <div class="rating-label">기억 평가:</div>
                              <div class="memory-rating {getMemoryRatingClass(review.memoryRating)}">
                                {getMemoryRatingText(review.memoryRating)} ({review.memoryRating}/5)
                              </div>
                            </div>
                          {/if}
                          
                          {#if review.memo}
                            <div class="review-memo">
                              <div class="memo-label">메모:</div>
                              <div class="memo-content">"{review.memo}"</div>
                            </div>
                          {/if}
                        {:else if review.status === 'pending'}
                          <span class="status-pending">⏳ 예정됨</span>
                          <div class="review-actions">
                            <button 
                              class="btn btn-primary btn-sm"
                              on:click={() => openReviewModal(review)}
                              disabled={!isReviewDue(review.scheduledDate) || processingReviewId === review.reviewId}
                              title={!isReviewDue(review.scheduledDate) ? '아직 복습 일정이 되지 않았습니다' : '복습 평가하기'}
                            >
                              {#if processingReviewId === review.reviewId}
                                <span class="spinner"></span>
                              {:else if !isReviewDue(review.scheduledDate)}
                                예정됨
                              {:else}
                                복습 평가
                              {/if}
                            </button>
                          </div>
                        {:else if review.status === 'missed'}
                          <span class="status-missed">❌ 놓친 복습</span>
                          <div class="review-actions">
                            <button 
                              class="btn btn-danger btn-sm"
                              on:click={() => openReviewModal(review)}
                              disabled={processingReviewId === review.reviewId}
                            >
                              {#if processingReviewId === review.reviewId}
                                <span class="spinner"></span>
                              {:else}
                                지금 복습하기
                              {/if}
                            </button>
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
          
          <!-- 학습 노트 섹션 -->
          <div class="study-notes mt-4">
            <h3>학습 노트</h3>
            <p class="text-muted">학습 자료에 대한 메모, 연관 개념, 키워드 등을 기록하세요.</p>
            
            <div class="notes-content">
              <textarea 
                placeholder="여기에 학습 노트를 작성하세요..."
                rows="4"
                class="form-control"
              ></textarea>
              <button class="btn btn-primary mt-3">노트 저장</button>
            </div>
          </div>
          
          <!-- 복습 통계 -->
          {#if material.reviews && material.reviews.length > 0}
            {#if true}
              {@const completedReviews = material.reviews.filter(r => r.status === 'completed').length}
              {@const totalReviews = material.reviews.length}
              {@const completionRate = totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 0}
              {@const avgMemory = material.reviews
                .filter(r => r.memoryRating)
                .map(r => r.memoryRating)
                .reduce((sum, val) => sum + val, 0) / material.reviews.filter(r => r.memoryRating).length || 0}
              
              <div class="review-statistics mt-4">
                <h3>복습 통계</h3>
                <div class="statistics-grid">
                  <div class="statistic-card">
                    <div class="statistic-value">{completedReviews}/{totalReviews}</div>
                    <div class="statistic-label">복습 완료</div>
                  </div>
                  
                  <div class="statistic-card">
                    <div class="statistic-value">{completionRate}%</div>
                    <div class="statistic-label">완료율</div>
                  </div>
                  
                  <div class="statistic-card">
                    <div class="statistic-value">{avgMemory.toFixed(1)}/5</div>
                    <div class="statistic-label">평균 기억도</div>
                  </div>
                </div>
              </div>
            {/if}
          {/if}
        </div>
        
        <div class="card-footer">
          {#if !deleteConfirmation}
            <div class="actions">
              <a href="/study" class="btn btn-outline-secondary">
                <span class="icon">←</span> 목록으로 돌아가기
              </a>
              <a href="/study/edit/{studyId}" class="btn btn-outline-primary">
                수정하기
              </a>
              <button class="btn btn-outline-danger" on:click={confirmDelete}>
                삭제하기
              </button>
            </div>
          {:else}
            <div class="delete-confirmation">
              <p>정말로 이 학습 자료를 삭제하시겠습니까?</p>
              <div class="confirmation-actions">
                <button class="btn btn-danger" on:click={handleDelete} disabled={loading}>
                  {loading ? '삭제 중...' : '삭제 확인'}
                </button>
                <button class="btn btn-outline-secondary ml-3" on:click={cancelDelete}>
                  취소
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- 복습 평가 모달 -->
{#if showReviewModal && activeReview}
  <div class="modal-backdrop" on:click={closeReviewModal}></div>
  <div class="review-modal">
    <div class="modal-header">
      <h3>복습 평가</h3>
      <button class="close-btn" on:click={closeReviewModal}>&times;</button>
    </div>
    <div class="modal-body">
      <div class="review-material-info">
        <h4>{material.title}</h4>
        <p>예정 일자: {formatDate(activeReview.scheduledDate)}</p>
      </div>
      
      <div class="memory-rating-section">
        <h5>기억 평가 - 얼마나 잘 기억났나요?</h5>
        <div class="rating-buttons">
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
      
      <div class="review-note-section">
        <h5>메모 (선택사항)</h5>
        <textarea 
          placeholder="복습에 대한 메모를 남겨보세요" 
          bind:value={reviewNote}
          rows="3"
        ></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" on:click={closeReviewModal}>취소</button>
      <button 
        class="btn btn-primary" 
        on:click={completeReview}
        disabled={processingReviewId === activeReview.reviewId}
      >
        {#if processingReviewId === activeReview.reviewId}
          <span class="spinner"></span> 처리 중...
        {:else}
          완료하기
        {/if}
      </button>
    </div>
  </div>
{/if}

<style>
  .study-detail-container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .study-detail-header {
    margin-bottom: 1.5rem;
  }
  
  .loading-state, .error-message {
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
    margin-bottom: 1rem;
  }
  
  .study-modes {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .mode-icon {
    margin-right: 0.5rem;
  }
  
  .study-detail-card {
    margin-bottom: 2rem;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    border-radius: 0.75rem;
    overflow: hidden;
    border: none;
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1.5rem;
    background-color: #f8fafc;
    border-bottom: 1px solid #edf2f7;
  }
  
  .header-content {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  .material-title {
    margin: 0;
    font-size: 1.5rem;
  }
  
  .subject-badge {
    background-color: var(--primary-color);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
  }
  
  .date-studied {
    font-size: 0.875rem;
    color: var(--secondary-color);
  }
  
  .date-label {
    font-weight: 600;
  }
  
  .material-content {
    white-space: pre-line;
    line-height: 1.6;
    font-size: 1.05rem;
  }
  
  .show-animation {
    animation: fadeIn 0.5s ease-in-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .test-mode-container {
    margin-bottom: 1.5rem;
  }
  
  .test-instructions {
    display: flex;
    align-items: center;
    gap: 1rem;
    background-color: #fff8e1;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .instructions-icon {
    font-size: 2rem;
  }
  
  .btn-block {
    display: block;
    width: 100%;
    margin-bottom: 1.5rem;
  }
  
  .material-attributes {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
  }
  
  .attribute-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .attribute-label {
    font-weight: 600;
  }
  
  .difficulty-easy {
    color: #28a745;
  }
  
  .difficulty-medium {
    color: #ffc107;
  }
  
  .difficulty-hard {
    color: #dc3545;
  }
  
  .importance-stars {
    display: inline-flex;
    color: #d9d9d9;
  }
  
  .star.filled {
    color: #ffc107;
  }
  
  .review-schedule {
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
  }
  
  .review-schedule h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }
  
  .schedule-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .schedule-item {
    padding: 1rem;
    text-align: center;
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s;
  }
  
  .schedule-item:hover {
    transform: translateY(-3px);
  }
  
  .schedule-item.completed {
    background-color: rgba(40, 167, 69, 0.05);
    border-color: #28a745;
  }
  
  .schedule-item.missed {
    background-color: rgba(220, 53, 69, 0.05);
    border-color: #dc3545;
  }
  
  .schedule-header {
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .schedule-date {
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    color: var(--info-color, #17a2b8);
  }
  
  .schedule-status {
    font-size: 0.875rem;
  }
  
  .status-completed {
    color: #28a745;
    font-weight: 600;
  }
  
  .status-pending {
    color: #ffc107;
    font-weight: 600;
  }
  
  .status-missed {
    color: #dc3545;
    font-weight: 600;
  }
  
  .completed-date {
    font-size: 0.75rem;
    color: var(--secondary-color);
    margin-top: 0.25rem;
    margin-bottom: 0.75rem;
  }
  
  .card-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--border-color);
    background-color: #f8fafc;
  }
  
  .actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }
  
  .delete-confirmation {
    background-color: #fff8f8;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid #f5c6cb;
  }
  
  .delete-confirmation p {
    color: #721c24;
    margin-bottom: 1rem;
  }
  
  .confirmation-actions {
    display: flex;
    gap: 1rem;
  }
  
  .icon {
    display: inline-block;
    margin-right: 0.25rem;
  }
  
  .mt-3 {
    margin-top: 1rem;
  }
  
  .mt-4 {
    margin-top: 1.5rem;
  }
  
  .ml-3 {
    margin-left: 1rem;
  }
  
  /* 플래시카드 스타일 */
  .flashcard-container {
    perspective: 1000px;
    padding: 2rem 0;
  }
  
  .flashcard {
    position: relative;
    width: 100%;
    height: 400px;
    transform-style: preserve-3d;
    transition: transform 0.6s;
    cursor: pointer;
  }
  
  .flashcard.flipped {
    transform: rotateY(180deg);
  }
  
  .flashcard-front, .flashcard-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }
  
  .flashcard-front {
    background-color: white;
    text-align: center;
  }
  
  .flashcard-back {
    background-color: white;
    transform: rotateY(180deg);
    overflow-y: auto;
  }
  
  .flashcard-subject {
    background-color: var(--primary-color);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    margin-top: 1rem;
  }
  
  .flashcard-content {
    white-space: pre-line;
    line-height: 1.6;
    font-size: 1.05rem;
    width: 100%;
  }
  
  .flashcard-prompt {
    position: absolute;
    bottom: 1.5rem;
    left: 0;
    right: 0;
    text-align: center;
  }
  
  .tap-prompt {
    font-size: 0.875rem;
    color: var(--secondary-color);
    background-color: rgba(0, 0, 0, 0.05);
    padding: 0.5rem 1rem;
    border-radius: 1rem;
  }
  
  @media (max-width: 768px) {
    .study-modes {
      flex-direction: column;
    }
    
    .actions {
      flex-direction: column;
    }
    
    .actions .btn {
      width: 100%;
    }
    
    .material-attributes {
      flex-direction: column;
      gap: 1rem;
    }
    
    .schedule-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .flashcard {
      height: 300px;
    }
  }
  
  /* 복습 알림 배너 스타일 */
  .review-alert {
    display: flex;
    align-items: center;
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .alert-icon {
    font-size: 2rem;
    margin-right: 1rem;
  }
  
  .alert-content h3 {
    color: #856404;
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
  }
  
  .alert-content p {
    color: #856404;
    margin: 0;
  }
  
  /* 일정 헤더 스타일 */
  .schedule-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  /* 달력 스타일 */
  .calendar-view {
    margin-bottom: 1.5rem;
  }
  
  .calendar-header {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .month-year {
    font-size: 1.1rem;
    font-weight: 600;
  }
  
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  
  .weekday {
    text-align: center;
    font-weight: 600;
    padding: 0.5rem 0;
  }
  
  .calendar-day {
    position: relative;
    min-height: 80px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding: 0.5rem;
    font-size: 0.9rem;
    cursor: default;
    background-color: white;
    border: 1px solid var(--border-color);
    transition: transform 0.2s, box-shadow 0.2s;
    overflow: hidden;
  }
  
  .calendar-day:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    z-index: 1;
  }
  
  .calendar-day.current-month {
    font-weight: 500;
  }
  
  .calendar-day.other-month {
    color: #aaa;
    background-color: #f9f9f9;
  }
  
  .calendar-day.today {
    border: 2px solid var(--primary-color);
    font-weight: 700;
  }
  
  .calendar-day.has-review {
    background-color: rgba(52, 152, 219, 0.05);
  }
  
  .calendar-day.missed-review {
    background-color: rgba(231, 76, 60, 0.05);
  }
  
  .calendar-day.completed-review {
    background-color: rgba(46, 204, 113, 0.05);
  }
  
  .day-number {
    position: absolute;
    top: 0.3rem;
    left: 0.5rem;
    font-weight: 600;
  }

  /* 달력 내 복습 정보 스타일 */
  .calendar-review-info {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-top: 1rem;
    gap: 0.5rem;
  }
  
  .review-cycle {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--primary-color);
    background-color: rgba(74, 109, 167, 0.1);
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
  }
  
  .calendar-status {
    font-size: 0.75rem;
    padding: 0.15rem 0.4rem;
    border-radius: 0.25rem;
  }
  
  .calendar-status.completed {
    background-color: rgba(40, 167, 69, 0.15);
    color: #28a745;
  }
  
  .calendar-status.missed {
    background-color: rgba(220, 53, 69, 0.15);
    color: #dc3545;
  }
  
  .calendar-status.pending {
    background-color: rgba(255, 193, 7, 0.15);
    color: #856404;
  }
  
  .calendar-review-btn {
    font-size: 0.7rem;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 0.25rem;
    padding: 0.15rem 0.4rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .calendar-review-btn:hover {
    background-color: var(--primary-dark-color, #3b5998);
  }
  
  .spinner.small {
    width: 8px;
    height: 8px;
    border-width: 1px;
    margin-right: 0.25rem;
  }
  
  .calendar-legend {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }
  
  .legend-color {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
  }
  
  .legend-color.today {
    border: 2px solid var(--primary-color);
  }
  
  .legend-color.has-review {
    background-color: rgba(52, 152, 219, 0.15);
  }
  
  .legend-color.missed-review {
    background-color: rgba(231, 76, 60, 0.15);
  }
  
  .legend-color.completed-review {
    background-color: rgba(46, 204, 113, 0.15);
  }
  
  /* 일정 항목 추가 스타일 */
  .schedule-item.missed {
    background-color: rgba(231, 76, 60, 0.05);
    border-color: #e74c3c;
  }
  
  /* 복습 평가 정보 스타일 */
  .review-rating {
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px dashed rgba(0, 0, 0, 0.1);
  }
  
  .rating-label, .memo-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--secondary-color);
    margin-bottom: 0.25rem;
  }
  
  .memory-rating {
    font-weight: 500;
    font-size: 0.85rem;
  }
  
  .poor-memory {
    color: #dc3545;
  }
  
  .medium-memory {
    color: #ffc107;
  }
  
  .good-memory {
    color: #28a745;
  }
  
  .review-memo {
    margin-top: 0.5rem;
  }
  
  .memo-content {
    font-size: 0.8rem;
    font-style: italic;
    color: var(--secondary-color);
    background-color: rgba(0, 0, 0, 0.02);
    padding: 0.5rem;
    border-radius: 0.25rem;
  }
  
  /* 복습 액션 버튼 */
  .review-actions {
    margin-top: 0.75rem;
  }
  
  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  /* 복습 평가 모달 스타일 */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(3px);
    z-index: 1000;
  }
  
  .review-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 500px;
    background-color: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #e9ecef;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #212529;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.75rem;
    line-height: 1;
    color: #6c757d;
    cursor: pointer;
    padding: 0;
  }
  
  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
  }
  
  .review-material-info {
    margin-bottom: 1.5rem;
  }
  
  .review-material-info h4 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
    color: #495057;
  }
  
  .review-material-info p {
    margin: 0;
    color: #6c757d;
    font-size: 0.9rem;
  }
  
  .memory-rating-section {
    margin-bottom: 1.5rem;
  }
  
  .memory-rating-section h5 {
    margin: 0 0 1rem;
    font-size: 1rem;
    color: #343a40;
  }
  
  .rating-buttons {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .rating-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid #dee2e6;
    background-color: white;
    color: #495057;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .rating-btn:hover {
    background-color: #f8f9fa;
    border-color: #adb5bd;
  }
  
  .rating-btn.active {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }
  
  .rating-labels {
    display: flex;
    justify-content: space-between;
    color: #6c757d;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }
  
  .review-note-section h5 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    color: #343a40;
  }
  
  .review-note-section textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9rem;
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid #e9ecef;
    background-color: #f8f9fa;
  }
  
  .btn-secondary {
    background-color: #6c757d;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .btn-secondary:hover {
    background-color: #5a6268;
  }
  
  /* 복습 통계 스타일 */
  .review-statistics {
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
  }
  
  .review-statistics h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.25rem;
  }
  
  .statistics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }
  
  .statistic-card {
    text-align: center;
    background-color: #f8fafc;
    padding: 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  .statistic-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
  }
  
  .statistic-label {
    font-size: 0.85rem;
    color: var(--secondary-color);
  }
  
  /* 학습 노트 스타일 */
  .study-notes {
    border-top: 1px solid var(--border-color);
    padding-top: 1.5rem;
  }
  
  .study-notes h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
  }
  
  .text-muted {
    color: var(--secondary-color);
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  
  .notes-content {
    background-color: #f8fafc;
    padding: 1rem;
    border-radius: 0.5rem;
  }
  
  .form-control {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    font-family: inherit;
    font-size: 0.9rem;
    resize: vertical;
  }
  
  /* 성공 토스트 메시지 */
  .success-toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #28a745;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: fadeInOut 3s ease;
  }
  
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateY(20px); }
    15% { opacity: 1; transform: translateY(0); }
    85% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
  }
  
  /* 스피너 애니메이션 */
  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-right: 0.5rem;
  }
  
  @media (max-width: 768px) {
    .calendar-grid {
      gap: 2px;
    }
    
    .calendar-day {
      min-height: 60px;
      font-size: 0.8rem;
      padding: 0.3rem;
    }
    
    .weekday {
      font-size: 0.8rem;
    }
    
    .legend-item {
      font-size: 0.7rem;
    }
    
    .review-modal {
      width: 95%;
      max-height: 95vh;
    }
    
    .rating-btn {
      width: 40px;
      height: 40px;
      font-size: 0.9rem;
    }
    
    .review-cycle, .calendar-status, .calendar-review-btn {
      font-size: 0.65rem;
      padding: 0.1rem 0.3rem;
    }
    
    .day-number {
      font-size: 0.75rem;
      top: 0.2rem;
      left: 0.3rem;
    }
    
    .calendar-review-info {
      margin-top: 0.8rem;
      gap: 0.3rem;
    }
    
    .schedule-grid {
      grid-template-columns: 1fr;
    }
    
    .statistics-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  
  .btn-primary, .btn-danger {
    color: white;
  }
</style> 