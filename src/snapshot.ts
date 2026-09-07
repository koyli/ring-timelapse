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
        }
    

    };
}

dotenv.config();

snapshot() .then(() => {
    log("done");
    process.exit(0);
})
.catch(err => {
    log(err)
});