<script lang="ts">
  import { VERSION, parseIPUZ } from '@crossword/shared';
  import CrosswordGrid from './components/CrosswordGrid.svelte';
  import ClueList from './components/ClueList.svelte';
  import samplePuzzleData from './assets/puzzle.json';

  // Parse the sample puzzle
  const puzzle = parseIPUZ(samplePuzzleData);
</script>

<section class="hero is-primary">
  <div class="hero-body">
    <div class="container">
      <h1 class="title">🧩 Crossword</h1>
      <h2 class="subtitle">
        {puzzle.title || 'Untitled Puzzle'} <span class="tag is-dark ml-2">v{VERSION}</span>
      </h2>
      <p class="is-size-7">By {puzzle.author || 'Unknown'}</p>
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

<style>
  /* Additional global styles if needed */
</style>
