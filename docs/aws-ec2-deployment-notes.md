# AWS EC2 Deployment Notes

## Current CI/CD Status

Your project has reached this stage:

```text
Code pushed to GitHub
  -> GitHub Actions CI passed
  -> Docker images built
  -> Docker images pushed to Docker Hub
```

Docker Hub images:

```text
pradeepdumka/peoplespace-backend:latest
pradeepdumka/peoplespace-frontend:latest
```

Next stage:

```text
Deploy Docker Hub images on AWS EC2
```

## AWS Deployment Flow

The deployment flow is:

```text
Docker Hub
  -> AWS EC2 Ubuntu server
  -> Install Docker
  -> Create docker-compose.yaml
  -> docker compose pull
  -> docker compose up -d
  -> App runs on public IP
```

Interview answer:

> After CI pushes images to Docker Hub, I deploy them on AWS EC2 using Docker Compose. The EC2 server pulls the already-built images and runs them as containers.

## Before Creating EC2: Safety Steps

Before creating any AWS server, do these safety steps:

```text
1. Enable MFA
2. Create billing alerts
3. Create AWS Budget
4. Use only Free Tier eligible resources
```

### Enable MFA

Path:

```text
AWS Console
  -> top right account name
  -> Security credentials
  -> Multi-factor authentication MFA
  -> Assign MFA device
```

Use an authenticator app:

```text
Google Authenticator
Microsoft Authenticator
Authy
```

### Create Billing Alert

Path:

```text
AWS Console
  -> Billing and Cost Management
  -> Billing preferences
```

Enable:

```text
Receive Free Tier Usage Alerts
Receive CloudWatch Billing Alerts
```

### Create AWS Budget

Path:

```text
AWS Console
  -> Billing and Cost Management
  -> Budgets
  -> Create budget
```

Recommended budget:

```text
$1 or $5 monthly cost budget
```

Interview answer:

> Before using AWS, I enable MFA and billing alerts to avoid security and cost issues.

## Create Free Tier EC2 Instance

Go to:

```text
AWS Console
  -> EC2
  -> Instances
  -> Launch instances
```

Do not use:

```text
EC2 -> Instance Types
```

That page is only for viewing instance types.

## EC2 Recommended Settings

### Name

Example:

```text
app-ci-cd-server
```

### OS Image

Choose:

```text
Ubuntu Server 24.04 LTS
```

Make sure it says:

```text
Free tier eligible
```

### Instance Type

Choose:

```text
t2.micro
```

or:

```text
t3.micro
```

Only select it if it is marked:

```text
Free tier eligible
```

### Key Pair

Create a key pair:

```text
Name: pp-ci-cd-key
Type: RSA
Format: .pem
```

AWS downloads:

```text
pp-ci-cd-key.pem
```

Important:

```text
Never commit .pem files to GitHub.
Keep the .pem file private.
```

### Security Group

Inbound rules:

```text
SSH   22   Your IP only
HTTP  80   0.0.0.0/0
```

Later for HTTPS:

```text
HTTPS 443  0.0.0.0/0
```

Do not expose MongoDB:

```text
Do not open 27017 publicly.
```

## SSH Into EC2

After the EC2 instance is running, copy:

```text
Public IPv4 address
```

On Mac:

```bash
cd ~/Downloads
chmod 400 pp-ci-cd-key.pem
ssh -i pp-ci-cd-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Example:

```bash
ssh -i pp-ci-cd-key.pem ubuntu@13.53.168.216
```

If SSH asks:

```text
Are you sure you want to continue connecting?
```

Type:

```text
yes
```

## Common SSH Error

Error:

```text
Warning: Identity file app-ci-cd-key.pem not accessible: No such file or directory.
Permission denied (publickey).
```

Meaning:

```text
The key file name or path is wrong.
```

Fix:

```bash
cd ~/Downloads
ls *.pem
chmod 400 pp-ci-cd-key.pem
ssh -i pp-ci-cd-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Interview answer:

> EC2 uses key pair authentication. If the key file path is wrong or permissions are incorrect, SSH login fails with public key permission errors.

## Install Docker On EC2

After SSH login, run:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
```

Then logout:

```bash
exit
```

SSH again:

```bash
ssh -i pp-ci-cd-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

Check Docker:

```bash
docker --version
docker compose version
```

Interview answer:

> I install Docker and Docker Compose on EC2 so the server can pull and run application containers.

## Production Docker Compose On EC2

On EC2, create a folder:

```bash
mkdir app-ci-cd
cd app-ci-cd
```

Create:

```bash
nano docker-compose.yaml
```

Production compose example:

```yaml
services:
  mongo:
    image: mongo:7
    container_name: peoplespace-mongo
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: change-this-password
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test:
        [
          "CMD",
          "mongosh",
          "--quiet",
          "-u",
          "admin",
          "-p",
          "change-this-password",
          "--authenticationDatabase",
          "admin",
          "--eval",
          "db.adminCommand('ping')"
        ]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 20s

  backend:
    image: pradeepdumka/peoplespace-backend:latest
    container_name: peoplespace-backend
    restart: unless-stopped
    depends_on:
      mongo:
        condition: service_healthy
    environment:
      HOST: 0.0.0.0
      PORT: 4000
      MONGODB_URI: mongodb://admin:change-this-password@mongo:27017/user_dashboard?authSource=admin
      JWT_SECRET: replace-with-long-random-secret
      JWT_EXPIRES_IN: 7d
      CLIENT_URL: http://YOUR_EC2_PUBLIC_IP

  frontend:
    image: pradeepdumka/peoplespace-frontend:latest
    container_name: peoplespace-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  mongo_data:
```

Important:

```text
Replace change-this-password.
Replace replace-with-long-random-secret.
Replace YOUR_EC2_PUBLIC_IP.
```

Do not expose backend port publicly at first.

The frontend Nginx container will proxy `/api` requests to the backend container.

## Run App On EC2

On EC2:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Check logs:

```bash
docker compose logs -f
```

Open in browser:

```text
http://YOUR_EC2_PUBLIC_IP
```

Interview answer:

> I deploy by pulling the latest Docker images from Docker Hub and starting them with Docker Compose in detached mode.

## Update Deployment Later

When you push new code:

```text
GitHub Actions builds new images
GitHub Actions pushes latest images to Docker Hub
```

Then on EC2:

```bash
cd app-ci-cd
docker compose pull
docker compose up -d
```

Interview answer:

> For updates, I pull the latest images and restart containers with Docker Compose.

## Stop Or Remove App

Stop containers:

```bash
docker compose down
```

Stop and remove volume data:

```bash
docker compose down -v
```

Use `-v` carefully because it deletes MongoDB data.

## Cost Safety

When finished practicing:

```text
EC2 Console
  -> Instances
  -> Select instance
  -> Instance state
  -> Stop instance
```

If you no longer need it:

```text
Terminate instance
```

Important:

```text
Stopped EC2 does not charge compute,
but storage volumes may still have small charges.
```

Interview answer:

> I stop or terminate unused AWS resources to avoid unnecessary charges.
