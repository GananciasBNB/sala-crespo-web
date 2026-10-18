# Short updater for La Maquina del Club (typed by hand at the cabinet):
#   Windows + R  ->  powershell irm saladejuegoscrespo.ar/u.ps1|iex
# Downloads the latest printer agent and restarts the PC so everything starts fresh.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$destino = 'C:\MaquinaClub'
if (-not (Test-Path $destino)) { Write-Host 'Esta PC no es la Maquina del Club (no existe C:\MaquinaClub). No hago nada.' -ForegroundColor Yellow; return }
try {
  $out = Join-Path $destino 'agente-impresora.ps1'
  Invoke-WebRequest -Uri 'https://www.saladejuegoscrespo.ar/maquina/agente-impresora.ps1' -OutFile $out -UseBasicParsing
  Unblock-File -Path $out -ErrorAction SilentlyContinue
  Write-Host ''
  Write-Host '  LISTO: impresora actualizada. La PC se reinicia en 10 segundos...' -ForegroundColor Green
  Start-Sleep -Seconds 10
  Restart-Computer -Force
} catch {
  Write-Host ('  ERROR: ' + $_.Exception.Message) -ForegroundColor Red
  Write-Host '  Revisa que haya internet y volve a probar.'
  Start-Sleep -Seconds 30
}
