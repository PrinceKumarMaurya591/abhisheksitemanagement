#!/bin/bash
# ==============================================
# 🚀 Site Ledger - EC2 Initial Setup Script
# ==============================================
# Run this ONCE on a fresh EC2 instance (Ubuntu 22.04)
# to install all prerequisites for CI/CD deployment.
#
# Usage:
#   ssh -i your-key.pem ubuntu@<EC2-IP>
#   curl -fsSL https://raw.githubusercontent.com/your-username/site-ledger/main/infra/ec2-setup.sh | bash
#
# Or copy & run manually:
#   chmod +x infra/ec2-setup.sh
#   ./infra/ec2-setup.sh
# ==============================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  🚀 Site Ledger - EC2 Setup${NC}"
echo -e "${GREEN}============================================${NC}"

# -----------------------------------------
# 1. System Updates
# -----------------------------------------
echo -e "\n${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# -----------------------------------------
# 2. Install Docker
# -----------------------------------------
echo -e "\n${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &>/dev/null; then
    sudo apt install -y docker.io
    sudo systemctl enable docker
    sudo systemctl start docker
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# -----------------------------------------
# 3. Install Docker Compose v2
# -----------------------------------------
echo -e "\n${YELLOW}🐙 Installing Docker Compose...${NC}"
if ! command -v docker compose &>/dev/null; then
    sudo apt install -y docker-compose-v2
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# -----------------------------------------
# 4. Install AWS CLI v2
# -----------------------------------------
echo -e "\n${YELLOW}☁️  Installing AWS CLI...${NC}"
if ! command -v aws &>/dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q /tmp/awscliv2.zip -d /tmp/
    sudo /tmp/aws/install --update
    rm -rf /tmp/aws /tmp/awscliv2.zip
    echo -e "${GREEN}✅ AWS CLI installed${NC}"
else
    echo -e "${GREEN}✅ AWS CLI already installed${NC}"
fi

# -----------------------------------------
# 5. Create project directory
# -----------------------------------------
echo -e "\n${YELLOW}📁 Creating project directory...${NC}"
mkdir -p /home/ubuntu/site-ledger
cd /home/ubuntu/site-ledger

# -----------------------------------------
# 6. Create production docker-compose override
# -----------------------------------------
echo -e "\n${YELLOW}📝 Creating docker-compose.prod.yml...${NC}"
cat > docker-compose.prod.yml << 'COMPOSEEOF'
services:
  postgres:
    image: postgres:16-alpine
    container_name: site-ledger-db
    environment:
      POSTGRES_DB: site_ledger
      POSTGRES_USER: siteledger
      POSTGRES_PASSWORD: ${DB_PASSWORD:-siteledger123}
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U siteledger -d site_ledger"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION:-ap-south-1}.amazonaws.com/site-ledger-backend:latest
    container_name: site-ledger-backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/site_ledger
      SPRING_DATASOURCE_USERNAME: siteledger
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD:-siteledger123}
      APP_JWT_SECRET: ${JWT_SECRET}
      APP_JWT_EXPIRATION_MS: 86400000
      APP_UPLOAD_DIR: /app/uploads
      APP_CORS_ALLOWED_ORIGINS: ${CORS_ORIGINS:-http://localhost}
    ports:
      - "127.0.0.1:8081:8081"
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    image: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION:-ap-south-1}.amazonaws.com/site-ledger-frontend:latest
    container_name: site-ledger-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  uploads_data:
COMPOSEEOF

# -----------------------------------------
# 7. Create .env file
# -----------------------------------------
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}🔐 Creating .env file...${NC}"
    # Get public IP
    PUBLIC_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "localhost")
    
    cat > .env << ENVEOF
# PostgreSQL Password - CHANGE THIS
DB_PASSWORD=siteledger123

# JWT Secret (min 256-bit / 32 characters) - CHANGE THIS
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Allowed CORS origins (comma-separated)
CORS_ORIGINS=http://${PUBLIC_IP}

# AWS Configuration (for ECR pull)
AWS_ACCOUNT_ID=YOUR_AWS_ACCOUNT_ID
AWS_REGION=ap-south-1
ENVEOF
    echo -e "${YELLOW}⚠️  EDIT .env file: nano /home/ubuntu/site-ledger/.env${NC}"
    echo -e "${YELLOW}   Set your AWS_ACCOUNT_ID and DB_PASSWORD${NC}"
fi

# -----------------------------------------
# 8. Create deploy script for manual use
# -----------------------------------------
cat > deploy.sh << 'DEPLOYEOF'
#!/bin/bash
# Manual deploy script (also used by CI/CD)
set -e

echo "🚀 Deploying Site Ledger..."

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION:-ap-south-1} | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION:-ap-south-1}.amazonaws.com

# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart containers
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Cleanup
docker image prune -af

echo "✅ Deployment complete!"
docker compose -f docker-compose.prod.yml ps
DEPLOYEOF
chmod +x deploy.sh

# -----------------------------------------
# 9. Set permissions
# -----------------------------------------
sudo chown -R ubuntu:ubuntu /home/ubuntu/site-ledger

# -----------------------------------------
# Summary
# -----------------------------------------
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}  ✅ EC2 Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "  📁 Project: ${YELLOW}/home/ubuntu/site-ledger/${NC}"
echo -e "  📝 Config:  ${YELLOW}sudo nano /home/ubuntu/site-ledger/.env${NC}"
echo -e ""
echo -e "  🔧 Next steps:"
echo -e "    1. Edit .env file: ${YELLOW}nano /home/ubuntu/site-ledger/.env${NC}"
echo -e "    2. Set your ${YELLOW}AWS_ACCOUNT_ID${NC} in .env"
echo -e "    3. Run deploy: ${YELLOW}cd ~/site-ledger && ./deploy.sh${NC}"
echo -e ""
echo -e "  📋 After first deploy, CI/CD will handle updates automatically!"
echo -e "  🔄 Just push to GitHub main branch."
echo ""
echo -e "${YELLOW}⚠️  LOGOUT & LOGIN again for Docker permissions to take effect!${NC}"
echo ""
