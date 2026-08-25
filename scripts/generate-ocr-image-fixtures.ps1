param(
  [string]$OutputDirectory = ".expo/ocr-image-fixtures"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $projectRoot "evaluation/ocr-image-fixtures/manifest.json"
$resolvedOutput = Join-Path $projectRoot $OutputDirectory

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

$fixtures = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
foreach ($fixture in $fixtures) {
  $bitmap = [System.Drawing.Bitmap]::new(1080, 1440)
  $bitmap.SetResolution(144, 144)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $font = $null
  $brush = $null
  $borderPen = $null

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $background = [System.Drawing.ColorTranslator]::FromHtml($fixture.style.background)
    $foreground = [System.Drawing.ColorTranslator]::FromHtml($fixture.style.foreground)
    $graphics.Clear($background)
    $graphics.TranslateTransform(540, 720)
    $graphics.RotateTransform([single]$fixture.style.rotationDegrees)
    $graphics.TranslateTransform(-540, -720)

    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(70, 91, 111, 232), 3)
    $graphics.DrawRectangle($borderPen, 54, 54, 972, 1332)
    $font = [System.Drawing.Font]::new(
      "Segoe UI",
      [single]$fixture.style.fontSize,
      [System.Drawing.FontStyle]::Regular,
      [System.Drawing.GraphicsUnit]::Pixel
    )
    $brush = [System.Drawing.SolidBrush]::new($foreground)
    $format = [System.Drawing.StringFormat]::new()
    $format.Trimming = [System.Drawing.StringTrimming]::Word

    $y = 120
    foreach ($line in $fixture.lines) {
      $layout = [System.Drawing.RectangleF]::new(105, $y, 870, 150)
      $graphics.DrawString([string]$line, $font, $brush, $layout, $format)
      $measured = $graphics.MeasureString([string]$line, $font, 870, $format)
      $y += [Math]::Max(64, [Math]::Ceiling($measured.Height) + 22)
    }

    $destination = Join-Path $resolvedOutput $fixture.filename
    $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    if ($borderPen) { $borderPen.Dispose() }
    if ($brush) { $brush.Dispose() }
    if ($font) { $font.Dispose() }
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

Write-Output "Generated $($fixtures.Count) synthetic OCR images in $resolvedOutput"
