FROM node:lts-slim

WORKDIR /usr/src/app

ENV PORT 80
ENV NODE_ENV production

# Create logs directory and set permissions
RUN mkdir -p /usr/src/app/logs && chmod 777 /usr/src/app/logs

COPY package*.json ./

# Install all dependencies including devDependencies
RUN npm install --include=dev

COPY . ./

RUN node -v

# Declare volume for logs
VOLUME ["/usr/src/app/logs"]

CMD [ "npm", "start" ]