<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { getStudyMaterial, updateStudyMaterial, updateReviewStatus } from '$lib/services/studyService';
  import { getUserSubjects } from '$lib/services/subjectService';
  import { getUserReviewTemplates } from '$lib/services/templateService';
  
  const studyId = $page.params.id;
  
  let title = '';
  let content = '';
  let selectedSubjectId = '';
  let difficulty = 'medium'; // 'easy', 'medium', 'hard'
  let importanceLevel = 3; // 1-5
  let subjects = [];
  let templates = [];
  let selectedTemplateId = '';
  let originalTemplateId = '';
  let loading = true;
  let saving = false;
  let error = '';
  let success = false;
  let material = null;
  let showReviews = true;
  let processingReviewId = null;
  
  // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  $: if ($user === null && loading === false) {
    goto('/login');
  }
  
  onMount(async () => {
    if ($user) {
      try {
        // 과목 정보와 템플릿 정보 동시에 로드
        [subjects, templates] = await Promise.all([
          getUserSubjects($user.uid),
          getUserReviewTemplates($user.uid)
        ]);
        
        // 학습 자료 로드
        await loadStudyMaterial();
      } catch (err) {
        console.error('초기 데이터 로딩 에러:', err);
        error = '데이터를 불러오는 중 오류가 발생했습니다.';
      } finally {
        loading = false;
      }
    } else {
      loading = false;
    }
  });
  
  const loadStudyMaterial = async () => {
    try {
      material = await getStudyMaterial(studyId);
      
      if (!material) {
        error = '학습 자료를 찾을 수 없습니다.';
        return;
      }
      
      // 폼 필드 초기화
      title = material.title;
      content = material.content;
      selectedSubjectId = material.subjectId;
      
      // 템플릿 ID 설정
      selectedTemplateId = material.templateId || '';
      originalTemplateId = material.templateId || '';
      
      if (material.difficultyLevel === 2) {
        difficulty = 'easy';
      } else if (material.difficultyLevel === 3) {
        difficulty = 'medium';
      } else if (material.difficultyLevel === 4) {
        difficulty = 'hard';
      }
      
      importanceLevel = material.importance || 3;
      
    } catch (err) {
      console.error('학습 자료 로딩 에러:', err);
      error = '학습 자료를 불러오는 중 오류가 발생했습니다.';
      throw err;
    }
  };
  
  // 템플릿 정보 표시
  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplateId);
  };
  
  const formatInterval = (interval) => {
    return interval === 0 ? '당일' : `${interval}일 후`;
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
  
  // 복습 상태 초기화 함수
  const resetReview = async (reviewId) => {
    if (!material || processingReviewId) return;
    
    try {
      processingReviewId = reviewId;
      
      // 복습 상태를 대기 중으로 초기화
      await updateReviewStatus(material.id, reviewId, {
        status: 'pending',
        completedDate: null,
        memoryRating: null,
        memo: ''
      });
      
      // 학습 자료 다시 로드
      await loadStudyMaterial();
      
      // 성공 메시지
      success = true;
      setTimeout(() => {
        success = false;
      }, 3000);
      
    } catch (err) {
      console.error('복습 초기화 에러:', err);
      error = '복습 상태를 초기화하는 중 오류가 발생했습니다.';
    } finally {
      processingReviewId = null;
    }
  };
  
  const handleSubmit = async () => {
    if (!title || !content || !selectedSubjectId) {
      error = '모든 필드를 입력해주세요.';
      return;
    }
    
    try {
      saving = true;
      error = '';
      
      // difficulty 문자열을 숫자로 변환
      let difficultyLevel = 3; // 기본값: 중간 난이도
      if (difficulty === 'easy') difficultyLevel = 2;
      else if (difficulty === 'medium') difficultyLevel = 3;
      else if (difficulty === 'hard') difficultyLevel = 4;
      
      const updateData = {
        title,
        content,
        subjectId: selectedSubjectId,
        difficultyLevel,
        importance: importanceLevel
      };
      
      // 템플릿이 변경되었는지 확인
      const templateChanged = selectedTemplateId !== originalTemplateId;
      
      // updateStudyMaterial 함수 호출
      await updateStudyMaterial(studyId, updateData, templateChanged ? selectedTemplateId : null);
      
      success = true;
      
      // 성공 메시지 표시 후 상세 페이지로 리다이렉트
      setTimeout(() => {
        goto(`/study/${studyId}?updated=true`);
      }, 1000);
      
    } catch (err) {
      console.error('학습 자료 수정 에러:', err);
      error = '학습 자료를 수정하는 중 오류가 발생했습니다.';
    } finally {
      saving = false;
    }
  };
</script>

<div class="edit-study-container">
  <h1>학습 자료 수정</h1>
  
  {#if error}
    <div class="alert alert-danger mt-3 mb-3" role="alert">
      {error}
    </div>
  {/if}
  
  {#if success}
    <div class="alert alert-success mt-3 mb-3" role="alert">
      학습 자료가 성공적으로 수정되었습니다!
    </div>
  {/if}
  
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>학습 자료를 불러오는 중...</p>
    </div>
  {:else if material}
    <div class="edit-content-grid">
      <!-- 왼쪽: 학습 자료 수정 폼 -->
      <div class="edit-form-column">
        <form on:submit|preventDefault={handleSubmit} class="edit-study-form card">
          <div class="card-body">
            <div class="form-group">
              <label for="title">제목</label>
              <input 
                type="text" 
                id="title" 
                class="form-control styled-input" 
                bind:value={title} 
                placeholder="학습 자료의 제목을 입력하세요"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="subject">과목</label>
              {#if subjects.length > 0}
                <select id="subject" class="form-control styled-select" bind:value={selectedSubjectId} required>
                  {#each subjects as subject}
                    <option value={subject.id}>{subject.name}</option>
                  {/each}
                </select>
              {:else}
                <div class="alert alert-warning">
                  과목이 없습니다. <a href="/subjects/add" class="alert-link">과목을 추가</a>해주세요.
                </div>
              {/if}
            </div>
            
            <div class="form-group">
              <label for="content">내용</label>
              <textarea 
                id="content" 
                class="form-control styled-textarea" 
                rows="6" 
                bind:value={content} 
                placeholder="학습할 내용을 입력하세요"
                required
              ></textarea>
            </div>
            
            <div class="options-section">
              <div class="options-header">
                <h2>복습 설정</h2>
                <p class="text-muted">복습 일정 템플릿을 선택하여 학습 일정을 관리합니다</p>
              </div>
              
              <div class="form-group">
                <label for="templateSelect">복습 템플릿</label>
                <select id="templateSelect" class="form-control styled-select" bind:value={selectedTemplateId}>
                  {#each templates as template}
                    <option value={template.id}>
                      {template.name} {template.isDefault ? '(기본)' : ''}
                    </option>
                  {/each}
                </select>
                
                {#if selectedTemplateId && selectedTemplateId !== originalTemplateId}
                  <div class="template-warning mt-2">
                    <div class="alert alert-warning">
                      템플릿을 변경하면 기존 복습 일정이 모두 초기화되고 새로운 복습 일정이 생성됩니다.
                    </div>
                  </div>
                {/if}
                
                {#if selectedTemplateId}
                  {@const selectedTemplate = getSelectedTemplate()}
                  {#if selectedTemplate}
                    <div class="selected-template-info mt-2">
                      <div class="template-intervals">
                        <div class="intervals-label">복습 간격:</div>
                        <div class="intervals">
                          {#each selectedTemplate.intervals as interval, i}
                            <span class="interval-badge">
                              {formatInterval(interval)}
                            </span>
                            {#if i < selectedTemplate.intervals.length - 1}
                              <span class="arrow">→</span>
                            {/if}
                          {/each}
                        </div>
                      </div>
                      {#if selectedTemplate.description}
                        <div class="template-description mt-1">
                          {selectedTemplate.description}
                        </div>
                      {/if}
                    </div>
                  {/if}
                {/if}
                
                <div class="template-actions mt-2">
                  <a href="/settings/templates" class="btn btn-sm btn-outline-primary">
                    템플릿 관리하기
                  </a>
                </div>
              </div>
              
              <div class="form-group difficulty-selection">
                <label>난이도</label>
                <div class="difficulty-options">
                  <label class="difficulty-option">
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value="easy" 
                      bind:group={difficulty} 
                      class="difficulty-radio" 
                      hidden
                    />
                    <div class="difficulty-card {difficulty === 'easy' ? 'selected' : ''}">
                      <div class="difficulty-icon">😊</div>
                      <div class="difficulty-label">쉬움</div>
                      <div class="difficulty-description">잘 이해하고 있는 내용</div>
                    </div>
                  </label>
                  
                  <label class="difficulty-option">
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value="medium" 
                      bind:group={difficulty} 
                      class="difficulty-radio" 
                      hidden
                    />
                    <div class="difficulty-card {difficulty === 'medium' ? 'selected' : ''}">
                      <div class="difficulty-icon">🤔</div>
                      <div class="difficulty-label">보통</div>
                      <div class="difficulty-description">어느 정도 이해하는 내용</div>
                    </div>
                  </label>
                  
                  <label class="difficulty-option">
                    <input 
                      type="radio" 
                      name="difficulty" 
                      value="hard" 
                      bind:group={difficulty} 
                      class="difficulty-radio" 
                      hidden
                    />
                    <div class="difficulty-card {difficulty === 'hard' ? 'selected' : ''}">
                      <div class="difficulty-icon">😓</div>
                      <div class="difficulty-label">어려움</div>
                      <div class="difficulty-description">이해하기 어려운 내용</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <div class="form-group">
                <label for="importanceLevel">중요도 (1-5)</label>
                <div class="importance-container">
                  <div class="importance-slider">
                    <input 
                      type="range" 
                      id="importanceLevel" 
                      min="1" 
                      max="5" 
                      step="1" 
                      bind:value={importanceLevel} 
                      class="form-control-range styled-range"
                    />
                    <div class="importance-labels">
                      <span>낮음</span>
                      <span>높음</span>
                    </div>
                  </div>
                  <div class="importance-value">
                    <div class="importance-stars">
                      {#each Array(5) as _, i}
                        <span class="star {i < importanceLevel ? 'filled' : ''}">★</span>
                      {/each}
                    </div>
                    <div class="importance-number">{importanceLevel}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              type="submit" 
              class="btn btn-primary btn-block mt-4 styled-button" 
              disabled={saving || !title || !content || !selectedSubjectId}
            >
              {#if saving}
                저장 중...
              {:else}
                학습 자료 수정 저장
              {/if}
            </button>
          </div>
        </form>
      </div>
      
      <!-- 오른쪽: 복습 일정 섹션 -->
      <div class="review-schedule-column">
        <div class="review-schedule card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h2 class="mb-0">복습 일정</h2>
            <button 
              class="btn btn-sm btn-outline-primary" 
              on:click={() => showReviews = !showReviews}
            >
              {showReviews ? '접기' : '펼치기'}
            </button>
          </div>
          
          {#if showReviews}
            <div class="card-body">
              {#if material.reviews && material.reviews.length > 0}
                <div class="review-list">
                  {#each material.reviews as review}
                    <div class="review-item">
                      <div class="review-info">
                        <div class="review-date">
                          <div class="review-label">예정일:</div>
                          <div class="review-value">{formatDate(review.scheduledDate)}</div>
                        </div>
                        
                        <div class="review-status">
                          <div class="review-label">상태:</div>
                          <div class="review-value status-badge {review.status}">
                            {review.status === 'completed' ? '완료됨' : '대기 중'}
                          </div>
                        </div>
                        
                        {#if review.status === 'completed'}
                          <div class="review-completed-date">
                            <div class="review-label">완료일:</div>
                            <div class="review-value">{formatDate(review.completedDate)}</div>
                          </div>
                          
                          {#if review.memoryRating}
                            <div class="review-memory">
                              <div class="review-label">기억 평가:</div>
                              <div class="review-value memory-rating">
                                {#each Array(5) as _, i}
                                  <span class="memory-star {i < review.memoryRating ? 'filled' : ''}">★</span>
                                {/each}
                              </div>
                            </div>
                          {/if}
                          
                          {#if review.memo}
                            <div class="review-memo">
                              <div class="review-label">메모:</div>
                              <div class="review-value memo-text">{review.memo}</div>
                            </div>
                          {/if}
                          
                          <button 
                            class="btn btn-sm btn-outline-warning reset-btn"
                            on:click={() => resetReview(review.reviewId)}
                            disabled={processingReviewId === review.reviewId}
                          >
                            {#if processingReviewId === review.reviewId}
                              초기화 중...
                            {:else}
                              복습 상태 초기화
                            {/if}
                          </button>
                        {/if}
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="empty-state">
                  <p>이 학습 자료에 대한 복습 일정이 없습니다.</p>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
    
    <div class="actions-nav mt-4">
      <a href="/study/{studyId}" class="btn btn-outline-secondary styled-button-secondary">
        <span class="icon">←</span> 상세 페이지로 돌아가기
      </a>
    </div>
  {/if}
</div>

<style>
  .edit-study-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
  }
  
  .edit-content-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  h1 {
    margin-bottom: 1.5rem;
    color: var(--primary-color);
    font-weight: 700;
  }
  
  .loading-state {
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
  
  .edit-study-form {
    margin-bottom: 1rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    border: none;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .btn-block {
    display: block;
    width: 100%;
  }
  
  /* 스타일링된 입력 필드 */
  .styled-input, .styled-select, .styled-textarea {
    border: 2px solid #e9ecef;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    transition: all 0.2s ease;
    background-color: #f8f9fa;
  }
  
  .styled-input:focus, .styled-select:focus, .styled-textarea:focus {
    border-color: var(--primary-color);
    background-color: #fff;
    box-shadow: 0 0 0 0.2rem rgba(74, 109, 167, 0.25);
    outline: none;
  }
  
  .styled-textarea {
    min-height: 120px;
    resize: vertical;
  }
  
  .styled-range {
    height: 6px;
    -webkit-appearance: none;
    width: 100%;
    border-radius: 8px;
    background: linear-gradient(to right, #e9ecef, #e9ecef);
    outline: none;
    padding: 0;
    margin: 0;
  }
  
  .styled-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-color);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }
  
  .styled-range::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }
  
  .styled-button {
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    border-radius: 8px;
    background: linear-gradient(to right, var(--primary-color), var(--primary-dark-color, #395d9e));
    border: none;
    color: white;
    box-shadow: 0 4px 8px rgba(74, 109, 167, 0.3);
    transition: all 0.3s ease;
  }
  
  .styled-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(74, 109, 167, 0.4);
  }
  
  .styled-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(74, 109, 167, 0.4);
  }
  
  .styled-button:disabled {
    background: #e9ecef;
    color: #6c757d;
    box-shadow: none;
    transform: none;
  }
  
  .styled-button-secondary {
    background: transparent;
    color: var(--primary-color);
    border: 2px solid var(--primary-color);
    box-shadow: none;
  }
  
  .styled-button-secondary:hover {
    background: rgba(74, 109, 167, 0.1);
    color: var(--primary-color);
  }
  
  .options-section {
    background-color: #f8f9fa;
    border-radius: 12px;
    padding: 1.5rem;
    margin: 1.5rem 0;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .options-header {
    margin-bottom: 1.5rem;
  }
  
  .options-header h2 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: var(--primary-color);
  }
  
  .difficulty-selection {
    margin-bottom: 2rem;
  }
  
  .difficulty-options {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
  }
  
  .difficulty-option {
    flex: 1;
    cursor: pointer;
    margin: 0;
  }
  
  .difficulty-card {
    text-align: center;
    border: 2px solid var(--border-color);
    border-radius: 12px;
    padding: 1rem;
    transition: all 0.2s ease;
    background-color: white;
  }
  
  .difficulty-card:hover {
    border-color: var(--primary-color);
    background-color: rgba(var(--primary-rgb), 0.05);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  }
  
  .difficulty-card.selected {
    border-color: var(--primary-color);
    background-color: rgba(var(--primary-rgb), 0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .difficulty-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  
  .difficulty-label {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  
  .difficulty-description {
    font-size: 0.875rem;
    color: var(--secondary-color);
  }
  
  .importance-container {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    background-color: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .importance-slider {
    flex: 1;
  }
  
  .importance-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--secondary-color);
  }
  
  .importance-value {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
  }
  
  .importance-stars {
    font-size: 1.25rem;
    color: #d9d9d9;
  }
  
  .star.filled {
    color: #ffc107;
    text-shadow: 0 0 3px rgba(255, 193, 7, 0.5);
  }
  
  .importance-number {
    font-weight: 600;
    margin-top: 0.25rem;
    color: var(--primary-color);
  }
  
  .alert {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }
  
  .alert-danger {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  .alert-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .alert-warning {
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
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
  
  .actions-nav {
    margin-bottom: 3rem;
    text-align: center;
  }
  
  .icon {
    display: inline-block;
    margin-right: 0.25rem;
  }
  
  /* 복습 일정 스타일 */
  .review-schedule {
    height: 100%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border-radius: 12px;
    border: none;
  }
  
  .review-schedule h2 {
    font-size: 1.25rem;
    color: var(--primary-color);
  }
  
  .review-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .review-item {
    padding: 1.25rem;
    border-radius: 8px;
    background-color: #f8f9fa;
    border-left: 4px solid var(--primary-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s ease;
  }
  
  .review-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .review-info {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .review-label {
    font-size: 0.9rem;
    color: var(--secondary-color);
    margin-bottom: 0.25rem;
  }
  
  .review-value {
    font-weight: 500;
    color: var(--dark-color);
  }
  
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
  }
  
  .status-badge.completed {
    background-color: rgba(40, 167, 69, 0.1);
    color: #28a745;
  }
  
  .status-badge.pending {
    background-color: rgba(255, 193, 7, 0.1);
    color: #ffc107;
  }
  
  .memory-rating {
    font-size: 1.1rem;
  }
  
  .memory-star {
    color: #d9d9d9;
  }
  
  .memory-star.filled {
    color: #ffc107;
  }
  
  .review-memo {
    grid-column: 1 / -1;
  }
  
  .memo-text {
    background-color: white;
    padding: 0.75rem;
    border-radius: 8px;
    border-left: 3px solid #6c757d;
    white-space: pre-line;
    font-style: italic;
    color: #495057;
  }
  
  .reset-btn {
    grid-column: 1 / -1;
    margin-top: 1rem;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  
  .reset-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--secondary-color);
    background-color: rgba(var(--light-rgb), 0.5);
    border-radius: 8px;
    border: 1px dashed var(--border-color);
  }
  
  .d-flex {
    display: flex;
  }
  
  .justify-content-between {
    justify-content: space-between;
  }
  
  .align-items-center {
    align-items: center;
  }
  
  .mb-0 {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    .edit-content-grid {
      grid-template-columns: 1fr;
    }
    
    .difficulty-options {
      flex-direction: column;
    }
    
    .importance-container {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
    
    .importance-value {
      flex-direction: row;
      justify-content: space-between;
      min-width: auto;
    }
  }
  
  .selected-template-info {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 0.75rem;
  }
  
  .template-intervals {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .intervals-label {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--dark-color);
    margin-right: 0.5rem;
  }
  
  .intervals {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .interval-badge {
    display: inline-block;
    background-color: #f0f0f0;
    border: 1px solid #e0e0e0;
    color: var(--dark-color);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.85rem;
  }
  
  .arrow {
    color: var(--secondary-color);
    font-size: 0.85rem;
  }
  
  .template-description {
    color: var(--secondary-color);
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }
  
  .template-actions {
    margin-top: 1rem;
  }
  
  .template-warning {
    margin-top: 0.75rem;
  }
</style> 