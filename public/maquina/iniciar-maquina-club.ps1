# La Maquina del Club - arranque + vigilante.
# Lanza Chrome en modo kiosk y lo vuelve a levantar si alguien lo cierra.
# Se ejecuta solo al iniciar Windows (lo instala instalar.ps1).

param([switch]$Ahora)   # -Ahora: arranque inmediato (lo usa el instalador)

$ErrorActionPreference = 'SilentlyContinue'

# --- Configuracion (la escribe el instalador) --------------------------------
$cfgPath = Join-Path $PSScriptRoot 'config.json'
if (-not (Test-Path $cfgPath)) { exit 1 }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$url     = $cfg.url
$perfil  = $cfg.perfil
$logPath = Join-Path $PSScriptRoot 'maquina-club.log'

function Log($msg) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Add-Content -Path $logPath -Encoding utf8
  # rotacion simple: si pasa 1 MB, conservar solo las ultimas 500 lineas
  if ((Get-Item $logPath).Length -gt 1MB) {
    $tail = Get-Content $logPath -Tail 500
    Set-Content -Path $logPath -Value $tail -Encoding utf8
  }
}

function Get-ChromePath {
  $rutas = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
  )
  foreach ($r in $rutas) { if (Test-Path $r) { return $r } }
  return $null
}

function Limpiar-CrashFlags {
  # Evita el cartel "Chrome no se cerro correctamente" tras un corte de luz
  $prefs = Join-Path $perfil 'Default\Preferences'
  if (Test-Path $prefs) {
    $txt = Get-Content $prefs -Raw
    $txt = $txt -replace '"exit_type":"Crashed"', '"exit_type":"Normal"'
    $txt = $txt -replace '"exited_cleanly":false', '"exited_cleanly":true'
    Set-Content -Path $prefs -Value $txt -Encoding utf8 -NoNewline
  }
}

function Kiosk-Vivo {
  $p = Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" |
       Where-Object { $_.CommandLine -like "*$perfil*" }
  return ($p | Measure-Object).Count -gt 0
}

function Lanzar-Kiosk {
  $chrome = Get-ChromePath
  if (-not $chrome) { Log 'ERROR: no se encontro chrome.exe'; return }
  Limpiar-CrashFlags
  $flags = @(
    "--user-data-dir=`"$perfil`""
    '--kiosk'
    '--autoplay-policy=no-user-gesture-required'   # sonido sin tocar la pantalla
    '--no-first-run'
    '--no-default-browser-check'
    '--noerrdialogs'
    '--disable-infobars'
    '--disable-session-crashed-bubble'
    '--disable-features=TranslateUI,Translate'
    '--overscroll-history-navigation=0'            # que el swipe no navegue atras
    '--disable-pinch'                              # sin zoom con dos dedos
    '--check-for-update-interval=31536000'
    $url
  )
  Start-Process -FilePath $chrome -ArgumentList $flags
  Log "kiosk lanzado -> $url"
}

# --- Arranque ----------------------------------------------------------------
Log '--- inicio de sesion: arrancando La Maquina del Club ---'
# Arranque rapido: 4s alcanzan para que el escritorio este listo. Si la red
# todavia no levanto, el kiosk carga igual y el vigilante lo repone.
if (-not $Ahora) { Start-Sleep -Seconds 4 }
Lanzar-Kiosk

# --- Vigilante ---------------------------------------------------------------
# Si alguien cierra Chrome (o se cae), vuelve solo a los pocos segundos.
while ($true) {
  Start-Sleep -Seconds 20
  if (-not (Kiosk-Vivo)) {
    Log 'kiosk caido -> relanzando'
    Start-Sleep -Seconds 3
    Lanzar-Kiosk
  }
}
