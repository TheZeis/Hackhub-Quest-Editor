@echo off
rem ─────────────────────────────────────────────────────────────────────────
rem  HackHub Quest Mod Editor — one-click launcher for Windows
rem  Installs dependencies, starts the editor, and opens it in your browser.
rem  Keep the "HackHub Quest Mod Editor" terminal window open while you work;
rem  closing it stops the editor.
rem ─────────────────────────────────────────────────────────────────────────
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo   Node.js was not found on this PC.
    echo   Install the LTS version from https://nodejs.org/ and run this file again.
    echo.
    pause
    exit /b 1
)

echo.
echo   [1/3] Installing dependencies (fast if already installed)...
call npm install
if errorlevel 1 (
    echo.
    echo   npm install failed — check the messages above.
    pause
    exit /b 1
)

echo   [2/3] Starting the editor...
start "HackHub Quest Mod Editor" cmd /k "npm run dev"

echo   [3/3] Opening http://localhost:5173 in your browser...
rem Give the dev server a few seconds to boot before opening the page.
timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo   Done! The editor runs at http://localhost:5173
echo   (If that page is empty, another app may hold port 5173 — look at the
echo    "HackHub Quest Mod Editor" terminal window for the actual address.)
echo.
echo   Your work autosaves in the browser. Export your mod with the
echo   "Export mod" button in the top bar.
echo.
pause
