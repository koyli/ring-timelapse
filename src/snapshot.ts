// Copyright (c) Wictor Wilén. All rights reserved. 
// Licensed under the MIT license.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { RingApi } from 'ring-client-api'
import * as path from 'path'
import * as dotenv from "dotenv";
import * as lodash from "lodash";

const log = console.log;

const tokenPath = path.resolve(__dirname, "target", ".ring-token");

const readToken = (): string => {
    if (existsSync(tokenPath)) {
        log("using persisted refresh token");
        return readFileSync(tokenPath, "utf-8").trim();
    }
    return process.env.TOKEN as string;
};

// Pings a healthchecks.io check so failures (or total silence, if the ping
// never arrives) show up as alerts. See https://healthchecks.io/docs/
const pingHealthcheck = async (suffix: "" | "/fail" = "", body?: string): Promise<void> => {
    const url = process.env.HEALTHCHECKS_URL;
    if (!url) {
        return;
    }
    try {
        await fetch(url + suffix, body ? { method: "POST", body } : undefined);
    } catch (err) {
        log(`Healthcheck ping failed: ${err}`);
    }
};

const snapshot = async (): Promise<void> => {
    log("running snapshot")

    if (!existsSync(path.resolve(__dirname, "target"))) {
        log("creating target");
        mkdirSync(path.resolve(__dirname, "target"));
    }

    const ringApi = new RingApi({
        refreshToken: readToken(),
        debug: true // false
    });

    // Ring rotates the refresh token on every use, so persist the new one
    // or the next run will be handed a stale, already-consumed token.
    ringApi.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
        log("persisting rotated refresh token");
        writeFileSync(tokenPath, newRefreshToken);
    });

    const cameras = await ringApi.getCameras();
    const failures: string[] = [];

    for (const camera of cameras) {
        // cameras.forEach(async camera => {
        const name = lodash.camelCase(camera.name);
        log(`Retrieving snapshot for ${camera.name}`);
        try {
            const result = await camera.getSnapshot();

            log((path.resolve(__dirname, "target", name)));
            if (!existsSync(path.resolve(__dirname, "target", name))) {
                mkdirSync(path.resolve(__dirname, "target", name));
            }
            writeFileSync(path.resolve(__dirname, "target", path.join(name, Date.now() + '.png')), result, );
            log(`Snapshot for ${camera.name} saved`);

        }
        catch (err) {
            log(`Snapshot error: ${err}`);
            failures.push(`${camera.name}: ${err}`);
        }


    };

    // Per-camera snapshot failures are common and often transient (e.g. the
    // camera is mid-event-recording) - log them but don't alert on them.
    // Only errors that stop the run outright (bad token, getCameras()
    // failing, etc.) reach the top-level catch and page via healthchecks.
    if (failures.length > 0) {
        log(`Snapshot failed for ${failures.length} camera(s):\n${failures.join("\n")}`);
    }

    await pingHealthcheck();
}

dotenv.config();

snapshot() .then(() => {
    log("done");
    process.exit(0);
})
.catch(async err => {
    log(err);
    await pingHealthcheck("/fail", String(err));
    process.exit(1);
});