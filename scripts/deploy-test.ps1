# Script de deploiement et test local de production pour Minerva Reach Lite
# Ce script valide les types, le style, compile l'application et la demarre en tache de fond pour valider l'acces HTTP 200.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PSScriptRoot = Split-Path -Parent $ScriptDir
Set-Location $PSScriptRoot

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Minerva Reach Lite - Deploy & Test Runner   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Verification des prerequis et liberation du port 3000
Write-Host "`n[1/6] Verification des prerequis..." -ForegroundColor Gray

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Error "pnpm n'est pas installe. Veuillez installer pnpm pour executer ce projet."
    Exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js n'est pas installe."
    Exit 1
}

$nodeVer = node -v
$pnpmVer = pnpm -v
Write-Host "[OK] Node.js ($nodeVer) et pnpm ($pnpmVer) sont disponibles." -ForegroundColor Green

# Verification et liberation du port 3000
Write-Host "Verification de la disponibilite du port 3000..." -ForegroundColor Gray
try {
    $portConnection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
    if ($portConnection) {
        Write-Host "[ATTENTION] Le port 3000 est actuellement utilise. Liberation du port..." -ForegroundColor Yellow
        $pids = $portConnection.OwningProcess | Select-Object -Unique
        foreach ($targetPid in $pids) {
            $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "Arret du processus '$($proc.Name)' (PID: $targetPid) occupant le port 3000..." -ForegroundColor Gray
                Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Seconds 2
    } else {
        Write-Host "[OK] Le port 3000 est disponible." -ForegroundColor Green
    }
} catch {
    # Fallback netstat pour les environnements plus restreints
    $netstatOut = netstat -ano | Select-String ":3000\s+"
    if ($netstatOut) {
        Write-Host "[ATTENTION] Le port 3000 est occupe. Liberation du port..." -ForegroundColor Yellow
        foreach ($line in $netstatOut) {
            $parts = $line.ToString().Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
            if ($parts.Length -ge 5) {
                $targetPid = $parts[-1]
                $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "Arret du processus '$($proc.Name)' (PID: $targetPid) occupant le port 3000..." -ForegroundColor Gray
                    Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
                }
            }
        }
        Start-Sleep -Seconds 2
    } else {
        Write-Host "[OK] Le port 3000 est disponible." -ForegroundColor Green
    }
}

# Verification et installation des dependances si necessaire
Write-Host "Verification des dependances..." -ForegroundColor Gray
if (-not (Test-Path "node_modules")) {
    Write-Host "Le repertoire node_modules est manquant. Installation des dependances via pnpm..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n[ERREUR] L'installation des dependances a echoue. Deploiement avorte." -ForegroundColor Red
        Exit 1
    }
    Write-Host "[OK] Dependances installees avec succes." -ForegroundColor Green
} else {
    Write-Host "[OK] Le repertoire node_modules existe. Etape d'installation sautee." -ForegroundColor Green
}

# 2. Nettoyage du cache de build precedent
Write-Host "`n[2/6] Nettoyage du cache de build precedent..." -ForegroundColor Gray
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "[OK] Repertoire de build precedent .next supprime." -ForegroundColor Green
} else {
    Write-Host "[OK] Aucun build precedent a nettoyer." -ForegroundColor Green
}

# 3. Validation TypeScript
Write-Host "`n[3/6] Validation des types TypeScript (typecheck)..." -ForegroundColor Gray
pnpm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERREUR] La validation TypeScript a echoue. Deploiement avorte." -ForegroundColor Red
    Exit 1
}
Write-Host "[OK] Validation TypeScript reussie." -ForegroundColor Green

# 4. Validation ESLint
Write-Host "`n[4/6] Validation du linter (lint)..." -ForegroundColor Gray
pnpm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERREUR] La validation du linter a echoue. Deploiement avorte." -ForegroundColor Red
    Exit 1
}
Write-Host "[OK] Validation du linter reussie." -ForegroundColor Green

# 5. Build de production Next.js
Write-Host "`n[5/6] Compilation de l'application Next.js (build)..." -ForegroundColor Gray
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERREUR] La compilation Next.js a echoue. Deploiement avorte." -ForegroundColor Red
    Exit 1
}
Write-Host "[OK] Compilation reussie." -ForegroundColor Green

# 6. Demarrage et test de sante de production
Write-Host "`n[6/6] Demarrage du serveur de production en tache de fond..." -ForegroundColor Gray

# Lancement du serveur Next.js en arriere-plan
$process = Start-Process cmd.exe -ArgumentList "/c pnpm start" -NoNewWindow -PassThru -WorkingDirectory $PSScriptRoot

try {
    Write-Host "Attente du demarrage du serveur a http://localhost:3000..." -ForegroundColor Gray
    
    $success = $false
    $maxAttempts = 15
    $attempt = 1
    
    # Polling HTTP 200 sur localhost:3000
    while ($attempt -le $maxAttempts) {
        if ($process.HasExited) {
            Write-Host "`n[ERREUR] Le processus Next.js s'est arrete de maniere inattendue." -ForegroundColor Red
            Exit 1
        }
        
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                if ($response.Content -match "Minerva") {
                    $success = $true
                    break
                } else {
                    Write-Host "`n[ATTENTION] Le serveur a repondu, mais le mot-cle 'Minerva' est manquant dans le corps HTML." -ForegroundColor Yellow
                }
            }
        } catch {
            # Echec temporaire en attente de l'ecoute du port
        }
        
        Write-Host "." -NoNewline -ForegroundColor Gray
        Start-Sleep -Seconds 1
        $attempt++
    }
    
    if ($success) {
        Write-Host "`n`n==========================================================" -ForegroundColor Green
        Write-Host " [SUCCES] DEPLOIEMENT ET L'APPLICATION SONT PRETS !" -ForegroundColor Green
        Write-Host " Le serveur de production est en ligne a : http://localhost:3000" -ForegroundColor Green
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host "`nAppuyez sur Ctrl+C pour arreter le serveur et quitter le script." -ForegroundColor Yellow
        
        # Attente infinie ou fermeture par l'utilisateur
        while ($true) {
            if ($process.HasExited) {
                Write-Host "`nLe processus serveur s'est arrete." -ForegroundColor Red
                break
            }
            Start-Sleep -Seconds 1
        }
    } else {
        Write-Host "`n`n[ERREUR] Le serveur a mis trop de temps a repondre (Timeout de 15s)." -ForegroundColor Red
        Exit 1
    }
} finally {
    # Nettoyage automatique du processus en tache de fond lors de la sortie
    if ($process -and -not $process.HasExited) {
        Write-Host "`n[Nettoyage] Arret du serveur de production local..." -ForegroundColor Yellow
        
        # Tente un arret propre
        $process.CloseMainWindow() | Out-Null
        
        # Attend 2 secondes, sinon tue le processus de force
        Start-Sleep -Seconds 2
        if (-not $process.HasExited) {
            Write-Host "[Nettoyage] Arret force du processus..." -ForegroundColor Gray
            $process.Kill()
        }
        $process.Dispose()
        Write-Host "[OK] Serveur arrete." -ForegroundColor Green
    }
}
