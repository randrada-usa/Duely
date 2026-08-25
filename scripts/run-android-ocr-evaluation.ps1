param(
  [string]$PackageName = "com.duely.app",
  [int]$MetroPort = 8082,
  [int]$TimeoutSeconds = 120
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$adb = Join-Path $env:LOCALAPPDATA "Android/Sdk/platform-tools/adb.exe"
$fixtureDirectory = Join-Path $projectRoot ".expo/ocr-image-fixtures"
$manifestPath = Join-Path $projectRoot "evaluation/ocr-image-fixtures/manifest.json"
$reportPath = "files/ocr-evaluation-report.json"

if (-not (Test-Path -LiteralPath $adb)) {
  throw "Android Debug Bridge was not found at $adb"
}

$reportJson = $null
try {
  & (Join-Path $PSScriptRoot "generate-ocr-image-fixtures.ps1") | Write-Output
  & $adb get-state | Out-Null
  & $adb reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
  $developmentClientUrl = "exp+duely://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$MetroPort"
  & $adb shell am start -W -a android.intent.action.VIEW -d $developmentClientUrl $PackageName | Out-Null
  Start-Sleep -Seconds 4

  & $adb shell run-as $PackageName mkdir -p files/ocr-evaluation
  & $adb shell run-as $PackageName rm -f $reportPath

  $fixtures = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  foreach ($fixture in $fixtures) {
    $localPath = Join-Path $fixtureDirectory $fixture.filename
    $temporaryPath = "/data/local/tmp/duely-$($fixture.filename)"
    & $adb push $localPath $temporaryPath | Out-Null
    & $adb shell run-as $PackageName cp $temporaryPath "files/ocr-evaluation/$($fixture.filename)"
    & $adb shell rm -f $temporaryPath
  }

  $runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  & $adb shell am start -W -a android.intent.action.VIEW -d "duely://ocr-evaluation?autorun=$runId" $PackageName | Out-Null

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $candidate = & $adb exec-out run-as $PackageName cat $reportPath 2>$null
    if ($LASTEXITCODE -eq 0 -and $candidate) {
      try {
        $candidate | ConvertFrom-Json | Out-Null
        $reportJson = $candidate
        break
      }
      catch {
        # The app may still be writing the small JSON report; retry briefly.
      }
    }
    Start-Sleep -Seconds 2
  }
}
finally {
  & $adb shell run-as $PackageName rm -rf files/ocr-evaluation
  & $adb shell run-as $PackageName rm -f $reportPath
}

if (-not $reportJson) {
  throw "Timed out waiting for the Android OCR evaluation report. Keep Metro and the development build running, then retry."
}

$parsedReport = $reportJson | ConvertFrom-Json
if ($parsedReport.status -eq "failed") {
  throw "Android OCR evaluation failed: $($parsedReport.error)"
}

$reportJson | Write-Output
