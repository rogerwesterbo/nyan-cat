# Image URL to use all building/pushing image targets
IMG ?= ghcr.io/rogerwesterbo/nyan-cat:latest

# CONTAINER_TOOL defines the container tool to be used for building images.
CONTAINER_TOOL ?= docker

# Setting SHELL to bash allows bash commands to be executed by recipes.
SHELL = /usr/bin/env bash -o pipefail
.SHELLFLAGS = -ec

.PHONY: all
all: build

##@ General

.PHONY: help
help: ## Display this help.
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: format
format: ## Format code with prettier
	npm run format

##@ Build

.PHONY: build
build: ## Build the application (compile less to css)
	npm run build:less

.PHONY: docker-build
docker-build: ## Build docker image
	$(CONTAINER_TOOL) build -t ${IMG} .

.PHONY: docker-push
docker-push: ## Push docker image
	$(CONTAINER_TOOL) push ${IMG}

##@ SBOM (Software Bill of Materials)

## Location to install dependencies to
LOCALBIN ?= $(shell pwd)/bin
$(LOCALBIN):
	mkdir -p $(LOCALBIN)

SYFT ?= $(LOCALBIN)/syft
SYFT_VERSION ?= latest
SBOM_OUTPUT_DIR ?= sbom
SBOM_PROJECT_NAME ?= nyan-cat

.PHONY: install-syft
install-syft: $(SYFT) ## Install syft SBOM generator locally
$(SYFT): $(LOCALBIN)
	@set -e; echo "Installing syft $(SYFT_VERSION)"; \
	curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b $(LOCALBIN)

.PHONY: sbom-source
sbom-source: install-syft ## Generate SBOMs for source code (CycloneDX + SPDX)
	@mkdir -p $(SBOM_OUTPUT_DIR)
	@echo "Generating source code SBOMs..."
	$(SYFT) dir:. --source-name=$(SBOM_PROJECT_NAME) -o cyclonedx-json=$(SBOM_OUTPUT_DIR)/sbom-source.cdx.json
	$(SYFT) dir:. --source-name=$(SBOM_PROJECT_NAME) -o spdx-json=$(SBOM_OUTPUT_DIR)/sbom-source.spdx.json
	@echo "SBOMs generated: $(SBOM_OUTPUT_DIR)/sbom-source.{cdx,spdx}.json"

.PHONY: sbom-container
sbom-container: install-syft ## Generate SBOMs for container image (CycloneDX + SPDX, requires IMG)
	@mkdir -p $(SBOM_OUTPUT_DIR)
	@echo "Generating container SBOMs for $(IMG)..."
	$(SYFT) $(IMG) -o cyclonedx-json=$(SBOM_OUTPUT_DIR)/sbom-container.cdx.json
	$(SYFT) $(IMG) -o spdx-json=$(SBOM_OUTPUT_DIR)/sbom-container.spdx.json
	@echo "SBOMs generated: $(SBOM_OUTPUT_DIR)/sbom-container.{cdx,spdx}.json"

.PHONY: sbom
sbom: sbom-source ## Alias for sbom-source

.PHONY: clean
clean: ## Clean build artifacts
	rm -rf $(LOCALBIN) $(SBOM_OUTPUT_DIR)
