# ☁️ Site Ledger — AWS Free Tier Deployment Guide (IP-based, No Domain)

> **Zero-cost deployment** using AWS Free Tier. Sirf IP address se kaam chalega, domain nahi chahiye.

---

## 📋 Quick Overview — Total Time: ~30 minutes

```
Step 1: AWS Console mein EC2 launch karo   → 5 min
Step 2: SSH karo aur Docker install karo   → 5 min
Step 3: Files upload karo                   → 5 min
Step 4: Docker Compose se deploy karo       → 10 min (build time)
Step 5: Browser mein kholo aur use karo     → 2 min
```

---

## 🚀 Step-by-Step Guide

---

### STEP 1: AWS Console se EC2 Instance Launch Karo

1. **AWS Console mein login karo** → https://console.aws.amazon.com
2. **Region select karo** — top-right corner mein **Asia Pacific (Mumbai) `ap-south-1`** select karo (ye India ke closest hai, speed achi milegi)

3. **EC2 Dashboard mein jao** — Search bar mein "EC2" likho aur click karo

4. **"Launch Instance" button click karo**

5. **Instance details fill karo:**

| Field | Value |
|-------|-------|
| **Name** | `site-ledger` |
| **Application and OS Images** | ✅ **Ubuntu Server 24.04 LTS** (Free Tier eligible) |
| **Architecture** | 64-bit (x86) |
| **Instance type** | ✅ **t2.micro** (1 vCPU, 1GB RAM — Free Tier eligible) |
| **Key pair** | **"Create new key pair"** click karo → Name: `site-ledger-key` → Type: RSA → Download `.pem` file **aur safe rakh lo** |
| **Network settings** | Click **"Edit"** → Phir neeche diye gaye rules add karo |
| **Storage** | Default **20GB gp2** (Free Tier eligible) — theek hai |

6. **Security Group Rules** — Network settings mein ye rules add karo:

| Rule | Type | Port | Source | Reason |
|------|------|------|--------|--------|
| 1 | **SSH** | 22 | `0.0.0.0/0` | Tumhara connection ke liye |
| 2 | **HTTP** | 80 | `0.0.0.0/0` | Website ke liye |

> ⚠️ Baad mein SSH ko sirf apne IP se restrict karna (security ke liye). Abhi `0.0.0.0/0` rakh do.

7. **"Launch Instance" click karo** ✅

8. **Instance ka IP note karo:**
   - Instances list mein jao
   - Apne `site-ledger` instance par click karo
   - **"Public IPv4 address"** copy karo (dikhne lagega kuch aisa: `13.126.xx.xx`)
   - **Ye IP address save karo — baar baar chahiye hoga**

---

### STEP 2: EC2 se SSH karo aur Docker Install karo

Apne **LOCAL computer** (jahan `.pem` file download ki hai) par terminal kholo:

```bash
# 1. PEM file permissions set karo (important!)
chmod 400 ~/Downloads/site-ledger-key.pem

# 2. SSH karo (IP replace karo apne EC2 ke IP se)
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx

# ⚡ Agar ye error aaye: "Permission denied (publickey)"
#    Toh is command se尝试 karo:
ssh -o IdentitiesOnly=yes -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx
```

**EC2 ke andar aa gaye? Ab Docker install karo:**

```bash
# System update
sudo apt update && sudo apt upgrade -y

# Docker install
sudo apt install -y docker.io docker-compose-v2

# Docker ko start aur enable karo
sudo systemctl enable docker
sudo systemctl start docker



# Apne user ko Docker group mein add karo (sudo ki zaroorat nahi hogi)
sudo usermod -aG docker ubuntu

# Logout aur login phir se
exit
```

**Phir se SSH karo:**

```bash
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx
```

**Verify karo ki Docker install hua:**

```bash
docker --version
docker compose version
```

> ✅ Dono commands ka version dikhna chahiye. Agar nahi dikha toh upar ke steps dobara karo.

---

### STEP 3: Project Files EC2 par Upload karo

Abhi bhi LOCAL terminal mein ho (EC2 mein nahi). Naya terminal kholo:

```bash
# Project directory mein jao
cd /media/prince-kumar-maurya/Work_Data/Abhishek\ Project/site-ledger

# Sab files ko EC2 par copy karo (IP replace karo)
rsync -avz --exclude 'node_modules/' --exclude 'target/' --exclude 'android/' \
    -e "ssh -i ~/Downloads/site-ledger-key.pem" \
    . ubuntu@13.126.xx.xx:~/app/
```

> ⏳ Isme 1-2 minute lagenge. It's copying the whole project.

**Verify karo ki files pahunch gayi:**

```bash
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@3.6.126.248 "ls -la ~/app/"
```

> `backend/`, `frontend/`, `docker-compose.prod.yml`, `infra/` — ye sab dikhne chahiye ✅

---

### STEP 4: Docker Compose se Application Deploy karo

**EC2 mein SSH karke ye commands run karo:**

```bash
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@3.6.126.248
```

**Ab EC2 ke andar:**

```bash
# App directory mein jao
cd ~/app

# Environment file banao
cat > .env << 'ENVEOF'
DB_PASSWORD=siteledger123
JWT_SECRET=MySecretKeyForSiteLedgerApp2024OnAwsFreeTier123
CORS_ORIGINS=http://3.6.126.248
ENVEOF

# IP address apne EC2 ke actual IP se replace karna (upar CORS_ORIGINS mein)
nano .env
# CORS_ORIGINS line mein apna IP daal do
# Ctrl+X → Y → Enter (save karne ke liye)
```

**Ab deploy karo (containers build aur start honge):**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

> ⏳ **Yeh sabse lamba step hai — 3-5 minutes lagega.** 
> - Pehli baar: Docker images download + Java build + npm build + Nginx setup
> - Baad ki baar (update karte waqt): sirf changed parts build honge, fast hoga

**Deploy ho gaya? Verify karo:**

```bash
# 1. Teeno containers running hain?
docker compose -f docker-compose.prod.yml ps

# Output kuch aisa dikhna chahiye:
# NAME                  STATUS
# site-ledger-db        Up 2 minutes (healthy)
# site-ledger-backend   Up 2 minutes
# site-ledger-frontend  Up 2 minutes

# 2. Backend chal raha hai?
docker compose -f docker-compose.prod.yml logs backend | tail -20

# Output mein "Started SiteLedgerApplication" dikhna chahiye

# 3. Backend API test karo?
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response aana chahiye: {"token":"eyJ...", "type":"Bearer", "username":"admin", "role":"SUPER_ADMIN"}
```

> ✅ Agar JWT token response aaya, toh backend perfectly kaam kar raha hai!

---

### STEP 5: Browser mein Kholo aur Use Karo

1. **Browser kholo** → Address bar mein daalo:
   ```
   http://13.126.xx.xx
   ```
   (apna actual EC2 IP daalna)

2. **Login page dikhna chahiye** ✅

3. **Login karo:**
   | Username | Password | Role |
   |----------|----------|------|
   | `admin` | `admin123` | SUPER_ADMIN (full access) |
   | `manager` | `manager123` | MANAGER |
   | `siteincharge` | `site123` | SITE_INCHARGE |

4. **Dashboard dikh raha hai** → Aap successfully deployed ho gaye! 🎉

---

## 🛠️ Useful Commands (Jab bhi zaroorat pade)

```bash
# Status check
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && docker compose -f docker-compose.prod.yml ps"

# Logs dekhna (backend)
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && docker compose -f docker-compose.prod.yml logs -f backend"

# Logs dekhna (frontend)
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && docker compose -f docker-compose.prod.yml logs -f frontend"

# Restart karna
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && docker compose -f docker-compose.prod.yml restart"

# Stop karna
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && docker compose -f docker-compose.prod.yml down"

# Update karna (naya code deploy)
# Local se files copy karo:
rsync -avz --exclude 'node_modules/' --exclude 'target/' --exclude 'android/' \
    -e "ssh -i ~/Downloads/site-ledger-key.pem" \
    . ubuntu@13.126.xx.xx:~/app/

# Phir rebuild karo:
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && docker compose -f docker-compose.prod.yml up -d --build"
```

---

## ⚠️ Common Problems aur Solutions

### ❌ Problem: "localhost didn't send any data" / blank page

**Reason:** Container abhi start nahi hua hai ya crash ho raha hai

**Solution:**
```bash
# Logs check karo
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && docker compose -f docker-compose.prod.yml logs backend"

# Agar "OutOfMemoryError" dikhe to:
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
```

### ❌ Problem: 502 Bad Gateway

**Reason:** Nginx chal raha hai but backend nahi chal raha

**Solution:**
```bash
# Backend restart karo
ssh -i ~/Downloads/site-ledger-key.pem ubuntu@13.126.xx.xx \
  "cd ~/app && docker compose -f docker-compose.prod.yml restart backend"
```

### ❌ Problem: Port 80 already in use

**Solution:**
```bash
# Check kon use kar raha hai port 80
sudo lsof -i :80

# Apache hatao (agar hai)
sudo apt remove -y apache2
```

### ❌ Problem: Instance restart hone ke baad IP change ho gaya

**Solution:** AWS Console mein jaake:
1. EC2 → Elastic IPs → Allocate Elastic IP
2. Apne instance ke saath associate kar do
3. Ab IP change nahi hoga (⚠️ Lekin Elastic IP free hai jab tak instance running hai. Agar instance stop kiya toh ₹ lagega)

---

## 💰 Free Tier Limits — In Points Yaad Rakho

| Resource | Free Limit | Hamara Usage |
|----------|-----------|--------------|
| EC2 t2.micro | 750 hours/month (≈ 24×7) | ✅ 1 instance = 730 hrs/month — free |
| EBS Storage | 30GB/month | ✅ 20GB — free |
| Data Transfer | 100GB/month out | ✅ Bilkul enough |
| **Cost** | **$0/month** | **✅ Free** |

> ⚠️ **12 months ke baad** ye sab paid ho jayega (~$25/month). Tab aapko decide karna hoga — pay karna hai ya Oracle Cloud ya Render.com par migrate karna hai.

---

## ✅ Final Checklist

| # | Task | Done? |
|---|------|-------|
| 1 | EC2 t2.micro Ubuntu instance launched | ☐ |
| 2 | Security group mein port 80 aur 22 open | ☐ |
| 3 | SSH key download ki (`.pem` file) | ☐ |
| 4 | Docker & Docker Compose install hua | ☐ |
| 5 | Project files EC2 par upload hue | ☐ |
| 6 | `.env` file bana diya | ☐ |
| 7 | `docker compose up -d --build` successful | ☐ |
| 8 | `http://<EC2-IP>` browser mein khul raha hai | ☐ |
| 9 | Admin login ho raha hai | ☐ |

> ✅ **Sab done? Congratulations!** Aapne successfully Site Ledger ko AWS Free Tier par deploy kar diya! 🎉
