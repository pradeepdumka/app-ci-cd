# Full CI/CD Pipeline — Step by Step

Use this one note to understand the finished pipeline and to build the same pipeline again for a new app.

This project is PeopleSpace:

```text
frontend/   Angular app
backend/    Node.js API
MongoDB     database, started by Docker Compose on the server
```

Repository:

```text
https://github.com/pradeepdumka/app-ci-cd
```

Workflow file:

```text
.github/workflows/ci.yml
```

## Workflow diagram

Every push to `main` follows this path. A pull request stops after the Docker build. It does not push images and it does not deploy.

```mermaid
flowchart TD
  dev["You: git push origin main"] --> gh["GitHub receives the code"]
  gh --> actions["GitHub Actions starts workflow CI"]

  actions --> backend["Job: Backend CI<br/>npm ci, npm test, npm run build"]
  actions --> frontend["Job: Frontend CI<br/>npm ci, npm test, npm run build"]

  backend --> docker["Job: Docker Build and Push<br/>needs backend and frontend"]
  frontend --> docker

  docker --> decision{"Was this a push to main?"}

  decision -->|"Pull request"| buildOnly["Build images only<br/>No Docker Hub login<br/>No deploy"]
  decision -->|"Push to main"| login["Login to Docker Hub<br/>using GitHub Secrets"]

  login --> pushBe["Push pradeepdumka/peoplespace-backend:latest"]
  login --> pushFe["Push pradeepdumka/peoplespace-frontend:latest"]

  pushBe --> deploy["Job: Deploy to AWS EC2<br/>needs docker<br/>only on push"]
  pushFe --> deploy

  deploy --> ssh["SSH into EC2<br/>EC2_HOST, EC2_USER, EC2_SSH_KEY"]
  ssh --> pull["docker compose pull"]
  pull --> up["docker compose up -d"]
  up --> prune["docker image prune -f"]
  prune --> live["App is updated<br/>http://EC2_PUBLIC_IP"]
```

One-time setup, done before the diagram above can run by itself:

```mermaid
flowchart LR
  s1["1. App and Dockerfiles"] --> s2["2. GitHub repo"]
  s2 --> s3["3. CI jobs"]
  s3 --> s4["4. Docker Hub secrets"]
  s4 --> s5["5. Push images"]
  s5 --> s6["6. EC2 + Docker"]
  s6 --> s7["7. First manual deploy"]
  s7 --> s8["8. EC2 secrets + deploy job"]
  s8 --> s9["9. Every later push deploys itself"]
```

## What each piece does

| Piece | Job |
| --- | --- |
| GitHub | Stores the code |
| GitHub Actions | Runs the workflow on a temporary Ubuntu machine |
| Backend CI and Frontend CI | Prove the code installs, checks, and builds |
| Docker Hub | Stores the built images |
| EC2 | The server that runs the containers |
| Docker Compose on EC2 | Pulls the new images and restarts the app |
| GitHub Secrets | Holds passwords and the SSH key outside the code |

## All steps in order

```text
 1. Know what CI and CD mean
 2. Run the app locally
 3. Add Dockerfiles
 4. Create the GitHub repository and push
 5. Add the first CI workflow
 6. Confirm CI is green
 7. Add the Docker build job
 8. Create a Docker Hub access token
 9. Save Docker Hub secrets in GitHub
10. Change the Docker job so it pushes images
11. Confirm the images exist on Docker Hub
12. Turn on AWS safety settings
13. Launch a free-tier EC2 server
14. Open only the right ports
15. Install Docker on EC2
16. Put the production Compose file and .env on EC2
17. Deploy once by hand and open the site
18. Fix the security group if the browser cannot connect
19. Save EC2 secrets in GitHub
20. Add the deploy job
21. Push to main and watch the full pipeline
22. Copy this pipeline to a new app
```

---

## Step 1. Know what CI and CD mean

CI means Continuous Integration.

It answers: is the code still working after it is pushed?

CD means Continuous Deployment.

It answers: if CI passed, can that code be packaged and put on the server automatically?

Finished flow for this project:

```text
git push origin main
  -> Backend CI
  -> Frontend CI
  -> Build Docker images
  -> Push images to Docker Hub
  -> SSH into EC2
  -> docker compose pull
  -> docker compose up -d
  -> site updates
```

A pull request only runs the checks and the Docker build. Production updates only on a push to `main`.

## Step 2. Run the app locally

Need Node.js 22 or newer.

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm start
```

Local URLs:

```text
Frontend  http://localhost:4200
API       http://localhost:4000
```

Or run the whole stack with Docker:

```bash
docker compose up --build
```

The root `docker-compose.yaml` is for your Mac. It builds from the local folders. The EC2 file is different. EC2 pulls ready-made images from Docker Hub.

## Step 3. Add Dockerfiles

Each app needs its own Dockerfile.

```text
backend/Dockerfile
frontend/Dockerfile
```

Backend image:

```text
Node.js
copy package files
npm install
start the API on port 4000
```

Frontend image is two stages:

```text
Stage 1: Node.js builds the Angular app
Stage 2: Nginx serves the built files on port 80
```

Nginx inside the frontend container sends `/api` requests to the backend container. The browser only talks to port 80.

Also keep:

```text
deploy/docker-compose.ec2.yaml
deploy/ec2.env.example
```

`deploy/docker-compose.ec2.yaml` does not build code on the server. It uses:

```text
pradeepdumka/peoplespace-backend:latest
pradeepdumka/peoplespace-frontend:latest
mongo:7
```

MongoDB has no public port in that file. The backend reaches it on the private Docker network.

## Step 4. Create the GitHub repository and push

Create the repository, then from the project folder:

```bash
git status
git add .
git commit -m "Add app and Docker setup"
git push origin main
```

Do not commit:

```text
.env
*.pem
real passwords
Docker Hub tokens
SSH private keys
```

## Step 5. Add the first CI workflow

Create:

```text
.github/workflows/ci.yml
```

GitHub reads every YAML file in that folder.

First version, checks only:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  backend:
    name: Backend CI
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - name: Install backend dependencies
        run: npm ci

      - name: Test backend
        run: npm test

      - name: Build backend
        run: npm run build

  frontend:
    name: Frontend CI
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        run: npm ci

      - name: Test frontend
        run: npm test

      - name: Build frontend
        run: npm run build
```

Meaning of the important lines:

```text
on
  Start the workflow on push or pull request to main.

jobs
  backend and frontend run at the same time on two machines.

runs-on: ubuntu-latest
  GitHub creates a temporary Ubuntu computer, then deletes it.

working-directory
  npm must run inside backend/ or frontend/, not the repo root.

actions/checkout@v4
  Download the code. The runner starts empty.

actions/setup-node@v4
  Install Node.js 22.

npm ci
  Install the exact versions from package-lock.json.

npm test and npm run build
  Fail the job if the check or the build fails.
```

If one step fails, later steps in that job do not run, and the workflow is red.

## Step 6. Confirm CI is green

Push the workflow:

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow"
git push origin main
```

Then open:

```text
GitHub repository
  -> Actions
  -> CI
  -> latest run
```

You should see:

```text
Backend CI      green
Frontend CI     green
```

If a job is red, open it and read the failed step. Fix that command, commit, and push again.

## Step 7. Add the Docker build job

Add a third job that starts only after both CI jobs pass.

At this stage it only builds. It does not push.

```yaml
  docker:
    name: Docker Build Check
    runs-on: ubuntu-latest
    needs:
      - backend
      - frontend

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Build backend Docker image
        run: docker build -t peoplespace-backend ./backend

      - name: Build frontend Docker image
        run: docker build -t peoplespace-frontend ./frontend
```

```text
needs
  Wait until backend and frontend are green.
  If either fails, this job never starts.

docker build ./backend
  Uses backend/Dockerfile.

docker build ./frontend
  Uses frontend/Dockerfile.
```

Push, then confirm three green jobs:

```text
Backend CI
Frontend CI
Docker Build Check
```

## Step 8. Create a Docker Hub access token

On Docker Hub:

```text
Account Settings
  -> Security
  -> Personal access tokens
  -> Generate
```

Copy the token once. You will not see it again.

Image names used by this project:

```text
pradeepdumka/peoplespace-backend:latest
pradeepdumka/peoplespace-frontend:latest
```

```text
pradeepdumka          your Docker Hub username
peoplespace-backend   image name
latest                tag
```

For a new app, change the username and the image names. Keep the same pattern: `username/app-backend:latest` and `username/app-frontend:latest`.

## Step 9. Save Docker Hub secrets in GitHub

```text
GitHub repository
  -> Settings
  -> Secrets and variables
  -> Actions
  -> New repository secret
```

Add:

```text
DOCKERHUB_USERNAME     your Docker Hub username
DOCKERHUB_TOKEN        the access token from Step 8
```

The workflow reads them as:

```text
${{ secrets.DOCKERHUB_USERNAME }}
${{ secrets.DOCKERHUB_TOKEN }}
```

The real values stay in GitHub. They are not written in `ci.yml`.

Names must match exactly. `dockerhub_username` and `DOCKERHUB USERNAME` will not work.

## Step 10. Change the Docker job so it pushes images

Replace the Docker build-check job with this:

```yaml
  docker:
    name: Docker Build and Push
    runs-on: ubuntu-latest
    needs:
      - backend
      - frontend

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Login to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push backend Docker image
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: ${{ github.event_name == 'push' }}
          tags: pradeepdumka/peoplespace-backend:latest

      - name: Build and push frontend Docker image
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: ${{ github.event_name == 'push' }}
          tags: pradeepdumka/peoplespace-frontend:latest
```

```text
if: github.event_name == 'push'
  Login only when code is pushed to main.

push: ${{ github.event_name == 'push' }}
  On a pull request, build the image and stop.
  On a push to main, build and upload it.
```

Push this change. The Docker job must be green before you continue.

## Step 11. Confirm the images exist on Docker Hub

Open Docker Hub and check:

```text
peoplespace-backend     tag latest
peoplespace-frontend    tag latest
```

If the images are missing, open the Docker job log and check the login step and the tag names.

## Step 12. Turn on AWS safety settings

Before creating a server:

```text
1. Enable MFA on the AWS account
2. Turn on Free Tier and billing alerts
3. Create a small monthly budget, for example $1 or $5
4. Use only Free Tier eligible resources
```

MFA path:

```text
AWS account name
  -> Security credentials
  -> Multi-factor authentication
  -> Assign MFA device
```

## Step 13. Launch a free-tier EC2 server

```text
AWS Console
  -> EC2
  -> Instances
  -> Launch instances
```

Use these settings:

```text
Name            app-ci-cd-server
OS              Ubuntu Server 24.04 LTS, Free tier eligible
Instance type   t2.micro or t3.micro, Free tier eligible
Key pair        pp-ci-cd-key
Key type        RSA
Key format      .pem
```

AWS downloads `pp-ci-cd-key.pem`. Keep that file private. Never commit it.

Copy the instance public IPv4 address. This guide calls it `YOUR_EC2_PUBLIC_IP`.

## Step 14. Open only the right ports

On the instance:

```text
Security tab
  -> Security group
  -> Inbound rules
  -> Edit inbound rules
```

Allow:

```text
SSH    22    My IP          for your own login
HTTP   80    0.0.0.0/0      so browsers can open the site
```

For this learning pipeline, GitHub Actions also needs SSH. The runners do not use your home IP, so port 22 may need to allow a wider source while you are learning:

```text
SSH  22  0.0.0.0/0
```

That is fine for practice. For a real production server, prefer a self-hosted runner, AWS Systems Manager, or a locked-down bastion instead of open SSH.

Never add:

```text
MongoDB  27017  0.0.0.0/0
```

The database stays inside Docker. Only the website port is public.

HTTPS port 443 is not used yet. Open the site with `http://`, not `https://`.

## Step 15. Install Docker on EC2

On your Mac:

```bash
cd ~/Downloads
chmod 400 pp-ci-cd-key.pem
ssh -i pp-ci-cd-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

If SSH asks you to continue, type `yes`.

On the server:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ubuntu
exit
```

SSH in again so the `docker` group applies, then check:

```bash
docker --version
docker compose version
```

Ubuntu’s default user name is `ubuntu`.

## Step 16. Put the production Compose file and .env on EC2

From your Mac, in the project folder:

```bash
scp -i ~/Downloads/pp-ci-cd-key.pem \
  deploy/docker-compose.ec2.yaml \
  ubuntu@YOUR_EC2_PUBLIC_IP:~/docker-compose.yaml

scp -i ~/Downloads/pp-ci-cd-key.pem \
  deploy/ec2.env.example \
  ubuntu@YOUR_EC2_PUBLIC_IP:~/.env
```

SSH in and edit the real values:

```bash
nano ~/.env
```

Example shape, with your own secrets:

```text
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-real-password
JWT_SECRET=your-real-long-secret
CLIENT_URL=http://YOUR_EC2_PUBLIC_IP
```

The server must have both files here:

```text
~/docker-compose.yaml
~/.env
```

The deploy job looks for those exact paths. Do not commit the real `.env`.

## Step 17. Deploy once by hand and open the site

Still on EC2:

```bash
docker compose --env-file ~/.env -f ~/docker-compose.yaml pull
docker compose --env-file ~/.env -f ~/docker-compose.yaml up -d
docker compose --env-file ~/.env -f ~/docker-compose.yaml ps
```

You want:

```text
peoplespace-mongo       running and healthy
peoplespace-backend     running
peoplespace-frontend    running
```

Inside the server, these should work:

```bash
curl http://localhost
curl http://localhost/api/health
```

Then open in a browser:

```text
http://YOUR_EC2_PUBLIC_IP
```

This first deploy proves the server, the images, and the Compose file. Automation comes after this works.

## Step 18. Fix the security group if the browser cannot connect

Use this order:

```text
1. docker compose ps
2. curl http://localhost          inside EC2
3. curl http://YOUR_EC2_PUBLIC_IP from your Mac
4. Check the security group inbound rules
```

If localhost works and the public IP does not, the app is fine and port 80 is blocked. Add the HTTP rule from Step 14, save it, and refresh the browser.

If localhost fails, read the container logs:

```bash
docker compose --env-file ~/.env -f ~/docker-compose.yaml logs
```

Common causes: a wrong password in `.env`, a missing image, or the frontend image not built yet.

## Step 19. Save EC2 secrets in GitHub

Same place as the Docker Hub secrets:

```text
GitHub -> Settings -> Secrets and variables -> Actions
```

Add three more secrets:

```text
EC2_HOST      YOUR_EC2_PUBLIC_IP
EC2_USER      ubuntu
EC2_SSH_KEY   full private key text
```

Get the key text on your Mac:

```bash
cat ~/Downloads/pp-ci-cd-key.pem
```

Paste the whole output, including the BEGIN and END lines.

```text
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

or:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Secret names must be exact:

```text
EC2_HOST
EC2_USER
EC2_SSH_KEY
```

`EC2 HOST`, `ec2_host`, and `EC2HOST` are different names. GitHub will not match them.

## Step 20. Add the deploy job

Add this job at the end of `.github/workflows/ci.yml`:

```yaml
  deploy:
    name: Deploy to AWS EC2
    runs-on: ubuntu-latest
    needs:
      - docker
    if: github.event_name == 'push'

    steps:
      - name: Deploy latest images on EC2
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            docker compose --env-file ~/.env -f ~/docker-compose.yaml pull
            docker compose --env-file ~/.env -f ~/docker-compose.yaml up -d
            docker image prune -f
```

```text
needs: docker
  Deploy starts only after the images are built and pushed.

if: github.event_name == 'push'
  Pull requests never update the server.

appleboy/ssh-action
  GitHub Actions logs into EC2 the same way you do with ssh.

pull
  Download the new images from Docker Hub.

up -d
  Recreate the containers in the background.

docker image prune -f
  Delete unused old images so the small server disk does not fill up.
```

Final job order:

```text
backend  \
           -> docker -> deploy
frontend /
```

`backend` and `frontend` run together. `docker` waits for both. `deploy` waits for `docker`.

## Step 21. Push to main and watch the full pipeline

```bash
git add .github/workflows/ci.yml
git commit -m "Deploy to EC2 after Docker push"
git push origin main
```

Open:

```text
GitHub -> Actions -> CI -> latest run
```

A successful push shows four green jobs:

```text
Backend CI
Frontend CI
Docker Build and Push
Deploy to AWS EC2
```

Then refresh:

```text
http://YOUR_EC2_PUBLIC_IP
```

From now on, a normal code change is:

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

GitHub Actions tests, builds, pushes, and deploys. You do not SSH in for a routine update.

To rerun without a code change:

```bash
git commit --allow-empty -m "Rerun deployment"
git push origin main
```

Or use:

```text
GitHub -> Actions -> the run -> Re-run jobs
```

### If deploy says `missing server host`

The SSH action did not receive `EC2_HOST`.

Check that the secret exists and the name is exactly `EC2_HOST`. Also confirm `EC2_USER` and `EC2_SSH_KEY`. Then rerun the workflow.

### When you are done practicing

Stop the instance so compute charges stop:

```text
EC2 -> Instances -> Instance state -> Stop instance
```

Terminate it when you no longer need the server. A stopped instance can still have a small storage charge.

## Step 22. Copy this pipeline to a new app

Keep the same order. Change only the names and secrets.

```text
1. App runs locally
2. backend/Dockerfile and frontend/Dockerfile exist
3. Push the repo to GitHub
4. Add .github/workflows/ci.yml with backend and frontend jobs
5. Confirm those two jobs are green
6. Add the Docker job with needs: backend and frontend
7. Create a Docker Hub token
8. Add DOCKERHUB_USERNAME and DOCKERHUB_TOKEN
9. Set push only when github.event_name == 'push'
10. Confirm both images on Docker Hub
11. Enable AWS MFA and a budget
12. Launch Ubuntu free-tier EC2 and download the .pem file
13. Allow HTTP 80, keep MongoDB private
14. Install Docker on the server
15. Copy docker-compose and .env to the home directory
16. Deploy once by hand and open http://PUBLIC_IP
17. Add EC2_HOST, EC2_USER, and EC2_SSH_KEY
18. Add the deploy job with needs: docker
19. Push to main and confirm four green jobs
```

For the new app, replace:

```text
Docker Hub username          pradeepdumka
Image names                  peoplespace-backend and peoplespace-frontend
EC2 public IP                EC2_HOST and CLIENT_URL
SSH key                      EC2_SSH_KEY
.env passwords               MONGO_ROOT_PASSWORD and JWT_SECRET
Folder names                 only if the app is not in backend/ and frontend/
```

Keep these secret names if you want the same workflow file to work:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
EC2_HOST
EC2_USER
EC2_SSH_KEY
```

## Final workflow file

The finished `.github/workflows/ci.yml` for this project is:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  backend:
    name: Backend CI
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run build

  frontend:
    name: Frontend CI
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run build

  docker:
    name: Docker Build and Push
    runs-on: ubuntu-latest
    needs:
      - backend
      - frontend
    steps:
      - uses: actions/checkout@v4
      - name: Login to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build and push backend Docker image
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: ${{ github.event_name == 'push' }}
          tags: pradeepdumka/peoplespace-backend:latest
      - name: Build and push frontend Docker image
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: ${{ github.event_name == 'push' }}
          tags: pradeepdumka/peoplespace-frontend:latest

  deploy:
    name: Deploy to AWS EC2
    runs-on: ubuntu-latest
    needs:
      - docker
    if: github.event_name == 'push'
    steps:
      - name: Deploy latest images on EC2
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            docker compose --env-file ~/.env -f ~/docker-compose.yaml pull
            docker compose --env-file ~/.env -f ~/docker-compose.yaml up -d
            docker image prune -f
```

## One sentence you can say

I push to `main`. GitHub Actions tests the Angular app and the Node API, builds both Docker images, pushes them to Docker Hub, then SSHes into EC2 and runs Docker Compose so the site updates by itself.
