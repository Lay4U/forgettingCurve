<script>
  import { user } from '$lib/stores/authStore';
</script>

<div class="home-container">
  <section class="hero">
    <div class="hero-content">
      <h1>에빙하우스의 망각 곡선으로 학습을 효율적으로!</h1>
      <p>
        망각 곡선 기반의 학습 도우미로 학습 내용을 오래 기억하세요.
        과학적인 복습 일정을 자동으로 생성하고, 복습을 체계적으로 관리할 수 있습니다.
      </p>
      
      {#if $user}
        <a href="/dashboard" class="btn btn-primary">대시보드로 이동</a>
      {:else}
        <div class="hero-buttons">
          <a href="/register" class="btn btn-primary">회원가입</a>
          <a href="/login" class="btn btn-secondary">로그인</a>
        </div>
      {/if}
    </div>
  </section>
  
  <section class="features">
    <h2 class="section-title">주요 기능</h2>
    
    <div class="feature-grid grid">
      <div class="feature-card card">
        <div class="card-body">
          <h3>망각 곡선 기반 학습</h3>
          <p>
            에빙하우스의 망각 곡선 이론을 기반으로 최적의 복습 일정을 자동으로 생성합니다.
            학습 내용을 등록하면 최적의 복습 시점을 알려드립니다.
          </p>
        </div>
      </div>
      
      <div class="feature-card card">
        <div class="card-body">
          <h3>체계적인 복습 관리</h3>
          <p>
            복습 일정을 체계적으로 관리하고, 복습 완료 여부를 체크할 수 있습니다.
            오늘의 복습 항목을 한눈에 확인하고 진행 상황을 추적할 수 있습니다.
          </p>
        </div>
      </div>
      
      <div class="feature-card card">
        <div class="card-body">
          <h3>과목별 관리</h3>
          <p>
            다양한 과목/분야별로 학습 내용을 분류하고 관리할 수 있습니다.
            과목마다 다른 복습 주기를 설정할 수도 있습니다.
          </p>
        </div>
      </div>
    </div>
  </section>
  
  <section class="how-it-works">
    <h2 class="section-title">사용 방법</h2>
    
    <div class="steps">
      <div class="step">
        <div class="step-number">1</div>
        <div class="step-content">
          <h3>학습 내용 등록</h3>
          <p>공부한 내용, 배운 내용을 간단히 등록합니다.</p>
        </div>
      </div>
      
      <div class="step">
        <div class="step-number">2</div>
        <div class="step-content">
          <h3>자동 복습 일정 생성</h3>
          <p>망각 곡선을 기반으로 최적의 복습 일정이 자동으로 생성됩니다.</p>
        </div>
      </div>
      
      <div class="step">
        <div class="step-number">3</div>
        <div class="step-content">
          <h3>알림 확인 및 복습</h3>
          <p>복습 시점에 알림을 받고, 내용을 복습합니다.</p>
        </div>
      </div>
      
      <div class="step">
        <div class="step-number">4</div>
        <div class="step-content">
          <h3>복습 완료 체크</h3>
          <p>복습을 완료한 후 체크하여 학습 진행 상황을 추적합니다.</p>
        </div>
      </div>
    </div>
  </section>
  
  <section class="cta">
    <div class="cta-content">
      <h2>지금 시작하세요!</h2>
      <p>과학적인 학습 방법으로 더 효율적으로 학습하고 더 오래 기억하세요.</p>
      
      {#if $user}
        <a href="/dashboard" class="btn btn-primary">대시보드로 이동</a>
      {:else}
        <a href="/register" class="btn btn-primary">무료로 시작하기</a>
      {/if}
    </div>
  </section>
</div>

<style>
  .home-container {
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .hero {
    padding: 3rem 1rem;
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .hero h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  
  .hero p {
    font-size: 1.2rem;
    max-width: 800px;
    margin: 0 auto 2rem;
  }
  
  .hero-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  .section-title {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  
  .features, .how-it-works {
    padding: 3rem 1rem;
  }
  
  .feature-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
  }
  
  .feature-card {
    height: 100%;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  
  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  .steps {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .step {
    display: flex;
    margin-bottom: 2rem;
    align-items: flex-start;
  }
  
  .step-number {
    background-color: var(--primary-color);
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 1.5rem;
    flex-shrink: 0;
  }
  
  .cta {
    background-color: var(--light-color);
    padding: 3rem 1rem;
    text-align: center;
    border-radius: 0.5rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
  }
  
  .cta h2 {
    margin-bottom: 1rem;
  }
  
  .cta p {
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
</style>
