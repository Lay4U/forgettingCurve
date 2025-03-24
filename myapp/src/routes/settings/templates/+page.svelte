<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { getUserReviewTemplates, addReviewTemplate, updateReviewTemplate, deleteReviewTemplate } from '$lib/services/templateService';
  
  let templates = [];
  let newTemplate = {
    name: '',
    description: '',
    intervals: [0, 1, 7, 30]
  };
  let editingTemplate = null;
  let newInterval = '';
  let loading = true;
  let error = '';
  let success = '';
  
  // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  $: if ($user === null && loading === false) {
    goto('/login');
  }
  
  onMount(async () => {
    if ($user) {
      await loadTemplates();
      loading = false;
    } else {
      loading = false;
    }
  });
  
  async function loadTemplates() {
    try {
      error = '';
      templates = await getUserReviewTemplates($user.uid);
    } catch (err) {
      console.error('템플릿 로딩 에러:', err);
      error = '템플릿 목록을 불러오는 중 오류가 발생했습니다.';
    }
  }
  
  async function handleAddTemplate() {
    try {
      error = '';
      
      if (!newTemplate.name) {
        error = '템플릿 이름을 입력해주세요.';
        return;
      }
      
      if (newTemplate.intervals.length === 0) {
        error = '최소 하나 이상의 복습 간격이 필요합니다.';
        return;
      }
      
      await addReviewTemplate($user.uid, newTemplate);
      
      success = '새 템플릿이 성공적으로 추가되었습니다.';
      setTimeout(() => { success = ''; }, 3000);
      
      newTemplate = { name: '', description: '', intervals: [0, 1, 7, 30] };
      await loadTemplates();
    } catch (err) {
      console.error('템플릿 추가 에러:', err);
      error = '템플릿을 추가하는 중 오류가 발생했습니다.';
    }
  }
  
  function startEditTemplate(template) {
    editingTemplate = { 
      ...template, 
      intervals: [...template.intervals] 
    };
    newInterval = '';
  }
  
  async function saveEditTemplate() {
    try {
      error = '';
      
      if (!editingTemplate.name) {
        error = '템플릿 이름을 입력해주세요.';
        return;
      }
      
      if (editingTemplate.intervals.length === 0) {
        error = '최소 하나 이상의 복습 간격이 필요합니다.';
        return;
      }
      
      // intervals 정렬
      editingTemplate.intervals.sort((a, b) => a - b);
      
      await updateReviewTemplate(editingTemplate.id, {
        name: editingTemplate.name,
        description: editingTemplate.description,
        intervals: editingTemplate.intervals
      });
      
      success = '템플릿이 성공적으로 업데이트되었습니다.';
      setTimeout(() => { success = ''; }, 3000);
      
      editingTemplate = null;
      await loadTemplates();
    } catch (err) {
      console.error('템플릿 업데이트 에러:', err);
      error = '템플릿을 업데이트하는 중 오류가 발생했습니다.';
    }
  }
  
  function addInterval() {
    if (newInterval && !isNaN(newInterval)) {
      const interval = parseInt(newInterval);
      if (interval >= 0) {
        if (editingTemplate) {
          if (!editingTemplate.intervals.includes(interval)) {
            editingTemplate.intervals = [...editingTemplate.intervals, interval];
            editingTemplate.intervals.sort((a, b) => a - b);
          }
        } else {
          if (!newTemplate.intervals.includes(interval)) {
            newTemplate.intervals = [...newTemplate.intervals, interval];
            newTemplate.intervals.sort((a, b) => a - b);
          }
        }
        newInterval = '';
      } else {
        error = '복습 간격은 0 이상의 값이어야 합니다.';
      }
    }
  }
  
  function removeInterval(intervals, index) {
    if (intervals.length > 1) {
      return intervals.filter((_, i) => i !== index);
    }
    return intervals;
  }
  
  function removeEditingInterval(index) {
    if (editingTemplate && editingTemplate.intervals.length > 1) {
      editingTemplate.intervals = removeInterval(editingTemplate.intervals, index);
    }
  }
  
  function removeNewInterval(index) {
    if (newTemplate.intervals.length > 1) {
      newTemplate.intervals = removeInterval(newTemplate.intervals, index);
    }
  }
  
  async function setDefaultTemplate(templateId) {
    try {
      error = '';
      
      // 모든 템플릿의 isDefault를 false로 설정
      const updatePromises = templates.map(template => 
        updateReviewTemplate(template.id, { isDefault: template.id === templateId })
      );
      
      await Promise.all(updatePromises);
      
      success = '기본 템플릿이 변경되었습니다.';
      setTimeout(() => { success = ''; }, 3000);
      
      await loadTemplates();
    } catch (err) {
      console.error('기본 템플릿 설정 에러:', err);
      error = '기본 템플릿을 설정하는 중 오류가 발생했습니다.';
    }
  }
  
  async function handleDeleteTemplate(templateId) {
    try {
      // 기본 템플릿은 삭제 불가
      const template = templates.find(t => t.id === templateId);
      if (template && template.isDefault) {
        error = '기본 템플릿은 삭제할 수 없습니다.';
        return;
      }
      
      if (confirm('정말로 이 템플릿을 삭제하시겠습니까?')) {
        error = '';
        await deleteReviewTemplate(templateId);
        
        success = '템플릿이 성공적으로 삭제되었습니다.';
        setTimeout(() => { success = ''; }, 3000);
        
        await loadTemplates();
      }
    } catch (err) {
      console.error('템플릿 삭제 에러:', err);
      error = '템플릿을 삭제하는 중 오류가 발생했습니다.';
    }
  }
  
  function formatInterval(interval) {
    return interval === 0 ? '당일' : interval + '일 후';
  }
</script>

<div class="templates-container">
  <h1>복습 일정 템플릿 관리</h1>
  
  {#if error}
    <div class="alert alert-danger mt-3 mb-3" role="alert">
      {error}
    </div>
  {/if}
  
  {#if success}
    <div class="alert alert-success mt-3 mb-3" role="alert">
      {success}
    </div>
  {/if}
  
  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>데이터를 불러오는 중...</p>
    </div>
  {:else}
    <div class="templates-list card">
      <div class="card-header">
        <h2>내 템플릿</h2>
      </div>
      <div class="card-body">
        {#if templates.length === 0}
          <div class="empty-state">
            <p>저장된 템플릿이 없습니다. 새 템플릿을 추가해보세요.</p>
          </div>
        {:else}
          {#each templates as template}
            <div class="template-item {template.isDefault ? 'default' : ''}">
              <div class="template-header">
                <div>
                  <h3>{template.name}</h3>
                  {#if template.isDefault}
                    <span class="default-badge">기본값</span>
                  {/if}
                </div>
                <div class="template-actions">
                  <button class="btn btn-sm btn-outline-primary" on:click={() => startEditTemplate(template)}>
                    수정
                  </button>
                  {#if !template.isDefault}
                    <button class="btn btn-sm btn-outline-success" on:click={() => setDefaultTemplate(template.id)}>
                      기본값으로 설정
                    </button>
                    <button class="btn btn-sm btn-outline-danger" on:click={() => handleDeleteTemplate(template.id)}>
                      삭제
                    </button>
                  {/if}
                </div>
              </div>
              {#if template.description}
                <p class="template-description">{template.description}</p>
              {/if}
              <div class="intervals-list">
                <div class="intervals-label">복습 간격:</div>
                <div class="intervals">
                  {#each template.intervals as interval, i}
                    <span class="interval-badge">
                      {formatInterval(interval)}
                    </span>
                    {#if i < template.intervals.length - 1}
                      <span class="arrow">→</span>
                    {/if}
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
    
    <div class="template-form card mt-4">
      <div class="card-header">
        <h2>{editingTemplate ? '템플릿 수정' : '새 템플릿 추가'}</h2>
      </div>
      <div class="card-body">
        <form on:submit|preventDefault={editingTemplate ? saveEditTemplate : handleAddTemplate}>
          <div class="form-group">
            <label>템플릿 이름</label>
            {#if editingTemplate}
              <input 
                type="text" 
                class="form-control styled-input" 
                bind:value={editingTemplate.name} 
                placeholder="예: 어휘 학습용, 개념 이해용 등"
                required
              />
            {:else}
              <input 
                type="text" 
                class="form-control styled-input" 
                bind:value={newTemplate.name} 
                placeholder="예: 어휘 학습용, 개념 이해용 등"
                required
              />
            {/if}
          </div>
          
          <div class="form-group">
            <label>설명 (선택사항)</label>
            {#if editingTemplate}
              <textarea 
                class="form-control styled-textarea" 
                bind:value={editingTemplate.description}
                rows="2"
                placeholder="이 템플릿에 대한 간단한 설명을 입력하세요"
              ></textarea>
            {:else}
              <textarea 
                class="form-control styled-textarea" 
                bind:value={newTemplate.description}
                rows="2"
                placeholder="이 템플릿에 대한 간단한 설명을 입력하세요"
              ></textarea>
            {/if}
          </div>
          
          <div class="form-group">
            <label>복습 간격 (일)</label>
            <div class="intervals-editor">
              <div class="intervals-list">
                {#if editingTemplate}
                  {#each editingTemplate.intervals as interval, i}
                    <div class="interval-item">
                      <span class="interval-value">{formatInterval(interval)}</span>
                      <button 
                        type="button" 
                        class="btn btn-sm btn-outline-danger" 
                        on:click={() => removeEditingInterval(i)} 
                        disabled={editingTemplate.intervals.length <= 1}
                      >
                        삭제
                      </button>
                    </div>
                  {/each}
                {:else}
                  {#each newTemplate.intervals as interval, i}
                    <div class="interval-item">
                      <span class="interval-value">{formatInterval(interval)}</span>
                      <button 
                        type="button" 
                        class="btn btn-sm btn-outline-danger" 
                        on:click={() => removeNewInterval(i)} 
                        disabled={newTemplate.intervals.length <= 1}
                      >
                        삭제
                      </button>
                    </div>
                  {/each}
                {/if}
              </div>
              
              <div class="add-interval">
                <div class="input-group">
                  <input 
                    type="number" 
                    class="form-control styled-input" 
                    bind:value={newInterval} 
                    placeholder="복습 일수 추가 (0은 당일)" 
                    min="0"
                  />
                  <div class="input-group-append">
                    <button 
                      type="button" 
                      class="btn btn-outline-primary" 
                      on:click={addInterval}
                    >
                      추가
                    </button>
                  </div>
                </div>
                <small class="form-text text-muted">
                  0은 당일, 1은 1일 후, 7은 7일 후 등 일수 기준으로 입력하세요.
                </small>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            {#if editingTemplate}
              <button type="submit" class="btn btn-primary styled-button">
                변경사항 저장
              </button>
              <button 
                type="button" 
                class="btn btn-secondary styled-button-secondary ml-3" 
                on:click={() => editingTemplate = null}
              >
                취소
              </button>
            {:else}
              <button type="submit" class="btn btn-primary styled-button">
                템플릿 추가
              </button>
            {/if}
          </div>
        </form>
      </div>
    </div>
  {/if}
  
  <div class="actions-nav mt-4">
    <a href="/settings" class="btn btn-outline-secondary styled-button-secondary">
      <span class="icon">←</span> 설정으로 돌아가기
    </a>
  </div>
</div>

<style>
  .templates-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 1.5rem;
  }
  
  h1 {
    margin-bottom: 1.5rem;
    color: var(--primary-color);
    font-weight: 700;
  }
  
  h2 {
    font-size: 1.25rem;
    color: var(--primary-color);
  }
  
  .templates-list {
    margin-bottom: 2rem;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border: none;
  }
  
  .template-item {
    margin-bottom: 1.5rem;
    padding: 1.25rem;
    border-radius: 8px;
    background-color: #f8f9fa;
    border-left: 4px solid var(--primary-color);
    transition: transform 0.2s ease;
  }
  
  .template-item:last-child {
    margin-bottom: 0;
  }
  
  .template-item.default {
    border-left-color: #28a745;
    background-color: rgba(40, 167, 69, 0.05);
  }
  
  .template-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .template-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  
  .template-header h3 {
    font-size: 1.1rem;
    margin: 0;
    font-weight: 600;
  }
  
  .default-badge {
    display: inline-block;
    background-color: #28a745;
    color: white;
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 12px;
    margin-left: 0.5rem;
  }
  
  .template-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .template-description {
    color: var(--secondary-color);
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  
  .intervals-list {
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
  
  .template-form {
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    border: none;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .styled-input, .styled-textarea {
    border: 2px solid #e9ecef;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    transition: all 0.2s ease;
    background-color: #f8f9fa;
  }
  
  .styled-input:focus, .styled-textarea:focus {
    border-color: var(--primary-color);
    background-color: #fff;
    box-shadow: 0 0 0 0.2rem rgba(74, 109, 167, 0.25);
    outline: none;
  }
  
  .styled-textarea {
    min-height: 80px;
    resize: vertical;
  }
  
  .intervals-editor {
    background-color: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 0.5rem;
  }
  
  .interval-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: white;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    margin-bottom: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  
  .interval-value {
    font-weight: 500;
  }
  
  .add-interval {
    margin-top: 1rem;
  }
  
  .input-group {
    display: flex;
  }
  
  .input-group-append {
    margin-left: 0.5rem;
  }
  
  .form-actions {
    display: flex;
    margin-top: 2rem;
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
  
  .ml-3 {
    margin-left: 1rem;
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
  
  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--secondary-color);
    background-color: rgba(var(--light-rgb), 0.5);
    border-radius: 8px;
    border: 1px dashed var(--border-color);
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
  
  .actions-nav {
    margin: 2rem 0;
    text-align: center;
  }
  
  .icon {
    display: inline-block;
    margin-right: 0.25rem;
  }
  
  @media (max-width: 768px) {
    .template-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    
    .template-actions {
      width: 100%;
      justify-content: flex-start;
    }
    
    .form-actions {
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .ml-3 {
      margin-left: 0;
    }
    
    .styled-button, .styled-button-secondary {
      width: 100%;
    }
  }
</style> 