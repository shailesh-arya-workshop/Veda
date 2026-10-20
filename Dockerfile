# AI Everything Workspace — Docker image (Render Docker deploy ke liye)
# yt-dlp + ffmpeg sirf is image me milte hain; plain Node deploy par
# /api/dl/* imaandaari se 501 YTDLP_MISSING deta hai.
FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg ca-certificates \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
