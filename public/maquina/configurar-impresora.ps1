# Deja la termica del gabinete lista para imprimir cupones.
# Correr UNA vez, despues de instalar el driver de la impresora.
#
# Uso:  powershell -ExecutionPolicy Bypass -File configurar-impresora.ps1

# --- Elevacion automatica ----------------------------------------------------
$soyAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
            ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $soyAdmin) {
  Write-Host 'Pidiendo permisos de administrador...' -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath
  )
  exit
}

$ErrorActionPreference = 'Stop'
$base    = $PSScriptRoot
$cfgPath = Join-Path $base 'config.json'
$SHARE   = 'TermicaClub'

function Ok($t)    { Write-Host "  OK  $t" -ForegroundColor Green }
function Aviso($t) { Write-Host "  !   $t" -ForegroundColor Magenta }

Write-Host ''
Write-Host '  IMPRESORA DE CUPONES' -ForegroundColor Cyan
Write-Host '  La Maquina del Club - Sala de Juegos Crespo' -ForegroundColor DarkGray
Write-Host ''

# --- 1. Elegir la impresora --------------------------------------------------
$impresoras = @(Get-Printer | Where-Object { $_.Name -notmatch 'OneNote|Fax|XPS|PDF' })
if ($impresoras.Count -eq 0) { Write-Host 'No hay impresoras instaladas. Instala primero el driver.' -ForegroundColor Red; Read-Host; exit }

Write-Host '  Impresoras encontradas:' -ForegroundColor Yellow
for ($i = 0; $i -lt $impresoras.Count; $i++) {
  Write-Host ("   [{0}] {1}" -f ($i + 1), $impresoras[$i].Name)
}
Write-Host ''
$elegida = $null
if ($impresoras.Count -eq 1) {
  $elegida = $impresoras[0]
  Ok "Una sola impresora: $($elegida.Name)"
} else {
  $n = Read-Host "Cual es la termica de cupones? [1-$($impresoras.Count)]"
  $elegida = $impresoras[[int]$n - 1]
}
if (-not $elegida) { Write-Host 'Opcion invalida.' -ForegroundColor Red; Read-Host; exit }

# --- 2. Compartirla: es como el agente le manda los bytes crudos -------------
Set-Printer -Name $elegida.Name -Shared $true -ShareName $SHARE
Ok "Compartida como '$SHARE'"

# --- 3. Predeterminada, y que Windows no la cambie ---------------------------
# Windows trae activado "administrar mi impresora predeterminada", que la
# cambia sola a la ultima usada. En un gabinete eso hace que un dia los
# cupones salgan por otro lado o se guarden como PDF.
(New-Object -ComObject WScript.Network).SetDefaultPrinter($elegida.Name)
New-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Windows' `
  -Name 'LegacyDefaultPrinterMode' -Value 1 -PropertyType DWord -Force | Out-Null
Ok 'Predeterminada, y Windows ya no la cambia sola'

# --- 4. Dejarla anotada para el agente ---------------------------------------
$cfg = if (Test-Path $cfgPath) { Get-Content $cfgPath -Raw | ConvertFrom-Json } else { [pscustomobject]@{} }
$cfg | Add-Member -NotePropertyName 'impresora' -NotePropertyValue $SHARE -Force
if (-not $cfg.api) { $cfg | Add-Member -NotePropertyName 'api' -NotePropertyValue 'https://sala-crespo-backend.onrender.com' -Force }
if (-not $cfg.kioskKey) {
  Write-Host ''
  Aviso 'Falta la llave de la maquina para que el agente pueda leer la cola.'
  $k = Read-Host '  Pega la llave (KIOSK_DEVICE_KEY, la misma de Render)'
  if ($k) { $cfg | Add-Member -NotePropertyName 'kioskKey' -NotePropertyValue $k.Trim() -Force }
}
$cfg | ConvertTo-Json | Set-Content $cfgPath -Encoding utf8
Ok 'Configuracion guardada'

# --- 5. Cupon de prueba ------------------------------------------------------
Write-Host ''
$probar = Read-Host 'Imprimo un cupon de prueba? [S/n]'
if ($probar -ne 'n') {
  $ESC = [char]27; $GS = [char]29
  $t  = "$ESC@" + "$ESC" + 'a' + [char]1
  $t += "$GS" + '!' + [char]17 + "$ESC" + 'E' + [char]1 + "SALA DE JUEGOS`nCRESPO`n"
  $t += "$GS" + '!' + [char]0 + "$ESC" + 'E' + [char]0 + "`n* Prueba de impresora *`n`n"
  $t += "$ESC" + 'a' + [char]0
  $t += "Si lees esto, la impresora`nquedo lista para los cupones.`n`n"
  $t += "0123456789012345678901234567890123456789`n"
  $t += "|....|....1....|....2....|....3....|...4`n`n"
  $t += "$ESC" + 'a' + [char]1 + "$(Get-Date -Format 'dd/MM/yyyy HH:mm')`n"
  $t += "`n`n`n`n`n`n" + "$GS" + 'V' + [char]1
  $tmp = Join-Path $env:TEMP 'prueba-cupon.bin'
  [IO.File]::WriteAllBytes($tmp, [Text.Encoding]::GetEncoding(437).GetBytes($t))
  cmd /c copy /b "`"$tmp`"" "`"\\localhost\$SHARE`"" > $null 2>&1
  if ($LASTEXITCODE -eq 0) { Ok 'Cupon enviado - fijate si salio del papel' }
  else { Aviso 'No se pudo enviar. Revisa que la impresora este encendida y con papel.' }
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host '  LISTO.' -ForegroundColor Green
Write-Host '  Si la regla de arriba se corto, avisale a Claude para angostar el cupon.' -ForegroundColor DarkGray
Write-Host ''
Read-Host 'Enter para cerrar'
