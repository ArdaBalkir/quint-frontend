
# Enable strict error handling
$ErrorActionPreference = "Stop"

if (-not $env:REGISTRY) {
    $env:REGISTRY = "docker-registry.ebrains.eu/workbench"
    Write-Host "Using default registry: $env:REGISTRY" -ForegroundColor Yellow
}

# Check if Docker is available
try {
    docker --version | Out-Null
} catch {
    Write-Host "ERROR: Docker is not available or not in PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Building Docker image..." -ForegroundColor Cyan
try {
    docker build . -t "$env:REGISTRY/workbench-quint:latest"
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed with exit code $LASTEXITCODE"
    }
    Write-Host "Docker build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker build failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Pushing image to registry..." -ForegroundColor Cyan
try {
    docker push "$env:REGISTRY/workbench-quint:latest"
    if ($LASTEXITCODE -ne 0) {
        throw "Docker push failed with exit code $LASTEXITCODE"
    }
    Write-Host "Docker image pushed successfully to $env:REGISTRY/workbench-quint:latest" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker push failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "Build and push completed successfully!" -ForegroundColor Green
exit 0
