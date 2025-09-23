# Location: C:\JetSetNew6

# 1. Target file
$file = "C:\JetSetNew6\actions\generate-user-stripe.ts"

# 2. Backup first
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = "$file.bak-$timestamp"
Copy-Item $file $backup
Write-Host "📦 Backup created at $backup"

# 3. Replace import
(Get-Content $file) -replace 'from "next-auth";', 'from "next-auth/next";' | 
    Set-Content $file -Encoding UTF8

Write-Host "✅ Patched import to use next-auth/next"

# 4. Commit and push
git add $file
git commit -m "Fix generate-user-stripe: import getServerSession from next-auth/next"
git push origin main
