$vitePath = Join-Path $PSScriptRoot "..\node_modules\vite\bin\vite.js"
$proc = Start-Process -FilePath "node" -ArgumentList "`"$vitePath`"", "preview", "--port", "4173", "--strictPort" -WorkingDirectory "$PSScriptRoot\.." -PassThru
Start-Sleep -Seconds 3

try {
    Write-Host "Testing HTML root..."
    $htmlRes = Invoke-WebRequest -Uri "http://localhost:4173/expensify-local/" -UseBasicParsing
    Write-Host "HTML Status: $($htmlRes.StatusCode)"

    Write-Host "Testing Web Manifest..."
    $manifestRes = Invoke-WebRequest -Uri "http://localhost:4173/expensify-local/manifest.webmanifest" -UseBasicParsing
    Write-Host "Manifest Status: $($manifestRes.StatusCode) | Content-Type: $($manifestRes.Headers['Content-Type'])"

    Write-Host "Testing Service Worker..."
    $swRes = Invoke-WebRequest -Uri "http://localhost:4173/expensify-local/sw.js" -UseBasicParsing
    Write-Host "SW Status: $($swRes.StatusCode) | Length: $($swRes.Content.Length)"

    Write-Host "Testing 192px Icon..."
    $icon192 = Invoke-WebRequest -Uri "http://localhost:4173/expensify-local/icon-192x192.png" -UseBasicParsing
    Write-Host "192 Icon Status: $($icon192.StatusCode) | Length: $($icon192.Content.Length)"

    Write-Host "Testing 512px Icon..."
    $icon512 = Invoke-WebRequest -Uri "http://localhost:4173/expensify-local/icon-512x512.png" -UseBasicParsing
    Write-Host "512 Icon Status: $($icon512.StatusCode) | Length: $($icon512.Content.Length)"
} finally {
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}
