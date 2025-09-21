#!/bin/bash

# Script to create a new namespace and copy docker-registry secret from development namespace
# Usage: ./scripts/setup-namespace.sh <target-namespace> [source-namespace]

if [ $# -eq 0 ]; then
    echo "Usage: $0 <target-namespace> [source-namespace]"
    echo "Example: $0 my-namespace"
    echo "Example: $0 my-namespace scai-dev"
    exit 1
fi

TARGET_NAMESPACE=$1
SOURCE_NAMESPACE=${2:-"scai-dev"}

echo "🚀 Setting up namespace: $TARGET_NAMESPACE"
echo "📋 Source namespace: $SOURCE_NAMESPACE"
echo ""

# Create target namespace if it doesn't exist
echo "📁 Creating namespace $TARGET_NAMESPACE..."
if ! kubectl get namespace $TARGET_NAMESPACE >/dev/null 2>&1; then
    kubectl create namespace $TARGET_NAMESPACE
    echo "✅ Namespace $TARGET_NAMESPACE created"
    
    # Add common labels
    kubectl label namespace $TARGET_NAMESPACE istio-injection=enabled
    kubectl label namespace $TARGET_NAMESPACE app.kubernetes.io/name=oauth-grant-management
    kubectl label namespace $TARGET_NAMESPACE app.kubernetes.io/version=v1
    kubectl label namespace $TARGET_NAMESPACE app.kubernetes.io/managed-by=cds
    echo "✅ Namespace labels applied"
else
    echo "ℹ️  Namespace $TARGET_NAMESPACE already exists"
fi

# Copy docker-registry secret if source exists
echo ""
echo "🔐 Setting up docker-registry secret..."
if kubectl get secret docker-registry -n $SOURCE_NAMESPACE >/dev/null 2>&1; then
    # Check if secret already exists in target namespace
    if kubectl get secret docker-registry -n $TARGET_NAMESPACE >/dev/null 2>&1; then
        echo "ℹ️  docker-registry secret already exists in $TARGET_NAMESPACE"
    else
        # Copy the secret
        kubectl get secret docker-registry -n $SOURCE_NAMESPACE -o yaml | \
            sed "s/namespace: $SOURCE_NAMESPACE/namespace: $TARGET_NAMESPACE/" | \
            kubectl apply -f -
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully copied docker-registry secret to $TARGET_NAMESPACE"
        else
            echo "❌ Failed to copy docker-registry secret"
            exit 1
        fi
    fi
else
    echo "⚠️  docker-registry secret not found in namespace $SOURCE_NAMESPACE"
    echo "   You may need to create it manually or use a different source namespace"
fi

# Create default service account with necessary permissions
echo ""
echo "👤 Setting up service account..."
kubectl create serviceaccount oauth-grant-management-sa -n $TARGET_NAMESPACE 2>/dev/null || echo "ℹ️  Service account already exists"

# Create a basic role binding for the service account
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: $TARGET_NAMESPACE
  name: oauth-grant-management-role
rules:
- apiGroups: [""]
  resources: ["pods", "services", "configmaps", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
EOF

# Create role binding
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: oauth-grant-management-rolebinding
  namespace: $TARGET_NAMESPACE
subjects:
- kind: ServiceAccount
  name: oauth-grant-management-sa
  namespace: $TARGET_NAMESPACE
roleRef:
  kind: Role
  name: oauth-grant-management-role
  apiGroup: rbac.authorization.k8s.io
EOF

echo "✅ Service account and RBAC configured"

# Set default namespace context
echo ""
echo "🎯 Setting default namespace context..."
kubectl config set-context --current --namespace=$TARGET_NAMESPACE

echo ""
echo "🎉 Namespace setup complete!"
echo ""
echo "📋 Summary:"
echo "   Namespace: $TARGET_NAMESPACE"
echo "   Docker secret: $(kubectl get secret docker-registry -n $TARGET_NAMESPACE >/dev/null 2>&1 && echo '✅ Available' || echo '❌ Not available')"
echo "   Service account: oauth-grant-management-sa"
echo "   RBAC: oauth-grant-management-role"
echo ""
echo "🚀 Next steps:"
echo "   npm run deploy:helm $TARGET_NAMESPACE"
echo "   # or"
echo "   helm upgrade oauth-grant-management ./gen/chart --install --namespace $TARGET_NAMESPACE"
echo ""
