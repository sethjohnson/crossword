<script lang="ts">
  import { isConnected, playerCountText } from '../lib/socket';
</script>

{#if $playerCountText}
  <span class="player-badge" class:is-connected={$isConnected}>
    <span class="icon">
      <i class="fas fa-users"></i>
    </span>
    <span>{$playerCountText}</span>
  </span>
{/if}

<style>
  .player-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 1rem;
    font-size: 0.875rem;
    color: white;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .player-badge.is-connected {
    opacity: 1;
  }

  .icon {
    font-size: 0.75rem;
  }
</style>
