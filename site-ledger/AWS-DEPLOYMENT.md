# 🚀 Site Ledger - AWS Deployment Guide

Complete guide to deploy **Site Ledger V1.0** (Spring Boot + React + PostgreSQL) on AWS.

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Architecture Overview](#2-architecture-overview)
3. [Option A: Single EC2 Instance (Docker Compose) — ✅ Recommended](#3-option-a-single-ec2-instance-docker-compose--recommended)
4. [Option B: Elastic Beanstalk + RDS + S3/CloudFront](#4-option-b-elastic-beanstalk--rds--s3cloudfront)
5. [Option C: ECS Fargate (Fully Containerized)](#5-option-c-ecs-fargate-fully-containerized)
6. [Database Backups](#6-database-backups)
7. [Monitoring & Logging](#7-monitoring--logging)
8. [Security Checklist](#8-security-checklist)
9. [Cost Estimation](#9-cost-estimation)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Prerequisites

| Requirement | Version |
|-------------|---------|
| AWS Account | Active |
| AWS CLI | v2+ |
| Docker & Docker Compose | Latest |
| Domain Name (optional) | Any registrar |
| Java | 21+ |
| Node.js | 18+ |
| Maven | 3.9+ |

### 1.1 Install AWS CLI

```bash
# Linux (Ubuntu/Debian)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify
aws --version

# Configure
aws configure
# Enter your: AWS Access Key ID, Secret Access Key, Region (ap-south-1 for Mumbai), Output format (json)
```

### 1.2 Create an IAM User (if not already)

1. Go to **AWS Console → IAM → Users → Create user**
2. Name: `site-ledger-deployer`
3. Attach policies: `AdministratorAccess` (or restrict to: EC2, RDS, S3, ECR, CloudFront)
4. Create access key & secret — save them safely

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Internet                             │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
     ┌─────▼──────┐            ┌──────▼──────┐
     │  CloudFront │            │  Route 53    │
     │  (CDN)      │            │  (DNS)       │
     └─────┬──────┘            └──────┬──────┘
           │                          │
     ┌─────▼──────────────────────────▼──────┐
     │        Application Load Balancer       │
     │           (HTTPS:443)                  │
     └─────┬──────────────────────────┬───────┘
           │                          │
     ┌─────▼──────┐            ┌──────▼───────┐
     │  Frontend   │            │   Backend     │
     │  (React)    │◄──────────►│  (Spring Boot)│
     │  Port 80    │            │  Port 8081    │
     └─────────────┘            └──────┬────────┘
                                       │
                                ┌──────▼───────┐
                                │  PostgreSQL   │
                                │  Port 5432    │
                                └──────────────┘
```

---

## 3. Option A: Single EC2 Instance (Docker Compose) — ✅ Recommended

**Best for**: Small teams, cost-effective, easy management, single server.

**Cost**: ~$15–30/month (t3.medium + 20GB EBS)

### 3.1 Launch EC2 Instance

```bash
# Step 1: Launch Ubuntu 22.04 or 24.04 LTS instance
# Via AWS Console:
#   - AMI: Ubuntu Server 24.04 LTS (HVM)
#   - Instance: t3.medium (2 vCPU, 4GB RAM) — minimum for both apps + DB
#   - Storage: 20-30GB gp3
#   - Security Group: Create new (rules below)
#   - Key Pair: Create or use existing

# OR via AWS CLI:
aws ec2 run-instances \
    --image-id resolve:ssm:/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
    --instance-type t3.medium \
    --key-name your-key-pair \
    --security-group-ids sg-xxxxxxxx \
    --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=site-ledger}]'
```

### 3.2 Security Group Rules

Create a security group with these inbound rules:

| Type | Protocol | Port | Source | Purpose |
|------|----------|------|--------|---------|
| SSH | TCP | 22 | Your IP (e.g., `103.xxx.xxx.xxx/32`) | Admin access |
| HTTP | TCP | 80 | `0.0.0.0/0` | Frontend traffic |
| HTTPS | TCP | 443 | `0.0.0.0/0` | SSL traffic |
| Custom TCP | TCP | 8081 | Security Group itself (or ALB) | Backend API |

### 3.3 Connect & Setup EC2

```bash
# SSH into your EC2
ssh -i /path/to/your-key.pem ubuntu@<EC2-PUBLIC-IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Log out and back in for group changes to take effect
exit

# Reconnect
ssh -i /path/to/your-key.pem ubuntu@<EC2-PUBLIC-IP>

# Verify
docker --version
docker compose version
```

### 3.4 Create Production Docker Files

We need these files on the EC2 instance. You can either:

**A) Upload from local (recommended)**:

```bash
# On your LOCAL machine, create these files, then:
scp -i /path/to/your-key.pem \
    site-ledger/backend/Dockerfile \
    site-ledger/frontend/Dockerfile \
    site-ledger/docker-compose.prod.yml \
    site-ledger/infra/nginx/site-ledger.conf \
    ubuntu@<EC2-PUBLIC-IP>:~/app/
```

**B) Or clone directly from Git on EC2** (if using version control).

Let's create all the required files:

---

#### 📄 File: [`site-ledger/backend/Dockerfile`](site-ledger/backend/Dockerfile)

```dockerfile
# ---- Build Stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml first (for layer caching)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -B

# ---- Run Stage ----
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy the JAR from build stage
COPY --from=build /app/target/*.jar app.jar

# Create upload directory
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

USER appuser
EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

#### 📄 File: [`site-ledger/frontend/Dockerfile`](site-ledger/frontend/Dockerfile)

```dockerfile
# ---- Build Stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Run Stage ----
FROM nginx:1.27-alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

#### 📄 File: [`site-ledger/frontend/nginx.conf`](site-ledger/frontend/nginx.conf)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
    }
}
```

---

#### 📄 File: [`site-ledger/docker-compose.prod.yml`](site-ledger/docker-compose.prod.yml)

```yaml
services:
  # =====================
  # PostgreSQL Database
  # =====================
  postgres:
    image: postgres:16-alpine
    container_name: site-ledger-db
    environment:
      POSTGRES_DB: site_ledger
      POSTGRES_USER: siteledger
      POSTGRES_PASSWORD: ${DB_PASSWORD:-siteledger123}
    ports:
      - "127.0.0.1:5432:5432"  # Only localhost access
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U siteledger -d site_ledger"]
      interval: 10s
      timeout: 5s
      retries: 5

  # =====================
  # Spring Boot Backend
  # =====================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
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
      - "127.0.0.1:8081:8081"  # Only localhost (nginx will proxy)
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  # =====================
  # React Frontend (Nginx)
  # =====================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: site-ledger-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
  uploads_data:
```

---

### 3.5 Deploy on EC2

Run these commands **on the EC2 instance**:

```bash
# Go to app directory
cd ~/app

# Create .env file for secrets
cat > .env << 'EOF'
# Change these!
DB_PASSWORD=YourStrongDBPassword123!
JWT_SECRET=YourSuperSecretJWTKeyThatIsAtLeast256BitsLong!!!
CORS_ORIGINS=http://<EC2-PUBLIC-IP>,https://yourdomain.com
EOF

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs

# Verify backend health
curl http://localhost:8081/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 3.6 Set Up Domain & SSL (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (Certbot adds this automatically)
sudo certbot renew --dry-run
```

If you don't have a domain, you can use **CloudFlare Tunnel** or just HTTP for testing:

```bash
# For testing without SSL, just update frontend .env:
# Edit the .env file
nano .env
# Update CORS_ORIGINS=http://<EC2-PUBLIC-IP>
```

### 3.7 Update Frontend API URL

The frontend Nginx config already proxies `/api/` to the backend, so **no code changes are needed** on the frontend — it calls `/api/...` relative paths. This is already working because the Axios base URL in [`site-ledger/frontend/src/api/axios.js`](site-ledger/frontend/src/api/axios.js) can be set to just `/api`.

However, to make it environment-aware, update the axios config:

#### 📄 Updated: [`site-ledger/frontend/src/api/axios.js`](site-ledger/frontend/src/api/axios.js)

```javascript
import axios from 'axios';

// In production, API is proxied through Nginx (same domain)
// In development, point to localhost
const API_BASE_URL = import.meta.env.PROD
  ? '/api'                    // Nginx proxies to backend
  : 'http://localhost:8081/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ... rest remains same
```

### 3.8 One-Click Deploy Script

#### 📄 File: [`site-ledger/infra/deploy-ec2.sh`](site-ledger/infra/deploy-ec2.sh)

```bash
#!/bin/bash
# Deploy Site Ledger to EC2
# Usage: ./deploy-ec2.sh <ec2-ip> <pem-file-path>

set -euo pipefail

EC2_IP=$1
PEM_FILE=$2
REMOTE_USER="ubuntu"
REMOTE_DIR="~/app"

echo "🚀 Deploying Site Ledger to EC2 ($EC2_IP)..."

# Create remote directory
ssh -i "$PEM_FILE" "$REMOTE_USER@$EC2_IP" "mkdir -p $REMOTE_DIR"

# Copy files
echo "📦 Copying files..."
scp -i "$PEM_FILE" \
    ./docker-compose.prod.yml \
    ./backend/Dockerfile \
    ./frontend/Dockerfile \
    ./frontend/nginx.conf \
    "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/"

# Copy source code
echo "📂 Copying backend source..."
rsync -avz --exclude 'target/' --exclude '.git/' \
    -e "ssh -i $PEM_FILE" \
    ./backend/ "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/backend/"

echo "📂 Copying frontend source..."
rsync -avz --exclude 'node_modules/' --exclude 'dist/' --exclude 'android/' \
    -e "ssh -i $PEM_FILE" \
    ./frontend/ "$REMOTE_USER@$EC2_IP:$REMOTE_DIR/frontend/"

# Build and start on EC2
echo "🐳 Building & starting containers..."
ssh -i "$PEM_FILE" "$REMOTE_USER@$EC2_IP" "
    cd $REMOTE_DIR
    docker compose -f docker-compose.prod.yml up -d --build
    echo '✅ Deployment complete!'
    docker compose -f docker-compose.prod.yml ps
"

echo "🎉 Done! App is running at http://$EC2_IP"
```

Make the script executable:
```bash
chmod +x site-ledger/infra/deploy-ec2.sh
```

Run it:
```bash
./site-ledger/infra/deploy-ec2.sh <EC2-PUBLIC-IP> /path/to/key.pem
```

---

### 3.9 Auto-scaling Setup (Optional)

For production with traffic spikes, set up an **Auto Scaling Group**:

1. Create an **AMI** from your configured EC2 instance
2. Create a **Launch Template** using that AMI
3. Create an **Auto Scaling Group** (min: 1, max: 3, desired: 1)
4. Add an **Application Load Balancer** in front
5. Set up **CloudWatch Alarm** for CPU > 70% to trigger scale-up

However, for a single-server setup with Docker Compose, the auto-scaling approach is more complex. Consider **Option C** (ECS Fargate) if you need automatic scaling.

---

## 4. Option B: Elastic Beanstalk + RDS + S3/CloudFront

**Best for**: Managed infrastructure, automatic scaling, less DevOps overhead.

**Cost**: ~$30–60/month (t3.small + db.t3.micro + S3 + CloudFront)

### 4.1 Create RDS PostgreSQL

```bash
# Via AWS CLI
aws rds create-db-instance \
    --db-instance-identifier site-ledger-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username siteledger \
    --master-user-password YourStrongPassword123 \
    --allocated-storage 20 \
    --publicly-accessible false \
    --vpc-security-group-ids sg-xxxxxxxx
```

### 4.2 Deploy Backend to Elastic Beanstalk

First, create a `Procfile` for Elastic Beanstalk:

#### 📄 File: [`site-ledger/backend/Procfile`](site-ledger/backend/Procfile)

```
web: java -jar target/site-ledger-backend-1.0.0.jar --server.port=5000
```

Create `Beanstalk environment properties` in AWS Console:

| Key | Value |
|-----|-------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<RDS-ENDPOINT>:5432/site_ledger` |
| `SPRING_DATASOURCE_USERNAME` | `siteledger` |
| `SPRING_DATASOURCE_PASSWORD` | `YourStrongPassword123` |
| `APP_JWT_SECRET` | `YourSuperSecretKey` |
| `APP_UPLOAD_DIR` | `/var/app/current/uploads` |
| `APP_CORS_ALLOWED_ORIGINS` | `https://your-frontend-domain.com` |

```bash
# Build the backend
cd site-ledger/backend
mvn package -DskipTests

# Initialize Elastic Beanstalk (one-time)
pip install awsebcli
eb init -p java-21 site-ledger-backend --region ap-south-1

# Create environment
eb create site-ledger-prod \
    --instance-type t3.small \
    --keyname your-key-pair \
    --envvars SPRING_DATASOURCE_URL=jdbc:postgresql://<RDS-ENDPOINT>:5432/site_ledger,SPRING_DATASOURCE_USERNAME=siteledger,SPRING_DATASOURCE_PASSWORD=YourStrongPassword123,APP_JWT_SECRET=YourSuperSecretKey

# Deploy
eb deploy
```

### 4.3 Deploy Frontend to S3 + CloudFront

```bash
# Build frontend
cd site-ledger/frontend
npm ci
npm run build

# Create S3 bucket
aws s3 mb s3://site-ledger-frontend --region ap-south-1

# Enable static website hosting
aws s3 website s3://site-ledger-frontend \
    --index-document index.html \
    --error-document index.html

# Set bucket policy for public access
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::site-ledger-frontend/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy --bucket site-ledger-frontend --policy file://bucket-policy.json

# Upload files
aws s3 sync dist/ s3://site-ledger-frontend/ --delete

# Create CloudFront distribution (or use S3 website URL)
aws cloudfront create-distribution \
    --origin-domain-name site-ledger-frontend.s3-website.ap-south-1.amazonaws.com \
    --default-root-object index.html
```

### 4.4 Update Frontend API URL

Update [`site-ledger/frontend/src/api/axios.js`](site-ledger/frontend/src/api/axios.js) to point to the Elastic Beanstalk URL:

```javascript
const API_BASE_URL = import.meta.env.PROD
  ? 'https://site-ledger-backend.ap-south-1.elasticbeanstalk.com/api'
  : 'http://localhost:8081/api';
```

---

## 5. Option C: ECS Fargate (Fully Containerized)

**Best for**: Full container orchestration, auto-scaling, high availability.

**Cost**: ~$40–80/month (Fargate + ALB + RDS + ECR)

### 5.1 Create ECR Repositories

```bash
# Create ECR repos
aws ecr create-repository --repository-name site-ledger/backend
aws ecr create-repository --repository-name site-ledger/frontend

# Login to ECR
aws ecr get-login-password --region ap-south-1 | \
    docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# Build and push backend image
docker build -t site-ledger/backend ./backend
docker tag site-ledger/backend:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/site-ledger/backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/site-ledger/backend:latest

# Build and push frontend image
docker build -t site-ledger/frontend ./frontend
docker tag site-ledger/frontend:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/site-ledger/frontend:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/site-ledger/frontend:latest
```

### 5.2 Create ECS Cluster & Services

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name site-ledger-cluster

# Register task definitions (use below JSON)
# Create backend service
# Create frontend service
# Set up ALB in front
```

#### 📄 File: [`site-ledger/infra/ecs-task-backend.json`](site-ledger/infra/ecs-task-backend.json)

```json
{
  "family": "site-ledger-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/site-ledger/backend:latest",
      "portMappings": [{ "containerPort": 8081, "protocol": "tcp" }],
      "environment": [
        { "name": "SPRING_DATASOURCE_URL", "value": "jdbc:postgresql://<RDS-ENDPOINT>:5432/site_ledger" },
        { "name": "SPRING_DATASOURCE_USERNAME", "value": "siteledger" },
        { "name": "SPRING_DATASOURCE_PASSWORD", "value": "YourStrongPassword123" },
        { "name": "APP_JWT_SECRET", "value": "YourSuperSecretKey" },
        { "name": "APP_CORS_ALLOWED_ORIGINS", "value": "https://yourdomain.com" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/site-ledger-backend",
          "awslogs-region": "ap-south-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

---

## 6. Database Backups

### 6.1 Automated RDS Backups (Option B & C)

RDS automatically creates daily backups with 7-day retention (configurable up to 35 days).

### 6.2 Manual PostgreSQL Backup (Option A — EC2)

```bash
# Create backup script
cat > ~/backup-db.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DB_NAME="site_ledger"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec site-ledger-db pg_dump -U siteledger $DB_NAME | \
    gzip > $BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${DB_NAME}_${TIMESTAMP}.sql.gz"
SCRIPT

chmod +x ~/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup-db.sh") | crontab -
```

### 6.3 Sync Backups to S3

```bash
# Install AWS CLI on EC2
sudo snap install aws-cli --classic
aws configure

# Update backup script to also sync to S3
# Add to backup-db.sh:
aws s3 cp $BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz \
    s3://site-ledger-backups/${DB_NAME}_${TIMESTAMP}.sql.gz
```

---

## 7. Monitoring & Logging

### 7.1 CloudWatch Setup

```bash
# Install CloudWatch agent on EC2
sudo apt install -y amazon-cloudwatch-agent

# Create config
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
  "metrics": {
    "metrics_collected": {
      "cpu": { "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] },
      "mem": { "measurement": ["mem_used_percent"] }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/docker/containers/*/*.log",
            "log_group_name": "site-ledger-docker-logs",
            "log_stream_name": "{instance_id}",
            "timestamp_format": "%Y-%m-%dT%H:%M:%S"
          }
        ]
      }
    }
  }
}
EOF

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json -s
```

### 7.2 View Logs

```bash
# Docker logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend

# CloudWatch (Browser)
# AWS Console → CloudWatch → Log groups → site-ledger-docker-logs
```

---

## 8. Security Checklist

| # | Item | Status |
|---|------|--------|
| ✅ | Change default passwords (`admin123`, `siteledger123`) | ☐ |
| ✅ | Use strong JWT secret (min 256-bit) | ☐ |
| ✅ | Restrict SSH to your IP only | ☐ |
| ✅ | Enable HTTPS (SSL/TLS) with Certbot or ACM | ☐ |
| ✅ | Database not publicly accessible (bind to 127.0.0.1 or private subnet) | ☐ |
| ✅ | Use environment variables for secrets (`.env` file) | ☐ |
| ✅ | Enable automatic security updates on EC2 | ☐ |
| ✅ | Set up CloudWatch alarms for unusual activity | ☐ |
| ✅ | Regular database backups to S3 | ☐ |
| ✅ | Use IAM roles instead of root credentials | ☐ |
| ✅ | Enable VPC with private subnets for DB | ☐ |
| ✅ | Set up WAF (Web Application Firewall) if production | ☐ |

### 8.1 Enable Auto Security Updates

```bash
# On EC2
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 8.2 Harden PostgreSQL

```bash
# On EC2 (inside container or directly)
# Edit pg_hba.conf to only allow local connections
# Already done in docker-compose.prod.yml (127.0.0.1:5432)
```

---

## 9. Cost Estimation

### Option A: Single EC2 (Recommended)

| Service | Specification | Monthly Cost (ap-south-1) |
|---------|--------------|--------------------------|
| EC2 (t3.medium) | 2 vCPU, 4GB RAM | ~$25 |
| EBS (30GB gp3) | 3000 IOPS | ~$4 |
| Domain (optional) | .com | ~$1 |
| **Total** | | **~$30/month** |

### Option B: Elastic Beanstalk + RDS

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| EC2 (t3.small) | 2 vCPU, 2GB RAM | ~$18 |
| RDS (db.t3.micro) | 2 vCPU, 1GB, 20GB | ~$15 |
| S3 + CloudFront | 10GB storage, 50GB transfer | ~$5 |
| ALB | 1 LCU avg | ~$8 |
| **Total** | | **~$46/month** |

### Option C: ECS Fargate

| Service | Specification | Monthly Cost |
|---------|--------------|--------------|
| Fargate (2 tasks) | 1 vCPU, 2GB each | ~$35 |
| RDS (db.t3.micro) | 2 vCPU, 1GB, 20GB | ~$15 |
| ALB | 1 LCU avg | ~$8 |
| ECR | 2 repos, 1GB each | ~$1 |
| **Total** | | **~$59/month** |

---

## 10. Troubleshooting

### Problem: Backend can't connect to PostgreSQL
```bash
# Check if DB is running
docker compose -f docker-compose.prod.yml ps postgres

# Check logs
docker compose -f docker-compose.prod.yml logs postgres

# Verify connection from backend container
docker exec site-ledger-backend \
    nc -zv postgres 5432
```

### Problem: Frontend shows blank page
```bash
# Check nginx logs
docker compose -f docker-compose.prod.yml logs frontend

# Verify API proxy
curl http://localhost/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Problem: CORS errors in browser
```bash
# Update CORS origins in .env
nano ~/app/.env
# Set CORS_ORIGINS to include your domain

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

### Problem: Out of memory
```bash
# Check memory usage
free -h
docker stats

# Increase swap (EC2)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Problem: SSL certificate expired
```bash
# Renew manually
sudo certbot renew

# Check auto-renewal timer
sudo systemctl status certbot.timer
```

---

## 🚀 Quick Start (Option A — Fastest Path)

Run these commands **on your local machine**:

```bash
# 1. Create the deployment files
#    (Files are already in the project)

# 2. Make deploy script executable
chmod +x site-ledger/infra/deploy-ec2.sh

# 3. Deploy to your EC2
./site-ledger/infra/deploy-ec2.sh <EC2-PUBLIC-IP> /path/to/your-key.pem

# 4. Open browser
echo "Open http://<EC2-PUBLIC-IP>"
echo "Login: admin / admin123"
```

---

## 📚 Reference

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Spring Boot on AWS](https://spring.io/guides/gs/spring-boot-aws/)
- [NGINX Configuration](https://nginx.org/en/docs/)
- [AWS Free Tier](https://aws.amazon.com/free/)

---

> **Pro Tip**: Start with **Option A** (Single EC2) for quick deployment. When your user base grows, migrate to **Option C** (ECS Fargate) for better scalability and high availability.

---

## 11. Free & Zero-Cost Deployment Options

Can you run Site Ledger **completely free** on AWS? **Partially, for 12 months** — and only with some trade-offs. Here's the reality:

### 11.1 AWS Free Tier (New Accounts Only — 12 Months)

If your AWS account is less than 12 months old, these are free:

| Service | Free Tier Includes | Used For |
|---------|-------------------|----------|
| 🖥️ **EC2 t2.micro** | 750 hrs/month (1 vCPU, 1GB RAM) | Backend + DB (on same instance) |
| 🗄️ **RDS db.t2.micro** | 750 hrs/month (20GB storage) | PostgreSQL (separate DB) |
| 📦 **S3** | 5GB storage + 20K GET/month | Frontend hosting |
| 🌐 **CloudFront** | 1TB transfer/month | CDN for frontend |
| 🔄 **ELB** | ❌ **NOT free** (~$18/month) | Load balancer |

#### ✅ Free Tier — Best Strategy

Since ELB is **not free**, avoid it. Use **Option A** (single EC2 with Docker Compose), but with a `t2.micro` instance:

```yaml
# In docker-compose.prod.yml, add JVM memory limits for backend:
services:
  backend:
    environment:
      # Add JVM args to limit memory (critical for t2.micro's 1GB RAM)
      JAVA_OPTS: "-Xms256m -Xmx384m"
```

#### ⚠️ The 1GB RAM Problem

`t2.micro` has only **1GB RAM**. Running everything is tight:

| Component | RAM Usage |
|-----------|-----------|
| Ubuntu OS | ~200MB |
| PostgreSQL | ~200MB |
| Spring Boot (with 384MB limit) | ~384MB + overhead |
| Nginx | ~20MB |
| **Total** | **~850MB — just within limits** |

**But performance will be slow** — Spring Boot takes 2-3 minutes to start, and pages will load noticeably slower.

#### ❌ What AWS Won't Give You For Free

- After 12 months, **everything above costs money** (~$30/month minimum)
- No free **static IP (Elastic IP)** — EC2 public IP changes on restart
- No free **SSL certificate** for ALB (ACM is free but ALB isn't)
- No free **load balancer**
- No free **WAF**

### 11.2 🏆 Better Free Alternatives (Not AWS)

These platforms offer **genuinely free tiers** that can run Site Ledger **indefinitely**:

| Platform | Free Tier | RAM | Best For |
|----------|-----------|-----|----------|
| **Oracle Cloud** 🥇 | **2 AMD VMs (1GB each) + 4 ARM VMs (24GB total) — FOREVER** | ✅ **Best** | Running the full stack |
| **Render.com** | Web service (sleeps after inactivity) + PostgreSQL 1GB | ⚠️ Sleeps | Testing / demo |
| **Railway.app** | $5 free credits/month (runs ~500 hours) | ⚠️ Limited | Light usage |
| **Fly.io** | 3 shared VMs (256MB each) + 3GB storage | ⚠️ Limited | Light usage |
| **Koyeb** | 1 app (sleeps on idle) + 1GB storage | ⚠️ Sleeps | Testing |

### 11.3 🥇 Best Free Option: Oracle Cloud Free Tier

**Oracle Cloud** is the only cloud provider offering **permanently free** compute powerful enough for Site Ledger.

#### What You Get Free (Forever)

| Resource | Specification |
|----------|--------------|
| **AMD VM** | 2 instances × 1 OCPU, 1GB RAM each |
| **ARM VM** (recommended) | Up to 4 instances × 24GB **total** RAM, 4 OCPU |
| **Storage** | 200GB total (boot volumes) |
| **Load Balancer** | 1 free (10Mbps) |
| **Database** | No free managed DB, but can run PostgreSQL on the VM |

#### Step-by-Step: Deploy on Oracle Cloud Free Tier

```bash
# 1. Sign up at https://www.oracle.com/cloud/free/
#    (No credit card required for Free Tier, but they ask for it for verification)

# 2. Create an ARM VM (much more powerful than t2.micro)
#    Shape: VM.Standard.A1.Flex (OCPU: 1, Memory: 6GB) ← 6GB RAM!
#    Image: Ubuntu 22.04 or 24.04 LTS
#    SSH Key: Generate or upload yours

# 3. After VM is created, SSH in:
ssh -i your-key.pem ubuntu@<ORACLE-VM-PUBLIC-IP>

# 4. Install Docker:
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu
exit  # then reconnect

# 5. Open firewall ports (Oracle Cloud has a separate firewall):
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT

# 6. Also add Ingress Rules in Oracle Cloud Console:
#    Network → Virtual Cloud Networks → Your VCN → Security List → Add Ingress Rules
#    - Source: 0.0.0.0/0, Protocol: TCP, Port: 80, Description: HTTP
#    - Source: 0.0.0.0/0, Protocol: TCP, Port: 443, Description: HTTPS
#    - Source: YOUR_IP/32, Protocol: TCP, Port: 22, Description: SSH

# 7. Deploy using existing files (clone from Git or upload):
#    Follow "Option A" steps from this guide — the Docker files already work!
git clone <your-repo-url> site-ledger
cd site-ledger

# 8. Create .env and start:
cat > .env << 'EOF'
DB_PASSWORD=YourStrongPassword
JWT_SECRET=YourSecretKeyForJWTTokenSigning2024
CORS_ORIGINS=http://<ORACLE-VM-IP>
EOF

docker compose -f docker-compose.prod.yml up -d --build

# 9. Open http://<ORACLE-VM-IP> in your browser
```

### 11.4 📦 Alternative: Render.com (Good for Demo)

Render.com has a free tier that's simple to set up but services **sleep after 15 minutes of inactivity** (wakes on next request, takes ~30 seconds).

#### Backend on Render

```yaml
# site-ledger/render.yaml
services:
  - type: web
    name: site-ledger-backend
    env: java
    plan: free
    buildCommand: mvn package -DskipTests
    startCommand: java -Xmx256m -jar target/site-ledger-backend-1.0.0.jar
    envVars:
      - key: SPRING_DATASOURCE_URL
        fromDatabase:
          name: site-ledger-db
          property: connectionString
      - key: SPRING_DATASOURCE_USERNAME
        fromDatabase:
          name: site-ledger-db
          property: user
      - key: SPRING_DATASOURCE_PASSWORD
        fromDatabase:
          name: site-ledger-db
          property: password
      - key: APP_JWT_SECRET
        value: your-secret-key-here

databases:
  - name: site-ledger-db
    plan: free
    databaseName: site_ledger
    user: siteledger
```

Then just connect your GitHub repo to Render and it auto-deploys.

### 11.5 📊 Free Tier Comparison

| Feature | AWS (12mo) | Oracle Cloud (Forever) | Render.com | Railway.app |
|---------|-----------|----------------------|------------|-------------|
| **RAM** | 1GB (tight) | **6GB+ (comfortable)** | 512MB | 512MB |
| **CPU** | 1 vCPU (burst) | **1-4 OCPU** | Shared | Shared |
| **Duration** | 12 months only | **Forever** | Forever (sleeps) | Monthly credits |
| **SSL/HTTPS** | Extra $ | Free LB + SSL | Free | Free |
| **PostgreSQL** | Free RDS (12mo) | Run on VM (free) | Free (1GB) | Free (limited) |
| **Sleep on idle** | No | No | **Yes (15min)** | No |
| **Setup effort** | Medium | Medium | **Easy (Git deploy)** | Easy |

### 11.6 💡 My Recommendation

| Your Need | Best Option |
|-----------|-------------|
| "I just want to test it" | **Render.com** (free, easy, Git-based deploy) |
| "I want it running 24/7 for free" | **Oracle Cloud ARM VM** (6GB RAM, powerful, truly free) |
| "I already have AWS free tier active" | **AWS t2.micro** (tight but works for 12 months) |
| "I want the fastest setup" | **Railway.app** or **Koyeb** (one-click from Git) |

### 11.7 Important: Reduce Memory Usage

Whichever free option you choose, **reduce Spring Boot's memory** to avoid crashes:

In [`site-ledger/docker-compose.prod.yml`](site-ledger/docker-compose.prod.yml), update the backend:

```yaml
services:
  backend:
    environment:
      JAVA_OPTS: "-Xms128m -Xmx256m"
      SPRING_JPA_SHOW_SQL: "false"  # Disable SQL logging
```

Also, on the EC2/VM itself, add swap space:

```bash
# Add 2GB swap (prevents OOM kills on low-RAM instances)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```
