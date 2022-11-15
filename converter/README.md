## Kubernetes conventions

This job collects data from a kubernetes cluster.
Nodes in the cluster can be labeled and annotated in order to them to show up in the configuration-gui.

### Labels

* `sorrir.host.class`: The type of node, e.g. "raspberry-pi3". Nodes will not show up in the configuration-gui unless this label is set.

### Annotations

* `sorrir.host.protocols`: A json array describing the protocols this node offers, e.g. "[ip, bluetooth]".
* `sorrir.host.location`: currently unused.
