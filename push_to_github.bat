@echo off
chcp 65001 > nul
cls
echo ====================================================================
echo   FresherTrack 2026: Automatic Push to GitHub (sainath2709/JOB_DASH)
echo ====================================================================
echo.

echo [1/3] Setting branch to main...
git branch -M main

echo [2/3] Configuring remote origin to https://github.com/sainath2709/JOB_DASH.git ...
git remote add origin https://github.com/sainath2709/JOB_DASH.git 2>nul
git remote set-url origin https://github.com/sainath2709/JOB_DASH.git

echo [3/3] Pushing code to GitHub...
echo.
echo If a browser window opens, click "Sign in with your browser" to authorize.
echo.
git push -u origin main

echo.
echo ====================================================================
if %ERRORLEVEL% equ 0 (
    echo  SUCCESS: Code pushed to https://github.com/sainath2709/JOB_DASH!
) else (
    echo  NOTE: If repository does not exist yet, make sure to create it at:
    echo        https://github.com/new (Name: JOB_DASH)
)
echo ====================================================================
echo.
pause
