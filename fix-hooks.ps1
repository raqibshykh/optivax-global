Get-ChildItem -Path saas-core/hooks/*.php | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -notmatch 'add_action\s*\(\s*''rest_api_init''') {
        $content = $content -replace '(?s)(register_rest_route.*)', "add_action( 'rest_api_init', function() {`n`$1`n} );"
        Set-Content $_.FullName $content
    }
}
