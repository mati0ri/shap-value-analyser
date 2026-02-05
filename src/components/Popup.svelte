<script>
    import { store } from "../rune/store.svelte";
    import { csvToArray } from "../functions/csvParser";

    let files = $state({
        x: null,
        y: null,
        sv: null,
    });

    let dragging = $state({
        x: false,
        y: false,
        sv: false,
    });

    let isValidating = $state(false);
    let errorMessage = $state(null);

    function handleKeydown(e) {
        if (e.key === "Escape") {
            store.isUploadPopupOpen = false;
        }
    }

    function handleDragOver(e, type) {
        e.preventDefault();
        dragging[type] = true;
    }

    function handleDragLeave(e, type) {
        e.preventDefault();
        dragging[type] = false;
    }

    function handleDrop(e, type) {
        e.preventDefault();
        dragging[type] = false;
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            files[type] = droppedFiles[0];
        }
    }

    function handleFileChange(e, type) {
        const selectedFiles = e.target.files;
        if (selectedFiles.length > 0) {
            files[type] = selectedFiles[0];
        }
    }

    async function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    async function handleValidate() {
        if (!files.x || !files.y || !files.sv) return;

        isValidating = true;
        errorMessage = null;

        try {
            const [xText, yText, svText] = await Promise.all([
                readFile(files.x),
                readFile(files.y),
                readFile(files.sv),
            ]);

            const x = csvToArray(xText);
            const y = csvToArray(yText);
            const sv = csvToArray(svText);

            // Basic validation
            if (x.length === 0 || y.length === 0 || sv.length === 0) {
                throw new Error("One or more files are empty or invalid CSV.");
            }

            if (x.length !== y.length || x.length !== sv.length) {
                throw new Error("Row counts do not match between files.");
            }

            store.initialize({ x, y, sv });
            store.isUploadPopupOpen = false;
        } catch (err) {
            console.error(err);
            errorMessage =
                err.message || "An error occurred during processing.";
        } finally {
            isValidating = false;
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="backdrop" onclick={() => (store.isUploadPopupOpen = false)}>
    <div class="popup-container" onclick={(e) => e.stopPropagation()}>
        <button
            class="close-btn"
            onclick={() => (store.isUploadPopupOpen = false)}
            aria-label="Close"
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M14 1.41L12.59 0L7 5.59L1.41 0L0 1.41L5.59 7L0 12.59L1.41 14L7 8.41L12.59 14L14 12.59L8.41 7L14 1.41Z"
                    fill="currentColor"
                />
            </svg>
        </button>

        <div class="popup-content">
            <h2>Upload Dataset</h2>
            <p class="subtitle">
                Please upload your dataset files (CSV format).
            </p>

            <div class="upload-grid">
                <!-- X Input -->
                <div class="upload-zone">
                    <label>Features (x.csv)</label>
                    <div
                        class="drop-area"
                        class:dragging={dragging.x}
                        class:filled={files.x}
                        ondragover={(e) => handleDragOver(e, "x")}
                        ondragleave={(e) => handleDragLeave(e, "x")}
                        ondrop={(e) => handleDrop(e, "x")}
                        role="button"
                        tabindex="0"
                        onclick={() =>
                            document.getElementById("input-x").click()}
                        onkeydown={(e) =>
                            e.key === "Enter" &&
                            document.getElementById("input-x").click()}
                    >
                        <input
                            type="file"
                            id="input-x"
                            accept=".csv"
                            hidden
                            onchange={(e) => handleFileChange(e, "x")}
                        />
                        <div class="drop-content">
                            {#if files.x}
                                <img
                                    src="/icones/check.svg"
                                    alt="checked"
                                    class="icon-large success"
                                />
                                <span class="filename">{files.x.name}</span>
                            {:else}
                                <img
                                    src="/icones/upload.svg"
                                    alt="upload"
                                    class="icon-large"
                                />
                                <span>Drag & Drop or Click</span>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Y Input -->
                <div class="upload-zone">
                    <label>Target (y.csv)</label>
                    <div
                        class="drop-area"
                        class:dragging={dragging.y}
                        class:filled={files.y}
                        ondragover={(e) => handleDragOver(e, "y")}
                        ondragleave={(e) => handleDragLeave(e, "y")}
                        ondrop={(e) => handleDrop(e, "y")}
                        role="button"
                        tabindex="0"
                        onclick={() =>
                            document.getElementById("input-y").click()}
                        onkeydown={(e) =>
                            e.key === "Enter" &&
                            document.getElementById("input-y").click()}
                    >
                        <input
                            type="file"
                            id="input-y"
                            accept=".csv"
                            hidden
                            onchange={(e) => handleFileChange(e, "y")}
                        />
                        <div class="drop-content">
                            {#if files.y}
                                <img
                                    src="/icones/check.svg"
                                    alt="checked"
                                    class="icon-large success"
                                />
                                <span class="filename">{files.y.name}</span>
                            {:else}
                                <img
                                    src="/icones/upload.svg"
                                    alt="upload"
                                    class="icon-large"
                                />
                                <span>Drag & Drop or Click</span>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- SV Input -->
                <div class="upload-zone">
                    <label>SHAP Values (sv.csv)</label>
                    <div
                        class="drop-area"
                        class:dragging={dragging.sv}
                        class:filled={files.sv}
                        ondragover={(e) => handleDragOver(e, "sv")}
                        ondragleave={(e) => handleDragLeave(e, "sv")}
                        ondrop={(e) => handleDrop(e, "sv")}
                        role="button"
                        tabindex="0"
                        onclick={() =>
                            document.getElementById("input-sv").click()}
                        onkeydown={(e) =>
                            e.key === "Enter" &&
                            document.getElementById("input-sv").click()}
                    >
                        <input
                            type="file"
                            id="input-sv"
                            accept=".csv"
                            hidden
                            onchange={(e) => handleFileChange(e, "sv")}
                        />
                        <div class="drop-content">
                            {#if files.sv}
                                <img
                                    src="/icones/check.svg"
                                    alt="checked"
                                    class="icon-large success"
                                />
                                <span class="filename">{files.sv.name}</span>
                            {:else}
                                <img
                                    src="/icones/upload.svg"
                                    alt="upload"
                                    class="icon-large"
                                />
                                <span>Drag & Drop or Click</span>
                            {/if}
                        </div>
                    </div>
                </div>
            </div>

            {#if errorMessage}
                <div class="error-message">{errorMessage}</div>
            {/if}

            <div class="actions">
                <button
                    class="btn-primary"
                    disabled={!files.x || !files.y || !files.sv || isValidating}
                    onclick={handleValidate}
                >
                    {#if isValidating}
                        Processing...
                    {:else}
                        Validate & Analyze
                    {/if}
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .popup-container {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
        width: 600px;
        max-width: 90%;
        position: relative;
        padding: 32px;
        animation: scaleIn 0.2s ease-out;
    }

    @keyframes scaleIn {
        from {
            transform: scale(0.95);
            opacity: 0;
        }
        to {
            transform: scale(1);
            opacity: 1;
        }
    }

    .close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: #605e5c;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
            background-color 0.2s,
            color 0.2s;
    }

    .close-btn:hover {
        background-color: #f3f2f1;
        color: #201f1e;
    }

    h2 {
        margin-top: 0;
        margin-bottom: 8px;
        font-size: 20px;
        color: #201f1e;
        font-weight: 600;
    }

    .subtitle {
        margin: 0 0 24px 0;
        color: #605e5c;
        font-size: 14px;
    }

    .upload-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
    }

    .upload-zone {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .upload-zone label {
        font-size: 12px;
        font-weight: 600;
        color: #323130;
    }

    .drop-area {
        border: 2px dashed #c8c6c4;
        border-radius: 4px;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        background-color: #faf9f8;
    }

    .drop-area:hover {
        background-color: #f3f2f1;
        border-color: #8a8886;
    }

    .drop-area.dragging {
        background-color: #eff6fc;
        border-color: var(--primary-color, #0078d4);
    }

    .drop-area.filled {
        background-color: #f0fdf4;
        border-color: #22c55e;
        border-style: solid;
    }

    .drop-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        text-align: center;
        padding: 8px;
        pointer-events: none;
    }

    .drop-content span {
        font-size: 12px;
        color: #605e5c;
    }

    .drop-content .filename {
        font-weight: 500;
        color: #201f1e;
        word-break: break-all;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }

    .icon-large {
        width: 24px;
        height: 24px;
        opacity: 0.6;
    }

    .icon-large.success {
        opacity: 1;
        /* color: #22c55e; handled by svg fill usually, direct img src might need filter if not colored */
    }

    .actions {
        display: flex;
        justify-content: flex-end;
    }

    .btn-primary {
        background-color: var(--primary-color, #0078d4);
        color: white;
        border: none;
        padding: 8px 24px;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }

    .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        background-color: #c8c6c4;
    }

    .btn-primary:hover:not(:disabled) {
        opacity: 0.9;
    }

    .error-message {
        color: #a4262c;
        background-color: #fde7e9;
        padding: 8px;
        border-radius: 4px;
        font-size: 13px;
        margin-bottom: 16px;
    }
</style>
