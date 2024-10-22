#!/bin/bash

function get_abs_filename() {
  # $1 : relative filename
  echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
}

function die () {
    ec=$1
    kill $$
}

# global variables
scriptDir=$(dirname -- "$(readlink -f -- "$BASH_SOURCE")")
cluster_name="testcluster"
worker_number=0
controlplane_number=1
install_nginx_controller="yes"
install_argocd="yes"
kind_config_path=$(get_abs_filename "$scriptDir/../config/kindconfig.yaml")
kind_config_template_path=$(get_abs_filename "$scriptDir/../config/kindconfig-template.yaml")
kind_config_file=$(get_abs_filename "$scriptDir/../config/configkind-$cluster_name.yaml")
nyancat_argo_app_yaml=$(get_abs_filename "$scriptDir/../config/nyancat-argo-app.yaml")
argocd_ingress_yaml=$(get_abs_filename "$scriptDir/../config/argocd-ingress.yaml")
cluster_info_file=$(get_abs_filename "$scriptDir/../config/clusterinfo-$cluster_name.txt")
argocd_password=""

declare -a kindk8sversions=(
    "1.31.0;kindest/node:v1.31.0@sha256:53df588e04085fd41ae12de0c3fe4c72f7013bba32a20e7325357a1ac94ba865"
    "1.30.4;kindest/node:v1.30.4@sha256:976ea815844d5fa93be213437e3ff5754cd599b040946b5cca43ca45c2047114"
    "1.30.3;kindest/node:v1.30.3@sha256:bf91e1ef2f7d92bb7734b2b896b3dddea98f0496b34d96e37dd5d7df331b7e56"
    "1.29.8;kindest/node:v1.29.8@sha256:d46b7aa29567e93b27f7531d258c372e829d7224b25e3fc6ffdefed12476d3aa"
    "1.29.7;kindest/node:v1.29.7@sha256:f70ab5d833fca132a100c1f95490be25d76188b053f49a3c0047ff8812360baf"
    "1.28.13;kindest/node:v1.28.13@sha256:45d319897776e11167e4698f6b14938eb4d52eb381d9e3d7a9086c16c69a8110"
    "1.28.12;kindest/node:v1.28.12@sha256:fa0e48b1e83bb8688a5724aa7eebffbd6337abd7909ad089a2700bf08c30c6ea"
    "1.27.16;kindest/node:v1.27.17@sha256:3fd82731af34efe19cd54ea5c25e882985bafa2c9baefe14f8deab1737d9fabe"
    "1.26.15;kindest/node:v1.26.15@sha256:1cc15d7b1edd2126ef051e359bf864f37bbcf1568e61be4d2ed1df7a3e87b354"
    "1.25.16;kindest/node:v1.25.16@sha256:6110314339b3b44d10da7d27881849a87e092124afab5956f2e10ecdb463b025"
)

firstk8sversion="${kindk8sversions[0]}"
IFS=';' read -r k8s_version kind_image <<< "$firstk8sversion"
kindk8simage=$kind_image
kindk8sversion=$k8s_version

kindk8spossibilities=""
for version in "${kindk8sversions[@]}"; do
    IFS=';' read -r k8s_version kind_image <<< "$version"
    kindk8spossibilities="$kindk8spossibilities $k8s_version,"
done

function print_logo() {
    echo -e "$blue"

    echo ""
    echo " ▄████▄   ██▀███  ▓█████ ▄▄▄     ▄▄▄█████▓▓█████     ▄████▄   ██▓     █    ██   ██████ ▄▄▄█████▓▓█████  ██▀███  ";
    echo "▒██▀ ▀█  ▓██ ▒ ██▒▓█   ▀▒████▄   ▓  ██▒ ▓▒▓█   ▀    ▒██▀ ▀█  ▓██▒     ██  ▓██▒▒██    ▒ ▓  ██▒ ▓▒▓█   ▀ ▓██ ▒ ██▒";
    echo "▒▓█    ▄ ▓██ ░▄█ ▒▒███  ▒██  ▀█▄ ▒ ▓██░ ▒░▒███      ▒▓█    ▄ ▒██░    ▓██  ▒██░░ ▓██▄   ▒ ▓██░ ▒░▒███   ▓██ ░▄█ ▒";
    echo "▒▓▓▄ ▄██▒▒██▀▀█▄  ▒▓█  ▄░██▄▄▄▄██░ ▓██▓ ░ ▒▓█  ▄    ▒▓▓▄ ▄██▒▒██░    ▓▓█  ░██░  ▒   ██▒░ ▓██▓ ░ ▒▓█  ▄ ▒██▀▀█▄  ";
    echo "▒ ▓███▀ ░░██▓ ▒██▒░▒████▒▓█   ▓██▒ ▒██▒ ░ ░▒████▒   ▒ ▓███▀ ░░██████▒▒▒█████▓ ▒██████▒▒  ▒██▒ ░ ░▒████▒░██▓ ▒██▒";
    echo "░ ░▒ ▒  ░░ ▒▓ ░▒▓░░░ ▒░ ░▒▒   ▓▒█░ ▒ ░░   ░░ ▒░ ░   ░ ░▒ ▒  ░░ ▒░▓  ░░▒▓▒ ▒ ▒ ▒ ▒▓▒ ▒ ░  ▒ ░░   ░░ ▒░ ░░ ▒▓ ░▒▓░";
    echo "  ░  ▒     ░▒ ░ ▒░ ░ ░  ░ ▒   ▒▒ ░   ░     ░ ░  ░     ░  ▒   ░ ░ ▒  ░░░▒░ ░ ░ ░ ░▒  ░ ░    ░     ░ ░  ░  ░▒ ░ ▒░";
    echo "░          ░░   ░    ░    ░   ▒    ░         ░      ░          ░ ░    ░░░ ░ ░ ░  ░  ░    ░         ░     ░░   ░ ";
    echo "░ ░         ░        ░  ░     ░  ░           ░  ░   ░ ░          ░  ░   ░           ░              ░  ░   ░     ";
    echo "░                                                   ░                                                           ";

    echo -e "$clear"
}

function print_help() {
    # Display Help
    echo -e "$yellow"
    echo "Syntax: ./create-cluster.sh [create|c|help|h]"
    echo
    echo "options:"
    echo "  create           alias: c         Create a local cluster with kind and docker"
    echo "  install-nginx    alias: in        Install Nginx Ingress Controller to current cluster"
    echo "  install-argocd   alias: ia        Install ArgoCD to current cluster"
    echo "  install-nyancat  alias: nyan,cat  Install Nyan-cat ArgoCD application"
    echo "  details          alias: dt        Install Nyan-cat ArgoCD application"
    echo "  delete           alias: d         Install Nyan-cat ArgoCD application"
    echo "  help             alias: h         Print this Help"
    echo ""
    echo "dependencies: docker, kind, kubectl, jq, base64 and helm"
    echo ""
    now=$(date)
    printf "Current date and time in Linux %s\n" "$now"
    echo ""
    echo -e "$clear"
}

clear

yellow='\033[0;33m'
clear='\033[0m'
blue='\033[0;34m'
red='\033[0;31m'

spinner()
{
    local pid=$!
    local delay=0.25
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf "$blue [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
    echo -e "$clear"
}

function prerequisites() {
  if ! command -v $1 1> /dev/null
  then
      echo -e "$red 🚨 $1 could not be found. Install it! 🚨"
      exit
  fi
}

function get_cluster_parameter() {
    prerequisites docker
    prerequisites kind
    prerequisites kubectl
    prerequisites helm
    prerequisites jq
    prerequisites base64

    echo -e "$clear"
    read -p "Enter the cluster name: (default: $cluster_name): " cluster_name_new
    if [ ! -z $cluster_name_new ]; then
        cluster_name=$cluster_name_new
    fi

    read -p "Enter number of control planes (default: 1): " controlplane_number_new 
    if [ ! -z $controlplane_number_new ]; then
        controlplane_number=$controlplane_number_new
    fi

    read -p "Enter number of workers (default: 0): " worker_number_new 
    if [ ! -z $worker_number_new ]; then
        worker_number=$worker_number_new
    fi

    read -p "Enter version of kubernetes version (available:$kindk8spossibilities default: $kindk8sversion): " selected_k8s_version 
    check_k8s_version=""
    selected_k8s_version=$(echo $selected_k8s_version | tr '[:upper:]' '[:lower:]')
    if [ ! -z $selected_k8s_version ]; then
        for version in "${kindk8sversions[@]}"; do
            IFS=';' read -r k8s_version kind_image <<< "$version"
            if [ "$selected_k8s_version" == "$k8s_version" ]; then
                kindk8simage=$kind_image
                kindk8sversion=$k8s_version
                check_k8s_version=$k8s_version
            fi
        done

        if [ -z $check_k8s_version ]; then
            echo -e "$red
            🛑 Kubernetes version $selected_k8s_version is not available. Next time, please select from the available versions: $kindk8spossibilities
            "
            die
        fi
    fi

    read -p "Install Nginx Controller? (default: yes) (y/yes | n/no): " install_nginx_controller_new
    if [ "$install_nginx_controller_new" == "yes" ] || [ "$install_nginx_controller_new" == "y" ] || [ "$install_nginx_controller_new" == "" ]; then
        install_nginx_controller="yes"
    else
        install_nginx_controller="no"
    fi

    read -p "Install ArgoCD? (default: yes) (y/yes | n/no): " install_argocd_new
    if [ "$install_argocd_new" == "yes" ] || [ "$install_argocd_new" == "y" ] || [ "$install_argocd_new" == "" ]; then
        install_argocd="yes"
    else
        install_argocd="no"
    fi

    if [ -f "$kind_config_file" ]; then
        truncate -s 0 "$kind_config_file"
    fi

    echo "
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
networking:
  ipFamily: dual
nodes:" >> $kind_config_file

    controlplane_port_http=$(find_free_port)
    controlplane_port_https=$(find_free_port)
    for i in $(seq 1 $controlplane_number); do
        echo "  - role: control-plane
    image: $kindk8simage
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: "$controlplane_port_http"
        protocol: TCP
      - containerPort: 443
        hostPort: "$controlplane_port_https"
        protocol: TCP" >> $kind_config_file
    
    local http=$(find_free_port)
    local https=$(find_free_port)

    controlplane_port_http=$http
    controlplane_port_https=$https
    
    done

    if [ $worker_number -gt 0 ]; then
        for i in $(seq 1 $worker_number); do
            echo "  - role: worker" >> $kind_config_file
            echo "    image: $kindk8simage" >> $kind_config_file
        done
    fi

    echo -e "$yellow\n⏰ Creating Kind cluster with the following configuration"

    echo -en "$yellow\nCluster name:" 
    echo -en "$blue $cluster_name"

    echo -en "$yellow\nHow many controlplanes?:"
    echo -en "$blue $controlplane_number"

    echo -en "$yellow\nHow many workers?:"
    echo -en "$blue $worker_number"

    echo -en "$yellow\nWhich version of kubernetes?:"
    echo -en "$blue $kindk8sversion"

    echo -en "$yellow\nInstall Nginx ingress controller?:"
    echo -en "$blue $install_nginx_controller"

    echo -en "$yellow\nInstall ArgoCD?:"
    echo -en "$blue $install_argocd"

    if [ -f "$cluster_info_file" ]; then
        truncate -s 0 "$cluster_info_file"
    fi

    echo "
Cluster name: $cluster_name
Controlplane number: $controlplane_number
Worker number: $worker_number
Kubernetes version: $kindk8sversion
Install Nginx ingress controller: $install_nginx_controller
Install ArgoCD: $install_argocd
ArgoCD admin GUI portforwarding: kubectl port-forward -n argocd services/argocd-server 58080:443
ArgoCD admin GUI url: http://localhost:58080" >> $cluster_info_file

    echo ""
    echo -e "$yellow\nKind command about to be run:"
    echo -e "$blue\nkind cluster create $cluster_name --config "$kind_config_file""
    
    echo -e "$clear"
    read -p "Looks ok (n | no | y | yes)? " ok

    if [ "$ok" == "yes" ] ;then
            echo "Excellent  👌 "
            create_cluster
        elif [ "$ok" == "y" ]; then
            echo "Good  🤌"
            create_cluster
        else
            echo "🛑 Did not notice and confirmation, I need you to confirm with a yes or y 😀 ... quitting"
            exit 0
    fi
}

function install_argocd(){
    echo -e "$yellow
    Create ArgoCD namespace
    "        
    (kubectl create namespace argocd|| 
    { 
        echo -e "$red 
        🛑 Could not namespace argocd in cluster ...
        "
        die
    }) & spinner

    echo -e "$yellow
    Installing ArgoCD
    "
    (kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml|| 
    { 
        echo -e "$red 
        🛑 Could not install argocd into cluster  ...
        "
        die
    }) & spinner

    echo -e "$yellow
    ⏰ Waiting for ArgoCD to be ready
    "
    sleep 7
    (kubectl wait --namespace argocd --for=condition=ready pod --selector=app.kubernetes.io/name=argocd-server --timeout=90s|| 
    { 
        echo -e "$red 
        🛑 Could not install argocd into cluster  ...
        "
        die
    }) & spinner

    echo -e "$yellow
    Installing ArgoCD Ingress
    "
    (kubectl apply -n argocd -f $argocd_ingress_yaml|| 
    { 
        echo -e "$red 
        🛑 Could not install argocd ingress into cluster  ...
        "
        die
    }) & spinner

    echo -e "$yellow
    ✅ Done installing ArgoCD"
}

function install_nginx_controller(){
    echo -e "$yellow
    Create Nginx Ingress Controller
    "        
    (kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml|| 
    { 
        echo -e "$red 
        Could not install nginx controller in cluster ...
        "
        die
    }) & spinner

    echo -e "$yellow
    ⏰ Waiting for Nginx ingress controller to be ready
    "
    sleep 7
    (kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s|| 
    { 
        echo -e "$red 
        🛑 Could not install nginx ingress controller into cluster  ...
        "
        die
    }) & spinner

    echo -e "$yellow
    ✅ Done installing Nginx Ingress Controller"
}

function create_cluster() {
    if [ -z $cluster_name ]  || [ $controlplane_number -lt 1 ] || [ $worker_number -lt 0 ]; then
        echo "Not all parameters good ... quitting"
        die
    fi

    echo -e "$yellow ⏰ Creating Kind cluster"
    echo -e "$clear"
    (kind create cluster --name "$cluster_name" --config "$kind_config_file" || 
    { 
        echo -e "$red 
        🛑 Could not create cluster ...
        "
        die
    }) & spinner

    if [ "$install_nginx_controller" == "yes" ]; then
        install_nginx_controller
    fi

    if [ "$install_argocd" == "yes" ]; then
        install_argocd
        argocd_password="$(kubectl get secrets -n argocd argocd-initial-admin-secret -o json | jq -r '.data.password' | base64 -d)"

        echo "ArgoCD:"
        echo "Username: admin"
        echo "ArgoCD password: $argocd_password" >> $cluster_info_file
    fi

    echo -e "$yellow
    ✅ Done creating kind cluster
    "

    if [ "$install_argocd" == "yes" ]; then

    echo -e "$yellow
    🚀 ArgoCD is ready to use
    Port forward the ArgoCD server to access the UI:
    "
    echo -e "$white
    https (self-signed certificate):
    kubectl port-forward -n argocd services/argocd-server 58080:443
    "
    
    echo -e "$yellow
    Open the ArgoCD UI in your browser: http://localhost:58080
    
    🔑  Argocd Username: admin
    🔑  Argocd Password: $argocd_password

    "
    fi

    echo -e "$yellow
    To see all kind clusters , type: $red kind get clusters
    "

    echo -e "$yellow
    To delete cluster, type: $red kind delete cluster --name $cluster_name
    "
    echo -e "$clear"

    install_nyancat=""
    read -p "Install Nyan-cat ArgoCD application? (default: yes) (y/yes | n/no): " install_nyancat_new
    if [ "$install_nyancat_new" == "yes" ] || [ "$install_nyancat_new" == "y" ] || [ "$install_nyancat_new" == "" ]; then
        install_nyancat="yes"
    else
        install_nyancat="no"
    fi

    if [ "$install_nyancat" == "yes" ]; then
        install_nyancat_application
    fi
}

function install_nyancat_application(){
    echo -e "$yellow
    Installing Nyan-cat ArgoCD application
    "
    (kubectl apply -f $nyancat_argo_app_yaml|| 
    { 
        echo -e "$red 
        🛑 Could not install Nyan-cat ArgoCD application into cluster  ...
        "
        die
    }) & spinner

    echo -e "$yellow
    ✅ Done installing Nyan-cat ArgoCD application
    "

    echo "Nyancat argocd application installed: yes" >> $cluster_info_file
}

function find_free_port() {
    LOW_BOUND=49152
    RANGE=16384
    while true; do
        CANDIDATE=$[$LOW_BOUND + ($RANDOM % $RANGE)]
        (echo -n >/dev/tcp/127.0.0.1/${CANDIDATE}) >/dev/null 2>&1
        if [ $? -ne 0 ]; then
            echo $CANDIDATE
            break
        fi
    done
}

function see_details_of_cluster() {
    echo -e "$yellow
    🚀 Cluster details
    "
    echo -e "$clear"
    kubectl cluster-info
    echo -e "$yellow
    🚀 Nodes
    "
    echo -e "$clear"
    kubectl get nodes
    echo -e "$yellow
    🚀 Pods
    "
    echo -e "$clear"
    kubectl get pods --all-namespaces
    echo -e "$yellow
    🚀 Services
    "
    echo -e "$clear"
    kubectl get services --all-namespaces
    echo -e "$yellow
    🚀 Ingresses
    "
    echo -e "$clear"
    kubectl get ingresses --all-namespaces
}

function details_for_cluster() {
    clusterName=${@: -1}

    if [[ "$#" -lt 2 ]]; then 
        echo "Missing name of cluster"; 
        exit 1
    fi

    if [[ "$#" -gt 2 ]]; then 
        echo "Too many arguments"; 
        exit 1
    fi

    clusters=$(kind get clusters)
    if ! echo "$clusters" | grep -q "$clusterName"; then
        echo "Cluster $clusterName not found"
        exit 1
    fi

    echo -e "$yellow\nCluster details for $clusterName"
    cat $cluster_info_file

    echo -e "$yellow\nKind configuration for $clusterName"

    cat $kind_config_file
}

function delete_cluster() {
    clusterName=${@: -1}

    if [[ "$#" -lt 2 ]]; then 
        echo "Missing name of cluster"; 
        exit 1
    fi

    if [[ "$#" -gt 2 ]]; then 
        echo "Too many arguments"; 
        exit 1
    fi

    ##kind delete cluster --name $clusterName
    (kind delete cluster --name $clusterName|| 
    { 
        echo -e "$red 
        🛑 Could not delete cluster with name $clusterName
        "
        die
    }) & spinner

    echo -e "$yellow
    ✅ Done deleting cluster
    "
}

while (($#)); do
   case $1 in
        create|c) # create cluster
            print_logo
            get_cluster_parameter
            exit;;
        help|h) # display Help
            print_logo
            print_help
            exit;;
        install-nyancat|nyan|cat) # install nyancat application
            print_logo
            install_nyancat_application
            exit;;
        install-nginx|in) # install nginx controller
            print_logo
            install_nginx_controller
            exit;;
        install-argocd|ia) # install argocd
            print_logo
            install_argocd
            exit;;
        details|dt) # see details of cluster
            print_logo
            see_details_of_cluster
            exit;;
        info|i) # see details of cluster
            print_logo
            details_for_cluster $*
            exit;;
        delete|d) # see details of cluster
            print_logo
            delete_cluster $*
            exit;;
        *) # Invalid option
            echo -e "$red
            Error: Invalid option
            $clear
            "
            exit;;
   esac
done

print_logo
print_help
