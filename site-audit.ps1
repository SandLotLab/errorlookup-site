# ===============================
# ErrorLookup.com Site Audit Script
# ===============================

$domain = "https://errorlookup.com"
$adsClient = "ca-pub-7167291111213614"
$gaMeasurementId = "G-75H3P692GN"

$urls = @(
  "$domain/",
  "$domain/ads.txt",
  "$domain/robots.txt",
  "$domain/sitemap.xml",
  "$domain/about/",
  "$domain/contact/",
  "$domain/privacy/",
  "$domain/terms/"
)

function Fetch($url) {
  try {
    return Invoke-WebRequest -Uri $url -Method GET -MaximumRedirection 10 -UseBasicParsing -ErrorAction Stop -Headers @{
      "User-Agent" = "Mozilla/5.0"
    }
  } catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    return $null
  }
}

function Fetch-FollowRedirect($url, $maxHops = 10) {
  $current = $url
  for ($i = 0; $i -lt $maxHops; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $current -Method GET -MaximumRedirection 0 -UseBasicParsing -ErrorAction Stop -Headers @{
        "User-Agent" = "Mozilla/5.0"
      }
      return $r
    } catch {
      $resp = $_.Exception.Response
      if (-not $resp) {
        Write-Host "ERROR: $($_.Exception.Message)"
        return $null
      }

      $status = [int]$resp.StatusCode
      if ($status -notin 301,302,303,307,308) {
        Write-Host "ERROR: HTTP $status"
        return $null
      }

      $loc = $resp.Headers["Location"]
      if (-not $loc) {
        Write-Host "ERROR: Redirect ($status) without Location header"
        return $null
      }

      if ($loc -match '^\s*/') {
        $u = [Uri]$current
        $current = "$($u.Scheme)://$($u.Host)$loc"
      } elseif ($loc -notmatch '^https?://') {
        $u = [Uri]$current
        $current = (New-Object Uri($u, $loc)).AbsoluteUri
      } else {
        $current = $loc
      }
    }
  }

  Write-Host "ERROR: Too many redirects for $url"
  return $null
}

function Extract-Hrefs($html) {
  if ([string]::IsNullOrWhiteSpace($html)) { return @() }

  return [regex]::Matches($html, 'href\s*=\s*["'']([^"'']+)["'']', 'IgnoreCase') |
    ForEach-Object { $_.Groups[1].Value } |
    Sort-Object -Unique
}

function Extract-Title($html) {
  if ([string]::IsNullOrWhiteSpace($html)) { return $null }
  $m = [regex]::Match($html, '<title[^>]*>(.*?)</title>', 'IgnoreCase,Singleline')
  if ($m.Success) { return ($m.Groups[1].Value -replace '\s+', ' ').Trim() }
  return $null
}

function Extract-MetaContent($html, $name) {
  if ([string]::IsNullOrWhiteSpace($html)) { return $null }

  $patterns = @(
    '<meta[^>]+name=["'']' + [regex]::Escape($name) + '["''][^>]+content=["'']([^"'']+)["'']',
    '<meta[^>]+content=["'']([^"'']+)["''][^>]+name=["'']' + [regex]::Escape($name) + '["'']',
    '<meta[^>]+property=["'']' + [regex]::Escape($name) + '["''][^>]+content=["'']([^"'']+)["'']',
    '<meta[^>]+content=["'']([^"'']+)["''][^>]+property=["'']' + [regex]::Escape($name) + '["'']'
  )

  foreach ($pattern in $patterns) {
    $m = [regex]::Match($html, $pattern, 'IgnoreCase')
    if ($m.Success) { return $m.Groups[1].Value }
  }

  return $null
}

function Extract-Canonical($html) {
  if ([string]::IsNullOrWhiteSpace($html)) { return $null }
  $m = [regex]::Match($html, '<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']+)["'']', 'IgnoreCase')
  if ($m.Success) { return $m.Groups[1].Value }
  return $null
}

function Count-Pattern($html, $pattern) {
  if ([string]::IsNullOrWhiteSpace($html)) { return 0 }
  return ([regex]::Matches($html, $pattern, 'IgnoreCase')).Count
}

function Audit-Page($url) {
  Write-Host "`n===== PAGE AUDIT: $url ====="

  $r = Fetch-FollowRedirect $url
  if (-not $r) { return $null }

  $html = $r.Content
  $title = Extract-Title $html
  $desc = Extract-MetaContent $html "description"
  $canonical = Extract-Canonical $html
  $ogTitle = Extract-MetaContent $html "og:title"
  $ogDesc = Extract-MetaContent $html "og:description"
  $ogUrl = Extract-MetaContent $html "og:url"
  $twitterCard = Extract-MetaContent $html "twitter:card"
  $h1Count = Count-Pattern $html '<h1\b'
  $adsenseLoaderCount = Count-Pattern $html 'pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js'
  $gaCount = Count-Pattern $html 'googletagmanager\.com/gtag/js'
  $fuelLinkCount = Count-Pattern $html 'https://onlinedevtools\.app/infrastructure'
  $signatureCount = Count-Pattern $html '// Beware of The Old Soldier'

  Write-Host "Status: $($r.StatusCode)"
  Write-Host "Title: $title"
  Write-Host "Meta Description: $desc"
  Write-Host "Canonical: $canonical"
  Write-Host "OG Title: $ogTitle"
  Write-Host "OG Description: $ogDesc"
  Write-Host "OG URL: $ogUrl"
  Write-Host "Twitter Card: $twitterCard"
  Write-Host "H1 Count: $h1Count"
  Write-Host "AdSense Loader Count: $adsenseLoaderCount"
  Write-Host "GA Loader Count: $gaCount"
  Write-Host "Fuel Link Count: $fuelLinkCount"
  Write-Host "Signature Count: $signatureCount"

  return $r
}

Write-Host "`n========== BASIC SITE CHECK =========="

foreach ($url in $urls) {
  Write-Host "`n===== $url ====="

  $r = Fetch $url
  if (-not $r) { continue }

  Write-Host "Status: $($r.StatusCode)"
  Write-Host "Content-Type: $($r.Headers.'Content-Type')"
  Write-Host "Server: $($r.Headers.Server)"
  Write-Host "Cache-Control: $($r.Headers.'Cache-Control')"
  Write-Host "X-Robots-Tag: $($r.Headers.'X-Robots-Tag')"
  Write-Host "CSP: $($r.Headers.'Content-Security-Policy')"
  Write-Host "X-Frame-Options: $($r.Headers.'X-Frame-Options')"
  Write-Host "Referrer-Policy: $($r.Headers.'Referrer-Policy')"
  Write-Host "Permissions-Policy: $($r.Headers.'Permissions-Policy')"
  Write-Host "Strict-Transport-Security: $($r.Headers.'Strict-Transport-Security')"

  Write-Host "`n---- First 40 lines of body ----"
  ($r.Content -split "`n" | Select-Object -First 40) -join "`n"
}

Write-Host "`n========== HOMEPAGE ADSENSE / ANALYTICS CHECK =========="

$homeResp = Audit-Page "$domain/"
if (-not $homeResp) {
  Write-Host "Homepage fetch failed."
} else {
  $homeHtml = $homeResp.Content

  $adsenseLoaderMatches = [regex]::Matches($homeHtml, 'pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js', 'IgnoreCase').Count
  $hasClient = ($homeHtml -match [regex]::Escape($adsClient))
  $hasGA = ($homeHtml -match 'googletagmanager\.com/gtag/js')
  $hasMeasurement = ($homeHtml -match [regex]::Escape($gaMeasurementId))

  Write-Host "AdSense Loader Count on Homepage: $adsenseLoaderMatches"
  Write-Host "AdSense Publisher ID Present: $hasClient"
  Write-Host "Google Analytics Loader Present: $hasGA"
  Write-Host "GA Measurement ID Present: $hasMeasurement"

  if ($adsenseLoaderMatches -eq 1) {
    Write-Host "AdSense loader count looks correct."
  } elseif ($adsenseLoaderMatches -eq 0) {
    Write-Host "AdSense loader missing on homepage."
  } else {
    Write-Host "AdSense loader duplicated on homepage."
  }
}

$adsResp = Fetch "$domain/ads.txt"
if ($adsResp) {
  $pubId = $adsClient -replace "^ca-",""
  if ($adsResp.Content -match [regex]::Escape($pubId)) {
    Write-Host "Publisher ID found in ads.txt."
  } else {
    Write-Host "Publisher ID NOT found in ads.txt."
  }
}

Write-Host "`n========== HOMEPAGE LINKS =========="

try {
  if ($homeResp -and $homeResp.Content) {
    $hrefs = Extract-Hrefs $homeResp.Content
    if ($hrefs.Count -gt 0) {
      $hrefs | ForEach-Object { Write-Host $_ }
    } else {
      Write-Host "No href links found in HTML."
    }
  } else {
    Write-Host "Homepage not available."
  }
} catch {
  Write-Host "Could not extract links."
}

Write-Host "`n========== KEY PAGE AUDITS =========="

$keyPages = @(
  "$domain/status-codes/",
  "$domain/common/client-errors/",
  "$domain/common/server-errors/",
  "$domain/common/redirect-codes/",
  "$domain/compare/301-vs-302/",
  "$domain/guides/404-not-found/",
  "$domain/guides/500-internal-server-error/",
  "$domain/about/",
  "$domain/contact/",
  "$domain/privacy/",
  "$domain/terms/"
)

foreach ($page in $keyPages) {
  Audit-Page $page | Out-Null
}

Write-Host "`n========== SAVE LOCAL SNAPSHOTS =========="

try {
  $backupPath = Join-Path $PSScriptRoot "backups"

  if (!(Test-Path $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath | Out-Null
  }

  if ($homeResp) {
    $homeResp.Content | Out-File -Encoding utf8 (Join-Path $backupPath "audit_home.html")
  }

  Invoke-WebRequest "$domain/robots.txt"  -UseBasicParsing -OutFile (Join-Path $backupPath "audit_robots.txt")
  Invoke-WebRequest "$domain/sitemap.xml" -UseBasicParsing -OutFile (Join-Path $backupPath "audit_sitemap.xml")
  Invoke-WebRequest "$domain/ads.txt"     -UseBasicParsing -OutFile (Join-Path $backupPath "audit_ads.txt")

  Write-Host "Saved:"
  Write-Host " - audit_home.html"
  Write-Host " - audit_robots.txt"
  Write-Host " - audit_sitemap.xml"
  Write-Host " - audit_ads.txt"
} catch {
  Write-Host "Snapshot save failed."
}

Write-Host "`n========== DONE =========="