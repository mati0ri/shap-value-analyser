<script>
    import { store } from "../rune/store.svelte";
    import { create_data } from "../functions/create_data";

    $inspect(store.filtered_graph_data)

    function handleMerge() {
        const selected = store.selectedFeatures;

        if (selected.length === 0) {
            console.log("Aucune feature sélectionnée.");
            return;
        }

        const uniqueSelected = [...new Set(selected)];

        const sortedSelected = [...uniqueSelected].sort();

        const alreadyExists = store.merges.some(
            (m) =>
                m.length === sortedSelected.length &&
                [...m].sort().every((v, i) => v === sortedSelected[i])
        );

        if (alreadyExists) {
            console.log("Cette combinaison existe déjà.");
            return;
        }

        store.merges = [...store.merges, sortedSelected];

        create_data([sortedSelected]);

        store.selectedFeatures = [];

        console.log("Merge ajouté !");
    }

    function unselectAllFeatures() {
        store.selectedFeatures = [];
    }
</script>

<div class="footer">
    {#if store.selectedFeatures.length > 1}
        <div>
            <button class="merge" on:click={handleMerge}>
                <img src="/icones/merge.svg" alt="merge" class="icon" />
                Merge {store.selectedFeatures.length} features
            </button>
        </div>
        <div>
            <button class="unselect" on:click={unselectAllFeatures}>
                <img src="/icones/unselect.svg" alt="unselect" class="icon" />
                Unselect all
            </button>
        </div>
    {:else}
        <p>Select 2 features or more to start merging</p>
    {/if}
</div>

<style>
    .footer {
        height: 100px;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 30px;
    }

    button.merge {
        background-color: #999999; /* gris */
        color: white;
        border: none;
        border-radius: 5px; /* pas d'arrondi */
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 14px;
    }

    button.merge:hover {
        background-color: #777777;
    }

    button.unselect {
        background-color: white; /* gris */
        color: #999999;
        border: 2px solid #999999;
        border-radius: 5px; /* pas d'arrondi */
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 14px;
    }

    button.unselect:hover {
        background-color: #eeeeee;
    }

    .icon {
        width: 16px;
        height: 16px;
    }
</style>
