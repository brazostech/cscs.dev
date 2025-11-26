# CSCS.dev Backend

The CSCS.dev backend is hosted on a single [Google Cloud GCE e2-micro](https://gcloud-compute.com/e2-micro.html) instance which costs roughly $8 (including block device) per month. It is automatically deployed during CI/CD by a Github Action located in this project's `.github` directory.

The cloud-init configuration in this directory ensures that the instance is bootstrapped with the Podman runtime which provisions the container. Volume mounts in this container's configuration ensure the container data (pocketbase users and migrations) are persisted a block storage devices that undergoes scheduled backups.

## Strategy

1. Podman runs the `pocketbase` container from arguments supplied as a [Podman Quadlet](https://docs.podman.io/en/latest/markdown/podman-quadlet.1.html) (.container unit file).
2. All application data is persisted to the block device designated for this purpose.
3. Podman will automatically pull and replace the running container with any new container images published to the container registry using the specified tag.
