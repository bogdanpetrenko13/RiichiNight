# Heroine call voices with VOICEVOX, for Windows without Python
# (same job as gen_voices.py). The VOICEVOX app must be open: its engine
# listens on http://127.0.0.1:50021.
#
#   powershell -ExecutionPolicy Bypass -File gen_voices.ps1 samples
#       -> samples\<speaker>_<style>_<id>.wav ("リーチ！ ロン！" in every voice)
#          and samples\speakers.txt
#   powershell -ExecutionPolicy Bypass -File gen_voices.ps1 calls
#       -> calls\<heroine>\<riichi|pon|chi|kan|ron|tsumo>.wav from voices.json
#          and calls\credits.json
#
# 1_samples.bat / 2_calls.bat next to this file run the two steps.

param([Parameter(Mandatory = $true)][ValidateSet("samples", "calls")][string]$Mode)

$ErrorActionPreference = "Stop"
$Engine = "http://127.0.0.1:50021"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-Json($path) {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "$Engine$path"
    return $Utf8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json
}

function Save-Speech([string]$text, [int]$style, [string]$out, $opts) {
    $q = [uri]::EscapeDataString($text)
    $r = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$Engine/audio_query?text=$q&speaker=$style"
    $query = $Utf8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json
    $query.speedScale = [double]($opts.speed, 1.0 -ne $null)[0]
    $query.pitchScale = [double]($opts.pitch, 0.0 -ne $null)[0]
    $query.intonationScale = [double]($opts.intonation, 1.0 -ne $null)[0]
    $query.volumeScale = [double]($opts.volume, 1.0 -ne $null)[0]
    $query.prePhonemeLength = 0.05
    $query.postPhonemeLength = 0.1
    $body = $Utf8.GetBytes(($query | ConvertTo-Json -Depth 50 -Compress))
    Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$Engine/synthesis?speaker=$style" `
        -ContentType "application/json" -Body $body -OutFile $out | Out-Null
}

function Safe([string]$s) { return ($s -replace '[\\/:*?"<>|\s]+', '_') }

try {
    $speakers = Get-Json "/speakers"
} catch {
    Write-Host "VOICEVOX is not running. Open the VOICEVOX app and try again." -ForegroundColor Red
    exit 1
}

if ($Mode -eq "samples") {
    $dir = Join-Path $Here "samples"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $rows = @()
    foreach ($sp in $speakers) {
        foreach ($st in $sp.styles) {
            $rows += "$($st.id)`t$($sp.name)`t$($st.name)"
            $file = Join-Path $dir ("{0}_{1}_{2}.wav" -f (Safe $sp.name), (Safe $st.name), $st.id)
            if (-not (Test-Path $file)) { Save-Speech "リーチ！ ロン！" $st.id $file @{} }
            Write-Host "sample $($st.id) $($sp.name) $($st.name)"
        }
    }
    [IO.File]::WriteAllLines((Join-Path $dir "speakers.txt"), $rows, $Utf8)
    Write-Host "Done: $dir" -ForegroundColor Green
}
else {
    $map = [IO.File]::ReadAllText((Join-Path $Here "voices.json"), $Utf8) | ConvertFrom-Json
    $calls = [ordered]@{ riichi = "リーチ！"; pon = "ポン！"; chi = "チー！"; kan = "カン！"; ron = "ロン！"; tsumo = "ツモ！" }
    $names = @{}
    foreach ($sp in $speakers) { foreach ($st in $sp.styles) { $names[[int]$st.id] = "$($sp.name)（$($st.name)）" } }
    $credits = [ordered]@{}
    $dir = Join-Path $Here "calls"
    foreach ($h in $map.PSObject.Properties) {
        $v = $h.Value
        $folder = Join-Path $dir $h.Name
        New-Item -ItemType Directory -Force -Path $folder | Out-Null
        foreach ($k in $calls.Keys) { Save-Speech $calls[$k] ([int]$v.style) (Join-Path $folder "$k.wav") $v }
        $credits[$h.Name] = $names[[int]$v.style]
        Write-Host "calls $($h.Name) $($credits[$h.Name])"
    }
    [IO.File]::WriteAllText((Join-Path $dir "credits.json"), ($credits | ConvertTo-Json), $Utf8)
    Write-Host "Done: $dir" -ForegroundColor Green
}
