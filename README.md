# nyan-cat

Nyan Cat

# Development

## Prerequsites

- node lts or current (https://nodejs.org)
- docker runtime (for building and pushing a container)

### optional

- k9s (https://github.com/derailed/k9s)

## Run

```bash
npm start
```

Open your favorite browser with url: http://localhost:8080

# Deployment

## Build container

```bash
docker build --platform=linux/amd64,linux/arm64,linux/arm/v7 -f Dockerfile -t rogerwesterbo/nyan-cat:<0.0.6> .
```

Multi architecture docker build, see this article first: https://unix.stackexchange.com/questions/748633/error-multiple-platforms-feature-is-currently-not-supported-for-docker-driver
and then:

```bash
docker buildx build --platform=linux/amd64,linux/arm64,linux/arm/v7 -t rogerwesterbo/nyan-cat:<0.0.6> --output type=docker .
```

# Create a kubernetes cluster

[Read this ./docs/k8s.md](./docs/k8s.md)

or run the script

```bash
./scripts/create-cluster.sh
```
