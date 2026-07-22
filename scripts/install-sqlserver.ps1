<#
.SYNOPSIS
    Installs SQL Server 2022 Developer Edition configured for this project.

.DESCRIPTION
    Does unattended what the setup wizard does across a dozen screens, so that four
    developers end up with byte-identical database servers instead of four subtly
    different ones. Specifically it:

      - installs the Database Engine only (no SSRS, no SSIS, no Machine Learning)
      - enables Mixed Mode authentication, because Prisma authenticates with a
        username and password and cannot use Windows authentication
      - sets the sa password
      - enables TCP/IP and pins it to port 1433, because Prisma's driver speaks
        TCP and nothing else
      - starts the service automatically on boot

.PARAMETER SaPassword
    Password for the 'sa' account. SQL Server enforces Windows password policy:
    8+ characters with three of { uppercase, lowercase, digit, symbol }. A weak
    password makes setup fail late and unhelpfully.

.PARAMETER MediaPath
    Where to download and extract the installation media (about 1.5 GB).

.EXAMPLE
    # Run from an ELEVATED PowerShell window:
    .\scripts\install-sqlserver.ps1 -SaPassword 'ChooseSomethingStrong_123!'

.NOTES
    Must run as Administrator. Takes 15-25 minutes, mostly downloading.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SaPassword,

    [string]$MediaPath = "$env:TEMP\SQLServer2022Media",

    [string]$InstanceName = 'MSSQLSERVER'
)

$ErrorActionPreference = 'Stop'

function Write-Step { param([string]$Message) Write-Host "`n==> $Message" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Message) Write-Host "    $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "    $Message" -ForegroundColor Yellow }

# --- Preflight ---------------------------------------------------------------

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    throw "This script must run as Administrator. Right-click PowerShell -> 'Run as administrator', then re-run it."
}

# Fail on a weak password now, rather than 20 minutes into setup.
$classes = 0
if ($SaPassword -cmatch '[A-Z]')          { $classes++ }
if ($SaPassword -cmatch '[a-z]')          { $classes++ }
if ($SaPassword -match  '[0-9]')          { $classes++ }
if ($SaPassword -match  '[^a-zA-Z0-9]')   { $classes++ }
if ($SaPassword.Length -lt 8 -or $classes -lt 3) {
    throw "SaPassword is too weak. SQL Server requires 8+ characters using at least three of: uppercase, lowercase, digit, symbol."
}

$existing = Get-Service -Name "MSSQL`$$InstanceName", 'MSSQLSERVER' -ErrorAction SilentlyContinue
if ($existing) {
    Write-Warn "A SQL Server engine is already installed: $($existing.Name) [$($existing.Status)]"
    Write-Warn "Nothing to do. If you want a clean install, uninstall it via 'Apps & features' first."
    return
}

Write-Step "Preparing media folder: $MediaPath"
New-Item -ItemType Directory -Path $MediaPath -Force | Out-Null

# --- 1. Download the web installer -------------------------------------------

$ssei = Join-Path $MediaPath 'SQL2022-SSEI-Dev.exe'
if (-not (Test-Path $ssei)) {
    Write-Step "Downloading the SQL Server 2022 Developer bootstrapper"
    $url = 'https://go.microsoft.com/fwlink/p/?linkid=2215158'
    try {
        # Invoke-WebRequest's progress bar makes large downloads dramatically slower.
        $prev = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $url -OutFile $ssei -UseBasicParsing
        $ProgressPreference = $prev
    } catch {
        throw @"
Could not download the bootstrapper automatically ($($_.Exception.Message)).

Download 'SQL Server 2022 Developer' manually from
    https://www.microsoft.com/en-us/sql-server/sql-server-downloads
save it as:
    $ssei
then re-run this script.
"@
    }
    Write-Ok "Downloaded."
} else {
    Write-Ok "Bootstrapper already present, skipping download."
}

# --- 2. Download the full installation media ---------------------------------

$setup = Join-Path $MediaPath 'Extracted\SETUP.EXE'
if (-not (Test-Path $setup)) {
    Write-Step "Downloading installation media (~1.5 GB) - this is the slow part"
    & $ssei /ACTION=Download /MEDIAPATH=$MediaPath /MEDIATYPE=CAB /QUIET | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Media download failed with exit code $LASTEXITCODE" }

    $box = Get-ChildItem -Path $MediaPath -Filter 'SQLServer2022-DEV-x64-ENU.exe' -ErrorAction SilentlyContinue |
           Select-Object -First 1
    if (-not $box) { throw "Media downloaded but SQLServer2022-DEV-x64-ENU.exe was not found in $MediaPath" }

    Write-Step "Extracting media"
    & $box.FullName /Q /X:"$MediaPath\Extracted" | Out-Null
    if (-not (Test-Path $setup)) { throw "Extraction did not produce SETUP.EXE at $setup" }
    Write-Ok "Extracted."
} else {
    Write-Ok "Media already extracted, skipping download."
}

# --- 3. Unattended install ---------------------------------------------------

Write-Step "Installing the Database Engine (this takes ~10 minutes, no output until it finishes)"

# The current Windows user becomes a SQL sysadmin, so you can also connect from
# SSMS using Windows authentication without needing the sa password.
$sysAdmin = "$env:USERDOMAIN\$env:USERNAME"

$arguments = @(
    '/Q'                                  # quiet, no UI
    '/ACTION=Install'
    '/FEATURES=SQLENGINE'                 # engine only; we need nothing else
    "/INSTANCENAME=$InstanceName"         # default instance => reachable on 1433
    '/SECURITYMODE=SQL'                   # Mixed Mode: enables username/password login
    "/SAPWD=`"$SaPassword`""
    "/SQLSYSADMINACCOUNTS=`"$sysAdmin`""
    '/TCPENABLED=1'                       # Prisma's driver is TCP-only
    '/NPENABLED=0'                        # named pipes unused; smaller attack surface
    '/SQLSVCSTARTUPTYPE=Automatic'
    '/AGTSVCSTARTUPTYPE=Disabled'         # SQL Agent is for scheduled jobs; not used
    '/UPDATEENABLED=0'
    '/IACCEPTSQLSERVERLICENSETERMS'
)

$proc = Start-Process -FilePath $setup -ArgumentList $arguments -Wait -PassThru -NoNewWindow
# 3010 means success but a reboot is pending - not a failure.
if ($proc.ExitCode -ne 0 -and $proc.ExitCode -ne 3010) {
    throw @"
Setup failed with exit code $($proc.ExitCode).
The detailed log is under C:\Program Files\Microsoft SQL Server\160\Setup Bootstrap\Log\Summary.txt
"@
}
Write-Ok "Engine installed."
if ($proc.ExitCode -eq 3010) { Write-Warn "A reboot is pending, but SQL Server is usable now." }

# --- 4. Pin TCP to port 1433 -------------------------------------------------

# /TCPENABLED=1 turns the protocol on but can leave it on a dynamic port, which
# would make 'localhost:1433' fail intermittently. Pin it explicitly.
Write-Step "Pinning TCP/IP to port 1433"

$instanceKey = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL').$InstanceName
$tcpAll = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instanceKey\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"

Set-ItemProperty -Path $tcpAll -Name 'TcpPort'         -Value '1433'
Set-ItemProperty -Path $tcpAll -Name 'TcpDynamicPorts' -Value ''
Write-Ok "Port fixed at 1433."

Write-Step "Restarting SQL Server so the port change takes effect"
Restart-Service -Name $InstanceName -Force
Write-Ok "Restarted."

# --- 5. Verify ---------------------------------------------------------------

Write-Step "Verifying"

$svc = Get-Service -Name $InstanceName
if ($svc.Status -ne 'Running') { throw "Service $InstanceName is $($svc.Status), expected Running." }
Write-Ok "Service running."

$listening = Get-NetTCPConnection -LocalPort 1433 -State Listen -ErrorAction SilentlyContinue
if (-not $listening) { throw "Nothing is listening on port 1433. Check SQL Server Configuration Manager." }
Write-Ok "Listening on port 1433."

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " SQL Server 2022 Developer Edition is ready." -ForegroundColor Green
Write-Host "============================================================`n" -ForegroundColor Green

Write-Host "Put this line in server\.env (replace the existing DATABASE_URL):`n" -ForegroundColor White
Write-Host "DATABASE_URL=`"sqlserver://localhost:1433;database=qramc;user=sa;password=$SaPassword;encrypt=true;trustServerCertificate=true`"`n" -ForegroundColor Yellow
Write-Host "Then, from the repository root:`n"
Write-Host "    npm run db:migrate" -ForegroundColor White
Write-Host "    npm run db:seed`n" -ForegroundColor White
