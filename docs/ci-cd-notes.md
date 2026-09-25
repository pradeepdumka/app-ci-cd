# CI/CD Notes for Angular + Node.js + MongoDB Docker Project

## 1. What CI/CD Means

CI/CD is an automation process used by software teams.

CI means Continuous Integration.

It answers this question:

> Is my code still working after I pushed it to GitHub?

CD means Continuous Delivery or Continuous Deployment.

It answers this question:

> If CI passed, can this working code be packaged and deployed automatically?

For this project, we are learning in two phases.

Phase 1:

```text
Mac
  -> Git repository
  -> GitHub
  -> GitHub Actions
  -> npm install
  -> npm test
  -> npm build
  -> CI passed
```

Phase 2:

```text
CI passed
  -> Docker build
  -> Docker Hub
  -> AWS EC2
  -> Docker Compose
  -> Application running on server
```

## 2. Your Current Project Structure

This project has three main application parts:

```text
frontend/
  Angular application

backend/
  Node.js + Express API

docker-compose.yaml
  Runs frontend, backend, MongoDB, and mongo-express together
```

The Docker Compose services are:

```text
mongo
  MongoDB database

mongo-express
  Browser UI for MongoDB

backend
  Node.js API running on port 4000

frontend
  Angular app served by Nginx on port 4200
```

## 3. What Happens Before CI

On your Mac, you write code and test it locally.

Common local commands:

```bash
cd backend
npm install
npm start
```

```bash
cd frontend
npm install
npm start
```

With Docker:

```bash
docker compose up --build
```

After local work is ready, you commit and push:

```bash
git add .
git commit -m "Add CI workflow"
git push origin main
```

The `git push` sends your code to GitHub. GitHub Actions sees the push and starts CI.

## 4. GitHub Actions Workflow File

GitHub Actions workflow files live inside:

```text
.github/workflows/
```

This project now has:

```text
.github/workflows/ci.yml
```

GitHub automatically reads this file.

## 5. Full CI Workflow Code

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

## 6. Explanation of Every Important Line

### `name: CI`

This is the name shown in the GitHub Actions tab.

When the workflow runs, GitHub displays it as `CI`.

### `on`

This controls when the workflow starts.

```yaml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
```

This means:

- Run CI when code is pushed to the `main` branch.
- Run CI when someone opens or updates a pull request targeting `main`.

Interview answer:

> The `on` block defines workflow triggers. In this project, CI runs on pushes and pull requests to the main branch.

### `jobs`

Jobs are groups of steps.

This workflow has two jobs:

```yaml
jobs:
  backend:
  frontend:
```

The backend and frontend are separate because they live in separate folders and have separate `package.json` files.

Interview answer:

> I separated frontend and backend into two jobs so each part of the full-stack app can install, test, and build independently.

### `runs-on: ubuntu-latest`

This tells GitHub which machine to use.

```yaml
runs-on: ubuntu-latest
```

GitHub creates a temporary Linux machine in the cloud. Your code runs there.

After the workflow finishes, GitHub destroys the machine.

Interview answer:

> `runs-on` selects the runner environment. I use Ubuntu because it is common, fast, and works well for Node.js CI.

### `defaults.run.working-directory`

Backend commands must run inside `backend/`.

Frontend commands must run inside `frontend/`.

Example:

```yaml
defaults:
  run:
    working-directory: backend
```

Without this, GitHub would run `npm ci` from the project root, where there is no root `package.json`.

Interview answer:

> Since my repo has separate frontend and backend folders, I use `working-directory` so each npm command runs in the correct folder.

### `actions/checkout@v4`

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
```

This downloads your GitHub repository into the GitHub Actions runner.

Without checkout, the runner is empty and cannot run your code.

Interview answer:

> The checkout action pulls the repository code into the CI runner.

### `actions/setup-node@v4`

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
```

This installs Node.js on the GitHub runner.

This project uses Node.js 22 because the README says Node.js 22+ is required.

Interview answer:

> `setup-node` installs the Node.js version required by the project before npm commands run.

### `cache: npm`

```yaml
cache: npm
cache-dependency-path: backend/package-lock.json
```

This lets GitHub cache npm packages between workflow runs.

It makes CI faster.

The cache key is based on `package-lock.json`. If dependencies change, the cache updates.

Interview answer:

> npm caching speeds up CI by reusing downloaded packages when the lock file has not changed.

### `npm ci`

```yaml
run: npm ci
```

`npm ci` installs dependencies from `package-lock.json`.

It is better than `npm install` in CI because:

- It is faster.
- It is stricter.
- It gives repeatable installs.
- It fails if `package.json` and `package-lock.json` do not match.

Interview answer:

> In CI I prefer `npm ci` because it creates a clean, reproducible install from the lock file.

### `npm test`

```yaml
run: npm test
```

This runs the `test` script from `package.json`.

In this project:

Backend:

```json
"test": "node --check src/server.js && node --check src/app.js"
```

Frontend:

```json
"test": "ng build --configuration development"
```

Important note:

These are beginner CI checks. They prove that the important app entry files compile or parse correctly.

Later, replace these with real unit tests, for example:

- Backend: Jest, Vitest, or Node test runner.
- Frontend: Angular test runner with Karma, Jest, or Vitest.

Interview answer:

> Currently the project uses smoke checks for CI. The next improvement would be adding real unit and integration tests.

### `npm run build`

```yaml
run: npm run build
```

This verifies the app can be built.

For Angular:

```bash
ng build
```

This creates production-ready frontend files inside `dist/`.

For the Node.js backend, there is no TypeScript compile step, so the current build script performs a syntax check:

```json
"build": "node --check src/server.js && node --check src/app.js"
```

Interview answer:

> The build step proves the application can be prepared for production. Angular creates static production files, while the plain JavaScript backend currently uses a syntax check.

## 7. Why MongoDB Is Not Started in This CI Yet

This first CI phase checks install, test, and build.

It does not start MongoDB because there are not yet integration tests that need a real database.

When backend integration tests are added, we can add MongoDB as a GitHub Actions service:

```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - 27017:27017
```

Interview answer:

> I would add MongoDB as a CI service only when tests need the database. For simple build checks, starting MongoDB is unnecessary.

## 8. What CI Passed Means

CI passed means:

- GitHub downloaded the code.
- Node.js was installed.
- Dependencies installed successfully.
- Tests or smoke checks passed.
- Build commands completed successfully.

CI passed does not mean:

- The app is deployed.
- The UI was manually tested.
- Every possible bug is gone.

Interview answer:

> CI passed means the automated checks configured in the pipeline succeeded. It increases confidence, but it does not replace all manual or end-to-end testing.

## 9. Later Phase: Docker Build and Push

After CI is stable, the next phase is Docker image creation.

The future flow:

```text
CI passed
  -> Build backend Docker image
  -> Build frontend Docker image
  -> Push images to Docker Hub
```

Example future image names:

```text
your-dockerhub-name/peoplespace-backend:latest
your-dockerhub-name/peoplespace-frontend:latest
```

Future GitHub Actions steps:

```yaml
- name: Login to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}

- name: Build and push backend image
  uses: docker/build-push-action@v6
  with:
    context: ./backend
    push: true
    tags: your-dockerhub-name/peoplespace-backend:latest

- name: Build and push frontend image
  uses: docker/build-push-action@v6
  with:
    context: ./frontend
    push: true
    tags: your-dockerhub-name/peoplespace-frontend:latest
```

Secrets are used so passwords and tokens are not written in code.

Interview answer:

> Docker Hub credentials should be stored in GitHub Actions secrets, not committed into the repository.

## 10. Later Phase: AWS EC2 Deployment

After Docker images are pushed, an AWS EC2 server can pull and run them.

Typical EC2 setup:

```text
Ubuntu EC2 instance
Docker installed
Docker Compose installed
Security group allows HTTP/HTTPS/SSH
docker-compose.yaml copied to server
```

Deployment flow:

```text
GitHub Actions
  -> SSH into EC2
  -> docker compose pull
  -> docker compose up -d
```

Example future commands on EC2:

```bash
docker compose pull
docker compose up -d
docker image prune -f
```

Interview answer:

> In the deployment stage, the server pulls the latest Docker images and restarts the containers using Docker Compose.

## 11. Common Interview Questions

### What is CI?

CI is Continuous Integration. It automatically checks code after developers push changes.

### What is CD?

CD is Continuous Delivery or Continuous Deployment. It packages and deploys code after CI passes.

### Why use GitHub Actions?

GitHub Actions automates testing, building, Docker image creation, and deployment directly from a GitHub repository.

### Why use `npm ci` instead of `npm install`?

`npm ci` is cleaner and more reliable for CI because it installs exactly from `package-lock.json`.

### Why separate backend and frontend jobs?

Because backend and frontend have separate dependencies, scripts, and build commands.

### Why use Docker after CI?

Docker packages the app and its runtime environment into images, making deployment more consistent.

### Why use secrets?

Secrets protect sensitive values like Docker Hub tokens, AWS keys, SSH keys, JWT secrets, and database passwords.

### What happens if one step fails?

The job fails, the workflow becomes red, and later steps in that job do not run.

### What is a runner?

A runner is the temporary machine where GitHub Actions executes workflow jobs.

### What is a workflow?

A workflow is an automation file written in YAML inside `.github/workflows/`.

## 12. Best Practice Roadmap

Current beginner CI:

```text
npm ci
npm test
npm run build
```

Next improvements:

```text
Add backend unit tests
Add frontend unit tests
Add linting
Add Docker image build
Push images to Docker Hub
Deploy to AWS EC2
Add HTTPS and production environment variables
```

Strong final interview answer:

> I started with CI first because deployment should only happen after automated checks pass. My first pipeline installs dependencies, runs test or smoke checks, and builds both frontend and backend. After that is stable, I would extend the pipeline to build Docker images, push them to Docker Hub, and deploy them to AWS EC2 using Docker Compose.
