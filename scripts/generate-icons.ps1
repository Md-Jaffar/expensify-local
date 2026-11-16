Add-Type -AssemblyName System.Drawing

function Generate-Icon {
    param(
        [int]$size,
        [string]$outPath,
        [bool]$maskable = $false
    )
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Primary Deep Slate: #0f172a
    $slateBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    # Positive Emerald Circle: #10b981
    $emeraldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 16, 185, 129))
    # White Text
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    if ($maskable) {
        # Full bleed background for adaptive icons
        $g.FillRectangle($slateBrush, 0, 0, $size, $size)
    } else {
        # Rounded rectangle for any icon
        $radius = [int]($size * 0.22)
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $radius * 2
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($size - $d, 0, $d, $d, 270, 90)
        $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
        $path.AddArc(0, $size - $d, $d, $d, 90, 90)
        $path.CloseFigure()
        $g.FillPath($slateBrush, $path)
        $path.Dispose()
    }

    # Center circle (scaled to fit well within safe area)
    $margin = [int]($size * (76.0 / 512.0))
    $circleSize = $size - ($margin * 2)
    $g.FillEllipse($emeraldBrush, $margin, $margin, $circleSize, $circleSize)

    # Rupee Symbol: ₹
    $fontSize = [int]($size * (240.0 / 512.0))
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString([char]0x20B9, $font, $whiteBrush, $rect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $slateBrush.Dispose()
    $emeraldBrush.Dispose()
    $whiteBrush.Dispose()
    $font.Dispose()
    $sf.Dispose()
    Write-Host "Generated: $outPath ($size x $size, maskable=$maskable)"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$publicDir = Join-Path $scriptDir "..\public"

Generate-Icon -size 192 -outPath (Join-Path $publicDir "icon-192x192.png") -maskable $false
Generate-Icon -size 512 -outPath (Join-Path $publicDir "icon-512x512.png") -maskable $false
Generate-Icon -size 512 -outPath (Join-Path $publicDir "icon-maskable-512x512.png") -maskable $true
