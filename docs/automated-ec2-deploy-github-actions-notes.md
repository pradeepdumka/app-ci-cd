# Automated EC2 Deployment With GitHub Actions Notes

## Goal

Before automation, deployment was manual:

```text
SSH into EC2
docker compose pull
docker compose up -d
```

After automation, GitHub Actions does this automatically:

```text
git push origin main
  -> CI test/build
  -> Docker build
  -> Docker Hub push
  -> SSH into EC2
  -> docker compose pull
  -> docker compose up -d
```

This makes the pipeline closer to full CI/CD.

## New Full Pipeline

```text
Mac
  -> GitHub
  -> GitHub Actions
  -> Backend CI
  -> Frontend CI
  -> Docker build and push
  -> Deploy to AWS EC2
  -> App updated automatically
```

Interview answer:

> I automated deployment by adding a GitHub Actions deploy job. After Docker images are pushed to Docker Hub, the workflow SSHes into EC2 and runs Docker Compose commands to pull and restart the latest containers.

## GitHub Actions Deploy Job

The workflow now has this job:

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

## Explanation

### `deploy`

This creates a new job called `deploy`.

It is separate from:

```text
backend
frontend
docker
```

### `name: Deploy to AWS EC2`

This is the name shown in GitHub Actions UI.

### `needs`

```yaml
needs:
  - docker
```

This means deploy runs only after the Docker job passes.

Flow:

```text
backend + frontend pass
  -> docker image push passes
  -> deploy starts
```

Interview answer:

> I use `needs: docker` so deployment only happens after images are successfully built and pushed.

### `if: github.event_name == 'push'`

This prevents deployment on pull requests.

Deployment happens only when code is pushed to `main`.

Interview answer:

> I deploy only on push events, not pull requests, because pull requests should validate code but not update production.

### `appleboy/ssh-action`

This action connects to EC2 using SSH.

It is similar to running this manually:

```bash
ssh -i key.pem ubuntu@13.53.168.216
```

But GitHub Actions does it automatically.

### `host`

```yaml
host: ${{ secrets.EC2_HOST }}
```

This is your EC2 public IP.

Example value:

```text
13.53.168.216
```

### `username`

```yaml
username: ${{ secrets.EC2_USER }}
```

For Ubuntu EC2, the username is:

```text
ubuntu
```

### `key`

```yaml
key: ${{ secrets.EC2_SSH_KEY }}
```

This is the private key content from your `.pem` file.

Important:

```text
Do not commit the .pem file.
Do not paste the key in code.
Store it only in GitHub Secrets.
```

## GitHub Secrets Needed

Go to:

```text
GitHub repository
  -> Settings
  -> Secrets and variables
  -> Actions
  -> New repository secret
```

Add these secrets:

```text
EC2_HOST
EC2_USER
EC2_SSH_KEY
```

### `EC2_HOST`

Value:

```text
13.53.168.216
```

### `EC2_USER`

Value:

```text
ubuntu
```

### `EC2_SSH_KEY`

On your Mac:

```bash
cat ~/Downloads/pp-ci-cd-key.pem
```

Copy the full output, including:

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

Paste that full content into GitHub secret:

```text
EC2_SSH_KEY
```

## EC2 Must Already Have These Files

The deploy job expects these files on EC2:

```text
~/docker-compose.yaml
~/.env
```

These were copied from:

```text
deploy/docker-compose.ec2.yaml
deploy/ec2.env.example
```

The `.env` file on EC2 must contain real values:

```text
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-real-password
JWT_SECRET=your-real-secret
CLIENT_URL=http://13.53.168.216
```

Do not commit the real `.env` file to GitHub.

## EC2 Security Group Warning

For GitHub Actions to SSH into EC2, port `22` must be reachable from GitHub Actions runners.

For learning, you may use:

```text
SSH 22  0.0.0.0/0
```

But for production, this is not ideal.

More secure production options:

```text
Use a self-hosted runner
Use AWS Systems Manager Session Manager
Use a fixed bastion host
Restrict SSH as much as possible
```

Interview answer:

> For a learning project, I allowed GitHub Actions to SSH into EC2 using a private key stored in GitHub Secrets. In production, I would prefer a more secure approach such as a self-hosted runner, AWS SSM, or restricted network access.

## What The Script Does

```bash
docker compose --env-file ~/.env -f ~/docker-compose.yaml pull
```

Pulls latest images from Docker Hub.

```bash
docker compose --env-file ~/.env -f ~/docker-compose.yaml up -d
```

Starts or updates containers in detached mode.

```bash
docker image prune -f
```

Removes unused old Docker images to save disk space.

## Troubleshooting: Missing Server Host

Error in GitHub Actions:

```text
Run appleboy/ssh-action@v1.2.0
Run entrypoint.sh
Will download drone-ssh-1.8.0-linux-amd64
Error: missing server host
```

Meaning:

```text
GitHub Actions did not receive the EC2 host value.
```

Most common reason:

```text
EC2_HOST secret is missing or named incorrectly.
```

Fix:

Go to:

```text
GitHub repository
  -> Settings
  -> Secrets and variables
  -> Actions
  -> New repository secret
```

Add:

```text
Name: EC2_HOST
Value: 13.53.168.216
```

Also confirm these exist:

```text
EC2_USER
EC2_SSH_KEY
```

Secret names must match exactly:

```text
EC2_HOST
EC2_USER
EC2_SSH_KEY
```

Wrong examples:

```text
EC2 HOST
ec2_host
EC2HOST
EC2_Host
```

After adding the secrets, rerun the failed workflow:

```text
GitHub
  -> Actions
  -> Failed CI run
  -> Re-run jobs
```

Or push an empty commit:

```bash
git commit --allow-empty -m "Rerun deployment"
git push origin main
```

Interview answer:

> The `missing server host` error means the SSH action did not receive the EC2 host value. I fixed it by adding the `EC2_HOST` repository secret with the EC2 public IP.

## Final Interview Explanation

Say this:

> My final pipeline runs CI checks, builds Docker images, pushes them to Docker Hub, and then deploys to AWS EC2 automatically. The deploy job uses SSH credentials stored in GitHub Secrets and runs Docker Compose commands on EC2 to pull and restart the latest containers.
