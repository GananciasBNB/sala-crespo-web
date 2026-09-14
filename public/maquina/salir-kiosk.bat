@echo off
rem Cierra el kiosk y su vigilante (para mantenimiento de la PC del gabinete).
rem Para volver a activarlo: reinicia la PC o corre iniciar-maquina-club.ps1
title La Maquina del Club - salir
echo Cerrando el kiosk y el vigilante...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name='powershell.exe'\" | Where-Object { $_.CommandLine -like '*iniciar-maquina-club*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*MaquinaClub*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Listo. El kiosk vuelve solo al reiniciar la PC.
timeout /t 3 >nul
