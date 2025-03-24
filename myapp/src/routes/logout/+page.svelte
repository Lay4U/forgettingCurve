<script>
  import { onMount } from 'svelte';
  import { signOut } from '$lib/services/authService';
  import { goto } from '$app/navigation';

  onMount(async () => {
    try {
      await signOut();
      goto('/');
    } catch (error) {
      console.error('로그아웃 에러:', error);
      goto('/');
    }
  });
</script>

<div class="container text-center py-5">
  <h2>로그아웃 중...</h2>
  <p>잠시만 기다려주세요.</p>
</div> 