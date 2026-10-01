# Bee3ly — first-time AWS dev deploy (Windows PowerShell)
# Prerequisites: Docker Desktop running, Node.js, Git repo pushed (for Amplify later)
#
# 1) Run once: aws configure
#    - Access Key ID + Secret from IAM user (AdministratorAccess or PowerUser for dev)
#    - Region: eu-north-1  (or your chosen region — use the SAME everywhere)
#
# 2) Then: .\scripts\aws-setup-and-deploy-dev.ps1 -FrontendUrl "https://main.xxxxx.amplifyapp.com"

param(
  [Parameter(Mandatory = $true)]
  [string] $FrontendUrl,
  [string] $Region = "eu-north-1"
)

$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing command: $name. Install it and retry."
  }
}

Require-Command aws
Require-Command npm
Require-Command docker

$Account = (aws sts get-caller-identity --query Account --output text).Trim()
if (-not $Account) { throw "AWS credentials not working. Run: aws configure" }

$env:CDK_DEFAULT_ACCOUNT = $Account
$env:CDK_DEFAULT_REGION = $Region

Write-Host "Account: $Account  Region: $Region"
Write-Host "FrontendUrl: $FrontendUrl"

Push-Location "$PSScriptRoot\..\infra"
try {
  if (-not (Get-Command cdk -ErrorAction SilentlyContinue)) {
    Write-Host "Installing aws-cdk globally..."
    npm install -g aws-cdk
  }

  npm install
  Write-Host "CDK bootstrap (once per account/region)..."
  cdk bootstrap "aws://${Account}/${Region}"

  Write-Host "Deploying Bee3ly-dev stack (15–25 min)..."
  npm run deploy:dev -- -c "frontendUrl=$FrontendUrl"
} finally {
  Pop-Location
}

Write-Host @"

Next (manual or second script run):
  1. Secrets Manager -> bee3ly/dev/gemini-api-key -> paste Gemini key (plain text)
  2. Note CDK outputs: BackendEcrUri, AiEcrUri, ApiUrl
  3. From repo root:
       aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin ${Account}.dkr.ecr.${Region}.amazonaws.com
       docker build -t bee3ly-backend ./backend && docker tag bee3ly-backend:latest <BackendEcrUri>:latest && docker push <BackendEcrUri>:latest
       docker build -t bee3ly-ai ./ai-services && docker tag bee3ly-ai:latest <AiEcrUri>:latest && docker push <AiEcrUri>:latest
  4. ECS -> force new deployment (backend + ai)
  5. Amplify -> VITE_API_URL = ApiUrl

See docs/aws-deployment.md

"@
