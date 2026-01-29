<script>
  import { store } from "../rune/store.svelte";

  const logos = [
    { src: "/logos/LIRMM.png", url: "https://www.lirmm.fr" },
    { src: "/logos/UMd.png", url: "https://www.umontpellier.fr" },
    { src: "/logos/CNRSd.png", url: "https://www.cnrs.fr" },
    { src: "/logos/UMPVd.png", url: "https://www.univ-montp3.fr" },
  ];
  let isInfoOpen = $state(false);

  function toggleInfo() {
    isInfoOpen = !isInfoOpen;
  }

  const contributors = [
    {
      name: "M. Iori",
      orcid: "https://orcid.org/0009-0005-2879-5022",
      affils: "1",
    },
    { name: "stagiaire 2026", orcid: null, affils: "1" },
    { name: "L. Abrouk", orcid: null, affils: "2,3" },
    {
      name: "S. Bringay",
      orcid: "https://orcid.org/0000-0002-2830-3666",
      affils: "1,4",
    },
    {
      name: "A. Guyot",
      orcid: "https://orcid.org/0000-0001-5896-7693",
      affils: "1",
    },
    {
      name: "V. Raveneau",
      orcid: "https://orcid.org/0000-0002-0548-2526",
      affils: "1",
    },
    {
      name: "A. Sallaberry",
      orcid: "https://orcid.org/0000-0001-7068-176X",
      affils: "1,4",
    },
    {
      name: "M. Servajean",
      orcid: "https://orcid.org/0000-0002-9426-2583",
      affils: "1,4",
    },
  ];

  const affiliations = [
    "LIRMM, Université de Montpellier, CNRS",
    "LIB, Université de Bourgogne",
    "MISTEA, Université de Montpellier, INRAE, Institut Agro",
    "AMIS, Université de Montpellier Paul-Valéry",
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

    <div class="info-section">
      <button class="info-btn" onclick={toggleInfo} aria-label="Information">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="info-icon"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <!-- <span class="info-text">Info</span> -->
      </button>

      {#if isInfoOpen}
        <div class="info-dropdown">
          <div class="info-content">
            <h3>Contributors</h3>
            <ul>
              {#each contributors as contributor}
                <li>
                  {contributor.name}<sup class="affil-ref"
                    >{contributor.affils}</sup
                  >
                  {#if contributor.orcid}
                    <a
                      href={contributor.orcid}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="orcid-link"
                      aria-label="ORCID Profile"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 256 256"
                        class="orcid-icon"
                      >
                        <path
                          fill="#A6CE39"
                          d="M256 128c0 70.7-57.3 128-128 128S0 198.7 0 128 57.3 0 128 0s128 57.3 128 128z"
                        />
                        <path
                          fill="#FFF"
                          d="M86.3 186.2H70.9V79.1h15.4v107.1zM78.6 61.6c-5.8 0-10.5-4.2-10.5-10.5s4.7-10.5 10.5-10.5 10.5 4.2 10.5 10.5-4.7 10.5-10.5 10.5zM108.9 79.1h41.6c39 0 57.4 23.2 57.4 53.5 0 32-23.1 53.6-56.8 53.6h-42.2V79.1zm15.4 93.3h24.5c23.3 0 38-12.6 38-39.7 0-28-15.7-39.7-38.5-39.7h-24v79.4z"
                        />
                      </svg>
                    </a>
                  {/if}
                </li>
              {/each}
            </ul>

            <h3>Affiliations</h3>
            <ul class="affiliations-list">
              {#each affiliations as affiliation, i}
                <li>
                  <sup class="affil-index">{i + 1}</sup>
                  {affiliation}
                </li>
              {/each}
            </ul>

            <h3>Resources</h3>
            <p>
              <strong>Article:</strong>
              <span class="placeholder">Not published yet</span>
            </p>
            <p>
              <strong>Code:</strong>
              <span class="placeholder">Link to repository</span>
            </p>

            <h3>Technologies</h3>
            <p>Made with Svelte, D3.js</p>

            <h3>License</h3>
            <p>MIT</p>

            <div class="citation">
              <p>Please cite the article if you use this tool.</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative; /* For dropdown positioning */
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

  /* Info Section Styles */
  .info-section {
    position: relative;
  }

  .info-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    transition: opacity 0.2s;
    gap: 8px; /* Space between text and icon */
  }

  .info-text {
    color: white;
    font-size: 1rem;
    font-weight: 500;
  }

  .info-btn:hover {
    opacity: 0.8;
  }

  .info-icon {
    height: 30px;
    width: 30px;
  }

  .info-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    width: 300px;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-radius: 8px;
    padding: 1.5rem;
    z-index: 1000;
    color: #333;
    margin-top: 10px;
  }

  .info-content h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: var(--primary-color);
    border-bottom: 2px solid #eee;
    padding-bottom: 0.25rem;
  }

  .info-content h3:not(:first-child) {
    margin-top: 1.25rem;
  }

  .info-content ul {
    margin: 0;
    padding-left: 1.2rem;
    list-style-type: none; /* Default none for contributors */
  }

  .info-content ul.affiliations-list {
    list-style-type: disc; /* Bullets for affiliations */
  }

  .info-content li {
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .info-content ul.affiliations-list li {
    display: list-item; /* Restore default list item display for bullets */
  }

  .orcid-link {
    display: flex;
    align-items: center;
    text-decoration: none;
  }

  .orcid-icon {
    width: 16px;
    height: 16px;
    transition: opacity 0.2s;
  }

  .orcid-link:hover .orcid-icon {
    opacity: 0.8;
  }

  .info-content p {
    margin: 0.5rem 0;
  }

  .placeholder {
    color: #888;
    font-style: italic;
  }

  .citation {
    margin-top: 1.5rem;
    padding: 0.75rem;
    background: #f5f5f5;
    border-radius: 4px;
    font-size: 0.9rem;
    font-style: italic;
    text-align: center;
    border: 1px solid #e0e0e0;
  }
</style>
