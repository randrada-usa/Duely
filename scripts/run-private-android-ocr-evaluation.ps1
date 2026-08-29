param(
  [string]$SampleDirectory = "Duely_RealTestData",
  [string]$PackageName = "com.duely.app",
  [int]$MetroPort = 8081,
  [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$adb = Join-Path $env:LOCALAPPDATA "Android/Sdk/platform-tools/adb.exe"
$samplePath = Join-Path $projectRoot $SampleDirectory
$sourceManifestPath = Join-Path $samplePath "private-manifest.json"
$temporaryManifestPath = Join-Path $projectRoot ".expo/private-ocr-manifest.json"
$reportPath = "files/ocr-evaluation-report.json"

if (-not (Test-Path -LiteralPath $adb)) {
  throw "Android Debug Bridge was not found at $adb"
}
if (-not (Test-Path -LiteralPath $sourceManifestPath)) {
  throw "Private OCR manifest was not found at $sourceManifestPath"
}

function Invoke-PrivateAdbPush([string]$Source, [string]$Destination) {
  $previousErrorPreference = $ErrorActionPreference
  try {
    # adb writes successful transfer progress to stderr on Windows.
    $ErrorActionPreference = "Continue"
    $pushOutput = & $adb push $Source $Destination 2>&1
    $pushExitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorPreference
  }
  if ($pushExitCode -ne 0) {
    throw "Android Debug Bridge could not transfer an anonymous private OCR fixture."
  }
}

$sourceFixtures = Get-Content -LiteralPath $sourceManifestPath -Raw | ConvertFrom-Json
$deviceFixtures = @()
$seenIds = [Collections.Generic.HashSet[string]]::new()
foreach ($fixture in $sourceFixtures) {
  $fixtureId = [string]$fixture.id
  $sourceFilename = [string]$fixture.filename
  $extension = [IO.Path]::GetExtension([string]$fixture.filename).ToLowerInvariant()
  if ($fixtureId -notmatch '^sample-\d{2,3}$' -or -not $seenIds.Add($fixtureId)) {
    throw "Private OCR fixture ids must be unique anonymous values such as sample-01."
  }
  if (
    [IO.Path]::GetFileName($sourceFilename) -ne $sourceFilename -or
    $extension -notin @('.jpg', '.jpeg', '.png')
  ) {
    throw "Private OCR fixtures must reference a JPG or PNG directly inside the sample directory."
  }
  $deviceFixtures += [ordered]@{
    id = $fixtureId
    filename = "$fixtureId$extension"
    expectedDeadline = $fixture.expectedDeadline
  }
}

$reportJson = $null
try {
  [IO.Directory]::CreateDirectory((Split-Path -Parent $temporaryManifestPath)) | Out-Null
  [IO.File]::WriteAllText(
    $temporaryManifestPath,
    ($deviceFixtures | ConvertTo-Json -Depth 5),
    [Text.UTF8Encoding]::new($false)
  )

  & $adb get-state | Out-Null
  & $adb reverse "tcp:$MetroPort" "tcp:$MetroPort" | Out-Null
  $developmentClientUrl = "exp+duely://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A$MetroPort"
  & $adb shell am start -W -a android.intent.action.VIEW -d $developmentClientUrl $PackageName | Out-Null
  Start-Sleep -Seconds 4

  & $adb shell run-as $PackageName mkdir -p files/ocr-evaluation
  & $adb shell run-as $PackageName rm -f $reportPath

  for ($index = 0; $index -lt $sourceFixtures.Count; $index += 1) {
    $sourceFixture = $sourceFixtures[$index]
    $deviceFixture = $deviceFixtures[$index]
    $localPath = Join-Path $samplePath ([string]$sourceFixture.filename)
    if (-not (Test-Path -LiteralPath $localPath)) {
      throw "Private sample is missing for $($sourceFixture.id)"
    }
    $temporaryPath = "/data/local/tmp/duely-$($deviceFixture.filename)"
    Invoke-PrivateAdbPush $localPath $temporaryPath
    & $adb shell run-as $PackageName cp $temporaryPath "files/ocr-evaluation/$($deviceFixture.filename)"
    & $adb shell rm -f $temporaryPath
  }

  $manifestTemporaryPath = "/data/local/tmp/duely-private-manifest.json"
  Invoke-PrivateAdbPush $temporaryManifestPath $manifestTemporaryPath
  & $adb shell run-as $PackageName cp $manifestTemporaryPath "files/ocr-evaluation/manifest.json"
  & $adb shell rm -f $manifestTemporaryPath

  $runId = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  # adb shell reconstructs a remote shell command, so protect the query separator.
  & $adb shell am start -W -a android.intent.action.VIEW -d "duely://ocr-evaluation?mode=private\&autorun=$runId" $PackageName | Out-Null

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
  foreach ($deviceFixture in $deviceFixtures) {
    & $adb shell rm -f "/data/local/tmp/duely-$($deviceFixture.filename)"
  }
  & $adb shell rm -f "/data/local/tmp/duely-private-manifest.json"
  & $adb shell run-as $PackageName rm -rf files/ocr-evaluation
  & $adb shell run-as $PackageName rm -f $reportPath
  if (Test-Path -LiteralPath $temporaryManifestPath) {
    Remove-Item -LiteralPath $temporaryManifestPath -Force
  }
}

if (-not $reportJson) {
  throw "Timed out waiting for the private Android OCR evaluation report. Keep Metro and the development build running, then retry."
}

$parsedReport = $reportJson | ConvertFrom-Json
if ($parsedReport.status -eq "failed") {
  throw "Private Android OCR evaluation failed: $($parsedReport.error)"
}

$reportJson | Write-Output
