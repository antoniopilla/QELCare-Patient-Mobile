[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$javaHomePath = if ($env:QELCARE_JAVA_HOME) { $env:QELCARE_JAVA_HOME } elseif ($env:JAVA_HOME) { $env:JAVA_HOME } else { 'C:\Program Files\Java\jdk-21' }
$sdkPath = if ($env:QELCARE_ANDROID_SDK) { $env:QELCARE_ANDROID_SDK } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } elseif ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
$keyStorePath = if ($env:QELCARE_KEYSTORE) { $env:QELCARE_KEYSTORE } else { Join-Path $env:USERPROFILE '.android\debug.keystore' }
$keyAlias = if ($env:QELCARE_KEY_ALIAS) { $env:QELCARE_KEY_ALIAS } else { 'androiddebugkey' }
$legacyCertificate = '5b270652b168a35630115bd59d614b47cea25ba58966b9be0ae8f589478acf06'
$usingLegacyKey = -not $env:QELCARE_KEYSTORE
$buildTools = Get-ChildItem -LiteralPath (Join-Path $sdkPath 'build-tools') -Directory |
    Where-Object { $_.Name -match '^\d+\.\d+\.\d+$' } |
    Sort-Object { [version]$_.Name } -Descending |
    Select-Object -First 1

foreach ($requiredPath in @((Join-Path $javaHomePath 'bin\java.exe'), $keyStorePath, (Join-Path $sdkPath 'platforms\android-36\android.jar'))) {
    if (-not (Test-Path -LiteralPath $requiredPath)) { throw "Required Android build file not found: $requiredPath" }
}
if (-not $buildTools) { throw "Android SDK build-tools not found under $sdkPath" }

$zipAlign = Join-Path $buildTools.FullName 'zipalign.exe'
$apkSigner = Join-Path $buildTools.FullName 'apksigner.bat'
$aapt = Join-Path $buildTools.FullName 'aapt.exe'
$releaseFolder = Join-Path $projectRoot 'android\app\build\outputs\apk\release'
$unsignedApk = Join-Path $releaseFolder 'app-release-unsigned.apk'
$alignedApk = Join-Path $releaseFolder 'app-release-aligned.apk'
$signedApk = Join-Path $releaseFolder 'app-release.apk'
$deliveryFolder = Join-Path $projectRoot 'QELCare-APK'
$deliveryApk = Join-Path $deliveryFolder 'qelcare-patient-release.apk'

function Invoke-BuildStep {
    param([string]$Executable, [string[]]$Arguments)
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Build step failed ($LASTEXITCODE): $Executable" }
}

function Get-ApkSha256 {
    param([string]$ApkPath)
    $hashAlgorithm = [System.Security.Cryptography.SHA256]::Create()
    $apkStream = $null
    try {
        $apkStream = [System.IO.File]::OpenRead($ApkPath)
        return [System.BitConverter]::ToString($hashAlgorithm.ComputeHash($apkStream)).Replace('-', '').ToLowerInvariant()
    } finally {
        if ($null -ne $apkStream) { $apkStream.Dispose() }
        $hashAlgorithm.Dispose()
    }
}

$previousJavaHome = $env:JAVA_HOME
$previousStorePassword = $env:QELCARE_STORE_PASSWORD
$previousKeyPassword = $env:QELCARE_KEY_PASSWORD
Push-Location -LiteralPath $projectRoot
try {
    $env:JAVA_HOME = $javaHomePath
    if ($usingLegacyKey) {
        # This identity matches the existing distributed APK; no key is generated or copied.
        if (-not $env:QELCARE_STORE_PASSWORD) { $env:QELCARE_STORE_PASSWORD = 'android' }
        if (-not $env:QELCARE_KEY_PASSWORD) { $env:QELCARE_KEY_PASSWORD = 'android' }
        Write-Host 'Release variant: using the existing legacy Android developer signing certificate for installed-app continuity.'
    } elseif (-not $env:QELCARE_STORE_PASSWORD -or -not $env:QELCARE_KEY_PASSWORD) {
        throw 'Set QELCARE_STORE_PASSWORD and QELCARE_KEY_PASSWORD for the supplied QELCARE_KEYSTORE.'
    }

    Invoke-BuildStep 'npm.cmd' @('run', 'build')
    Invoke-BuildStep 'node.exe' @((Join-Path $projectRoot 'node_modules\@capacitor\cli\bin\capacitor'), 'sync', 'android')
    Push-Location -LiteralPath (Join-Path $projectRoot 'android')
    try { Invoke-BuildStep '.\gradlew.bat' @('assembleRelease', '--console=plain') }
    finally { Pop-Location }

    if (-not (Test-Path -LiteralPath $unsignedApk)) { throw "Expected unsigned release APK not found: $unsignedApk" }
    Invoke-BuildStep $zipAlign @('-f', '-p', '4', $unsignedApk, $alignedApk)
    Invoke-BuildStep $apkSigner @('sign', '--ks', $keyStorePath, '--ks-key-alias', $keyAlias, '--ks-pass', 'env:QELCARE_STORE_PASSWORD', '--key-pass', 'env:QELCARE_KEY_PASSWORD', '--out', $signedApk, $alignedApk)

    $verification = & $apkSigner verify --verbose --print-certs $signedApk 2>&1
    if ($LASTEXITCODE -ne 0) { throw "APK signature verification failed: $verification" }
    $verificationText = $verification -join "`n"
    if ($usingLegacyKey -and $verificationText -notmatch [regex]::Escape($legacyCertificate)) {
        throw 'The local signing certificate does not match the existing distributed QELCare APK.'
    }
    $badging = & $aapt dump badging $signedApk 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the release APK manifest.' }
    if (($badging -join "`n") -match 'application-debuggable') { throw 'Release APK unexpectedly has debuggable enabled.' }
    if (($badging -join "`n") -notmatch "package: name='com\.qelcare\.patient'") { throw 'APK application ID does not match the existing app.' }
    Invoke-BuildStep $zipAlign @('-c', '-p', '4', $signedApk)

    New-Item -ItemType Directory -Path $deliveryFolder -Force | Out-Null
    Copy-Item -LiteralPath $signedApk -Destination $deliveryApk -Force
    $signedHash = Get-ApkSha256 $signedApk
    $deliveryHash = Get-ApkSha256 $deliveryApk
    if ($signedHash -ne $deliveryHash) { throw 'The final APK copy does not match the signed build output.' }
    Write-Host 'APK signature verified; debuggable=false; applicationId=com.qelcare.patient.'
    Write-Host "Original signed build: $signedApk"
    Write-Host "Final APK: $deliveryApk"
    Write-Host "SHA256 (signed build and final copy): $deliveryHash"
} finally {
    $env:JAVA_HOME = $previousJavaHome
    $env:QELCARE_STORE_PASSWORD = $previousStorePassword
    $env:QELCARE_KEY_PASSWORD = $previousKeyPassword
    Pop-Location
}
