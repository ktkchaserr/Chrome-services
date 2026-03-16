// Steam API proxy for CORS handling
const CORS_PROXY = "https://corsproxy.io/?";
const STEAM_STORE_API = "https://store.steampowered.com/api";

// Check if running as Chrome extension
const isExtension = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

async function fetchJSON(url) {
  const fetchUrl = isExtension ? url : CORS_PROXY + encodeURIComponent(url);
  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Fetch game details by AppID
async function fetchAppDetails(appId) {
  const url = `${STEAM_STORE_API}/appdetails?appids=${appId}`;
  const data = await fetchJSON(url);
  if (data[appId] && data[appId].success) {
    return data[appId].data;
  }
  throw new Error("Game not found. Check the AppID and try again.");
}

// Search games by name
async function searchGames(query) {
  const url = `${STEAM_STORE_API}/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`;
  const data = await fetchJSON(url);
  if (data.total > 0) {
    return data.items;
  }
  throw new Error("No games found matching that name.");
}

// Generate ACF manifest content
function generateManifest(appId, name, installDir) {
  const sanitizedDir = installDir.replace(/[^a-zA-Z0-9\s\-_'.!()]/g, "");
  return `"AppState"
{
\t"appid"\t\t"${appId}"
\t"Universe"\t\t"1"
\t"name"\t\t"${name}"
\t"StateFlags"\t\t"1026"
\t"installdir"\t\t"${sanitizedDir}"
\t"LastUpdated"\t\t"0"
\t"UpdateResult"\t\t"0"
\t"SizeOnDisk"\t\t"0"
\t"buildid"\t\t"0"
\t"LastOwner"\t\t"0"
\t"BytesToDownload"\t\t"0"
\t"BytesDownloaded"\t\t"0"
\t"AutoUpdateBehavior"\t\t"0"
\t"AllowOtherDownloadsWhileRunning"\t\t"0"
}`;
}

// Download file helper
function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate restart Steam batch script
function generateRestartScript() {
  return `@echo off
echo Closing Steam...
taskkill /f /im steam.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo Starting Steam...
start "" "C:\\Program Files (x86)\\Steam\\steam.exe"
echo Done!
timeout /t 2 /nobreak >nul
exit`;
}

// DOM elements
const searchInput = document.getElementById("searchInput");
const resultsContent = document.getElementById("resultsContent");
const addGameBtn = document.getElementById("addGameBtn");
const removeGameBtn = document.getElementById("removeGameBtn");
const multiplayerBtn = document.getElementById("multiplayerBtn");
const restartSteamBtn = document.getElementById("restartSteamBtn");
const closeBtn = document.getElementById("closeBtn");

let selectedGame = null;
let searchResults = [];

// Show message in results area
function showStatus(message, type) {
  const className = type === "error" ? "error-msg" : type === "success" ? "success-msg" : "status-msg";
  resultsContent.innerHTML = `<div class="${className}">${message}</div>`;
}

// Show loading spinner
function showLoading(message) {
  resultsContent.innerHTML = `<div class="status-msg"><span class="spinner"></span>${message}</div>`;
}

// Display search results
function displaySearchResults(items) {
  searchResults = items;
  selectedGame = null;
  let html = "";
  items.forEach((item, index) => {
    const appId = item.id || item.appid;
    const name = item.name || item.title;
    html += `<div class="game-item" data-index="${index}" data-appid="${appId}" data-name="${name}">
  <strong>${name}</strong> <span style="color:#7b2ff7;">(AppID: ${appId})</span>
</div>`;
  });
  resultsContent.innerHTML = html;

  // Add click handlers to game items
  document.querySelectorAll(".game-item").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".game-item").forEach((e) => e.classList.remove("selected"));
      el.classList.add("selected");
      selectedGame = {
        appid: el.dataset.appid,
        name: el.dataset.name,
      };
    });
  });
}

// Display game details and manifest preview
function displayGameDetails(appId, name, details) {
  const installDir = name.replace(/[^a-zA-Z0-9\s\-_'.!()]/g, "");
  const manifest = generateManifest(appId, name, installDir);

  let html = `<div class="game-info">
  <div><span class="label">Name: </span><span class="value">${name}</span></div>
  <div><span class="label">AppID: </span><span class="value">${appId}</span></div>`;

  if (details) {
    if (details.type) {
      html += `<div><span class="label">Type: </span><span class="value">${details.type}</span></div>`;
    }
    if (details.developers && details.developers.length > 0) {
      html += `<div><span class="label">Developer: </span><span class="value">${details.developers.join(", ")}</span></div>`;
    }
    if (details.is_free !== undefined) {
      html += `<div><span class="label">Free: </span><span class="value">${details.is_free ? "Yes" : "No"}</span></div>`;
    }
  }

  html += `</div>
<div class="label" style="margin-top:10px;">Manifest File: appmanifest_${appId}.acf</div>
<div class="manifest-preview">${manifest}</div>
<button class="download-btn" id="downloadManifestBtn">Download Manifest</button>`;

  resultsContent.innerHTML = html;

  document.getElementById("downloadManifestBtn").addEventListener("click", () => {
    downloadFile(`appmanifest_${appId}.acf`, manifest);
    showStatus("Manifest downloaded! Place it in your Steam/steamapps/ folder and restart Steam.", "success");
  });
}

// Search handler (triggered on Enter)
searchInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    const query = searchInput.value.trim();
    if (!query) return;

    showLoading("Searching...");

    try {
      // Check if input is a numeric AppID
      if (/^\d+$/.test(query)) {
        const details = await fetchAppDetails(query);
        displayGameDetails(query, details.name, details);
      } else {
        const results = await searchGames(query);
        displaySearchResults(results);
      }
    } catch (err) {
      showStatus(err.message, "error");
    }
  }
});

// Add Game button
addGameBtn.addEventListener("click", async () => {
  const query = searchInput.value.trim();

  if (selectedGame) {
    showLoading("Fetching game details...");
    try {
      const details = await fetchAppDetails(selectedGame.appid);
      displayGameDetails(selectedGame.appid, selectedGame.name, details);
    } catch (err) {
      // If details fail, still generate manifest with what we have
      displayGameDetails(selectedGame.appid, selectedGame.name, null);
    }
    return;
  }

  if (!query) {
    showStatus("Enter an AppID or Game Name first.", "error");
    return;
  }

  showLoading("Searching...");

  try {
    if (/^\d+$/.test(query)) {
      const details = await fetchAppDetails(query);
      displayGameDetails(query, details.name, details);
    } else {
      const results = await searchGames(query);
      if (results.length === 1) {
        const game = results[0];
        const appId = game.id || game.appid;
        try {
          const details = await fetchAppDetails(appId);
          displayGameDetails(appId, details.name, details);
        } catch (err) {
          displayGameDetails(appId, game.name, null);
        }
      } else {
        displaySearchResults(results);
        showStatus("Multiple results found. Click a game to select it, then click 'Add Game'.", "status");
      }
    }
  } catch (err) {
    showStatus(err.message, "error");
  }
});

// Remove Game button — opens Game Remover
removeGameBtn.addEventListener("click", () => {
  const appId = selectedGame ? selectedGame.appid : searchInput.value.trim();

  if (isExtension) {
    const url = chrome.runtime.getURL("game-remover.html");
    const params = appId ? `?appid=${appId}` : "";
    chrome.tabs.create({ url: url + params });
  } else {
    const params = appId ? `?appid=${appId}` : "";
    window.open("game-remover.html" + params, "_blank", "width=400,height=450");
  }
});

// Multiplayer button
multiplayerBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  const appId = selectedGame ? selectedGame.appid : (/^\d+$/.test(query) ? query : null);

  if (!appId) {
    showStatus("Enter an AppID or select a game first to view multiplayer info.", "error");
    return;
  }

  const steamDbUrl = `https://www.steamcardexchange.net/index.php?gamepage-appid-${appId}`;
  const storeUrl = `https://store.steampowered.com/app/${appId}`;

  let html = `<div class="game-info">
  <div><span class="label">Multiplayer Links for AppID: </span><span class="value">${appId}</span></div>
  <div style="margin-top:10px;">
    <a href="${storeUrl}" target="_blank" style="color:#9b59f7;">View on Steam Store</a>
  </div>
</div>`;

  resultsContent.innerHTML = html;
});

// Restart Steam button
restartSteamBtn.addEventListener("click", () => {
  const script = generateRestartScript();

  let html = `<div class="game-info">
  <div><span class="label">Restart Steam Script</span></div>
  <div style="margin-top:6px;color:#d0d0d0;font-size:12px;">
    Download and run the batch file to restart Steam.
  </div>
</div>
<div class="manifest-preview">${script}</div>
<button class="download-btn" id="downloadRestartBtn">Download restart_steam.bat</button>`;

  resultsContent.innerHTML = html;

  document.getElementById("downloadRestartBtn").addEventListener("click", () => {
    downloadFile("restart_steam.bat", script);
    showStatus("Script downloaded! Run it to restart Steam.", "success");
  });
});

// Close button
closeBtn.addEventListener("click", () => {
  if (isExtension) {
    window.close();
  } else {
    window.close();
  }
});
