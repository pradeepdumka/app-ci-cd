# Docker Hub Push With GitHub Actions Notes

## Current Step

You already added these GitHub repository secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

Now GitHub Actions can log in to Docker Hub securely.

Important:

```text
The real Docker Hub token is stored in GitHub Secrets.
It is not written in code.
It is not committed to GitHub.
```

## New Flow

Before:

```text
CI passed
  -> Docker build check
```

Now:

```text
CI passed
  -> Docker login
  -> Build backend Docker image
  -> Push backend Docker image to Docker Hub
  -> Build frontend Docker image
  -> Push frontend Docker image to Docker Hub
```

## Docker Images

The workflow pushes these images:

```text
pradeepdumka/peoplespace-backend:latest
pradeepdumka/peoplespace-frontend:latest
```

Image meaning:

```text
pradeepdumka
  Docker Hub username

peoplespace-backend
  Backend image repository name

peoplespace-frontend
  Frontend image repository name

latest
  Image tag
```

## GitHub Actions Code

The Docker job in `.github/workflows/ci.yml` now uses:

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

## Explanation

### `name: Docker Build and Push`

This is the job name shown in GitHub Actions.

Interview answer:

> I renamed the job to Docker Build and Push because it now builds images and pushes them to Docker Hub.

### `needs`

```yaml
needs:
  - backend
  - frontend
```

This means Docker image build and push will happen only after backend and frontend CI jobs pass.

Interview answer:

> I use `needs` to make sure Docker images are pushed only after tests and builds pass.

### Docker Hub Login

```yaml
- name: Login to Docker Hub
  if: github.event_name == 'push'
  uses: docker/login-action@v3
```

This logs in to Docker Hub.

The login happens only for push events.

It does not run for pull requests.

Interview answer:

> Docker login uses GitHub Secrets and runs only on push, so credentials are not exposed unnecessarily.

### Secrets

```yaml
username: ${{ secrets.DOCKERHUB_USERNAME }}
password: ${{ secrets.DOCKERHUB_TOKEN }}
```

GitHub reads these values from repository secrets.

The real values are hidden.

Interview answer:

> Secrets allow the workflow to authenticate without storing passwords or tokens in the repository.

### Backend Build And Push

```yaml
context: ./backend
push: ${{ github.event_name == 'push' }}
tags: pradeepdumka/peoplespace-backend:latest
```

Meaning:

```text
context: ./backend
  Build the backend Dockerfile from the backend folder.

push: true on push
  Push the image only when code is pushed.

tags
  Docker Hub image name and version tag.
```

### Frontend Build And Push

```yaml
context: ./frontend
push: ${{ github.event_name == 'push' }}
tags: pradeepdumka/peoplespace-frontend:latest
```

Meaning:

```text
context: ./frontend
  Build the frontend Dockerfile from the frontend folder.

push: true on push
  Push the image only when code is pushed.

tags
  Docker Hub image name and version tag.
```

## What To Check After Push

After committing and pushing:

```text
GitHub -> Actions -> CI -> latest run
```

You should see:

```text
Backend CI
Frontend CI
Docker Build and Push
```

Then open Docker Hub and check for:

```text
peoplespace-backend
peoplespace-frontend
```

Each should have a `latest` tag.

## Interview Explanation

Say this:

> After CI passed, I extended GitHub Actions to log in to Docker Hub using repository secrets. Then the workflow builds backend and frontend Docker images and pushes them to Docker Hub with the `latest` tag. I used GitHub Secrets so credentials are not exposed in code.

## Next Step

After Docker images are visible in Docker Hub, the next phase is AWS EC2 deployment.

Future flow:

```text
Docker Hub
  -> AWS EC2
  -> docker compose pull
  -> docker compose up -d
```
