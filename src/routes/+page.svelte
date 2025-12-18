<script>
    import Header from "../components/header.svelte";
    import Footer from "../components/footer.svelte";
    import Graph from "../components/graph.svelte";
    import Matrix from "../components/matrix.svelte";

    import { store } from "../rune/store.svelte";
    let { data } = $props();

    store.initialize(data)
</script>

<div class="container">
    <Header />

    <div class="middle">
        <Graph />
        <Matrix />
    </div>

    <Footer />
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
        padding: 30px;
        gap: 40px;
    }
</style>
