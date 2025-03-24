<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { 
    getUserSubjects, 
    addSubject, 
    updateSubject, 
    deleteSubject 
  } from '$lib/services/subjectService';

  let subjects = [];
  let loading = true;
  let error = '';
  let showAddForm = false;
  let editingSubject = null;

  // 새 과목 폼 데이터
  let newSubject = {
    name: '',
    customIntervals: null,
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };

  // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  $: if ($user === null && loading === false) {
    goto('/login');
  }

  onMount(async () => {
    if ($user) {
      await loadSubjects();
    } else {
      loading = false;
    }
  });

  const loadSubjects = async () => {
    try {
      loading = true;
      error = '';
      subjects = await getUserSubjects($user.uid);
    } catch (err) {
      console.error('과목 목록 로딩 에러:', err);
      error = '과목 목록을 불러오는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };

  const handleAddSubject = async () => {
    if (!newSubject.name.trim()) {
      error = '과목 이름을 입력해주세요.';
      return;
    }

    try {
      loading = true;
      error = '';
      
      await addSubject($user.uid, {
        name: newSubject.name.trim(),
        color: newSubject.color,
        customIntervals: newSubject.customIntervals
      });
      
      // 폼 초기화
      newSubject = {
        name: '',
        customIntervals: null,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      };
      
      showAddForm = false;
      
      // 목록 갱신
      await loadSubjects();
    } catch (err) {
      console.error('과목 추가 에러:', err);
      error = '과목을 추가하는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };

  const handleEditSubject = (subject) => {
    editingSubject = { ...subject };
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject.name.trim()) {
      error = '과목 이름을 입력해주세요.';
      return;
    }

    try {
      loading = true;
      error = '';
      
      // Firestore는 undefined 값을 허용하지 않으므로 업데이트 데이터에서 undefined 값을 제거합니다
      const updateData = {
        name: editingSubject.name.trim(),
        color: editingSubject.color
      };
      
      // customIntervals이 있을 경우에만 포함 (undefined인 경우 제외)
      if (editingSubject.customIntervals !== undefined) {
        updateData.customIntervals = editingSubject.customIntervals;
      }
      
      await updateSubject(editingSubject.id, updateData);
      
      editingSubject = null;
      
      // 목록 갱신
      await loadSubjects();
    } catch (err) {
      console.error('과목 업데이트 에러:', err);
      error = '과목을 업데이트하는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!confirm('정말로 이 과목을 삭제하시겠습니까?')) {
      return;
    }

    try {
      loading = true;
      error = '';
      
      await deleteSubject(subjectId);
      
      // 목록 갱신
      await loadSubjects();
    } catch (err) {
      console.error('과목 삭제 에러:', err);
      error = '과목을 삭제하는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };

  const cancelEdit = () => {
    editingSubject = null;
  };
</script>

<div class="subjects-container">
  <div class="header flex justify-between items-center">
    <h1>과목 관리</h1>
    
    {#if !showAddForm}
      <button 
        class="btn-add"
        on:click={() => showAddForm = true}
        disabled={loading}
      >
        <span class="btn-icon">+</span> 과목 추가
      </button>
    {/if}
  </div>
  
  {#if error}
    <div class="error-message" role="alert">
      {error}
    </div>
  {/if}
  
  {#if showAddForm}
    <div class="add-form card mt-4">
      <div class="card-header">
        <h3>새 과목 추가</h3>
      </div>
      <div class="card-body">
        <form on:submit|preventDefault={handleAddSubject}>
          <div class="form-group">
            <label for="subjectName">과목 이름</label>
            <input 
              type="text" 
              id="subjectName"
              class="form-control" 
              placeholder="과목 이름을 입력하세요"
              bind:value={newSubject.name}
              disabled={loading}
              required
            />
          </div>
          
          <div class="form-group">
            <label for="subjectColor">색상</label>
            <div class="color-selector">
              <input 
                type="color" 
                id="subjectColor"
                class="form-control color-input" 
                bind:value={newSubject.color}
                disabled={loading}
              />
              <div class="color-presets">
                {#each [
                  '#4285F4', '#34A853', '#FBBC05', '#EA4335', 
                  '#8E44AD', '#3498DB', '#E67E22', '#1ABC9C', 
                  '#F1C40F', '#E74C3C', '#9B59B6', '#2ECC71',
                  '#16A085', '#27AE60', '#D35400', '#2980B9'
                ] as color}
                  <button 
                    type="button"
                    class="color-preset {newSubject.color === color ? 'active' : ''}"
                    style="background-color: {color};"
                    on:click={() => newSubject.color = color}
                  ></button>
                {/each}
              </div>
            </div>
          </div>
          
          <div class="form-actions flex mt-4">
            <button 
              type="submit" 
              class="btn btn-primary"
              disabled={loading}
            >
              추가
            </button>
            <button 
              type="button"
              class="btn btn-secondary ml-2"
              on:click={() => showAddForm = false}
              disabled={loading}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
  
  {#if loading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>불러오는 중...</p>
    </div>
  {:else if subjects.length === 0}
    <div class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>등록된 과목이 없습니다</h3>
      <p>새로운 과목을 추가해보세요.</p>
      <button 
        class="btn-add mt-4"
        on:click={() => showAddForm = true}
      >
        <span class="btn-icon">+</span> 과목 추가
      </button>
    </div>
  {:else}
    <div class="subjects-list">
      {#each subjects as subject}
        <div class="subject-card" style="border-top: 4px solid {subject.color};">
          <div class="card-content">
            <h3 class="subject-name">{subject.name}</h3>
            <div class="subject-color-preview" style="background-color: {subject.color};"></div>
          </div>
          <div class="card-actions">
            <button 
              class="btn-edit"
              on:click={() => handleEditSubject(subject)}
            >
              수정
            </button>
            <button 
              class="btn-delete"
              on:click={() => handleDeleteSubject(subject.id)}
            >
              삭제
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- 과목 편집 모달 -->
{#if editingSubject}
  <div class="modal-backdrop" on:click={cancelEdit}></div>
  <div class="modal">
    <div class="modal-header">
      <h3>과목 편집</h3>
      <button class="close-btn" on:click={cancelEdit}>&times;</button>
    </div>
    <div class="modal-body">
      <form on:submit|preventDefault={handleUpdateSubject}>
        <div class="form-group">
          <label for="editSubjectName">과목명</label>
          <input 
            type="text" 
            id="editSubjectName" 
            class="form-control" 
            bind:value={editingSubject.name} 
            required
          />
        </div>
        
        <div class="form-group">
          <label for="editSubjectColor">색상</label>
          <div class="color-selector">
            <input 
              type="color" 
              id="editSubjectColor" 
              class="form-control color-input" 
              bind:value={editingSubject.color} 
            />
            <div class="color-presets">
              {#each [
                '#4285F4', '#34A853', '#FBBC05', '#EA4335', 
                '#8E44AD', '#3498DB', '#E67E22', '#1ABC9C', 
                '#F1C40F', '#E74C3C', '#9B59B6', '#2ECC71',
                '#16A085', '#27AE60', '#D35400', '#2980B9'
              ] as color}
                <button 
                  type="button"
                  class="color-preset {editingSubject.color === color ? 'active' : ''}"
                  style="background-color: {color};"
                  on:click={() => editingSubject.color = color}
                ></button>
              {/each}
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {#if loading}저장 중...{:else}저장{/if}
          </button>
          <button type="button" class="btn btn-secondary" on:click={cancelEdit}>취소</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .subjects-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 1rem 3rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
  
  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #333;
    margin: 0;
  }
  
  .btn-add {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }
  
  .btn-add:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(79, 70, 229, 0.4);
  }
  
  .btn-icon {
    font-size: 1.2rem;
    font-weight: bold;
  }
  
  .add-form, .edit-form {
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    margin-bottom: 2.5rem;
    transition: transform 0.3s;
  }
  
  .card-header {
    padding: 1.5rem;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }
  
  .card-header h3 {
    margin: 0;
    font-size: 1.25rem;
    color: #333;
  }
  
  .card-body {
    padding: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #444;
  }
  
  .form-control {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s;
  }
  
  .form-control:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.25);
    outline: none;
  }
  
  .subjects-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  
  .subject-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: all 0.3s;
    display: flex;
    flex-direction: column;
  }
  
  .subject-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  }
  
  .card-content {
    padding: 1.5rem;
    flex-grow: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .subject-name {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
  }
  
  .subject-color-preview {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  
  .card-actions {
    display: flex;
    border-top: 1px solid #eee;
    background: #f9f9f9;
  }
  
  .btn-edit, .btn-delete {
    flex: 1;
    padding: 0.75rem;
    border: none;
    background: transparent;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .btn-edit {
    color: #4f46e5;
    border-right: 1px solid #eee;
  }
  
  .btn-delete {
    color: #ef4444;
  }
  
  .btn-edit:hover {
    background: rgba(79, 70, 229, 0.08);
  }
  
  .btn-delete:hover {
    background: rgba(239, 68, 68, 0.08);
  }
  
  .error-message {
    padding: 1rem;
    background-color: #fef2f2;
    color: #b91c1c;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    border-left: 4px solid #ef4444;
  }
  
  .error-message::before {
    content: "!";
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background-color: #ef4444;
    color: white;
    border-radius: 50%;
    margin-right: 0.75rem;
    font-weight: bold;
  }
  
  .loading, .empty-state {
    text-align: center;
    padding: 3rem;
    background-color: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    margin: 2rem 0;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 50px;
    height: 50px;
    border: 4px solid rgba(79, 70, 229, 0.2);
    border-radius: 50%;
    border-top-color: #4f46e5;
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .empty-state h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #333;
  }
  
  .empty-state p {
    color: #666;
    margin-bottom: 1.5rem;
  }
  
  .mt-4 {
    margin-top: 1.5rem;
  }
  
  .color-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .color-input {
    height: 48px;
    width: 100%;
    padding: 0;
    border: 1px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .color-input:hover {
    border-color: #4f46e5;
  }
  
  .color-presets {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 0.75rem;
  }
  
  .color-preset {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
  
  .color-preset.active {
    border-color: #333;
    transform: scale(1.1);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
  }
  
  .color-preset:hover {
    transform: scale(1.1);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
  }
  
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .btn-primary {
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
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
  }
  
  .btn-secondary {
    background: white;
    color: #4b5563;
    border: 1px solid #d1d5db;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-secondary:hover {
    background: #f9fafb;
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  /* Modal styles */
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 1000;
  }
  
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    z-index: 1100;
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #eee;
  }
  
  .modal-header h3 {
    margin: 0;
    font-size: 1.5rem;
    color: #333;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    transition: color 0.2s;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }
  
  .close-btn:hover {
    color: #4b5563;
    background: #f3f4f6;
  }
  
  @media (max-width: 768px) {
    .subjects-list {
      grid-template-columns: 1fr;
    }
    
    .form-actions {
      flex-direction: column;
    }
    
    .form-actions button {
      width: 100%;
    }
    
    .btn-secondary {
      margin-top: 0.75rem;
    }
  }
</style> 