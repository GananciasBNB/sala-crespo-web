# Instalador de La Maquina del Club (correr UNA vez en la PC del gabinete).
# Deja la PC lista: arranque automatico del kiosk, sin suspension, teclado
# tactil disponible y la maquina vinculada con su llave.
#
# Uso:  boton derecho sobre este archivo -> "Ejecutar con PowerShell"
#       (si Windows lo bloquea:  powershell -ExecutionPolicy Bypass -File instalar.ps1)

$ErrorActionPreference = 'Stop'
$base = $PSScriptRoot

function Titulo($t) { Write-Host "`n=== $t ===" -ForegroundColor Yellow }
function Ok($t)     { Write-Host "  OK  $t" -ForegroundColor Green }
function Aviso($t)  { Write-Host "  !   $t" -ForegroundColor Magenta }

Write-Host ""
Write-Host "  LA MAQUINA DEL CLUB - instalador" -ForegroundColor Cyan
Write-Host "  Sala de Juegos Crespo" -ForegroundColor DarkGray

# --- 1. Datos ----------------------------------------------------------------
Titulo 'Datos de la maquina'
$urlDefault = 'https://www.saladejuegoscrespo.ar/kiosk'
$url = Read-Host "URL del kiosk [$urlDefault]"
if ([string]::IsNullOrWhiteSpace($url)) { $url = $urlDefault }

$llave = Read-Host 'Llave de la maquina (KIOSK_DEVICE_KEY, la misma que cargaste en Render)'
if ([string]::IsNullOrWhiteSpace($llave)) { throw 'Sin llave la maquina no puede fichar visitas ni dar giros.' }

# Carpeta sin espacios: si el usuario de Windows tiene espacios en el nombre
# (ej. "BARRA 1 PISO"), Chrome corta la ruta de --user-data-dir y no arranca.
$perfil = Join-Path $base 'chrome-profile'
New-Item -ItemType Directory -Force -Path $perfil | Out-Null
@{ url = $url; perfil = $perfil } | ConvertTo-Json | Set-Content (Join-Path $base 'config.json') -Encoding utf8
Ok "Perfil de Chrome: $perfil"

# --- 2. Energia: la sala no duerme -------------------------------------------
Titulo 'Energia y pantalla'
powercfg /change standby-timeout-ac 0     | Out-Null   # no suspender
powercfg /change monitor-timeout-ac 0     | Out-Null   # no apagar pantalla
powercfg /change hibernate-timeout-ac 0   | Out-Null
powercfg /change disk-timeout-ac 0        | Out-Null
Ok 'Sin suspension, sin apagado de pantalla'

# Protector de pantalla off
New-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'ScreenSaveActive' -Value '0' -PropertyType String -Force | Out-Null
New-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'ScreenSaveTimeOut' -Value '0' -PropertyType String -Force | Out-Null
Ok 'Protector de pantalla desactivado'

# --- 3. Teclado tactil (para el alta de socios nuevos) -----------------------
Titulo 'Teclado en pantalla'
$tip = 'HKCU:\SOFTWARE\Microsoft\TabletTip\1.7'
New-Item -Path $tip -Force | Out-Null
New-ItemProperty -Path $tip -Name 'EnableDesktopModeAutoInvoke' -Value 1 -PropertyType DWord -Force | Out-Null
Ok 'El teclado tactil aparece solo al tocar un campo de texto'

# --- 4. Arranque automatico --------------------------------------------------
Titulo 'Arranque automatico'
$startup = [Environment]::GetFolderPath('Startup')
$vbs = Join-Path $startup 'MaquinaClub.vbs'
$ps1 = Join-Path $base 'iniciar-maquina-club.ps1'
@"
' La Maquina del Club - arranque silencioso (lo crea instalar.ps1)
Set sh = CreateObject("WScript.Shell")
sh.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$ps1""", 0, False
"@ | Set-Content -Path $vbs -Encoding ascii
Ok "Arranca sola con Windows (y el vigilante la repone si se cierra)"

# --- 5. Vincular la maquina con su llave -------------------------------------
Titulo 'Vinculacion'
$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw 'No se encontro Chrome. Instalalo y volve a correr esto.' }

$urlVinc = "$url" + "?key=" + [uri]::EscapeDataString($llave)
Start-Process -FilePath $chrome -ArgumentList @("--user-data-dir=`"$perfil`"", '--no-first-run', '--autoplay-policy=no-user-gesture-required', $urlVinc)
Ok 'Se abrio el kiosk con la llave: la maquina quedo vinculada'
Aviso 'Si abajo del boton dice "Maquina no vinculada", avisale a Claude.'

Write-Host ""
Write-Host "  LISTO." -ForegroundColor Green
Write-Host "  - Para salir del kiosk:  Alt + F4   (o corre salir-kiosk.bat)" -ForegroundColor DarkGray
Write-Host "  - Para volver a entrar:  reinicia o corre iniciar-maquina-club.ps1" -ForegroundColor DarkGray
Write-Host "  - Panel de administracion: 5 toques rapidos en el logo de la pantalla de inicio" -ForegroundColor DarkGray
Write-Host ""
Read-Host 'Enter para cerrar'
