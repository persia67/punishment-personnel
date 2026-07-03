#!/bin/bash

# ==============================================================================
# HSE SafeWatch & Reward AI - One-Line Ubuntu Installer
# ==============================================================================
# این اسکریپت سامانه هوشمند HSE SafeWatch را به همراه لایه‌های امنیتی، فایروال،
# وب‌سرور انجین‌اکس (Nginx) و گواهینامه امنیتی SSL (خودکار یا خودامضا) نصب می‌کند.
# ==============================================================================

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Clear terminal screen
clear

echo -e "${CYAN}"
echo "======================================================================"
echo "    __  _________ ______   _____                      _ _       _     "
echo "   / / / / ___/ ____/     / ___/____ _____ _      __ ____ _  __| |__  "
echo "  / /_/ /\__ \/ __/       \__ \/ __ \`/ __ \ | /| / / __ \`/ /_  __/ /  "
echo " / __  /___/ / /___      ___/ / /_/ / /_/ / |/ |/ / /_/ / /  / /_/_/  "
echo "/_/ /_/____/_____/      /____/\__,_/\__,_/|__/|__/\__,_/_/   \__(_)   "
echo "                                                                      "
echo "            HSE SafeWatch & Reward AI - Ubuntu Installer              "
echo "======================================================================"
echo -e "${NC}"
echo -e "${YELLOW}به اسکریپت نصب خودکار و امنیتی سامانه هوشمند HSE خوش آمدید.${NC}"
echo -e "${YELLOW}Welcome to the automated secure installer for HSE SafeWatch AI.${NC}"
echo "----------------------------------------------------------------------"

# 1. Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}خطا: این اسکریپت باید با دسترسی مدیریت (root) یا با دستور sudo اجرا شود.${NC}"
  echo -e "${RED}Error: This script must be run as root or with sudo.${NC}"
  exit 1
fi

# Detect current directory as source
SRC_DIR=$(pwd)
INSTALL_DIR="/opt/hse-safewatch"

echo -e "\n${BLUE}[1/7] بروزرسانی مخازن و نصب پیش‌نیازها... / Updating system & installing prerequisites...${NC}"
apt update && apt install -y curl git ufw nginx certbot python3-certbot-nginx openssl

# 2. Check and Install Node.js LTS (v20)
if ! command -v node &> /dev/null; then
  echo -e "${BLUE}در حال نصب Node.js نسخه ۲۰ LTS... / Installing Node.js v20 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
else
  NODE_VER=$(node -v)
  echo -e "${GREEN}Node.js قبلاً نصب شده است: $NODE_VER / Node.js is already installed: $NODE_VER${NC}"
fi

# 3. Create secure system user 'hse-app'
echo -e "\n${BLUE}[2/7] ساخت کاربر سیستمی امن برای اجرای برنامه... / Creating secure system user...${NC}"
if ! id "hse-app" &>/dev/null; then
  useradd -r -m -U -d /home/hse-app -s /bin/bash hse-app
  echo -e "${GREEN}کاربر hse-app با موفقیت ساخته شد. / Created user 'hse-app'.${NC}"
else
  echo -e "${GREEN}کاربر hse-app از قبل وجود دارد. / User 'hse-app' already exists.${NC}"
fi

# 4. Copying source and installing packages
echo -e "\n${BLUE}[3/7] انتقال فایل‌های برنامه به دایرکتوری نصب... / Copying files to installation directory...${NC}"
mkdir -p "$INSTALL_DIR"

# Copy files excluding node_modules, .git etc.
rsync -av --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='release' "$SRC_DIR/" "$INSTALL_DIR/"

# Create storage directory for database if needed
mkdir -p "$INSTALL_DIR/data"
touch "$INSTALL_DIR/data/db.json"

echo -e "${BLUE}در حال نصب بسته‌های npm و بیلد پروژه... / Installing npm packages and building project...${NC}"
echo -e "${YELLOW}این کار با دسترسی بالا انجام می‌شود تا پارت‌های محلی و محیط سیستم به طور کامل و صحیح شناسایی شوند.${NC}"

# Install dependencies and build as root (safer for PATH resolution and Node.js toolchains)
cd "$INSTALL_DIR" || exit
npm install
npm run build

# Secure permissions and assign full ownership to 'hse-app' AFTER installation and build are complete
chown -R hse-app:hse-app "$INSTALL_DIR"

# Ensure environmental sample exists
if [ ! -f "$INSTALL_DIR/.env" ]; then
  if [ -f "$INSTALL_DIR/.env.example" ]; then
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
  else
    touch "$INSTALL_DIR/.env"
  fi
  chown hse-app:hse-app "$INSTALL_DIR/.env"
fi

# 5. Security Hardening (Firewall Config)
echo -e "\n${BLUE}[4/7] ایمن‌سازی پورت‌ها و کانفیگ فایروال (UFW)... / Configuring firewall...${NC}"
echo -e "${YELLOW}این مرحله فایروال اوبونتو را فعال کرده و تنها دسترسی به پورت‌های ۲۲ (SSH)، ۸۰ (HTTP) و ۴۴۳ (HTTPS) را مجاز می‌کند.${NC}"
echo -e "${YELLOW}پورت اصلی برنامه (3000) پشت پراکسی مخفی شده و هکرها امکان نفوذ مستقیم به آن را نخواهند داشت.${NC}"

ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP Nginx'
ufw allow 443/tcp comment 'HTTPS Nginx'
echo "y" | ufw enable
ufw status verbose

# 6. Configuring SSL & Nginx Proxy
echo -e "\n${BLUE}[5/7] تنظیم وب‌سرور Nginx و گواهینامه SSL... / Nginx & SSL setup...${NC}"
echo "------------------------------------------------------------"
echo "روش دسترسی به برنامه را انتخاب کنید:"
echo "Choose how you want users to access the application:"
echo "1) آدرس دامنه اینترنتی (دریافت SSL رایگان Let's Encrypt)"
echo "   Internet Domain Name (Auto Let's Encrypt SSL)"
echo "2) آدرس IP سرور داخلی (تولید گواهینامه SSL خودامضا امن)"
echo "   Internal Server IP (Secure Self-Signed SSL Certificate)"
echo "------------------------------------------------------------"
# Get primary server IP as helper
SERVER_IP=$(hostname -I | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
  SERVER_IP="127.0.0.1"
fi

if [ -t 0 ]; then
  read -p "گزینه مورد نظر (1 یا 2) / Choose option (1 or 2): " SSL_CHOICE
else
  echo -e "${YELLOW}غیرتعاملی (پایپ شده): انتخاب خودکار گزینه ۲ (SSL خودامضا روی آی‌پی سرور) / Non-interactive (piped): Auto-selecting option 2 (Self-signed SSL)...${NC}"
  SSL_CHOICE="2"
fi

if [ "$SSL_CHOICE" == "1" ]; then
  # Let's Encrypt Domain Option
  echo -e "\n${CYAN}تنظیم آدرس دامنه / Domain Name Setup${NC}"
  if [ -t 0 ]; then
    read -p "نام دامنه خود را وارد کنید (مثال: hse.company.ir): " DOMAIN_NAME
    read -p "ایمیل خود را جهت دریافت هشدارهای تمدید SSL وارد کنید: " SSL_EMAIL
  else
    DOMAIN_NAME=""
    SSL_EMAIL=""
  fi
  
  if [ -z "$DOMAIN_NAME" ] || [ -z "$SSL_EMAIL" ]; then
    echo -e "${RED}خطا: نام دامنه و ایمیل نمی‌توانند خالی باشند. بازگشت به حالت IP.${NC}"
    SSL_CHOICE="2"
  fi
fi

if [ "$SSL_CHOICE" == "2" ] || [ -z "$SSL_CHOICE" ]; then
  # Self-Signed IP Option
  DOMAIN_NAME=$SERVER_IP
  echo -e "\n${CYAN}تنظیم گواهینامه خودامضا بر روی آی‌پی: $SERVER_IP${NC}"
  echo -e "${BLUE}در حال تولید کلیدهای رمزنگاری قوی SSL (مدت اعتبار ۱۰ سال)...${NC}"
  
  SSL_KEY_DIR="/etc/ssl/private"
  SSL_CRT_DIR="/etc/ssl/certs"
  
  openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$SSL_KEY_DIR/hse-safewatch.key" \
    -out "$SSL_CRT_DIR/hse-safewatch.crt" \
    -subj "/C=IR/ST=Tehran/L=Tehran/O=HSE SafeWatch/OU=IT/CN=$SERVER_IP"
    
  echo -e "${GREEN}گواهینامه خودامضا با موفقیت تولید شد. / Self-signed certificate generated.${NC}"
fi

# Create Nginx Config
NGINX_CONF="/etc/nginx/sites-available/hse-safewatch"

if [ "$SSL_CHOICE" == "1" ]; then
  # Nginx template for Let's Encrypt
  cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME;

    # Dynamic Proxy for express backend + vite frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
else
  # Nginx template with custom Self-Signed SSL Pre-configured
  cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME;
    # Auto-redirect all HTTP traffic to secure HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN_NAME;

    # SSL Strong Configuration
    ssl_certificate /etc/ssl/certs/hse-safewatch.crt;
    ssl_certificate_key /etc/ssl/private/hse-safewatch.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "upgrade-insecure-requests" always;

    # Dynamic Proxy to PM2 / Node backend (Port 3000)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
fi

# Enable config and restart Nginx
ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/"
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx
echo -e "${GREEN}پیکربندی Nginx با موفقیت اعمال شد. / Nginx configuration loaded successfully.${NC}"

# If Let's Encrypt option was selected, run Certbot now
if [ "$SSL_CHOICE" == "1" ]; then
  echo -e "\n${BLUE}در حال دریافت خودکار گواهینامه SSL رایگان Let's Encrypt... / Fetching Let's Encrypt SSL...${NC}"
  certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}گواهینامه Let's Encrypt با موفقیت نصب و روی Nginx فعال شد!${NC}"
  else
    echo -e "${RED}اخطار: خطا در دریافت گواهی از Let's Encrypt. لطفاً وضعیت دامنه و پورت ۸۰ خود را بررسی کنید.${NC}"
    echo -e "${YELLOW}به عنوان جایگزین، گواهینامه خودامضا برای آی‌پی سرور فعال گردید تا امنیت حفظ شود.${NC}"
    
    # Fallback to Self-Signed Nginx Config
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout "/etc/ssl/private/hse-safewatch.key" \
      -out "/etc/ssl/certs/hse-safewatch.crt" \
      -subj "/C=IR/ST=Tehran/L=Tehran/O=HSE SafeWatch/OU=IT/CN=$SERVER_IP"
      
    # Rewrite to Self-signed Nginx template
    cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $SERVER_IP;

    ssl_certificate /etc/ssl/certs/hse-safewatch.crt;
    ssl_certificate_key /etc/ssl/private/hse-safewatch.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    systemctl restart nginx
  fi
fi

# 7. Systemd Daemon Service Setup
echo -e "\n${BLUE}[6/7] ایجاد سرویس پس‌زمینه لینوکس (Systemd Service)... / Configuring systemd daemon...${NC}"
echo -e "${YELLOW}این سرویس تضمین می‌کند که نرم‌افزار حتی با ریستارت شدن سرور، به‌طور خودکار بالا بیاید و همیشه فعال بماند.${NC}"

# Dynamically locate the exact path to node binary on the server
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
  NODE_PATH="/usr/bin/node"
fi

cat > /etc/systemd/system/hse-safewatch.service <<EOF
[Unit]
Description=HSE SafeWatch & Reward AI Application Service
After=network.target

[Service]
Type=simple
User=hse-app
WorkingDirectory=$INSTALL_DIR
ExecStart=$NODE_PATH dist/server.cjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# Reload, enable and start service
systemctl daemon-reload
systemctl enable hse-safewatch.service
systemctl restart hse-safewatch.service

echo -e "${GREEN}سرویس پس‌زمینه با موفقیت فعال و راه‌اندازی شد. / Systemd service started successfully.${NC}"

# 8. Success Report & Final instructions
echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}   نصب سامانه هوشمند HSE SafeWatch & Reward AI با موفقیت پایان یافت!  ${NC}"
echo -e "${GREEN}   Installation of HSE SafeWatch & Reward AI completed successfully!  ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "\n${YELLOW}مشخصات و آدرس‌های دسترسی / Access Information:${NC}"
echo -e "----------------------------------------------------------------------"
if [ "$SSL_CHOICE" == "1" ]; then
  echo -e "آدرس دامنه امن (HTTPS):   ${CYAN}https://$DOMAIN_NAME${NC}"
else
  echo -e "آدرس آی‌پی سرور امن (HTTPS): ${CYAN}https://$SERVER_IP${NC}"
  echo -e "${YELLOW}نکته: به دلیل استفاده از SSL خودامضا (Self-Signed)، مرورگر در اولین ورود هشدار امنیتی نشان می‌دهد (Connection is not private).${NC}"
  echo -e "${YELLOW}جهت ورود بدون مشکل، روی دکمه Advanced کلیک کرده و گزینه Proceed to $SERVER_IP (unsafe) را انتخاب کنید.${NC}"
fi
echo -e "مسیر نصب برنامه:          ${CYAN}$INSTALL_DIR${NC}"
echo -e "نام کاربر ایمن سیستم:       ${CYAN}hse-app${NC}"
echo "----------------------------------------------------------------------"
echo -e "دستورات مدیریتی کاربردی / Useful Management Commands:"
echo -e "۱. مشاهده وضعیت برنامه:     ${CYAN}systemctl status hse-safewatch${NC}"
echo -e "۲. متوقف کردن برنامه:       ${CYAN}systemctl stop hse-safewatch${NC}"
echo -e "۳. راه‌اندازی مجدد برنامه:   ${CYAN}systemctl restart hse-safewatch${NC}"
echo -e "۴. مشاهده لاگ‌های زنده:      ${CYAN}journalctl -u hse-safewatch -f${NC}"
echo "----------------------------------------------------------------------"
echo -e "${GREEN}پرتال با موفقیت در خدمت شماست. با تشکر از انتخاب شما!${NC}"
echo -e "${GREEN}The HSE system is live and secure. Thank you for using SafeWatch AI!${NC}"
echo -e "${GREEN}======================================================================${NC}"
