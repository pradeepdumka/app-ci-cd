# CI/CD Step-by-Step Notes After First CI Pass

## Current Status

Your project is now pushed to GitHub.

Repository:

```text
https://github.com/pradeepdumka/app-ci-cd
```

GitHub Actions workflow:

```text
.github/workflows/ci.yml
```

Current result:

```text
CI passed
```

That means GitHub successfully ran your automated checks.

## Step 1: Understand What Already Happened

You wrote code on your Mac.

Then you pushed the code to GitHub:

```text
Mac
  -> Git
  -> GitHub
```

GitHub saw this file:

```text
.github/workflows/ci.yml
```

Then GitHub automatically started the CI workflow.

Interview answer:

> When I pushed my code to GitHub, GitHub Actions detected the workflow file inside `.github/workflows`. It automatically started the CI pipeline for the `main` branch.

## Step 2: What GitHub Actions Did

The CI workflow created a temporary Ubuntu machine.

This temporary machine is called a runner.

The runner performed these tasks:

```text
1. Downloaded my repository code
2. Installed Node.js
3. Installed backend dependencies
4. Ran backend test/build checks
5. Installed frontend dependencies
6. Ran frontend test/build checks
7. Marked CI as passed
```

Interview answer:

> GitHub Actions runs jobs on a temporary runner. In my project, the runner installs Node.js, installs dependencies, runs tests, and builds both backend and frontend.

## Step 3: How To Check CI Result On GitHub

Open your repository on GitHub.

Go to:

```text
Actions -> CI -> latest workflow run
```

If you see a green check mark:

```text
CI passed
```

If you see a red cross:

```text
CI failed
```

Click the failed job to see the exact command that failed.

Interview answer:

> I check the Actions tab on GitHub. A green check means the workflow passed. If it fails, I open the failed job logs and fix the exact failing step.

## Step 4: Why This Is CI, Not CD Yet

Right now, your pipeline only checks the code.

It does not deploy the app anywhere.

Current flow:

```text
Code pushed
  -> Install dependencies
  -> Test
  -> Build
  -> CI passed
```

This is CI.

Later flow:

```text
CI passed
  -> Build Docker images
  -> Push Docker images to Docker Hub
  -> Deploy on AWS EC2
```

That will become CI/CD.

Interview answer:

> My current setup is CI because it validates the code but does not deploy it yet. The next step is CD, where I will build Docker images and deploy them to a server.

## Step 5: What You Should Learn Next

Learn these topics in this order:

```text
1. GitHub Actions basics
2. Workflow, jobs, and steps
3. npm ci vs npm install
4. GitHub Actions secrets
5. Docker image build in CI
6. Docker Hub push from GitHub Actions
7. AWS EC2 deployment using Docker Compose
```

Do not jump directly to AWS.

First understand CI properly.

## Step 6: Next Practical Task

Your next practical task should be:

```text
Add Docker build check in GitHub Actions
```

This means GitHub should check whether your Docker images can build successfully.

New flow:

```text
CI passed
  -> Docker build backend image
  -> Docker build frontend image
  -> Docker build passed
```

This still does not push images to Docker Hub.

It only confirms that Docker builds are working.

Why this step is useful:

- It catches Dockerfile errors early.
- It proves the app can be containerized in CI.
- It prepares you for Docker Hub.

Interview answer:

> After npm test and npm build are passing, I would add Docker build checks to make sure both frontend and backend Docker images can be built successfully.

## Step 7: Future Docker Build Check Example

Later, we can add a third job to `.github/workflows/ci.yml`.

Example:

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

Explanation:

```text
docker:
  Creates a new job named docker.

needs:
  Means this job runs only after backend and frontend jobs pass.

docker build:
  Builds Docker images from the Dockerfiles.

-t:
  Gives a temporary local name to the image.
```

Interview answer:

> I use `needs` so Docker images are built only after backend and frontend CI jobs pass.

## Step 8: After Docker Build Passes

After Docker image build works in GitHub Actions, the next step is Docker Hub.

Future flow:

```text
Docker build passed
  -> Login to Docker Hub
  -> Push backend image
  -> Push frontend image
```

For Docker Hub, we need:

```text
Docker Hub username
Docker Hub access token
GitHub repository secrets
```

Never write Docker Hub password directly in code.

Use GitHub secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

Interview answer:

> For Docker Hub authentication, I store credentials in GitHub Actions secrets, not in the YAML file.

## Step 9: After Docker Hub

After images are pushed to Docker Hub, the next step is AWS EC2.

Future flow:

```text
Docker Hub
  -> AWS EC2
  -> docker compose pull
  -> docker compose up -d
```

On EC2, Docker Compose will run:

```text
frontend container
backend container
mongo container
```

Interview answer:

> On EC2, I would use Docker Compose to pull the latest images and restart the containers.

## Step 10: Simple Interview Explanation Of Full Journey

Say this:

> I started by dockerizing my Angular, Node.js, and MongoDB project. Then I created a GitHub repository and added GitHub Actions for CI. The CI workflow runs on every push to `main`, installs dependencies, tests, and builds both frontend and backend. After CI passed, the next step is to add Docker image build checks. After that, I will push images to Docker Hub and deploy them to AWS EC2 using Docker Compose.

## Your Next Command Checklist

For now, after adding or changing code:

```bash
git status
git add .
git commit -m "your message"
git push origin main
```

Then check:

```text
GitHub -> Actions -> CI
```

Expected result:

```text
Green check mark
```

## Recommended Next Implementation

Next, we should add this to CI:

```text
Docker Build Check
```

After that, we should add:

```text
Docker Hub Push
```

After that:

```text
AWS EC2 Deployment
```
