# Kubernetes abstractions:

## Pod

A Kubernetes Pod is the smallest and most basic deployable unit in Kubernetes. A Pod represents a single instance of a running process in your Kubernetes cluster and can contain one or more tightly coupled containers that share the same network namespace and storage volumes.

### Lifecycle:

Pods are ephemeral and can be created, destroyed, and recreated based on the state of the application.

Kubernetes uses higher-level abstractions like ReplicaSets and Deployments to manage Pods, providing mechanisms for scaling and healing.

## Deployment

A Kubernetes Deployment is a higher-level abstraction that manages a set of replicated Pods. It provides declarative updates to applications and ensures that the specified number of replicas of a Pod are running at all times.

# ReplicaSet

A Kubernetes ReplicaSet is a resource that ensures a specified number of identical Pods are running at any given time. It provides the mechanism to maintain a stable set of replica Pods, automatically replacing any that fail, or are deleted.

# Service

A Kubernetes Service is an abstraction that defines a logical set of Pods and a policy by which to access them. Services enable communication between different parts of your application and between application components and external services.

### Key Characteristics:

- **Stable Endpoint**: Provides a stable IP address and DNS name to a dynamic set of Pods, helping to access Pods consistently.

- **Load Balancing**: Distributes traffic across the group of Pods that a Service targets, facilitating load balancing.
  Selectors: Uses label selectors to identify the set of Pods it proxies traffic to.

- **Discovery and Binding**: Integrates with service discovery and DNS to provide internal DNS names for applications.

### Types of Services:

- **ClusterIP**: Exposes the Service on an internal IP in the cluster. This is the default type and makes the Service accessible only within the cluster.
- **NodePort**: Exposes the Service on the same port on each selected Node in the cluster, providing external access.
- **LoadBalancer**: Exposes the Service externally using a cloud provider's load balancer.
- **ExternalName**: Maps the Service to the contents of the externalName field (e.g., for external DNS).

### Use Cases:

- **Internal Communication**: Enable communication between different microservices within the cluster.
- **External Access**: Expose applications to external traffic by using NodePort or LoadBalancer.
- **Stable Access**: Provide a stable way to reach a set of Pods that might change dynamically.

# Ingress

A Kubernetes Ingress is an API object that manages external access to services within a Kubernetes cluster, typically HTTP and HTTPS traffic. It provides a way to define rules for routing external requests to the appropriate services based on URL paths, hostnames, and other criteria.

### Key Characteristics:

- **HTTP/HTTPS Routing**: Configures how incoming HTTP/HTTPS requests are routed to backend services.
  Path-Based Routing: Routes traffic based on URL paths, allowing different paths on the same domain to be directed to different services.
- **Host-Based Routing**: Routes traffic based on hostnames, enabling different domains to direct traffic to different services.
- **TLS/SSL Termination**: Can handle TLS/SSL termination, providing secure connections.
- **Centralized Entry Point**: Acts as a single point of entry for external traffic, simplifying access management.

### Use Cases:

- **Web Applications**: Exposing web applications to the internet with path and host-based routing.
- **Multiple Services**: Managing routing rules for multiple services under the same domain or different subdomains.
- **Secure Connections**: Terminating TLS/SSL at the ingress level to manage certificates centrally.

# Gateway (2. generation ingress)

A Kubernetes Gateway typically refers to an API Gateway that sits at the edge of a Kubernetes cluster, managing and controlling ingress (incoming) and egress (outgoing) traffic. It can provide various features such as load balancing, security, routing, and API management.

### Key Characteristics:

- **Central Entry and Exit Point**: Acts as a primary access point for both incoming and outgoing traffic.
  Advanced Routing: Supports complex routing rules based on paths, headers, and other request attributes.
- **Load Balancing**: Distributes incoming traffic across multiple backend services to ensure optimal resource utilization and availability.
- **Security Features**: Manages SSL/TLS termination, authentication, and authorization, protecting your services from external threats.
- **API Management**: Offers features like rate limiting, API versioning, and monitoring, often crucial for microservices architectures.
- **Service Mesh Integration**: Can integrate with service meshes like Istio for advanced traffic management, observability, and security.

### Use Cases:

- **Microservices Architectures**: Facilitating communication between microservices while providing centralized control over traffic.
- **External Facing Services**: Managing and controlling access to services exposed to the internet.
- **Hybrid Environments**: Managing ingress and egress for services running in hybrid cloud and on-premises environments.

### Example yaml:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: my-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - 'example.com'
```

# Persisted Volume Claim

A Kubernetes Persistent Volume Claim (PVC) is a request for storage by a user. It abstracts the details of storage and allows users to request specific storage capacities and access modes without needing to know the specifics of the underlying storage infrastructure.

### Key Characteristics:

- **Abstraction**: Provides an abstraction over the underlying storage infrastructure, decoupling storage from individual Pods.
- **Specification**: Users can specify storage requirements such as size and access modes (e.g., ReadWriteOnce, ReadOnlyMany, ReadWriteMany).
- **Binding**: The Kubernetes control plane automatically binds the PVC to an available Persistent Volume (PV) that meets the criteria defined in the PVC.
- **Dynamic Provisioning**: If no suitable PV exists, Kubernetes can dynamically provision a new PV if the StorageClass allows it.

### Use Cases:

- **Stateful Applications**: Storing data for stateful applications such as databases and file systems.
- **Data Persistence**: Ensuring data persists beyond the lifecycle of individual Pods.
- **Shared Storage**: Enabling multiple Pods to access the same storage if required by the application's architecture.

# Persistance Volume

A Kubernetes Persistent Volume (PV) is a piece of storage in the cluster that has been provisioned by an administrator or dynamically provisioned using StorageClasses. It provides a way to manage durable storage resources independently of the lifecycle of individual Pods, ensuring that data persists across Pod restarts and reschedules.

### Key Characteristics:

- **Static or Dynamic Provisioning**: Can be statically created by administrators or dynamically provisioned using StorageClasses.
- **Reusable Resource**: Represents a reusable storage resource in the cluster.
- Lifecycle Independent: Lives independently of the Pods that use it, ensuring data persistence.
- **Access Modes**: Supports various access modes such as ReadWriteOnce, ReadOnlyMany, and ReadWriteMany.
- **Storage Classes**: Can be associated with StorageClasses to enable dynamic provisioning and define different types of storage (e.g., SSD, HDD).

### Use Cases:

- **Data Persistence**: Ensuring that application data persists even when Pods are recreated, such as for databases and stateful applications.
- **Shared Storage**: Providing shared storage that multiple Pods can access simultaneously.
- **Backup and Recovery**: Facilitating data backup and recovery mechanisms.

### Example Persistent Volume:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  nfs:
    path: /path/to/nfs
    server: nfs-server.example.com
```
