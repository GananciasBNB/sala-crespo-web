# Agente de impresion de La Maquina del Club.
# Consulta la cola del servidor y manda cada cupon a la termica del gabinete
# hablandole en ESC/POS, que es el idioma nativo de estas impresoras. Va por
# cola y no directo desde el navegador para que ningun cupon se pierda: si la
# impresora esta apagada o sin papel, el trabajo espera y sale cuando vuelve.
#
# Uso:  powershell -ExecutionPolicy Bypass -File agente-impresora.ps1
#       (lo levanta solo iniciar-maquina-club.ps1)

$ErrorActionPreference = 'SilentlyContinue'
$base    = $PSScriptRoot
$cfgPath = Join-Path $base 'config.json'
$logPath = Join-Path $base 'impresora.log'

function Log($msg) {
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Add-Content -Path $logPath -Encoding utf8
  if ((Get-Item $logPath).Length -gt 512KB) {
    Set-Content -Path $logPath -Value (Get-Content $logPath -Tail 300) -Encoding utf8
  }
}

if (-not (Test-Path $cfgPath)) { Log 'sin config.json - corre primero el instalador'; exit 1 }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$api    = if ($cfg.api)      { $cfg.api }      else { 'https://sala-crespo-backend.onrender.com' }
$llave  = $cfg.kioskKey
$puerto = if ($cfg.impresora) { $cfg.impresora } else { 'TermicaClub' }   # nombre del recurso compartido
if (-not $llave) { Log 'falta kioskKey en config.json'; exit 1 }

# --- ESC/POS -----------------------------------------------------------------
# La termica no entiende HTML: se le mandan bytes con comandos. Estos son los
# basicos, iguales en practicamente todas las Epson-compatibles (la XP-E200M lo es).
$ESC = [char]27; $GS = [char]29
$INIT      = "$ESC@"           # reset
$CENTRO    = "$ESC" + 'a' + [char]1
$IZQ       = "$ESC" + 'a' + [char]0
$NEGRITA   = "$ESC" + 'E' + [char]1
$NORMAL    = "$ESC" + 'E' + [char]0
$DOBLE     = "$GS"  + '!' + [char]17   # alto y ancho doble
$CHICO     = "$GS"  + '!' + [char]0
$CORTE     = "$GS"  + 'V' + [char]1    # corte parcial (GS V 1): probado en la XP-E200M

function Linea($n = 1) { "`n" * $n }

# Arma el texto del cupon segun su tipo.
function Armar($job) {
  $p = $job.payload
  $t = $INIT + $CENTRO + $NEGRITA + $DOBLE + "SALA DE JUEGOS" + (Linea) + "CRESPO" + (Linea)
  $t += $CHICO + $NORMAL

  switch ($job.kind) {
    'sorteo' {
      $t += "* Sala Crespo Club *" + (Linea 2)
      $t += $NEGRITA + "SORTEO DEL MES" + $NORMAL + (Linea 2)
      $t += $DOBLE + $NEGRITA + $p.codigo + $NORMAL + $CHICO + (Linea 2)
      $t += $IZQ + "Socio: $($p.nombre)" + (Linea)
      $t += "DNI:   $($p.dni)" + (Linea)
      $t += "Fecha: $($p.fecha)" + (Linea 2)
      $t += $CENTRO + "DEPOSITA ESTE CUPON EN LA URNA" + (Linea)
      $t += "Un cupon por dia." + (Linea)
    }
    'canje' {
      $t += "* Sala Crespo Club *" + (Linea 2)
      $t += $NEGRITA + "CANJE DE PUNTOS" + $NORMAL + (Linea)
      $t += $DOBLE + $NEGRITA + $p.premio + $NORMAL + $CHICO + (Linea 2)
      $t += $DOBLE + $p.codigo + $CHICO + (Linea 2)
      $t += $IZQ + "Socio:  $($p.nombre)" + (Linea)
      $t += "DNI:    $($p.dni)" + (Linea)
      $t += "Puntos: $($p.puntos)" + (Linea)
      $t += "Fecha:  $($p.fecha)" + (Linea 2)
      $t += $CENTRO + "PRESENTALO EN LA BARRA" + (Linea)
      $t += "Valido solo hoy." + (Linea)
    }
    'premio' {
      $t += "* Fortuna Dorada *" + (Linea 2)
      $t += $NEGRITA + "GANASTE" + $NORMAL + (Linea)
      $t += $DOBLE + $NEGRITA + $p.premio + $NORMAL + $CHICO + (Linea 2)
      $t += $DOBLE + $p.codigo + $CHICO + (Linea 2)
      $t += $IZQ + "Socio: $($p.nombre)" + (Linea)
      $t += "DNI:   $($p.dni)" + (Linea)
      $t += "Fecha: $($p.fecha)" + (Linea 2)
      $t += $CENTRO + "RETIRALO EN LA BARRA CON TU DNI" + (Linea)
      $t += "Valido solo hoy." + (Linea)
    }
  }
  $t += (Linea 6) + $CORTE   # 6 lineas: el cabezal queda unos mm abajo del cutter
  return $t
}

# Manda los bytes crudos a la impresora compartida. El share local es la forma
# mas confiable de imprimir RAW en Windows sin instalar nada.
function Imprimir($texto) {
  $tmp = Join-Path $env:TEMP "cupon-$(Get-Random).bin"
  # codepage 437: la termica no entiende UTF-8, y los acentos salen como basura
  [IO.File]::WriteAllBytes($tmp, [Text.Encoding]::GetEncoding(437).GetBytes($texto))
  $destino = "\\localhost\$puerto"
  cmd /c copy /b "`"$tmp`"" "`"$destino`"" > $null 2>&1
  $ok = $LASTEXITCODE -eq 0
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  if (-not $ok) { throw "no se pudo escribir en $destino (esta compartida como '$puerto'?)" }
}

# --- Bucle -------------------------------------------------------------------
Log "agente iniciado - cola: $api - impresora: \\localhost\$puerto"
$headers = @{ 'x-kiosk-key' = $llave }

while ($true) {
  try {
    $r = Invoke-RestMethod -Uri "$api/api/print/queue" -Headers $headers -TimeoutSec 20
    foreach ($job in $r.jobs) {
      try {
        Imprimir (Armar $job)
        Invoke-RestMethod -Uri "$api/api/print/$($job.id)/done" -Method Post -Headers $headers -TimeoutSec 20 | Out-Null
        Log "impreso #$($job.id) ($($job.kind))"
      } catch {
        $msg = $_.Exception.Message
        Log "FALLO #$($job.id): $msg"
        Invoke-RestMethod -Uri "$api/api/print/$($job.id)/done" -Method Post -Headers $headers `
          -Body (@{ error = $msg } | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 20 | Out-Null
      }
    }
  } catch {
    # sin internet o backend dormido: no es grave, se reintenta en la proxima vuelta
  }
  Start-Sleep -Seconds 2
}
