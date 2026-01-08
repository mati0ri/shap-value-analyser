<script>
    import Header from "../components/header.svelte";
    import MenuBar from "../components/menuBar.svelte";
    import Graph from "../components/graph.svelte";
    import Matrix from "../components/matrix.svelte";

    import { store } from "../rune/store.svelte";
    let { data } = $props();

    store.initialize(data);
</script>

<div class="container">
    <Header />
    <MenuBar />

    <div class="middle">
        <Graph />
        <Matrix />
    </div>
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
