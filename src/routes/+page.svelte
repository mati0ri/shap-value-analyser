<script>
    import Header from "../components/header.svelte";
    import MenuBar from "../components/menuBar.svelte";
    import Graph from "../components/graph.svelte";
    import Details from "../components/details.svelte";
    import List from "../components/list.svelte";
    import Popup from "../components/Popup.svelte";

    import { store } from "../rune/store.svelte";

    import xCsv from "../data/Titanic/x.csv?raw";
    import yCsv from "../data/Titanic/y.csv?raw";
    import svCsv from "../data/Titanic/sv.csv?raw";

    function csvToArray(csv) {
        const [headerLine, ...lines] = csv.trim().split("\n");
        const headers = headerLine.split(",");

        return lines.map((line) => {
            const values = line.split(",");
            return headers.reduce((obj, key, i) => {
                const val = values[i];
                obj[key] = isNaN(val) ? val : Number(val);
                return obj;
            }, {});
        });
    }

    const x = csvToArray(xCsv);
    const y = csvToArray(yCsv);
    const sv = csvToArray(svCsv);

    store.initialize({ x, y, sv }, "Titanic");
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
        <Popup />
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
