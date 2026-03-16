// DOM elements
const appIdInput = document.getElementById("appIdInput");
const steamPath = document.getElementById("steamPath");
const steamFolderBtn = document.getElementById("steamFolderBtn");
const removeGameBtn = document.getElementById("removeGameBtn");
const restartSteamBtn = document.getElementById("restartSteamBtn");
const outputSection = document.getElementById("outputSection");

const DEFAULT_STEAM_PATH = "C:\\Program Files (x86)\\Steam";

// Read AppID from URL parameters (passed from main tool)
function getUrlParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Pre-fill AppID if passed via URL
const prefilledAppId = getUrlParam("appid");
if (prefilledAppId) {
  appIdInput.value = prefilledAppId;
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

// Show output message
function showOutput(message, type) {
  const className = type === "error" ? "error-msg" : type === "success" ? "success-msg" : "status-msg";
  outputSection.innerHTML = `<div class="${className}">${message}</div>`;
}

// Generate removal batch script
function generateRemoveScript(appId, steamDir) {
  return `@echo off
echo ============================================
echo   Game Remover - AppID: ${appId}
echo ============================================
echo.

set STEAM_DIR=${steamDir}
set MANIFEST_FILE=%STEAM_DIR%\\steamapps\\appmanifest_${appId}.acf
set COMMON_DIR=%STEAM_DIR%\\steamapps\\common

echo Closing Steam...
taskkill /f /im steam.exe >nul 2>&1
timeout /t 3 /nobreak >nul

echo.
echo Removing manifest file...
if exist "%MANIFEST_FILE%" (
    del /f "%MANIFEST_FILE%"
    echo Manifest removed: appmanifest_${appId}.acf
) else (
    echo Manifest not found: appmanifest_${appId}.acf
)

echo.
echo Starting Steam...
start "" "%STEAM_DIR%\\steam.exe"

echo.
echo Done! Steam will re-check your library.
timeout /t 3 /nobreak >nul
exit`;
}

// Generate restart Steam batch script
function generateRestartScript(steamDir) {
  return `@echo off
echo Closing Steam...
taskkill /f /im steam.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo Starting Steam...
start "" "${steamDir}\\steam.exe"
echo Done!
timeout /t 2 /nobreak >nul
exit`;
}

// Generate open Steam folder script
function generateOpenFolderScript(steamDir) {
  return `@echo off
explorer "${steamDir}\\steamapps"
exit`;
}

// Steam Folder button
steamFolderBtn.addEventListener("click", () => {
  const steamDir = DEFAULT_STEAM_PATH;

  const script = generateOpenFolderScript(steamDir);

  outputSection.innerHTML = `
<div class="status-msg">Steam Folder Script</div>
<div style="margin-top:6px;color:#d0d0d0;font-size:12px;">
  Download and run to open your Steam folder.<br>
  Default path: <span style="color:#e6a817;">${steamDir}\\steamapps</span>
</div>
<div class="script-preview">${script}</div>
<button class="download-btn" id="downloadFolderBtn">Download open_steam_folder.bat</button>`;

  document.getElementById("downloadFolderBtn").addEventListener("click", () => {
    downloadFile("open_steam_folder.bat", script);
    showOutput("Script downloaded!", "success");
  });
});

// Remove Game button
removeGameBtn.addEventListener("click", () => {
  const appId = appIdInput.value.trim();

  if (!appId) {
    showOutput("Enter an AppID first.", "error");
    return;
  }

  if (!/^\d+$/.test(appId)) {
    showOutput("AppID must be a number.", "error");
    return;
  }

  const steamDir = DEFAULT_STEAM_PATH;
  const script = generateRemoveScript(appId, steamDir);

  outputSection.innerHTML = `
<div class="status-msg">Remove Game Script - AppID: ${appId}</div>
<div style="margin-top:6px;color:#d0d0d0;font-size:12px;">
  This will remove the manifest file for AppID <span style="color:#e6a817;">${appId}</span>
  and restart Steam.
</div>
<div class="script-preview">${script}</div>
<button class="download-btn" id="downloadRemoveBtn">Download remove_game.bat</button>`;

  document.getElementById("downloadRemoveBtn").addEventListener("click", () => {
    downloadFile(`remove_game_${appId}.bat`, script);
    showOutput(`Removal script for AppID ${appId} downloaded!`, "success");
  });
});

// Restart Steam button
restartSteamBtn.addEventListener("click", () => {
  const steamDir = DEFAULT_STEAM_PATH;
  const script = generateRestartScript(steamDir);

  outputSection.innerHTML = `
<div class="status-msg">Restart Steam Script</div>
<div style="margin-top:6px;color:#d0d0d0;font-size:12px;">
  Download and run to restart Steam.
</div>
<div class="script-preview">${script}</div>
<button class="download-btn" id="downloadRestartBtn">Download restart_steam.bat</button>`;

  document.getElementById("downloadRestartBtn").addEventListener("click", () => {
    downloadFile("restart_steam.bat", script);
    showOutput("Script downloaded! Run it to restart Steam.", "success");
  });
});
