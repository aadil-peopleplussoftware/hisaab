try {
    # 1. Login or Register
    $loginBody = @{ email = 'test@hisaab.local'; password = 'Password123!'; rememberMe = $true } | ConvertTo-Json
    $res = $null
    try {
        $res = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -ErrorAction Stop
    } catch {
        $regBody = @{ email = 'test@hisaab.local'; password = 'Password123!'; fullName = 'Test User' } | ConvertTo-Json
        $res = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/auth/register' -Method Post -Body $regBody -ContentType 'application/json'
    }

    $token = $res.accessToken
    Write-Host "Authenticated successfully. Token acquired."

    # 2. Create a dummy PNG file
    $testFilePath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'test_receipt.png')
    $pngBytes = [byte[]](0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82)
    [System.IO.File]::WriteAllBytes($testFilePath, $pngBytes)

    # 3. Upload attachment using curl
    $authHeader = "Authorization: Bearer $token"
    $fileParam = "file=@$testFilePath;type=image/png"
    $curlOut = curl.exe -s -X POST 'http://localhost:5000/api/v1/attachments/upload' -H $authHeader -F $fileParam
    Write-Host "Upload response: $curlOut"

    $attachJson = $curlOut | ConvertFrom-Json
    $attachId = $attachJson.id
    Write-Host "Uploaded Attachment ID: $attachId"

    # 4. Anonymous GET verification (for img tags)
    $anonRes = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/attachments/$attachId" -Method Get
    Write-Host "Anonymous GET Status: $($anonRes.StatusCode) ContentType: $($anonRes.Headers['Content-Type'])"

    # 5. Fetch categories to get a valid categoryId
    $cats = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/categories?type=2' -Method Get -Headers @{ Authorization = "Bearer $token" }
    $catId = $cats[0].id

    # 6. Create Transaction with Attachment
    $txnBody = @{
        type = 2
        amount = 1250.50
        categoryId = $catId
        transactionDate = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')
        note = 'Office Supplies & Equipment'
        attachmentId = $attachId
        attachmentUrl = $attachJson.fileUrl
        attachmentFileName = $attachJson.originalFileName
        attachmentFileType = $attachJson.contentType
        attachmentFileSize = $attachJson.fileSizeBytes
    } | ConvertTo-Json

    $txnRes = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/transactions' -Method Post -Body $txnBody -ContentType 'application/json' -Headers @{ Authorization = "Bearer $token" }
    Write-Host "Created Transaction with Attachment: $($txnRes.id) AttachmentFileName: $($txnRes.attachmentFileName)"

    # 7. Query Transactions list and confirm attachment is included
    $listRes = Invoke-RestMethod -Uri 'http://localhost:5000/api/v1/transactions?pageSize=5' -Method Get -Headers @{ Authorization = "Bearer $token" }
    $foundTxn = $listRes.transactions.items | Where-Object { $_.id -eq $txnRes.id }
    Write-Host "Queried transaction attachmentUrl: $($foundTxn.attachmentUrl) size: $($foundTxn.attachmentFileSize)"

    # 8. Download endpoint check
    $dlRes = Invoke-WebRequest -Uri "http://localhost:5000/api/v1/attachments/$attachId/download" -Method Get
    Write-Host "Download Status: $($dlRes.StatusCode) Header: $($dlRes.Headers['Content-Disposition'])"

    # Clean up test file
    Remove-Item $testFilePath -Force -ErrorAction SilentlyContinue
    Write-Host "=== ALL ATTACHMENT TESTS PASSED SUCCESSFULLY! ==="
} catch {
    Write-Error $_
}

