# AWS Security Group HTTP Port Notes

## Problem

The app was running inside EC2, but the browser could not open:

```text
http://13.53.168.216
```

Browser showed:

```text
Safari Can't Open the Page
server unexpectedly dropped the connection
```

## What We Checked

On EC2, the containers were running:

```text
peoplespace-mongo      running healthy
peoplespace-backend    running
peoplespace-frontend   running
```

The frontend container exposed port:

```text
0.0.0.0:80->80/tcp
```

Inside EC2, these worked:

```bash
curl http://localhost
curl http://localhost/api/health
```

That means:

```text
Docker is working.
Nginx frontend is working.
Backend API is working.
MongoDB is working.
```

## Real Issue

The issue was not Docker.

The issue was AWS Security Group.

The EC2 server was running the app on port `80`, but AWS was not allowing public traffic to port `80`.

Flow before fixing:

```text
Browser
  -> EC2 public IP
  -> AWS Security Group blocks port 80
  -> Browser cannot open app
```

Flow after fixing:

```text
Browser
  -> EC2 public IP
  -> Security Group allows port 80
  -> Frontend container receives request
  -> App opens
```

## What Is A Security Group?

A Security Group is like a firewall for EC2.

It controls which traffic can enter the server.

Example:

```text
SSH port 22
  Used to login to EC2.

HTTP port 80
  Used to open website in browser.

HTTPS port 443
  Used for secure website traffic.
```

Interview answer:

> An AWS Security Group acts as a virtual firewall for EC2. Even if the application is running inside the server, users cannot access it unless the required inbound port is allowed.

## Where To Add HTTP Rule

Go to:

```text
AWS Console
  -> EC2
  -> Instances
  -> Click your instance
  -> Security tab
  -> Click Security group link
  -> Inbound rules
  -> Edit inbound rules
  -> Add rule
```

Add:

```text
Type: HTTP
Protocol: TCP
Port range: 80
Source: Anywhere-IPv4
Value: 0.0.0.0/0
```

Then click:

```text
Save rules
```

## Optional IPv6 Rule

If your instance also uses IPv6, add:

```text
Type: HTTP
Protocol: TCP
Port range: 80
Source: Anywhere-IPv6
Value: ::/0
```

## SSH Rule

Keep SSH restricted.

Recommended:

```text
Type: SSH
Protocol: TCP
Port range: 22
Source: My IP
```

Do not use this for SSH unless only learning temporarily:

```text
0.0.0.0/0
```

Because that allows SSH attempts from anywhere.

## Do Not Open MongoDB Publicly

Do not add this rule:

```text
MongoDB
Port: 27017
Source: 0.0.0.0/0
```

MongoDB should stay private inside Docker network.

The backend talks to MongoDB internally:

```text
backend container -> mongo container
```

Interview answer:

> I do not expose MongoDB publicly. Only the frontend HTTP port is public. The backend and database communicate internally through the Docker network.

## After Adding HTTP Rule

Open:

```text
http://13.53.168.216
```

Important:

```text
Use http, not https.
```

HTTPS will not work yet because SSL certificate is not configured.

## How To Debug This Type Of Issue

Use this checklist:

```text
1. docker compose ps
2. docker logs container-name
3. curl http://localhost inside EC2
4. curl public IP from outside
5. Check Security Group inbound rules
```

If localhost works but public IP does not:

```text
Usually Security Group problem.
```

If localhost does not work:

```text
Usually Docker, app, Nginx, or backend problem.
```

## Interview Explanation

Say this:

> During EC2 deployment, my containers were running and localhost worked inside the server, but the browser could not access the app. I identified that the issue was the AWS Security Group, because port 80 was not open publicly. After adding an inbound HTTP rule for port 80, the app became accessible through the EC2 public IP.
