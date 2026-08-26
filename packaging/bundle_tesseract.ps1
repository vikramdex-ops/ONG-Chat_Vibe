# Copy a portable Tesseract (exe + DLLs + English tessdata) next to the build.
# Used by GitHub Actions and local packaging/build_windows.ps1.
# Does not fail the whole desktop build if Tesseract cannot be installed.

$ErrorActionPreference = "Stop"
$Dest = Join-Path $PSScriptRoot "tesseract-runtime"

if (Test-Path (Join-Path $Dest "tesseract.exe")) {
  Write-Host "Tesseract already bundled at $Dest"
  exit 0
}

function Copy-TesseractTree([string]$Src) {
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  Copy-Item -Force (Join-Path $Src "tesseract.exe") (Join-Path $Dest "tesseract.exe")
  Get-ChildItem $Src -Filter "*.dll" | ForEach-Object {
    Copy-Item -Force $_.FullName (Join-Path $Dest $_.Name)
  }
  $tessdata = Join-Path $Src "tessdata"
  if (Test-Path $tessdata) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Dest "tessdata") | Out-Null
    foreach ($lang in @("eng.traineddata", "osd.traineddata")) {
      $hit = Join-Path $tessdata $lang
      if (Test-Path $hit) {
        Copy-Item -Force $hit (Join-Path $Dest "tessdata\$lang")
      }
    }
    Get-ChildItem $tessdata -Filter "*.dll" -ErrorAction SilentlyContinue | ForEach-Object {
      Copy-Item -Force $_.FullName (Join-Path $Dest "tessdata\$($_.Name)")
    }
  }
}

$roots = @(
  "$env:ProgramFiles\Tesseract-OCR",
  "${env:ProgramFiles(x86)}\Tesseract-OCR",
  "$env:LOCALAPPDATA\Programs\Tesseract-OCR"
)

foreach ($root in $roots) {
  if (Test-Path (Join-Path $root "tesseract.exe")) {
    Write-Host "Using existing Tesseract at $root"
    Copy-TesseractTree $root
    exit 0
  }
}

Write-Host "Installing Tesseract via Chocolatey (English only)..."
try {
  choco install tesseract --params "/Language:eng" -y --no-progress
} catch {
  Write-Warning "Chocolatey could not install Tesseract: $_"
}

foreach ($root in $roots) {
  if (Test-Path (Join-Path $root "tesseract.exe")) {
    Copy-TesseractTree $root
    Write-Host "Bundled Tesseract from $root"
    exit 0
  }
}

Write-Warning "Tesseract binary not found. The .exe will still ship RapidOCR. Install Tesseract and re-run this script to bundle it."
exit 0
