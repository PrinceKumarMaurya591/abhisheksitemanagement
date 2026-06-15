#!/bin/bash
# Deploy Site Ledger to EC2
# Usage: ./deploy-ec2.sh <ec2-ip> <pem-file-path>
#
# Example:
#   ./deploy-ec2.sh 13.126.123.45 ~/keys/site-ledger.pem
#
# This script copies the project files to EC2 and deploys using Docker Compose.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ $# -lt 2 ]; then
    echo -e "${RED}Usage: $0 <ec2-ip> <pem-file-path>${NC}"
    echo -e "Example: $0 13.126.123.45 ~/keys/site-ledger.pem"
    exit 1
fi

EC2_IP=$1
PEM_FILE=$2
REMOTE_USER="ubuntu"
REMOTE_DIR="~/app"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}🚀 Deploying Site Ledger to EC2 ($EC2_IP)...${NC}"

# Verify PEM file exists
if [ ! -f "$PEM_FILE" ]; then
    echo -e "${RED}❌ PEM file not found: $PEM_FILE${NC}"
    exit 1
fi

# Set proper permissions for PEM file
chmod 400 "$PEM_FILE"

# Test SSH connection
echo -e "${YELLOW}🔍 Testing SSH connection...${NC}"
ssh -o StrictHostKeyChecking=accept-new -i "$PEM_FILE" "$REMOTE_USER@$EC2_IP" "echo 'SSH connection successful'" || {
    echo -e "${RED}❌ SSH connection failed. Check IP and PEM file.${NC}"
    exit 1
}

# Create remote directory
echo -e "${YELLOW}📁 Creating remote directories...${NC}"
ssh -i "$PEM_FILE" "$REMOTE_USER@$EC2_IP" "mkdir -p $REMOTE_DIR/backend $REMOTE_DIR/frontend $REMOTE_DIR/infra"

# Copy docker-compose and Dockerfiles
echo -e "${YELLOW}📦 Copying configuration files...${NC}"
scp -i "$PEM_FILE" \
    "$PROJECT_DIR/docker-compose.prod.yml" \
    "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/docker-compose.prod.yml"

scp -i "$PEM_FILE" \
    "$PROJECT_DIR/backend/Dockerfile" \
    "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/backend/Dockerfile"

scp -i "$PEM_FILE" \
    "$PROJECT_DIR/frontend/Dockerfile" \
    "$PROJECT_DIR/frontend/nginx.conf" \
    "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/frontend/"

# Copy backend source (excluding target directory)
echo -e "${YELLOW}📂 Copying backend source code...${NC}"
rsync -avz --exclude 'target/' --exclude '.git/' --delete \
    -e "ssh -i $PEM_FILE" \
    "$PROJECT_DIR/backend/" "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/backend/"

# Copy frontend source (excluding node_modules, dist, android)
echo -e "${YELLOW}📂 Copying frontend source code...${NC}"
rsync -avz --exclude 'node_modules/' --exclude 'dist/' --exclude 'android/' --delete \
    -e "ssh -i $PEM_FILE" \
    "$PROJECT_DIR/frontend/" "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/frontend/"

# Deploy on EC2
echo -e "${YELLOW}🐳 Building & starting Docker containers...${NC}"
ssh -i "$PEM_FILE" "$REMOTE_USER@$EC2_IP" "
    cd $REMOTE_DIR

    # Check if .env exists, if not create from template
    if [ ! -f .env ]; then
        echo 'Creating .env file...'
        cat > .env << 'ENVEOF'
# PostgreSQL Password - CHANGE THIS
DB_PASSWORD=siteledger123

# JWT Secret (min 256-bit / 32 characters) - CHANGE THIS
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Allowed CORS origins (comma-separated)
CORS_ORIGINS=http://$EC2_IP
ENVEOF
        echo '.env file created. Please update passwords!'
    fi

    # Pull images and build
    docker compose -f docker-compose.prod.yml pull
    docker compose -f docker-compose.prod.yml up -d --build

    echo ''
    echo -e '${GREEN}========================================${NC}'
    echo -e '${GREEN}  ✅ Deployment Complete!${NC}'
    echo -e '${GREEN}========================================${NC}'
    echo ''
    echo 'Container status:'
    docker compose -f docker-compose.prod.yml ps
"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  🎉 Site Ledger Deployed Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  🌐 Open: ${YELLOW}http://$EC2_IP${NC}"
echo -e "  👤 Login: ${YELLOW}admin / admin123${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Change default passwords!${NC}"
echo -e "  SSH into EC2 and edit: ${YELLOW}nano ~/app/.env${NC}"
echo ""
