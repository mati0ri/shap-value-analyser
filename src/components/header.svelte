<script>
  import { store } from "../rune/store.svelte";

  const logos = [
    { src: "/logos/LIRMM.png", url: "https://www.lirmm.fr" },
    { src: "/logos/UMd.png", url: "https://www.umontpellier.fr" },
    { src: "/logos/CNRSd.png", url: "https://www.cnrs.fr" },
    { src: "/logos/UMPVd.png", url: "https://www.univ-montp3.fr" },
  ];
</script>

<header>
  <div class="header-row">
    <div class="logo-title">
      <div class="logos">
        {#each logos as logo}
          <a href={logo.url} target="_blank" rel="noopener noreferrer">
            <img src={logo.src} alt="Logo partenaire" />
          </a>
        {/each}
      </div>
      <h2>SHAP Interpretability Dashboard</h2>
    </div>
  </div>
</header>

<style>
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo-title {
    display: flex;
    align-items: center;
    color: white;
    gap: 2rem;
  }

  header {
    background-color: var(--primary-color);
    padding: 0rem 1.4rem;
  }

  .logos {
    display: flex;
    align-items: center;
    gap: 1.4rem;
  }

  .logos img {
    height: 30px;
    object-fit: contain;
    transition: opacity 0.2s;
  }

  .logos a:hover img {
    opacity: 0.6;
  }
</style>
