#!/bin/sh

# Setup the cron job. Overwrite rather than append - /etc/crontabs/root
# persists in the container's writable layer, so on a restart (e.g. after
# a host reboot with --restart unless-stopped) this script runs again and
# appending would duplicate every entry.
echo "$CRON_SCHEDULE cd /app && npm run snapshot" > /etc/crontabs/root
echo "$CRON_SCHEDULE_TIMELAPSE cd /app && npm run timelapse" >> /etc/crontabs/root
echo "$CRON_SCHEDULE_PROGRESS cd /app && npm run timelapse -- --keep" >> /etc/crontabs/root

crond -L /var/log/cron.log && tail -f /var/log/cron.log

