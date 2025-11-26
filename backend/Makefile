# Container image configuration
IMAGE_PREFIX := us-central1-docker.pkg.dev/cscsdotdev/website
IMAGE_NAME := backend
IMAGE_TAG ?= latest
FULL_IMAGE := $(IMAGE_PREFIX)/$(IMAGE_NAME):$(IMAGE_TAG)

# Build platforms
PLATFORMS := linux/amd64,linux/arm64


.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: build
build: ## Build multi-arch image (local cache only)
	podman build \
		--platform $(PLATFORMS) \
		-t $(FULL_IMAGE) \
		-f Containerfile \
		.

.PHONY: build-push
build-push: ## Build and push multi-arch image to registry
	podman build \
		--platform $(PLATFORMS) \
		-t $(FULL_IMAGE) \
		-f Containerfile \
		.
	podman push \
		$(FULL_IMAGE)

.PHONY: build-local
build-local: ## Build for local platform only (faster for development)
	podman build \
		-t $(FULL_IMAGE) \
		-f Containerfile \
		.

.PHONY: push
push: ## Push existing image to registry
	podman push $(FULL_IMAGE)

.PHONY: run
run: ## Run container locally
	podman run --rm -p 8090:8090 -v $(PWD)/pb_data:/pb_data $(FULL_IMAGE)

.PHONY: clean
clean: ## Clean up builder and local images
	podman rmi $(FULL_IMAGE) || true
