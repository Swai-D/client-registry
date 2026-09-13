@echo off
setlocal

cd /d "%~dp0"
set "XAMPP_DIR=C:\xampp"

if exist "%XAMPP_DIR%\xampp_start.exe" (
    echo Inawasha XAMPP...
    start "XAMPP" "%XAMPP_DIR%\xampp_start.exe"
) else (
    echo XAMPP haijapatikana kwenye C:\xampp.
    echo Hakikisha MySQL imewashwa kwenye XAMPP Control Panel.
)

echo Inawasha Client Registry...
start "Client Registry" /D "%~dp0" cmd /k npm start

timeout /t 3 /nobreak >nul
start "Client Registry Browser" "http://localhost:4000"

endlocal
