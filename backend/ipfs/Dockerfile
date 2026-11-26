
FROM ipfs/kubo:v0.39.0

# Persistent IPFS repository
VOLUME ["/data/ipfs"]

# IPFS swarm TCP and UDP
EXPOSE 4001/tcp
EXPOSE 4001/udp

# HTTP API (internal access only)
EXPOSE 5001

# HTTP gateway
EXPOSE 8080
