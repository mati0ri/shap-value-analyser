<script>
    import Header from "../components/header.svelte";
    import MenuBar from "../components/menuBar.svelte";
    import Graph from "../components/graph.svelte";
    import Details from "../components/details.svelte";
    import List from "../components/list.svelte";
    import Popup from "../components/Popup.svelte";

    import { store } from "../rune/store.svelte";
    let { data } = $props();

    // Pass the dataset name (currentStudy) to initialize
    store.initialize(data, data.currentStudy);
</script>

<div class="container">
    <Header />
    <MenuBar />

    <div class="middle">
        <List />
        <Graph />
        <Details />
    </div>

    {#if store.isUploadPopupOpen}
        <Popup>
            <h2>Upload Dataset</h2>
            <p>Upload functionality coming soon...</p>
        </Popup>
    {/if}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        width: 100%;
    }

    .middle {
        flex: 1;
        display: flex;
        flex-direction: row;
        padding: 40px;
        gap: 10px;
        background-color: var(--background-color);
    }
</style>
