# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Redis Configuration
ENV REDIS_URL=redis-16958.c301.ap-south-1-1.ec2.redns.redis-cloud.com:16958
ENV REDIS_PASSWORD=384829842
ENV REDIS_MAX_RETRIES=5
ENV REDIS_CONNECT_TIMEOUT=5000
ENV REDIS_KEEP_ALIVE=30000
ENV REDIS_MEMORY_LIMIT=1000000000
ENV REDIS_CACHE_TTL_FOODS=3600
ENV REDIS_CACHE_TTL_FOOD_DETAIL=7200
ENV REDIS_CACHE_TTL_USER=1800
ENV REDIS_CACHE_TTL_ORDER_HISTORY=900
ENV REDIS_HOST=redis
ENV REDIS_PORT=16958

# MongoDB Configuration
ENV MONGO_URI=mongodb+srv://rishika:1234@rishika.d2ouvag.mongodb.net/newDB

# Environment
ENV NODE_ENV=docker
ENV NODE_OPTIONS="--experimental-vm-modules"
ENV PORT=5000

ENV JWT_SECRET="random#secret"
ENV STRIPE_SECRET_KEY=sk_test_51RL2BtQE9tlu0TT9HiiRtmtwsUse607wHQGvys6stqDPThnXdAJGRN77s0YhafI8quw3SEtkuVAd7kcCQwuMYta000JM7baOTd

# Copy rest of the backend code
COPY . .

# Expose the port (default 5000, change if your backend uses another)
EXPOSE 5000

# Start the server (edit if your entrypoint is different)
CMD ["npm", "start"]
