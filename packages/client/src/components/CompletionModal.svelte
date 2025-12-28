<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show = false;

  const dispatch = createEventDispatcher();

  function handleClose() {
    dispatch('close');
  }
</script>

{#if show}
  <div class="modal is-active">
    <div class="modal-background" on:click={handleClose} on:keydown={handleClose}></div>
    <div class="modal-content">
      <div class="box has-text-centered">
        <h2 class="title is-2">🎉 Congratulations!</h2>
        <p class="subtitle is-4">You completed the puzzle!</p>
        <button class="button is-success is-medium mt-4" on:click={handleClose}> Close </button>
      </div>
    </div>
    <button class="modal-close is-large" aria-label="close" on:click={handleClose}></button>
  </div>
{/if}

<style>
  .box {
    padding: 3rem;
    border-radius: 8px;
  }

  .title {
    margin-bottom: 1rem;
  }
</style>
