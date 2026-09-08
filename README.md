
# Ring Timelapse generator

A Docker container that periodically takes snapshots from your [Ring](https://www.ring.com) cameras and then creates timelapse videos of the snapshots.

[![Docker Image Version (tag latest semver)](https://img.shields.io/docker/v/wictorwilen/ring-timelapse/latest)](https://hub.docker.com/repository/docker/wictorwilen/ring-timelapse)
[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/wictorwilen/ring-timelapse/blob/main/LICENSE.md)

## Features

- Takes snapshots of all Ring cameras periodically, default 15 minutes
- Creates a timelapse video periodically, default every day
- Runs as a Docker container with minimal footprint

> **NOTE**: Taking snapshots often will drain the battery faster than normal.

## Installation

In order to run the Docker container you need a Ring refresh token.
To generate the token use the following command:

``` bash
npx -p ring-client-api ring-auth-cli
```

Use the following to pull the Docker container from Docker hub.

``` bash
docker pull wictorwilen/ring-timelapse
```

Before starting the container, create a directory that will be shared with the 
container to persist the snapshots and timelapses, for instance:

``` bash
cd /media
mkdir timelapse
```

Start the container by running:

``` bash
docker run \
  -d \
  -e TOKEN="<insert token here>" \
  -e HEALTHCHECKS_URL="<optional healthchecks.io ping URL>" \
  -v "/media/timelapse:/app/dist/target" \
  --restart unless-stopped \
  wictorwilen/ring-timelapse
```

> **NOTE**: In the `-v` argument replace the local path (`/media/timelapse`) with the directory you created

## Environment Variables

The following variables are required:

`TOKEN` - your generated Ring token, see Installation. Ring rotates this token every time it's used, so the container persists the current token to `.ring-token` inside the mounted volume and uses that on subsequent runs instead of the original `TOKEN` value.

The following variables are optional:

`CRON_SCHEDULE` - Schedule for taking snapshots, in [Crontab format](https://linuxhandbook.com/crontab/). Default: `*/15 * * * *`

`CRON_SCHEDULE_TIMELAPSE` - Schedule for generating the timelapse video. Default: `0 7 * * *`

`HEALTHCHECKS_URL` - Ping URL for a [healthchecks.io](https://healthchecks.io) check. If set, the container pings this URL after every run that completes, and pings `<HEALTHCHECKS_URL>/fail` (with the error details as the request body) only if the run fails outright (e.g. an invalid refresh token). A single camera failing to snapshot - often just because it's mid-event-recording - is logged but does not page you, since that's common and usually transient. Set the check's expected schedule to match `CRON_SCHEDULE` so healthchecks.io also alerts you if the container stops running entirely.

## Authors

- [@wictorwilen](https://www.github.com/wictorwilen)
  
## License

[MIT](https://choosealicense.com/licenses/mit/)
