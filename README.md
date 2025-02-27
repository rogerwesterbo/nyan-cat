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

Open your favorite browser with url: http://localhost:8090

# Deployment

## Build container

```bash
docker build -f Dockerfile -t rogerwesterbo/nyan-cat:<0.0.11> .
```

```bash
docker buildx build --platform=linux/amd64,linux/arm64,linux/arm/v7 -f Dockerfile -t rogerwesterbo/nyan-cat:<0.0.11>  --output type=registry,dest=rogerwesterbo/nyan-cat:<0.0.11>,push=true .
```

# Create a kubernetes cluster

[Read this ./docs/k8s.md](./docs/k8s.md)

or run the script `./create-cluster.sh` in this repo: https://github.com/rogerwesterbo/createlocalk8s

# Need more information about kubernetes?!

[Kubernetes pros and cons](./docs/kubernetes.md)

[The abstractions of k8s](./docs/k8s_abstractions.md)
