# La Maquina del Club - diagnostico y reparacion del arranque automatico.
# Si tras reiniciar la PC no aparecio el kiosk, esto dice por que y lo arregla:
# reemplaza el arranque por VBS (que Windows a veces bloquea) por una tarea
# programada al inicio de sesion, y deja el kiosk corriendo.
#
#   powershell -ExecutionPolicy Bypass -File reparar-arranque.ps1

$base = 'C:\MaquinaClub'
$ps1  = Join-Path $base 'iniciar-maquina-club.ps1'
$cfg  = Join-Path $base 'config.json'
$log  = Join-Path $base 'maquina-club.log'

function Ok($t)    { Write-Host "  OK   $t" -ForegroundColor Green }
function Falta($t) { Write-Host "  ---  $t" -ForegroundColor Yellow }

Write-Host ""
Write-Host "  DIAGNOSTICO DEL ARRANQUE" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $ps1) {
  Ok 'Lanzador presente'
} else {
  Falta "NO esta $ps1 - corre primero el instalador"
  Read-Host 'Enter para cerrar'
  exit
}

if (Test-Path $cfg) {
  $c = Get-Content $cfg -Raw | ConvertFrom-Json
  Ok "Config: $($c.url)"
  Ok "Perfil: $($c.perfil)"
} else {
  Falta 'Faltaba config.json - se recrea con los valores por defecto'
  $perfil = Join-Path $base 'chrome-profile'
  New-Item -ItemType Directory -Force -Path $perfil | Out-Null
  @{ url = 'https://www.saladejuegoscrespo.ar/kiosk'; perfil = $perfil } | ConvertTo-Json | Set-Content $cfg -Encoding utf8
}

$vbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'MaquinaClub.vbs'
if (Test-Path $vbs) { Ok 'Habia arranque por VBS (se reemplaza por tarea programada)' }
else { Falta 'No habia arranque por VBS' }

if (Test-Path $log) {
  Write-Host ''
  Write-Host '  Ultimas lineas del log:' -ForegroundColor DarkGray
  Get-Content $log -Tail 6 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
} else {
  Falta 'No hay log: el lanzador nunca llego a ejecutarse'
}

# --- Reparacion: tarea programada al iniciar sesion ---------------------------
Write-Host ''
Write-Host '  REPARANDO...' -ForegroundColor Cyan
Remove-Item $vbs -Force -ErrorAction SilentlyContinue

$nombre = 'MaquinaClub'
Unregister-ScheduledTask -TaskName $nombre -Confirm:$false -ErrorAction SilentlyContinue

$argumentos = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + $ps1 + '"'
$accion  = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argumentos
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

try {
  Register-ScheduledTask -TaskName $nombre -Action $accion -Trigger $trigger -Settings $ajustes -Description 'La Maquina del Club: kiosk + vigilante' -Force | Out-Null
  Ok 'Tarea programada creada (arranca al iniciar sesion)'
} catch {
  Falta "No se pudo crear la tarea: $($_.Exception.Message)"
  Falta 'Volve a correr esto como administrador (boton derecho > Ejecutar como administrador)'
  $q = [char]34
  $linea1 = 'Set sh = CreateObject(' + $q + 'WScript.Shell' + $q + ')'
  $linea2 = 'sh.Run ' + $q + 'powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ' + $q + $q + $ps1 + $q + $q + $q + ', 0, False'
  Set-Content -Path $vbs -Value ($linea1, $linea2) -Encoding ascii
  Falta 'Se dejo el arranque por VBS como respaldo'
}

# Arrancar ahora
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*MaquinaClub*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Process -FilePath 'powershell' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $ps1, '-Ahora')
Ok 'Kiosk arrancado'

Write-Host ''
Write-Host '  LISTO. Reinicia para confirmar que arranca sola.' -ForegroundColor Green
Write-Host ''
Read-Host 'Enter para cerrar'
