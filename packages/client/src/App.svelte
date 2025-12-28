<script lang="ts">
  import { onDestroy } from 'svelte';
  import { VERSION, parseIPUZ, type CrosswordPuzzle } from '@crossword/shared';
  import CrosswordGrid from './components/CrosswordGrid.svelte';
  import ClueList from './components/ClueList.svelte';
  import CompletionModal from './components/CompletionModal.svelte';
  import UploadZone from './components/UploadZone.svelte';
  import PlayerBadge from './components/PlayerBadge.svelte';
  import { puzzleStore, isComplete } from './stores/puzzleStore';
  import { router } from './lib/router';
  import { connectToRoom, disconnect, onRemoteCellChange } from './lib/socket';

  // State
  let puzzle: CrosswordPuzzle | null = null;
  let isLoading = false;
  let error = '';
  let completionShown = false;
  let showCompletion = false;
  let gameState: Record<string, { value: string; playerId: string }> | null = null;

  // Watch for route changes
  $: if ($router.puzzleId) {
    loadPuzzle($router.puzzleId);
    connectToRoom($router.puzzleId);
    // Wire up remote cell changes to puzzleStore
    onRemoteCellChange((row, col, value, _playerId) => {
      puzzleStore.applyRemoteChange(row, col, value);
    });
  } else {
    puzzle = null;
    disconnect();
  }

  // Cleanup on destroy
  onDestroy(() => {
    disconnect();
  });

  // Watch for completion
  $: if ($isComplete && !completionShown && puzzle) {
    showCompletion = true;
    completionShown = true;
  }

  async function loadPuzzle(id: string) {
    isLoading = true;
    error = '';
    puzzle = null;
    gameState = null;
    completionShown = false;

    try {
      const response = await fetch(`/api/puzzle/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Puzzle not found');
        }
        throw new Error('Failed to load puzzle');
      }

      const data = await response.json();
      // Extract gameState from response
      const { gameState: gs, ...puzzleData } = data;
      puzzle = puzzleData as CrosswordPuzzle;
      gameState = gs?.grid || null;
    } catch (e: any) {
      error = e.message || 'Failed to load puzzle';
    } finally {
      isLoading = false;
    }
  }

  function handleUploadSuccess(id: string) {
    router.navigate(`puzzle/${id}`);
  }

  function handleCheck() {
    puzzleStore.checkPuzzle();
  }

  function handleReveal() {
    if (confirm('Are you sure you want to reveal the solution? This will show all answers.')) {
      puzzleStore.revealPuzzle();
    }
  }

  function handleCloseCompletion() {
    showCompletion = false;
  }

  function goToUpload() {
    router.navigate('');
  }
</script>

<section class="hero is-primary">
  <div class="hero-body">
    <div class="container">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <div>
              <h1 class="title">🧩 Crossword</h1>
              {#if puzzle}
                <h2 class="subtitle">
                  {puzzle.title || 'Untitled Puzzle'}
                  <span class="tag is-dark ml-2">v{VERSION}</span>
                </h2>
                <p class="is-size-7">By {puzzle.author || 'Unknown'}</p>
              {:else}
                <h2 class="subtitle">
                  Play Together <span class="tag is-dark ml-2">v{VERSION}</span>
                </h2>
              {/if}
            </div>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <PlayerBadge />
            <div class="buttons">
              {#if puzzle}
                <button class="button is-warning" on:click={handleCheck}> ✓ Check </button>
                <button class="button is-danger is-light" on:click={handleReveal}>
                  👁 Reveal
                </button>
                <button class="button is-light" on:click={goToUpload}> 📤 New Puzzle </button>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    {#if isLoading}
      <div class="has-text-centered py-6">
        <span class="icon is-large">
          <i class="fas fa-spinner fa-spin fa-3x"></i>
        </span>
        <p class="mt-4 is-size-5">Loading puzzle...</p>
      </div>
    {:else if error}
      <div class="notification is-danger">
        <strong>Error:</strong>
        {error}
        <button class="button is-small is-light ml-4" on:click={goToUpload}> Go Back </button>
      </div>
    {:else if puzzle}
      <div class="columns is-desktop">
        <!-- Grid Column -->
        <div class="column is-two-thirds-desktop">
          <div class="box">
            <CrosswordGrid {puzzle} initialGrid={gameState ?? undefined} />
          </div>
        </div>

        <!-- Clues Column -->
        <div class="column is-one-third-desktop">
          <div class="box">
            <ClueList clues={puzzle.clues} />
          </div>
        </div>
      </div>
    {:else}
      <!-- Upload View -->
      <div class="columns is-centered">
        <div class="column is-half">
          <div class="box">
            <h2 class="title is-4 has-text-centered mb-5">Upload a Puzzle</h2>
            <UploadZone onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      </div>
    {/if}
  </div>
</section>

<CompletionModal show={showCompletion} on:close={handleCloseCompletion} />

<style>
  .hero-body {
    padding-bottom: 1.5rem;
  }

  .buttons {
    margin-bottom: 0;
  }
</style>
