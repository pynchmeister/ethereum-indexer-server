import 'dotenv/config';

import Koa from "koa";
import Router from "koa-router";

import logger from "koa-logger";
import json from "koa-json";
import bodyParser from "koa-bodyparser";

import {EthereumIndexer} from 'ethereum-indexer';
import { JSONRPCProvider } from "./utils/JSONRPCProvider";
import { EventListFSStore } from "./processor/EventListFSStore";
import { loadContracts } from "./utils/contracts";

const args = process.argv.slice(2);
const deploymentFolder = args[0];

if (!deploymentFolder) {
    console.error(`no deployment folder provided`);
    process.exit(1);
}

const contractsData = loadContracts(deploymentFolder);

const indexer = new EthereumIndexer(new JSONRPCProvider(process.env.ETHEREUM_NODE), new EventListFSStore('logs'), contractsData);
let lastSync;
async function index() {
    lastSync = await indexer.indexMore();
    if (lastSync.latestBlock - lastSync.lastToBlock < 1) {
        setTimeout(index, 1000);
    } else {
        index();
    }
}
index();




const app = new Koa();
const router = new Router();

router.get("/", async (ctx, next) => {
    ctx.body = { lastSync };
    await next();
});

// Middlewares
app.use(json());
app.use(logger());
app.use(bodyParser());

app.use(router.routes()).use(router.allowedMethods());


const port = 14385;

app.listen(port, () => {
  console.log(`server started on port: ${port}`);
});
