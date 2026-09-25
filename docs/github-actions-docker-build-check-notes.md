# GitHub Actions Docker Build Check Notes

## Current Step

You already completed the first CI step:

```text
npm install
npm test
npm build
CI passed
```

Now the next GitHub Actions step is:

```text
Docker Build Check
```

This step checks whether your Docker images can be built successfully inside GitHub Actions.

It does not push images to Docker Hub yet.

## New CI Flow

Before:

```text
Backend CI
Frontend CI
CI passed
```

Now:

```text
Backend CI
Frontend CI
Docker Build Check
CI passed
```

## Why Add Docker Build Check?

Your app is dockerized, so CI should also confirm that Docker builds are working.

This catches problems like:

```text
Wrong Dockerfile path
Wrong build command
Missing package.json
Angular build failure inside Docker
Node dependency install failure
Nginx config copy issue
```

Interview answer:

> After my npm CI checks passed, I added a Docker build check to make sure both frontend and backend Docker images can be built successfully before deployment.

## Docker Job Code

This job is added inside `.github/workflows/ci.yml`:

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

## Line-By-Line Explanation

### `docker:`

This creates a new job named `docker`.

The internal job id is:

```text
docker
```

Interview answer:

> I created a separate Docker job so container build verification is separate from npm test and build checks.

### `name: Docker Build Check`

This is the display name shown in GitHub Actions.

On GitHub, you will see:

```text
Docker Build Check
```

Interview answer:

> The `name` field gives the job a readable name in the GitHub Actions UI.

### `runs-on: ubuntu-latest`

This tells GitHub to run the Docker job on an Ubuntu runner.

GitHub-hosted Ubuntu runners already support Docker commands.

Interview answer:

> I use `ubuntu-latest` because Docker is available on GitHub-hosted Ubuntu runners.

### `needs`

```yaml
needs:
  - backend
  - frontend
```

This means the Docker job will only start after both jobs pass:

```text
backend
frontend
```

If backend fails, Docker build will not run.

If frontend fails, Docker build will not run.

Interview answer:

> I used `needs` so Docker images are built only after backend and frontend CI jobs pass.

### `steps`

Steps are the commands inside a job.

This Docker job has three steps:

```text
1. Checkout repository
2. Build backend Docker image
3. Build frontend Docker image
```

### `actions/checkout@v4`

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
```

This downloads your repository code into the GitHub Actions runner.

Without this step, Docker cannot find:

```text
backend/Dockerfile
frontend/Dockerfile
```

Interview answer:

> Checkout is required because every GitHub Actions job starts with an empty runner.

### Backend Docker Build

```yaml
- name: Build backend Docker image
  run: docker build -t peoplespace-backend ./backend
```

This command builds the backend Docker image.

Explanation:

```text
docker build
  Creates a Docker image.

-t peoplespace-backend
  Gives the image a temporary name.

./backend
  Uses the backend folder as the Docker build context.
```

GitHub will look for:

```text
backend/Dockerfile
```

Interview answer:

> The backend Docker build command uses `./backend` as the build context because the backend Dockerfile and package.json are inside the backend folder.

### Frontend Docker Build

```yaml
- name: Build frontend Docker image
  run: docker build -t peoplespace-frontend ./frontend
```

This command builds the frontend Docker image.

Explanation:

```text
docker build
  Creates a Docker image.

-t peoplespace-frontend
  Gives the image a temporary name.

./frontend
  Uses the frontend folder as the Docker build context.
```

GitHub will look for:

```text
frontend/Dockerfile
```

Interview answer:

> The frontend Docker image uses a multi-stage Dockerfile. First it builds the Angular app using Node.js, then it serves the final static files using Nginx.

## Important Point

This job only builds Docker images.

It does not push images to Docker Hub.

So this is still CI, not full deployment.

Current status:

```text
CI with Docker build validation
```

Not yet:

```text
CD deployment
```

Interview answer:

> At this stage, Docker images are built only to validate the Dockerfiles. They are not pushed or deployed yet.

## What You Should See On GitHub

After committing and pushing this change, go to:

```text
GitHub repository
  -> Actions
  -> CI
  -> Latest run
```

You should see three jobs:

```text
Backend CI
Frontend CI
Docker Build Check
```

All should have green check marks.

## Commands To Push This Step

Run:

```bash
git status
git add .github/workflows/ci.yml docs/github-actions-docker-build-check-notes.md
git commit -m "Add Docker build check notes"
git push origin main
```

After pushing, GitHub Actions will run again automatically.

## If Docker Build Fails

Click the failed job:

```text
Actions -> CI -> Docker Build Check
```

Then read the failed step:

```text
Build backend Docker image
```

or:

```text
Build frontend Docker image
```

Common fixes:

```text
Check Dockerfile path
Check package.json exists
Check npm install works
Check npm run build works
Check COPY paths in Dockerfile
Check .dockerignore is not ignoring needed files
```

Interview answer:

> If the Docker build fails, I inspect the GitHub Actions logs, identify whether backend or frontend failed, then fix the Dockerfile, dependency, or build command issue.

## Next Step After This

After Docker Build Check passes, the next phase is Docker Hub.

Future flow:

```text
CI passed
  -> Docker build
  -> Docker Hub login
  -> Push images to Docker Hub
```

For that, we will need GitHub secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

Interview answer:

> After Docker builds are verified, I would add Docker Hub login and push steps using GitHub Actions secrets.
