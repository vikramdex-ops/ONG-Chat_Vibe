# Build the portable Windows app locally (same steps as GitHub Actions).
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File packaging/build_windows.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "Building frontend..."
Push-Location frontend
if (Test-Path package-lock.json) {
  npm ci
} else {
  npm install
}
npm run build
Pop-Location

Write-Host "Installing desktop Python deps + PyInstaller..."
python -m pip install --upgrade pip
python -m pip install -r requirements-desktop.txt pyinstaller

Write-Host "Building flame/circuit Windows icon..."
python packaging/make_icons.py

Write-Host "Packaging SQA-OG.exe..."
python -m PyInstaller packaging/sqa-og.spec --noconfirm --clean --distpath dist-desktop

$OutDir = Join-Path $Root "dist-desktop\SQA-OG"
if (-not (Test-Path (Join-Path $OutDir "SQA-OG.exe"))) {
  throw "PyInstaller did not produce dist-desktop\SQA-OG\SQA-OG.exe"
}

Copy-Item (Join-Path $Root "packaging\Launch-SQA-OG.bat") (Join-Path $OutDir "Launch-SQA-OG.bat") -Force
Copy-Item (Join-Path $Root "DESKTOP.md") (Join-Path $OutDir "README.txt") -Force
Copy-Item (Join-Path $Root "packaging\sqa-og.ico") (Join-Path $OutDir "sqa-og.ico") -Force

$Zip = Join-Path $Root "dist-desktop\SQA-OG-windows.zip"
if (Test-Path $Zip) { Remove-Item $Zip -Force }
Compress-Archive -Path (Join-Path $OutDir "*") -DestinationPath $Zip
Write-Host "Ready: $Zip"
Write-Host "Unzip and run SQA-OG.exe. Knowledge base lives in %LOCALAPPDATA%\SQA-OG"
