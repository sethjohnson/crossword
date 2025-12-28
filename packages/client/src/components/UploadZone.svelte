<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';

  export let onUploadSuccess: (id: string) => void = () => {};

  let isDragging = false;
  let isUploading = false;
  let errorMessage = '';
  let fileInput: HTMLInputElement;

  const dispatch = createEventDispatcher();

  async function handleFile(file: File) {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.ipuz') && !file.name.endsWith('.json')) {
      errorMessage = 'Please upload a .ipuz or .json file';
      return;
    }

    isUploading = true;
    errorMessage = '';

    try {
      const formData = new FormData();
      formData.append('puzzle', file);

      const response = await fetch('/api/puzzle', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Success - navigate to puzzle
      onUploadSuccess(data.id);
    } catch (e: any) {
      errorMessage = e.message || 'Upload failed';
    } finally {
      isUploading = false;
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) handleFile(file);
  }

  function openFilePicker() {
    fileInput?.click();
  }
</script>

<div
  class="upload-zone"
  class:is-dragging={isDragging}
  class:is-uploading={isUploading}
  on:drop={handleDrop}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  role="button"
  tabindex="0"
  on:click={openFilePicker}
  on:keydown={(e) => e.key === 'Enter' && openFilePicker()}
>
  <input
    type="file"
    accept=".ipuz,.json"
    bind:this={fileInput}
    on:change={handleFileSelect}
    hidden
  />

  {#if isUploading}
    <div class="content">
      <span class="icon is-large">
        <i class="fas fa-spinner fa-spin fa-2x"></i>
      </span>
      <p class="mt-3">Uploading puzzle...</p>
    </div>
  {:else}
    <div class="content">
      <span class="icon is-large">
        <i class="fas fa-cloud-upload-alt fa-3x"></i>
      </span>
      <p class="mt-3 is-size-5">Drop an iPUZ file here</p>
      <p class="is-size-7 has-text-grey">or click to browse</p>
    </div>
  {/if}

  {#if errorMessage}
    <p class="has-text-danger mt-3">{errorMessage}</p>
  {/if}
</div>

<style>
  .upload-zone {
    border: 3px dashed #ccc;
    border-radius: 12px;
    padding: 4rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: #fafafa;
  }

  .upload-zone:hover,
  .upload-zone.is-dragging {
    border-color: #3273dc;
    background-color: #f0f7ff;
  }

  .upload-zone.is-uploading {
    pointer-events: none;
    opacity: 0.7;
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .icon {
    color: #3273dc;
  }
</style>
