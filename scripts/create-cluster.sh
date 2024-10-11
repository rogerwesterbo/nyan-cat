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
kind_config_file=$(get_abs_filename "$scriptDir/../config/configkind.yaml")
argocd_password=""

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
    echo "  create  alias: c    Create a local cluster with kind and docker"
    echo "  help    alias: h    Print this Help"
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
    read -p "Enter number of control planes (default: 1): " controlplane_number_new 
    read -p "Enter number of workers (default: 0): " worker_number_new 

    if [ ! -z $cluster_name_new ]; then
        cluster_name=$cluster_name_new
    fi

    if [ ! -z $controlplane_number_new ]; then
        controlplane_number=$controlplane_number_new
    fi

    if [ ! -z $worker_number_new ]; then
        worker_number=$worker_number_new
    fi

    read -p "Install ArgoCD? (default: yes) (y/yes | n/no): " install_argocd_new

    if [ "$install_argocd_new" == "yes" ] || [ "$install_argocd_new" == "y" ] || [ "$install_argocd_new" == "" ]; then
        install_argocd="yes"
    else
        install_argocd="no"
    fi

    read -p "Install Nginx Controller? (default: yes) (y/yes | n/no): " install_nginx_controller_new

    if [ "$install_nginx_controller_new" == "yes" ] || [ "$install_nginx_controller_new" == "y" ] || [ "$install_nginx_controller_new" == "" ]; then
        install_nginx_controller="yes"
    else
        install_nginx_controller="no"
    fi

    echo -e "$yellow
    How many workers?: $worker_number"

    echo -e "$yellow
    Install ArgoCD: $install_argocd"

    echo -e "$yellow
    Install Nginx ingress controller: $install_nginx_controller"

    if [ -f "$kind_config_file" ]; then
        truncate -s 0 "$kind_config_file"
    fi

    echo "kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:" >> $kind_config_file

    controlplane_port_https=$(find_free_port)
    controlplane_port_http=$(find_free_port)
    for i in $(seq 1 $controlplane_number); do
        echo "  - role: control-plane
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
        done
    fi

    cat $kind_config_file

    echo -e "$yellow
    kind cluster create $cluster_name --config "$kind_config_file"
    "
    
    echo -e "$clear"
    read -p "Looks ok (n | no | y | yes)? " ok

    if [ "$ok" == "yes" ] ;then
            echo "Excellent  👌 "
            create_cluster
        elif [ "$ok" == "y" ]; then
            echo "Good  🤌"
            create_cluster
        else
            echo "🛑 That is bad ... quitting"
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
    sleep 5
    (kubectl wait --namespace argocd --for=condition=ready pod --selector=app.kubernetes.io/name=argocd-server --timeout=90s|| 
    { 
        echo -e "$red 
        🛑 Could not install argocd into cluster  ...
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
    sleep 5
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
    echo -e "$white
    http (insecure):
    kubectl port-forward -n argocd services/argocd-server 58080:80
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
