# Instalador de La Maquina del Club - baja todo y deja la PC lista.
# Correr UNA vez en la PC del gabinete, en PowerShell:
#
#   irm https://www.saladejuegoscrespo.ar/maquina/bootstrap.ps1 | iex
#
$ErrorActionPreference = 'Stop'
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base   = 'https://www.saladejuegoscrespo.ar/maquina'
$destino = 'C:\MaquinaClub'

Write-Host ""
Write-Host "  LA MAQUINA DEL CLUB" -ForegroundColor Cyan
Write-Host "  Sala de Juegos Crespo - instalacion" -ForegroundColor DarkGray
Write-Host ""

New-Item -ItemType Directory -Force -Path $destino | Out-Null
$archivos = @(
  'instalar.ps1',              # deja la PC lista (se corre solo, mas abajo)
  'iniciar-maquina-club.ps1',  # lanzador + vigilante
  'salir-kiosk.bat',           # salida de emergencia
  'guia-maquina-club.html',    # manual para la sala
  'autologin.ps1',             # entrar sola a Windows despues de un corte de luz
  'reparar-arranque.ps1',      # diagnostico si algun dia no levanta
  'mantenimiento.bat'          # pausar el vigilante para trabajar en la PC
)
foreach ($f in $archivos) {
  $out = Join-Path $destino $f
  Invoke-WebRequest -Uri "$base/$f" -OutFile $out -UseBasicParsing
  Unblock-File -Path $out -ErrorAction SilentlyContinue   # quitar marca "bajado de internet"
  Write-Host "  descargado: $f" -ForegroundColor DarkGray
}
Write-Host "  Archivos en $destino" -ForegroundColor Green
Write-Host ""

# El instalador corre en un proceso propio: ejecutado por pipeline (irm | iex)
# el teclado no llega a Read-Host y los prompts quedan colgados.
Start-Process -FilePath 'powershell' -Wait -ArgumentList @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $destino 'instalar.ps1')
)
