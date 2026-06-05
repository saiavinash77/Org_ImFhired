# PowerShell script to run authentication fix migration
# Run this to add the missing onboarding columns to your PostgreSQL database

param(
    [string]$DBHost = "localhost",
    [string]$DBUser = "postgres",
    [string]$DBPassword = "",
    [string]$DBName = "firedin",
    [int]$DBPort = 5432
)

Write-Host "======================================"
Write-Host "FiredIn Authentication Fix Migration"
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is installed
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "ERROR: psql is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools and try again"
    exit 1
}

Write-Host "Database Configuration:"
Write-Host "  Host: $DBHost"
Write-Host "  Port: $DBPort"
Write-Host "  User: $DBUser"
Write-Host "  Database: $DBName"
Write-Host ""

# Set environment variable for password
$env:PGPASSWORD = $DBPassword

Write-Host "Running migration: migration_add_onboarding_fields.sql..." -ForegroundColor Yellow
Write-Host ""

try {
    # Run the migration
    psql -h $DBHost -p $DBPort -U $DBUser -d $DBName -f "infra/migration_add_onboarding_fields.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "1. Restart your backend: python -m uvicorn app.main:app --reload"
        Write-Host "2. Test registration → onboarding → login flow"
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "⚠️ Migration may have encountered issues. Check output above." -ForegroundColor Yellow
    }
}
catch {
    Write-Host ""
    Write-Host "❌ Error running migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
finally {
    # Clear password from environment
    Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
}
