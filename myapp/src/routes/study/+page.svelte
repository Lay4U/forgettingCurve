<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/authStore';
  import { goto } from '$app/navigation';
  import { 
    getUserStudyMaterials, 
    addStudyMaterial, 
    updateReviewStatus 
  } from '$lib/services/studyService';
  import { getUserSubjects } from '$lib/services/subjectService';
  import { page } from '$app/stores';

  let materials = [];
  let subjects = {};
  let loading = true;
  let error = '';
  let showAddForm = false;
  let selectedMaterial = null;
  let recentlyAddedId = null; // 최근 추가된 학습 자료 ID
  let processingReviewId = null; // 현재 처리 중인 복습 ID
  
  // 복습 평가 모달 관련 상태
  let showReviewModal = false;
  let activeReview = null;
  let memoryRating = 3;
  let reviewNote = '';
  
  // 달력 관련 상태
  let currentMonth = new Date().getMonth();
  let currentYear = new Date().getFullYear();
  
  // URL에서 added 파라미터 추출
  $: {
    if ($page && $page.url.searchParams.has('added')) {
      recentlyAddedId = $page.url.searchParams.get('added');
      // URL에서 파라미터 제거 (새로고침 시 하이라이트 제거를 위해)
      setTimeout(() => {
        if (window.history && window.history.replaceState) {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }, 3000); // 3초 후 URL 파라미터 제거
      
      // 추가된 학습 자료로 스크롤
      setTimeout(() => {
        const addedElement = document.getElementById('recently-added');
        if (addedElement) {
          addedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500); // 페이지 로드 후 0.5초 후 스크롤
    }
  }

  // 새 학습 자료 폼 데이터
  let newMaterial = {
    title: '',
    content: '',
    subjectId: '',
    tags: [],
    importance: 3,
    difficultyLevel: 3
  };

  // 태그 입력
  let tagInput = '';

  // 필터링 및 정렬 관련 상태
  let selectedSubject = 'all';
  let searchQuery = '';
  let sortBy = 'date';  // 'date', 'title', 'difficulty', 'importance'
  let sortDirection = 'desc';  // 'asc', 'desc'
  let filterDifficulty = 'all';  // 'all', 'easy', 'medium', 'hard'

  // 사용자가 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  $: if ($user === null && loading === false) {
    goto('/login');
  }

  // 학습 자료 필터링
  $: filteredMaterials = materials.filter(material => {
    // 과목 필터
    if (selectedSubject !== 'all' && material.subjectId !== selectedSubject) {
      return false;
    }
    
    // 난이도 필터
    if (filterDifficulty !== 'all' && material.difficulty !== filterDifficulty) {
      return false;
    }
    
    // 검색어 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        material.title?.toLowerCase().includes(query) ||
        material.content?.toLowerCase().includes(query)
      );
    }
    
    return true;
  }).sort((a, b) => {
    // 정렬
    if (sortBy === 'date') {
      const dateA = a.dateStudied ? a.dateStudied.toDate().getTime() : 0;
      const dateB = b.dateStudied ? b.dateStudied.toDate().getTime() : 0;
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else if (sortBy === 'title') {
      return sortDirection === 'asc' 
        ? a.title.localeCompare(b.title) 
        : b.title.localeCompare(a.title);
    } else if (sortBy === 'difficulty') {
      const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
      const diffA = difficultyOrder[a.difficulty] || 2;
      const diffB = difficultyOrder[b.difficulty] || 2;
      return sortDirection === 'asc' ? diffA - diffB : diffB - diffA;
    } else if (sortBy === 'importance') {
      const impA = a.importanceLevel || 0;
      const impB = b.importanceLevel || 0;
      return sortDirection === 'asc' ? impA - impB : impB - impA;
    }
    return 0;
  });

  onMount(async () => {
    if ($user) {
      await loadData();
    } else {
      loading = false;
    }
  });

  const loadData = async () => {
    try {
      loading = true;
      error = '';
      
      // 데이터 동시에 로드
      const [materialsData, subjectsData] = await Promise.all([
        getUserStudyMaterials($user.uid),
        getUserSubjects($user.uid)
      ]);
      
      materials = materialsData;
      
      // 과목 ID를 키로 하는 객체로 변환
      subjects = subjectsData.reduce((acc, subject) => {
        acc[subject.id] = subject;
        return acc;
      }, {});
      
    } catch (err) {
      console.error('학습 자료 로딩 에러:', err);
      error = '학습 자료를 불러오는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.title.trim() || !newMaterial.content.trim() || !newMaterial.subjectId) {
      error = '제목, 내용, 과목을 모두 입력해주세요.';
      return;
    }

    try {
      loading = true;
      error = '';
      
      await addStudyMaterial($user.uid, newMaterial);
      
      // 폼 초기화
      newMaterial = {
        title: '',
        content: '',
        subjectId: subjects.length > 0 ? subjects[0].id : '',
        tags: [],
        importance: 3,
        difficultyLevel: 3
      };
      tagInput = '';
      
      showAddForm = false;
      
      // 목록 갱신
      await loadData();
    } catch (err) {
      console.error('학습 자료 추가 에러:', err);
      error = '학습 자료를 추가하는 중 오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !newMaterial.tags.includes(tagInput.trim())) {
      newMaterial.tags = [...newMaterial.tags, tagInput.trim()];
      tagInput = '';
    }
  };

  const removeTag = (tag) => {
    newMaterial.tags = newMaterial.tags.filter(t => t !== tag);
  };

  const viewMaterial = (material) => {
    selectedMaterial = material;
  };

  const closeDetail = () => {
    selectedMaterial = null;
  };

  // 특정 과목 이름 찾기
  const getSubjectName = (subjectId) => {
    const subject = subjects[subjectId];
    return subject ? subject.name : '알 수 없음';
  };

  // 과목 색상 찾기
  const getSubjectColor = (subjectId) => {
    const subject = subjects[subjectId];
    return subject ? subject.color : '#cccccc';
  };

  // 날짜 포맷팅
  const formatDate = (date) => {
    if (!date) return '';
    
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const toggleSortDirection = () => {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  };

  const setSortBy = (value) => {
    if (sortBy === value) {
      toggleSortDirection();
    } else {
      sortBy = value;
      // 날짜는 기본적으로 최신순(desc), 나머지는 오름차순(asc)
      sortDirection = value === 'date' ? 'desc' : 'asc';
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch(difficulty) {
      case 'easy': return '쉬움 😊';
      case 'medium': return '보통 🤔';
      case 'hard': return '어려움 😓';
      default: return '보통';
    }
  };

  const getNextReviewDate = (material) => {
    if (!material.reviewSchedule || material.reviewSchedule.length === 0) {
      return null;
    }
    
    // 예정된 복습 중 가장 빠른 날짜 찾기
    const pendingReviews = material.reviewSchedule.filter(r => r.status === 'pending');
    if (pendingReviews.length === 0) {
      return null;
    }
    
    return pendingReviews.reduce((earliest, review) => {
      const reviewDate = review.scheduledDate.toDate().getTime();
      return earliest === null || reviewDate < earliest.getTime() 
        ? review.scheduledDate.toDate() 
        : earliest;
    }, null);
  };

  const getReviewStatus = (material) => {
    if (!material.reviews || material.reviews.length === 0) {
      return { completed: 0, total: 0, rate: 0 };
    }
    
    const total = material.reviews.length;
    const completed = material.reviews.filter(r => r.status === 'completed').length;
    const rate = Math.round((completed / total) * 100);
    
    return { completed, total, rate };
  };

  // 현재 날짜 기준으로 일정이 된 복습인지 확인 (이전 복습도 모두 완료되어야 함)
  const isReviewDue = (scheduledDate, material, reviewIdx) => {
    // 날짜 체크 - 예정된 날짜가 오늘 이전이어야 함
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reviewDate = scheduledDate instanceof Date 
      ? new Date(scheduledDate) 
      : new Date(scheduledDate.toDate());
    
    reviewDate.setHours(0, 0, 0, 0);
    
    // 날짜 조건: 오늘이거나 이전 날짜인 경우
    const isDateDue = reviewDate <= today;
    
    if (!isDateDue) return false;
    
    // material이나 reviewIdx가 없으면 날짜 조건만 확인
    if (!material || reviewIdx === undefined) return true;
    
    // 실제 인덱스 확인 (review 객체에 reviewIndex가 있거나 전달된 인덱스 사용)
    const reviewIndex = typeof reviewIdx === 'number' ? reviewIdx : 
                       (material.reviews && material.reviews[reviewIdx] && material.reviews[reviewIdx].reviewIndex);
    
    // reviewIndex가 없으면 cycle-1로 추정
    const index = reviewIndex !== undefined ? reviewIndex : 
                 (material.reviews && material.reviews[reviewIdx] && material.reviews[reviewIdx].cycle 
                  ? material.reviews[reviewIdx].cycle - 1 : reviewIdx);
    
    // 첫 번째 복습(인덱스 0)은 이전 복습 체크 필요 없음
    if (index === 0) return true;
    
    // 이전 복습들이 모두 완료되었는지 확인
    for (let i = 0; i < index; i++) {
      if (material.reviews[i] && material.reviews[i].status !== 'completed') {
        return false; // 완료되지 않은 이전 복습이 있으면 불가능
      }
    }
    
    // 모든 조건 충족
    return true;
  };

  // 복습 일정이 지난 경우 확인 (오늘 제외)
  const isPastDue = (scheduledDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reviewDate = scheduledDate instanceof Date 
      ? new Date(scheduledDate) 
      : new Date(scheduledDate.toDate());
    
    reviewDate.setHours(0, 0, 0, 0);
    
    // 오늘보다 이전 날짜인 경우만 true
    return reviewDate < today;
  };

  // 복습 일정이 얼마나 지났는지 일수 계산
  const getDaysOverdue = (scheduledDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reviewDate = scheduledDate instanceof Date 
      ? new Date(scheduledDate) 
      : new Date(scheduledDate.toDate());
    
    reviewDate.setHours(0, 0, 0, 0);
    
    // 일수 차이 계산 (밀리초 → 일)
    const diffTime = Math.abs(today - reviewDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // 오늘 일정인지 확인
  const isToday = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const checkDate = date instanceof Date 
      ? new Date(date) 
      : new Date(date.toDate());
    
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate.getTime() === today.getTime();
  };

  // 달력 관련 함수
  const getCalendarDates = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // 달력에 표시할 날짜 배열 생성
    let dates = [];
    
    // 이전 달의 마지막 날짜들
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      dates.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        currentMonth: false
      });
    }
    
    // 현재 달의 날짜들
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push({
        date: new Date(year, month, i),
        currentMonth: true
      });
    }
    
    // 다음 달의 시작 날짜들 (달력을 6주로 맞추기)
    const remainingDays = 42 - dates.length; // 6주 x 7일 = 42
    for (let i = 1; i <= remainingDays; i++) {
      dates.push({
        date: new Date(year, month + 1, i),
        currentMonth: false
      });
    }
    
    return dates;
  };
  
  const prevMonth = () => {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
  };
  
  const nextMonth = () => {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  };
  
  // 특정 날짜에 복습할 모든 학습 자료 찾기
  const getAllReviewsOnDate = (date) => {
    const dateString = date.toDateString();
    const reviews = [];
    
    materials.forEach(material => {
      if (!material.reviews) return;
      
      material.reviews.forEach((review, index) => {
        const reviewDate = review.scheduledDate instanceof Date 
          ? review.scheduledDate 
          : review.scheduledDate.toDate();
        
        if (reviewDate.toDateString() === dateString) {
          reviews.push({
            materialId: material.id,
            materialTitle: material.title,
            reviewIndex: index + 1,
            status: review.status,
            scheduledDate: reviewDate,
            subjectId: material.subjectId
          });
        }
      });
    });
    
    return reviews;
  };
  
  const getMonthName = (month) => {
    const monthNames = [
      '1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월'
    ];
    return monthNames[month];
  };
  
  // 복습 항목 개수에 따른 배경색 계산
  const getReviewCountBgColor = (count) => {
    if (count === 0) return '';
    if (count === 1) return 'low-count';
    if (count <= 3) return 'medium-count';
    return 'high-count';
  };

  // 복습 평가 모달 열기
  const openReviewModal = (materialId, review) => {
    // 학습 자료 찾기
    const material = materials.find(m => m.id === materialId);
    if (!material) return;
    
    // 복습 인덱스 찾기
    const reviewIndex = review.reviewIndex !== undefined ? review.reviewIndex :
                       (review.cycle ? review.cycle - 1 : 
                       material.reviews.findIndex(r => r.reviewId === review.reviewId));
    
    // 복습 일정이 아직 안 된 경우 모달 열지 않음
    if (!isReviewDue(review.scheduledDate, material, reviewIndex)) {
      console.log('복습 불가:', { materialId, reviewId: review.reviewId, 이유: '이전 복습이 완료되지 않았거나 날짜가 아직 안됨' });
      return;
    }
    
    activeReview = {
      materialId,
      reviewId: review.reviewId,
      reviewIndex: reviewIndex,
      title: material?.title || '',
      scheduledDate: review.scheduledDate
    };
    
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
      await updateReviewStatus(activeReview.materialId, activeReview.reviewId, {
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
      await loadData();
    } catch (err) {
      console.error('복습 완료 처리 에러:', err);
      error = '복습을 완료하는 중 오류가 발생했습니다.';
    } finally {
      processingReviewId = null;
    }
  };
</script>

<div class="study-container">
  <div class="study-header">
    <h1>학습 자료</h1>
    <a href="/study/add" class="btn btn-primary add-button">
      <span class="btn-icon">+</span> 새 학습 자료 추가
    </a>
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
      <button class="btn btn-primary mt-3" on:click={loadData}>다시 시도</button>
    </div>
  {:else}
    <div class="filter-section card">
      <div class="filter-grid">
        <div class="filter-group">
          <label for="searchQuery">검색</label>
          <input 
            type="text" 
            id="searchQuery" 
            class="form-control" 
            placeholder="제목 또는 내용 검색" 
            bind:value={searchQuery}
          />
        </div>
        
        <div class="filter-group">
          <label for="subjectFilter">과목</label>
          <select id="subjectFilter" class="form-control" bind:value={selectedSubject}>
            <option value="all">모든 과목</option>
            {#each Object.values(subjects) as subject}
              <option value={subject.id}>{subject.name}</option>
            {/each}
          </select>
        </div>
        
        <div class="filter-group">
          <label for="difficultyFilter">난이도</label>
          <select id="difficultyFilter" class="form-control" bind:value={filterDifficulty}>
            <option value="all">모든 난이도</option>
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label for="sortBy">정렬</label>
          <div class="sort-controls">
            <select id="sortBy" class="form-control" bind:value={sortBy}>
              <option value="date">날짜</option>
              <option value="title">제목</option>
              <option value="difficulty">난이도</option>
              <option value="importance">중요도</option>
            </select>
            <button 
              class="btn btn-outline-secondary sort-direction" 
              on:click={toggleSortDirection}
              title={sortDirection === 'asc' ? '오름차순' : '내림차순'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
      
      {#if filteredMaterials.length > 0}
        <div class="filter-stats">
          {filteredMaterials.length}개의 항목 표시 중
          {#if filteredMaterials.length !== materials.length}
            <button class="btn btn-sm btn-link clear-filters" on:click={() => {
              selectedSubject = 'all';
              searchQuery = '';
              filterDifficulty = 'all';
            }}>
              필터 초기화
            </button>
          {/if}
        </div>
      {/if}
    </div>
    
    {#if filteredMaterials.length === 0}
      <div class="empty-state">
        {#if materials.length === 0}
          <div class="empty-icon">📚</div>
          <h3>등록된 학습 자료가 없습니다</h3>
          <p>새로운 학습 자료를 추가해보세요.</p>
          <a href="/study/add" class="btn btn-primary mt-3">학습 자료 추가하기</a>
        {:else}
          <div class="empty-icon">🔍</div>
          <h3>검색 결과가 없습니다</h3>
          <p>다른 검색어나 필터 조건을 시도해보세요.</p>
          <button 
            class="btn btn-primary mt-3" 
            on:click={() => {
              selectedSubject = 'all';
              searchQuery = '';
              filterDifficulty = 'all';
            }}
          >
            필터 초기화
          </button>
        {/if}
      </div>
    {:else}
      <div class="study-materials-grid">
        {#each filteredMaterials as material}
          <div 
            class="study-card card" 
            id={material.id === recentlyAddedId ? 'recently-added' : null}
            class:recently-added={material.id === recentlyAddedId}
          >
            <div class="card-content">
              <div class="material-header">
                <h2 class="material-title">
                  <a href="/study/{material.id}" class="title-link">{material.title}</a>
                </h2>
                {#if subjects[material.subjectId]}
                  <div class="subject-badge" style="background-color: {subjects[material.subjectId].color || 'var(--primary-color)'};">
                    {subjects[material.subjectId].name}
                  </div>
                {/if}
              </div>
              
              <div class="material-content">
                {#if material.content && material.content.length > 150}
                  {material.content.substring(0, 150)}...
                {:else}
                  {material.content}
                {/if}
              </div>
              
              <div class="material-meta">
                <div class="meta-item">
                  <span class="meta-icon">📅</span>
                  <span class="meta-value">{formatDate(material.dateStudied)}</span>
                </div>
                
                {#if material.difficulty}
                  <div class="meta-item">
                    <span class="meta-icon difficulty-icon">
                      {material.difficulty === 'easy' ? '😊' : material.difficulty === 'medium' ? '🤔' : '😓'}
                    </span>
                    <span class="meta-value difficulty-{material.difficulty}">
                      {getDifficultyLabel(material.difficulty)}
                    </span>
                  </div>
                {/if}
                
                {#if material.importanceLevel}
                  <div class="meta-item">
                    <span class="meta-icon">⭐</span>
                    <span class="meta-value">
                      <div class="importance-stars">
                        {#each Array(5) as _, i}
                          <span class="star {i < material.importanceLevel ? 'filled' : ''}">★</span>
                        {/each}
                      </div>
                    </span>
                  </div>
                {/if}
              </div>
              
              <div class="review-progress">
                {#if material.reviews && material.reviews.length > 0}
                  {@const status = getReviewStatus(material)}
                  <div class="progress-bar-container">
                    <div class="progress-label">
                      <span>복습 진행도</span>
                      <span>{status.completed}/{status.total} ({status.rate}%)</span>
                    </div>
                    <div class="progress-bar">
                      <div class="progress-value" style="width: {status.rate}%"></div>
                    </div>
                  </div>
                  
                  <div class="review-header">
                    <h4>복습 일정</h4>
                  </div>
                  
                  <div class="review-timeline">
                    {#each material.reviews as review, idx}
                      <div class="review-item {review.status === 'completed' ? 'completed' : isPastDue(review.scheduledDate) ? 'missed' : 'pending'}">
                        <div class="review-badge">{idx + 1}차</div>
                        <div class="review-date">{formatDate(review.scheduledDate)}</div>
                        <div class="review-status">
                          {#if review.status === 'completed'}
                            <button class="complete-btn completed" disabled>
                              완료됨
                            </button>
                          {:else}
                            <button 
                              class="complete-btn {isPastDue(review.scheduledDate) ? 'overdue' : ''}"
                              on:click={() => openReviewModal(material.id, review)}
                              disabled={!isReviewDue(review.scheduledDate, material, idx) || processingReviewId === review.reviewId}
                              title={!isReviewDue(review.scheduledDate, material, idx) ? '아직 복습 일정이 되지 않았습니다' : isPastDue(review.scheduledDate) ? '놓친 복습 완료하기' : '복습 완료하기'}
                            >
                              {#if processingReviewId === review.reviewId}
                                <span class="spinner small"></span>
                              {:else if !isReviewDue(review.scheduledDate, material, idx)}
                                예정
                              {:else if isPastDue(review.scheduledDate)}
                                놓친 복습
                              {:else}
                                평가
                              {/if}
                            </button>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
            
            <div class="card-actions">
              <a href="/study/{material.id}" class="btn btn-primary">상세 보기</a>
              <a href="/study/edit/{material.id}" class="btn btn-outline-secondary">수정</a>
            </div>
          </div>
        {/each}
      </div>
      
      <!-- 통합 달력 섹션 -->
      <div class="global-calendar-section">
        <div class="section-header">
          <h2>전체 복습 일정 달력</h2>
          <div class="calendar-navigation">
            <button class="calendar-nav-btn" on:click={prevMonth}>
              <i class="fas fa-chevron-left"></i> 이전
            </button>
            <div class="calendar-title">{getMonthName(currentMonth)} {currentYear}</div>
            <button class="calendar-nav-btn" on:click={nextMonth}>
              다음 <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
        
        <div class="master-calendar">
          <div class="calendar-weekdays">
            <div class="calendar-weekday sunday">일</div>
            <div class="calendar-weekday">월</div>
            <div class="calendar-weekday">화</div>
            <div class="calendar-weekday">수</div>
            <div class="calendar-weekday">목</div>
            <div class="calendar-weekday">금</div>
            <div class="calendar-weekday saturday">토</div>
          </div>
          
          <div class="calendar-body">
            {#each getCalendarDates(currentYear, currentMonth) as dateObj, i}
              {@const reviews = getAllReviewsOnDate(dateObj.date)}
              {@const reviewCount = reviews.length}
              <div 
                class="calendar-day {dateObj.currentMonth ? 'current-month' : 'other-month'} 
                       {isToday(dateObj.date) ? 'today' : ''} 
                       {getReviewCountBgColor(reviewCount)}
                       {i % 7 === 0 ? 'sunday' : ''} 
                       {i % 7 === 6 ? 'saturday' : ''}"
              >
                <div class="date-number">{dateObj.date.getDate()}</div>
                
                {#if reviewCount > 0}
                  <div class="date-review-counter">{reviewCount}개 복습</div>
                  <div class="date-reviews">
                    {#each reviews as review}
                      <div class="date-review-item" 
                           style="border-left-color: {subjects[review.subjectId]?.color || 'var(--primary-color)'};">
                        <div class="review-title" title="{review.materialTitle}">
                          {review.materialTitle.length > 15 ? review.materialTitle.substring(0, 15) + '...' : review.materialTitle}
                        </div>
                        <div class="review-info">
                          <span class="review-badge mini">{review.reviewIndex}차</span>
                          {#if review.status === 'completed'}
                            <span class="status-icon mini completed">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                              </svg>
                            </span>
                          {:else if isReviewDue(review.scheduledDate, materials.find(m => m.id === review.materialId), review.reviewIndex || review.cycle - 1)}
                            <button 
                              class="complete-btn mini {isPastDue(review.scheduledDate) ? 'overdue' : ''}"
                              on:click={() => openReviewModal(review.materialId, review)}
                              disabled={processingReviewId === review.reviewId}
                              title={isPastDue(review.scheduledDate) ? '놓친 복습 완료하기' : '복습 완료하기'}
                            >
                              {#if processingReviewId === review.reviewId}
                                <span class="spinner small"></span>
                              {:else if isPastDue(review.scheduledDate)}
                                놓친 복습
                              {:else}
                                평가
                              {/if}
                            </button>
                          {:else}
                            <span class="status-badge scheduled">예정</span>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
        
        <div class="calendar-legend">
          <div class="legend-title">복습 상태:</div>
          <div class="legend-item"><span class="legend-marker completed">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
          </span> 완료</div>
          <div class="legend-item"><span class="legend-marker missed">!</span> 놓친 복습</div>
          <div class="legend-item"><span class="legend-marker pending">·</span> 예정</div>
          
          <div class="legend-divider"></div>
          
          <div class="legend-title">복습 수:</div>
          <div class="legend-item"><span class="legend-box low-count"></span> 1개</div>
          <div class="legend-item"><span class="legend-box medium-count"></span> 2-3개</div>
          <div class="legend-item"><span class="legend-box high-count"></span> 4개 이상</div>
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
      <h3>복습 완료하기</h3>
      <button class="close-button" on:click={closeReviewModal}>&times;</button>
    </div>
    
    <div class="modal-body">
      <div class="modal-title">{activeReview.title}</div>
      
      {#if isPastDue(activeReview.scheduledDate)}
        <div class="alert alert-warning">
          <span class="overdue-icon">!</span>
          이 복습은 {getDaysOverdue(activeReview.scheduledDate)}일 지났습니다. 
          완료 시 다음 복습 일정도 그만큼 늦어집니다.
        </div>
      {/if}
      
      <div class="memory-rating">
        <div class="rating-title">얼마나 잘 기억했나요?</div>
        <div class="rating-scale">
          <button 
            class="rating-button {memoryRating === 1 ? 'selected' : ''}" 
            on:click={() => memoryRating = 1}
          >
            1<span class="rating-label">전혀 기억 안 남</span>
          </button>
          <button 
            class="rating-button {memoryRating === 2 ? 'selected' : ''}" 
            on:click={() => memoryRating = 2}
          >
            2<span class="rating-label">희미하게 기억</span>
          </button>
          <button 
            class="rating-button {memoryRating === 3 ? 'selected' : ''}" 
            on:click={() => memoryRating = 3}
          >
            3<span class="rating-label">부분적으로 기억</span>
          </button>
          <button 
            class="rating-button {memoryRating === 4 ? 'selected' : ''}" 
            on:click={() => memoryRating = 4}
          >
            4<span class="rating-label">대체로 기억</span>
          </button>
          <button 
            class="rating-button {memoryRating === 5 ? 'selected' : ''}" 
            on:click={() => memoryRating = 5}
          >
            5<span class="rating-label">완벽하게 기억</span>
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label for="reviewNote">복습 메모 (선택사항)</label>
        <textarea 
          id="reviewNote" 
          class="form-control review-note" 
          bind:value={reviewNote} 
          placeholder="복습하면서 메모하고 싶은 내용을 적어두세요"
        ></textarea>
      </div>
    </div>
    
    <div class="modal-footer">
      <button 
        class="btn btn-secondary" 
        on:click={closeReviewModal} 
        disabled={processingReviewId === activeReview.reviewId}
      >
        취소
      </button>
      <button 
        class="btn btn-primary" 
        on:click={completeReview} 
        disabled={processingReviewId === activeReview.reviewId}
      >
        {processingReviewId === activeReview.reviewId ? '처리 중...' : '복습 완료'}
      </button>
    </div>
  </div>
{/if}

<style>
  .study-container {
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: 3rem;
  }
  
  .study-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }
  
  h1 {
    margin: 0;
  }
  
  .add-button {
    white-space: nowrap;
  }
  
  .btn-icon {
    display: inline-block;
    margin-right: 0.5rem;
    font-weight: bold;
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
  
  .empty-icon, .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  .error-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    background-color: var(--danger-color);
    color: white;
    border-radius: 50%;
    font-weight: bold;
  }
  
  .filter-section {
    margin-bottom: 2rem;
    padding: 1.5rem;
  }
  
  .filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  }
  
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .filter-group label {
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .form-control {
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
    width: 100%;
  }
  
  .sort-controls {
    display: flex;
    gap: 0.5rem;
  }
  
  .sort-direction {
    padding: 0.5rem 0.75rem;
    font-weight: bold;
  }
  
  .filter-stats {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
    color: var(--secondary-color);
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .clear-filters {
    padding: 0;
    color: var(--primary-color);
    background: none;
    border: none;
    font-size: 0.9rem;
    text-decoration: underline;
  }
  
  .study-materials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .study-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    transition: transform 0.2s, box-shadow 0.2s;
    border: none;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  
  .study-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }
  
  .material-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .material-title {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.4;
  }
  
  .material-title a {
    color: var(--dark-color);
    text-decoration: none;
  }
  
  .material-title a:hover {
    color: var(--primary-color);
  }
  
  .subject-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 2rem;
    font-size: 0.75rem;
    white-space: nowrap;
    color: white;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }
  
  .material-content {
    color: var(--secondary-color);
    margin-bottom: 1.5rem;
    line-height: 1.5;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .material-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .meta-icon {
    font-size: 1.1rem;
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
  
  .review-progress {
    margin-top: 1rem;
  }
  
  .progress-bar-container {
    margin-bottom: 0.75rem;
  }
  
  .progress-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.25rem;
    font-size: 0.85rem;
    color: var(--secondary-color);
  }
  
  .progress-bar {
    height: 6px;
    background-color: #e9ecef;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .progress-value {
    height: 100%;
    background-color: var(--primary-color);
    border-radius: 3px;
  }
  
  .review-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .review-header h4 {
    margin: 0;
    font-size: 1rem;
  }
  
  .btn-sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
  
  /* 통합 달력 스타일 */
  .global-calendar-section {
    background-color: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
    padding: 2rem;
    margin-top: 2rem;
    overflow: hidden;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--dark-color);
    margin: 0;
  }
  
  .calendar-navigation {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .calendar-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--dark-color);
    min-width: 110px;
    text-align: center;
  }
  
  .calendar-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 80px;
    height: 36px;
    border-radius: 18px;
    border: none;
    background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
    color: white;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    padding: 0 12px;
  }
  
  .calendar-nav-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .master-calendar {
    background-color: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    margin-bottom: 1.5rem;
  }
  
  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }
  
  .calendar-weekday {
    text-align: center;
    padding: 0.75rem;
    font-weight: 600;
    font-size: 1rem;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  
  .calendar-weekday.sunday {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 700;
  }
  
  .calendar-weekday.saturday {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 700;
  }
  
  .calendar-body {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, minmax(110px, auto));
    background-color: #fafafa;
  }
  
  .calendar-day {
    position: relative;
    padding: 0.75rem;
    min-height: 110px;
    border-right: 1px solid #eaeaea;
    border-bottom: 1px solid #eaeaea;
    background-color: white;
    transition: all 0.2s;
  }
  
  .calendar-day:hover {
    background-color: #f8f9ff;
    z-index: 1;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
  }
  
  .calendar-day.other-month {
    background-color: #f7f7f7;
    color: #aaa;
  }
  
  .calendar-day.sunday .date-number {
    color: #e74c3c;
  }
  
  .calendar-day.saturday .date-number {
    color: #3498db;
  }
  
  .calendar-day.today {
    background-color: #f8fffd;
    box-shadow: inset 0 0 0 2px #4cd964;
  }
  
  .calendar-day.low-count {
    background-color: rgba(173, 216, 230, 0.2);
  }
  
  .calendar-day.medium-count {
    background-color: rgba(102, 204, 255, 0.2);
  }
  
  .calendar-day.high-count {
    background-color: rgba(51, 102, 255, 0.2);
  }
  
  .date-number {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: inline-block;
    width: 28px;
    height: 28px;
    line-height: 28px;
    text-align: center;
    border-radius: 50%;
    transition: all 0.2s;
  }
  
  .calendar-day:hover .date-number {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  .today .date-number {
    background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%);
    color: white;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    transform: scale(1.1);
  }
  
  .date-review-counter {
    font-size: 0.75rem;
    color: #666;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
  
  .date-reviews {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 160px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }
  
  .date-reviews::-webkit-scrollbar {
    width: 4px;
  }
  
  .date-reviews::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }
  
  .date-review-item {
    background-color: white;
    padding: 0.5rem;
    border-radius: 6px;
    font-size: 0.8rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
    border-left: 3px solid var(--primary-color);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: all 0.2s;
  }
  
  .date-review-item:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
  }
  
  .review-title {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .review-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .review-badge.mini {
    font-size: 0.7rem;
    padding: 0.15rem 0.35rem;
    background-color: var(--primary-color);
    color: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .status-icon.mini {
    font-size: 0.8rem;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background-color: #4cd964;
    color: white;
    box-shadow: 0 1px 3px rgba(76, 217, 100, 0.4);
  }
  
  .review-timeline {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .review-item {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    transition: background-color 0.2s;
  }
  
  .review-item.completed {
    background-color: rgba(40, 167, 69, 0.1);
  }
  
  .review-item.missed {
    background-color: rgba(220, 53, 69, 0.1);
  }
  
  .review-item.pending {
    background-color: rgba(122, 186, 255, 0.1);
    border-left: 3px solid #3b82f6;
  }
  
  .review-badge {
    background-color: var(--primary-color);
    color: white;
    padding: 0.1rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.7rem;
    margin-right: 0.75rem;
    white-space: nowrap;
  }
  
  .review-date {
    flex: 1;
    font-size: 0.85rem;
    color: var(--info-color);
  }
  
  /* 복습 완료 버튼 스타일 */
  .complete-btn {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .complete-btn:hover {
    background-color: var(--primary-dark-color);
  }
  
  .complete-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .complete-btn.completed {
    background-color: var(--success-color);
  }
  
  .complete-btn.overdue {
    background-color: var(--danger-color);
    color: white;
  }
  
  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
  }
  
  .spinner.small {
    width: 8px;
    height: 8px;
    border-width: 1px;
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
  
  /* 개선된 카드 스타일 */
  .study-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    transition: transform 0.2s, box-shadow 0.2s;
    border: none;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  
  .study-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }
  
  .card-actions {
    display: flex;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border-color, #e9ecef);
    background-color: rgba(248, 249, 250, 0.5);
  }
  
  .review-timeline {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
  
  .review-item {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    transition: background-color 0.2s;
  }
  
  .review-item.completed {
    background-color: rgba(40, 167, 69, 0.1);
  }
  
  .review-item.missed {
    background-color: rgba(220, 53, 69, 0.1);
  }
  
  .review-item.pending {
    background-color: rgba(122, 186, 255, 0.1);
    border-left: 3px solid #3b82f6;
  }
  
  .review-badge {
    background-color: var(--primary-color);
    color: white;
    padding: 0.1rem 0.5rem;
    border-radius: 1rem;
    font-size: 0.7rem;
    margin-right: 0.75rem;
    white-space: nowrap;
  }
  
  .review-date {
    flex: 1;
    font-size: 0.85rem;
    color: var(--info-color);
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
  
  .close-button {
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
  
  .modal-title {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    color: #495057;
  }
  
  .memory-rating {
    margin-bottom: 1.5rem;
  }
  
  .rating-title {
    margin-bottom: 0.5rem;
    font-size: 1rem;
    color: #343a40;
  }
  
  .rating-scale {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .rating-button {
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
  
  .rating-button:hover {
    background-color: #f8f9fa;
    border-color: #adb5bd;
  }
  
  .rating-button.selected {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }
  
  .rating-label {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.85rem;
    color: #6c757d;
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .review-note {
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
  
  /* 예정된 복습 스타일 */
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    text-align: center;
    min-width: 40px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .status-badge.scheduled {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    color: white;
    box-shadow: 0 1px 3px rgba(139, 92, 246, 0.3);
  }
  
  /* 반응형 조정 */
  @media (max-width: 576px) {
    .review-modal {
      width: 95%;
    }
    
    .rating-button {
      width: 40px;
      height: 40px;
      font-size: 0.9rem;
    }
  }
  
  .calendar-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: linear-gradient(to right, #ffffff, #f8f9fa);
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }
  
  .legend-title {
    font-weight: 700;
    font-size: 0.85rem;
    color: #444;
    margin-right: 0.5rem;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: #555;
    background-color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.03);
    transition: all 0.2s;
  }
  
  .legend-item:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
  
  .legend-marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    line-height: 24px;
    text-align: center;
    border-radius: 50%;
    font-weight: bold;
  }
  
  .legend-marker.completed {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    color: white;
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
  }
  
  .legend-marker.missed {
    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
    color: white;
    box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
  }
  
  .legend-marker.pending {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
  }
  
  .legend-box {
    display: inline-block;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .legend-box.low-count {
    background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%);
  }
  
  .legend-box.medium-count {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
  }
  
  .legend-box.high-count {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  }
  
  .legend-divider {
    height: 30px;
    width: 1px;
    background: linear-gradient(to bottom, transparent, #ccc, transparent);
    margin: 0 0.5rem;
  }
  
  .status-icon.completed {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    color: white;
    border-radius: 50%;
    font-weight: bold;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
  }
  
  .status-icon.mini.completed {
    width: 20px;
    height: 20px;
    font-size: 0.8rem;
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    box-shadow: 0 1px 3px rgba(16, 185, 129, 0.4);
  }
  
  .overdue {
    color: var(--danger-color);
    font-weight: 600;
  }
  
  .overdue-icon {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 1.2rem;
    height: 1.2rem;
    background-color: var(--danger-color);
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 700;
    margin-right: 0.25rem;
  }
  
  .alert {
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    border-radius: 0.375rem;
    font-size: 0.9rem;
  }
  
  .alert-warning {
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
  }
</style> 