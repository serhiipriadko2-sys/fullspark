#!/bin/bash
# IskraSpaceApp - Production Deployment Script

set -e

echo "🌌 Deploying Iskra Space App to Production..."
echo ""

# Configuration
IMAGE_NAME="iskra-space-app"
IMAGE_TAG="${1:-latest}"
CONTAINER_NAME="iskra-space-app"
PORT="${2:-5173}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker found: $(docker --version)${NC}"
echo ""

# Check for docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  docker-compose not found. Using docker compose v2${NC}"
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo -e "${GREEN}✅ Compose command: $COMPOSE_CMD${NC}"
echo ""

# Function: Build image
build_image() {
    echo -e "${YELLOW}📦 Building Docker image...${NC}"
    docker build -t $IMAGE_NAME:$IMAGE_TAG .
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Image built successfully: $IMAGE_NAME:$IMAGE_TAG${NC}"
    else
        echo -e "${RED}❌ Image build failed${NC}"
        exit 1
    fi
    echo ""
}

# Function: Stop existing container
stop_container() {
    if docker ps -a | grep -q $CONTAINER_NAME; then
        echo -e "${YELLOW}🛑 Stopping existing container...${NC}"
        docker stop $CONTAINER_NAME || true
        docker rm $CONTAINER_NAME || true
        echo -e "${GREEN}✅ Container stopped and removed${NC}"
    else
        echo -e "${GREEN}✅ No existing container to stop${NC}"
    fi
    echo ""
}

# Function: Run container
run_container() {
    echo -e "${YELLOW}🚀 Starting new container...${NC}"
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:80 \
        --restart unless-stopped \
        --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        $IMAGE_NAME:$IMAGE_TAG

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Container started successfully${NC}"
        echo -e "${GREEN}   Container ID: $(docker ps -qf name=$CONTAINER_NAME)${NC}"
        echo -e "${GREEN}   Access at: http://localhost:$PORT${NC}"
    else
        echo -e "${RED}❌ Container failed to start${NC}"
        exit 1
    fi
    echo ""
}

# Function: Check health
check_health() {
    echo -e "${YELLOW}🏥 Waiting for health check...${NC}"
    sleep 5

    for i in {1..10}; do
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unknown")

        if [ "$HEALTH" = "healthy" ]; then
            echo -e "${GREEN}✅ Container is healthy!${NC}"
            return 0
        elif [ "$HEALTH" = "unhealthy" ]; then
            echo -e "${RED}❌ Container is unhealthy${NC}"
            docker logs $CONTAINER_NAME --tail 50
            return 1
        fi

        echo -e "${YELLOW}   Health status: $HEALTH (attempt $i/10)${NC}"
        sleep 3
    done

    echo -e "${YELLOW}⚠️  Health check timeout (may still be starting)${NC}"
}

# Function: Show logs
show_logs() {
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    docker logs $CONTAINER_NAME --tail 20
    echo ""
}

# Main deployment flow
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}    Iskra Space App Deployment${NC}"
echo -e "${YELLOW}═══════════════════════════════════════${NC}"
echo ""

# Build
build_image

# Stop old container
stop_container

# Run new container
run_container

# Check health
check_health

# Show logs
show_logs

echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}   ✨ Deployment Complete! ✨${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📱 Application URL: http://localhost:$PORT${NC}"
echo -e "${GREEN}🏥 Health Check: http://localhost:$PORT/health${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs:    docker logs -f $CONTAINER_NAME"
echo -e "  Stop app:     docker stop $CONTAINER_NAME"
echo -e "  Restart app:  docker restart $CONTAINER_NAME"
echo -e "  Shell access: docker exec -it $CONTAINER_NAME sh"
echo ""
