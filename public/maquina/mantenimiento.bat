@echo off
rem Activa o desactiva el modo mantenimiento de La Maquina del Club.
rem Con el modo activo el vigilante deja de traer el kiosk al frente, asi se
rem puede trabajar en la PC (por ejemplo entrando por TeamViewer) sin pelear.
title La Maquina del Club - mantenimiento
set FLAG=%~dp0mantenimiento.flag

if exist "%FLAG%" (
  del "%FLAG%"
  echo.
  echo   MANTENIMIENTO DESACTIVADO
  echo   El kiosk vuelve a ponerse al frente solo.
) else (
  echo mantenimiento > "%FLAG%"
  echo.
  echo   MANTENIMIENTO ACTIVADO
  echo   Ya podes usar la PC con normalidad.
  echo   Volve a correr este archivo al terminar.
)
echo.
timeout /t 4 >nul
