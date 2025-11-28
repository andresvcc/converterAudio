# Build a minimal image with Node and ffmpeg for FLAC->AIFF conversion
# Lock to amd64 to match bundled ffmpeg binary
FROM --platform=linux/amd64 node:18-bookworm-slim

WORKDIR /app

# Add bundled ffmpeg/ffprobe to PATH
ENV PATH="/app/bin:${PATH}"

# Install dependencies first (better layer caching)
COPY package.json /app/
RUN npm install --omit=dev

# Copy app source
COPY . /app

EXPOSE 3000
CMD ["npm", "start"]
