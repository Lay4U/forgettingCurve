<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { addStudyMaterial } from '$lib/services/studyService';
  import { getUserSubjects } from '$lib/services/subjectService';
  import { getUserReviewTemplates } from '$lib/services/templateService';
  
  let title = '';
  let content = '';
  let selectedSubjectId = '';
  let difficulty = 'medium'; // 'easy', 'medium', 'hard'
  let importanceLevel = 3; // 1-5
  let subjects = [];
  let templates = [];
  let selectedTemplateId = '';
  let loading = true;
  let saving = false;
  let error = '';
  let success = false;
  
  // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  $: if ($user === null) {
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
        
        // 기본 템플릿 자동 선택
        const defaultTemplate = templates.find(t => t.isDefault);
        if (defaultTemplate) {
          selectedTemplateId = defaultTemplate.id;
        }
        
        // 과목이 있으면 첫 번째 과목 자동 선택
        if (subjects.length > 0) {
          selectedSubjectId = subjects[0].id;
        }
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
  
  // 템플릿 정보 표시
  const getSelectedTemplate = () => {
    return templates.find(t => t.id === selectedTemplateId);
  };
  
  const formatInterval = (interval) => {
    return interval === 0 ? '당일' : `${interval}일 후`;
  };
  
  const handleSubmit = async () => {
    if (!title || !content || !selectedSubjectId) {
      error = '모든 필드를 입력해주세요.';
      return;
    }
    
    try {
      saving = true;
      error = '';
      
      const studyData = {
        title,
        content,
        subjectId: selectedSubjectId,
        difficulty,
        importanceLevel
      };
      
      const newMaterial = await addStudyMaterial($user.uid, studyData, selectedTemplateId);
      
      // 폼 초기화
      title = '';
      content = '';
      difficulty = 'medium';
      importanceLevel = 3;
      success = true;
      
      // 성공 메시지 표시 후 목록 페이지로 리다이렉트
      setTimeout(() => {
        goto('/study?added=' + newMaterial.id); // 쿼리 파라미터로 추가된 자료 ID 전달
      }, 1000);
      
    } catch (err) {
      console.error('학습 자료 추가 에러:', err);
      error = '학습 자료를 추가하는 중 오류가 발생했습니다.';
    } finally {
      saving = false;
    }
  };
</script>

<div class="add-study-container">
  <h1>학습 자료 추가</h1>
  
  {#if error}
    <div class="alert alert-danger mt-3 mb-3" role="alert">
      {error}
    </div>
  {/if}
  
  {#if success}
    <div class="alert alert-success mt-3 mb-3" role="alert">
      학습 자료가 성공적으로 추가되었습니다!
    </div>
  {/if}
  
  <form on:submit|preventDefault={handleSubmit} class="add-study-form card">
    <div class="card-body">
      <div class="form-group">
        <label for="title">제목</label>
        <input 
          type="text" 
          id="title" 
          class="form-control" 
          bind:value={title} 
          placeholder="학습 자료의 제목을 입력하세요"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="subject">과목</label>
        {#if subjects.length > 0}
          <select id="subject" class="form-control" bind:value={selectedSubjectId} required>
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
          class="form-control" 
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
                class="form-control-range"
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
        class="btn btn-primary btn-block mt-4" 
        disabled={loading || !title || !content || !selectedSubjectId}
      >
        {#if loading}
          저장 중...
        {:else}
          학습 자료 저장
        {/if}
      </button>
    </div>
  </form>
  
  <div class="actions-nav mt-4">
    <a href="/study" class="btn btn-outline-secondary">
      <span class="icon">←</span> 학습 자료 목록으로 돌아가기
    </a>
  </div>
</div>

<style>
  .add-study-container {
    max-width: 800px;
    margin: 0 auto;
  }
  
  h1 {
    margin-bottom: 1.5rem;
  }
  
  .add-study-form {
    margin-top: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-control {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
  }
  
  textarea.form-control {
    resize: vertical;
    min-height: 120px;
  }
  
  .options-section {
    background-color: #f9f9f9;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }
  
  .options-header {
    margin-bottom: 1.5rem;
  }
  
  .options-header h2 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
  
  .difficulty-selection {
    margin-bottom: 2rem;
  }
  
  .difficulty-options {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
  }
  
  .difficulty-option {
    flex: 1;
    cursor: pointer;
  }
  
  .difficulty-card {
    border: 2px solid #e0e0e0;
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: center;
    transition: all 0.2s ease;
    height: 100%;
  }
  
  .difficulty-card:hover {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-color);
  }
  
  .difficulty-card.selected {
    border-color: var(--primary-color);
    background-color: rgba(74, 109, 167, 0.05);
    box-shadow: 0 0 0 2px var(--primary-color);
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
    font-size: 0.85rem;
    color: var(--secondary-color);
  }
  
  .importance-container {
    display: flex;
    align-items: center;
    gap: 2rem;
  }
  
  .importance-slider {
    flex: 1;
  }
  
  .importance-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--secondary-color);
    margin-top: 0.5rem;
  }
  
  .importance-value {
    text-align: center;
    min-width: 100px;
  }
  
  .importance-stars {
    font-size: 1.5rem;
    margin-bottom: 0.25rem;
    color: #d9d9d9;
  }
  
  .star.filled {
    color: #ffc107;
  }
  
  .importance-number {
    font-weight: 600;
    font-size: 1.25rem;
  }
  
  .actions-nav {
    margin-top: 2rem;
    margin-bottom: 3rem;
  }
  
  .icon {
    display: inline-block;
    margin-right: 0.5rem;
  }
  
  .text-muted {
    color: #6c757d !important;
    font-size: 0.875rem;
  }
  
  .mt-3 {
    margin-top: 1rem;
  }
  
  .mt-4 {
    margin-top: 1.5rem;
  }
  
  .mb-3 {
    margin-bottom: 1rem;
  }
  
  .alert {
    padding: 1rem;
    border-radius: 0.25rem;
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
  
  .alert-link {
    font-weight: 600;
    color: inherit;
    text-decoration: underline;
  }
  
  @media (max-width: 768px) {
    .difficulty-options {
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .importance-container {
      flex-direction: column;
      gap: 1rem;
    }
    
    .importance-value {
      margin-top: 0.5rem;
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
</style> 