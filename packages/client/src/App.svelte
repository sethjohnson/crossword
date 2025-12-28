<script lang="ts">
  import { VERSION, parseIPUZ } from '@crossword/shared';
  import CrosswordGrid from './components/CrosswordGrid.svelte';
  import ClueList from './components/ClueList.svelte';
  import CompletionModal from './components/CompletionModal.svelte';
  import { puzzleStore, isComplete } from './stores/puzzleStore';
  import samplePuzzleData from './assets/puzzle.json';

  // Parse the sample puzzle
  const puzzle = parseIPUZ(samplePuzzleData);

  // Track if completion modal was shown (so we only show once)
  let completionShown = false;
  let showCompletion = false;

  // Watch for completion
  $: if ($isComplete && !completionShown) {
    showCompletion = true;
    completionShown = true;
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
</script>

<section class="hero is-primary">
  <div class="hero-body">
    <div class="container">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <div>
              <h1 class="title">🧩 Crossword</h1>
              <h2 class="subtitle">
                {puzzle.title || 'Untitled Puzzle'} <span class="tag is-dark ml-2">v{VERSION}</span>
              </h2>
              <p class="is-size-7">By {puzzle.author || 'Unknown'}</p>
            </div>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <div class="buttons">
              <button class="button is-warning" on:click={handleCheck}> ✓ Check </button>
              <button class="button is-danger is-light" on:click={handleReveal}> 👁 Reveal </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="columns is-desktop">
      <!-- Grid Column -->
      <div class="column is-two-thirds-desktop">
        <div class="box">
          <CrosswordGrid {puzzle} />
        </div>
      </div>

      <!-- Clues Column -->
      <div class="column is-one-third-desktop">
        <div class="box">
          <ClueList clues={puzzle.clues} />
        </div>
      </div>
    </div>
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
