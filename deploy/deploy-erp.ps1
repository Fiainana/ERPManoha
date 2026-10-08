<#
.SYNOPSIS
  Construit le front en production et le déploie sur la VM nginx (erp.manoha-energie.online).

.DESCRIPTION
  Authentification par clé SSH (aucun mot de passe dans ce script).
  Première fois : nginx est installé et configuré (deploy/nginx-erp.conf).
  Chaque déploiement : build Angular → envoi d'une archive → bascule atomique du dossier servi.
  La version précédente est gardée dans /var/www/erp-manoha.prev pour un retour arrière rapide.

.EXAMPLE
  .\deploy\deploy-erp.ps1
  .\deploy\deploy-erp.ps1 -Hote 192.168.0.236 -SansBuild
#>
param(
    [string]$Hote = '192.168.0.236',
    [string]$Utilisateur = 'root',
    [string]$Cle = "$env:USERPROFILE\.ssh\id_ed25519_manoha_erp",
    [switch]$SansBuild
)

$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
$cible = "$Utilisateur@$Hote"
$ssh = @('-i', $Cle, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new')

function Distant([string]$commande) {
    # Retire les CR (fichier en CRLF sous Windows) : bash les rejetterait.
    & ssh @ssh $cible ($commande -replace "`r", '')
    if ($LASTEXITCODE -ne 0) { throw "Commande distante en échec : $commande" }
}

Push-Location $racine
try {
    if (-not $SansBuild) {
        Write-Host '▶ Build de production…' -ForegroundColor Cyan
        npx ng build --configuration production
        if ($LASTEXITCODE -ne 0) { throw 'Build Angular en échec.' }
    }

    $dist = Join-Path $racine 'dist\ERPManoha\browser'
    if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw "Build introuvable : $dist" }

    $archive = Join-Path $env:TEMP 'erp-manoha.tar.gz'
    if (Test-Path $archive) { Remove-Item $archive }
    tar -czf $archive -C $dist .
    Write-Host ('▶ Archive : {0:N0} Ko' -f ((Get-Item $archive).Length / 1KB)) -ForegroundColor Cyan

    Write-Host '▶ Préparation du serveur (nginx)…' -ForegroundColor Cyan
    Distant '(command -v nginx && command -v curl) >/dev/null || (export DEBIAN_FRONTEND=noninteractive; apt-get update -qq && apt-get install -y -qq nginx curl)'
    & scp @ssh (Join-Path $PSScriptRoot 'nginx-erp.conf') "${cible}:/etc/nginx/sites-available/erp-manoha"
    if ($LASTEXITCODE -ne 0) { throw 'Envoi de la configuration nginx en échec.' }
    Distant 'ln -sf /etc/nginx/sites-available/erp-manoha /etc/nginx/sites-enabled/erp-manoha && rm -f /etc/nginx/sites-enabled/default && nginx -t'

    Write-Host '▶ Envoi et bascule…' -ForegroundColor Cyan
    & scp @ssh $archive "${cible}:/tmp/erp-manoha.tar.gz"
    if ($LASTEXITCODE -ne 0) { throw "Envoi de l'archive en échec." }
    Distant @'
set -e
rm -rf /var/www/erp-manoha.new && mkdir -p /var/www/erp-manoha.new
tar -xzf /tmp/erp-manoha.tar.gz -C /var/www/erp-manoha.new
chown -R www-data:www-data /var/www/erp-manoha.new
rm -rf /var/www/erp-manoha.prev
[ -d /var/www/erp-manoha ] && mv /var/www/erp-manoha /var/www/erp-manoha.prev
mv /var/www/erp-manoha.new /var/www/erp-manoha
rm -f /tmp/erp-manoha.tar.gz
systemctl enable --now nginx >/dev/null 2>&1
systemctl reload nginx
'@

    Write-Host '▶ Vérification…' -ForegroundColor Cyan
    Distant "curl -fsS -o /dev/null -w 'index.html : HTTP %{http_code}\n' http://127.0.0.1/ && curl -fsS -o /dev/null -w 'route /suivi-gps : HTTP %{http_code}\n' http://127.0.0.1/suivi-gps"
    Write-Host "✔ Déployé sur http://$Hote/ (public : https://erp.manoha-energie.online via le tunnel Cloudflare)" -ForegroundColor Green
}
finally {
    Pop-Location
}
