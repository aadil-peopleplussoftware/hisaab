@echo off
setlocal
echo ========================================================
echo  Publishing Hisaab Project to IIS (D:\Applications\Hisaab\WebRoot)
echo ========================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0publish-iis.ps1"

pause

