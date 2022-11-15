#!/bin/sh

kubectl get nodes "$@" \
  -o=jsonpath="{range .items[*]}{.metadata.labels.k3s\.io\/hostname}{'\t'}{.status.nodeInfo.architecture}{'\t'}{.metadata.annotations.sorrir\.host\.protocols}{'\n'}{end}" \
    | sed '/^\t.*$/d' \
    | sort -u \
    | awk 'BEGIN { print "{\"devices\": [" } 
           NR!=1 && $1!="k8master" { printf "," } 
           $3=="" { $3="[]" } 
           $1!="k8master" { print "{\"name\": \"" $1 "\", \"architecture\": \"" $2 "\", \"protocols\": " $3 "}" } 
           END { print "]}" }' 
