<script>
    import Header from "../components/header.svelte";
    import MenuBar from "../components/menuBar.svelte";
    import Graph from "../components/graph.svelte";
    import Details from "../components/details.svelte";
    import Matrix from "../components/matrix.svelte";
    import Popup from "../components/Popup.svelte";

    import { store } from "../rune/store.svelte";
    let { data } = $props();

    store.initialize(data);
</script>

<div class="container">
    <Header />
    <MenuBar />

    <div class="middle">
        <Graph />
        <Details />
        <Matrix />
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
