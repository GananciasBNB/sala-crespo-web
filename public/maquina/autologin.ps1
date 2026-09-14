# La Maquina del Club — inicio de sesion automatico.
# Deja Windows entrando solo al usuario del gabinete: tras un corte de luz la
# maquina vuelve al kiosk sin que nadie escriba nada.
#
# Uso:  powershell -ExecutionPolicy Bypass -File autologin.ps1
#       (pide permisos de administrador solo)

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
Write-Host ""
Write-Host "  INICIO DE SESION AUTOMATICO" -ForegroundColor Cyan
Write-Host "  La Maquina del Club - Sala de Juegos Crespo" -ForegroundColor DarkGray
Write-Host ""

$userDefault = $env:USERNAME
$user = Read-Host "Usuario de Windows [$userDefault]"
if ([string]::IsNullOrWhiteSpace($user)) { $user = $userDefault }

Write-Host "Contrasena de '$user' (si no tiene, Enter):" -ForegroundColor Yellow
$secure = Read-Host -AsSecureString
$pass = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
          [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))

$winlogon = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
Set-ItemProperty -Path $winlogon -Name 'AutoAdminLogon'    -Value '1'
Set-ItemProperty -Path $winlogon -Name 'DefaultUserName'   -Value $user
Set-ItemProperty -Path $winlogon -Name 'DefaultDomainName' -Value $env:COMPUTERNAME
if ([string]::IsNullOrEmpty($pass)) {
  Remove-ItemProperty -Path $winlogon -Name 'DefaultPassword' -ErrorAction SilentlyContinue
} else {
  Set-ItemProperty -Path $winlogon -Name 'DefaultPassword' -Value $pass
}
Remove-ItemProperty -Path $winlogon -Name 'AutoLogonCount' -ErrorAction SilentlyContinue
Write-Host "  OK  Entra solo como '$user'" -ForegroundColor Green

# Windows 11 esconde la opcion si esta el modo "sin contrasena" (Windows Hello)
$passwordless = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\PasswordLess\Device'
if (Test-Path $passwordless) {
  Set-ItemProperty -Path $passwordless -Name 'DevicePasswordLessBuildVersion' -Value 0
  Write-Host "  OK  Desactivado el modo 'solo Windows Hello'" -ForegroundColor Green
}

# Que no pida contrasena al volver de suspension ni bloquee sola
powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_NONE CONSOLELOCK 0 2>$null | Out-Null
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_NONE CONSOLELOCK 0 2>$null | Out-Null
$personalization = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization'
New-Item -Path $personalization -Force | Out-Null
Set-ItemProperty -Path $personalization -Name 'NoLockScreen' -Value 1 -Type DWord
Write-Host "  OK  Sin pantalla de bloqueo ni pedido de contrasena al despertar" -ForegroundColor Green

Write-Host ""
Write-Host "  LISTO. Reinicia la PC para probarlo." -ForegroundColor Green
Write-Host "  (la contrasena queda guardada en el registro de esta PC:" -ForegroundColor DarkGray
Write-Host "   usa un usuario comun del gabinete, no uno con datos sensibles)" -ForegroundColor DarkGray
Write-Host ""
Read-Host 'Enter para cerrar'
