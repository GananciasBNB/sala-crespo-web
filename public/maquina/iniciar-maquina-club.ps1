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

# API de Windows para manejar el foco de las ventanas
Add-Type -Namespace MaquinaClub -Name Win -MemberDefinition @'
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
'@ -ErrorAction SilentlyContinue

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

function Kiosk-Pids {
  Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe'" |
    Where-Object { $_.CommandLine -like "*$perfil*" } |
    ForEach-Object { $_.ProcessId }
}

function Kiosk-Vivo {
  return ((Kiosk-Pids | Measure-Object).Count -gt 0)
}

# Trae el kiosk al frente si otra ventana lo tapo. En el gabinete no hay mouse:
# cualquier ventana que aparezca encima (TeamViewer, un aviso de Windows) dejaria
# la maquina inutilizable hasta que alguien vaya con un teclado.
function Traer-Al-Frente {
  $pids = @(Kiosk-Pids)
  if ($pids.Count -eq 0) { return }

  # si la ventana activa ya es del kiosk, no hacer nada
  $activa = [MaquinaClub.Win]::GetForegroundWindow()
  $pidActivo = 0
  [void][MaquinaClub.Win]::GetWindowThreadProcessId($activa, [ref]$pidActivo)
  if ($pids -contains $pidActivo) { return }

  $ventana = Get-Process -Id $pids -ErrorAction SilentlyContinue |
             Where-Object { $_.MainWindowHandle -ne 0 } |
             Select-Object -First 1
  if (-not $ventana) { return }

  [void][MaquinaClub.Win]::ShowWindow($ventana.MainWindowHandle, 9)   # 9 = SW_RESTORE
  [void][MaquinaClub.Win]::SetForegroundWindow($ventana.MainWindowHandle)
  # AppActivate como respaldo: Windows a veces ignora SetForegroundWindow
  # cuando el proceso que llama no es el que tiene el foco.
  try { (New-Object -ComObject WScript.Shell).AppActivate($ventana.Id) | Out-Null } catch {}
  Log "kiosk tapado por otra ventana -> traido al frente"
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
    '--kiosk-printing'                             # imprime el cupon sin preguntar nada
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

# Agente de impresion: consume la cola de cupones y los manda a la termica.
# Corre aparte del kiosco para que un problema de impresora no lo tumbe.
$agente = Join-Path $PSScriptRoot 'agente-impresora.ps1'
if (Test-Path $agente) {
  $yaCorre = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" |
             Where-Object { $_.CommandLine -like '*agente-impresora*' }
  if (-not $yaCorre) {
    Start-Process powershell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$agente)
    Log 'agente de impresion lanzado'
  }
}

# --- Vigilante ---------------------------------------------------------------
# Repone el kiosk si se cae y lo devuelve al frente si algo lo tapa.
# Para trabajar en la PC sin pelear con el vigilante (ej: entrar por TeamViewer),
# crear el archivo mantenimiento.flag; borrarlo al terminar.
$flag = Join-Path $PSScriptRoot 'mantenimiento.flag'
$vuelta = 0
while ($true) {
  Start-Sleep -Seconds 5
  if (Test-Path $flag) { continue }   # modo mantenimiento: no tocar nada

  $vuelta++
  if ($vuelta -ge 4) {                # cada 20s: revisar que siga vivo
    $vuelta = 0
    if (-not (Kiosk-Vivo)) {
      Log 'kiosk caido -> relanzando'
      Start-Sleep -Seconds 3
      Lanzar-Kiosk
      continue
    }
  }
  Traer-Al-Frente
}
