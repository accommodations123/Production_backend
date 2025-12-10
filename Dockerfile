# ---------- Stage 1: Build & install dependencies ----------
FROM node:18-alpine AS build
 
WORKDIR /accommodations-backend
 
# Copy dependency files
COPY package.json package-lock.json* ./
 
# Install all deps (including dev-deps if needed for build)
RUN npm ci --silent
 
# Copy the full source code
COPY . .
 
# If using TypeScript, build it here (uncomment if needed)
# RUN npm run build
 
 
# ---------- Stage 2: Production image ----------
FROM node:18-alpine AS production
 
WORKDIR /accommodations-backend
 
# Copy only package files first for clean prod install
COPY package.json package-lock.json* ./
 
# Install only production dependencies
RUN npm ci --silent --only=production
 
# Copy build output or JS source
COPY --from=build /accommodations-backend ./

# Expose backend port
EXPOSE 5000
 
# Start the backend
CMD ["node", "server.js"]