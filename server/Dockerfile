# Use official lightweight Node.js LTS Alpine image
FROM node:20-alpine

# Set container working directory
WORKDIR /app

# Copy dependency definitions first for optimal layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose the backend port
EXPOSE 5000

# Run the existing npm start command
CMD ["npm", "start"]
