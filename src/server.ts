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
import { EventCache } from './processor/EventCache';
import { ConquestEventProcessor } from './processor/conquest/ConquestEventProcessor';
import { PouchDBProcessor } from './processor/PouchDBProcessor';

const args = process.argv.slice(2);
const deploymentFolder = args[0];

if (!deploymentFolder) {
    console.error(`no deployment folder provided`);
    process.exit(1);
}

const contractsData = loadContracts(deploymentFolder);

const folder = 'data';

// const fsProcessor = new EventListFSStore(folder);
// const cached = new EventCache(folder, fsProcessor);

const conquestProcessor = new ConquestEventProcessor();
const pouchDBProcessor = new PouchDBProcessor(folder, conquestProcessor);
const cached = new EventCache(folder, pouchDBProcessor);

const indexer = new EthereumIndexer(new JSONRPCProvider(process.env.ETHEREUM_NODE), cached, contractsData);
let lastSync;
async function index() {
    try {
        lastSync = await indexer.indexMore();
    } catch(err) {
        setTimeout(index, 1000);
        return;
    }
    
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

router.get("/get/:id", async (ctx, next) => {
    const documentID = ctx.params['id'];
    console.log({documentID});
    const response = await pouchDBProcessor.get(documentID);
    console.log({response});
    ctx.body = response;
    await next();
});


router.post("/replay", async (ctx, next) => {
    await cached.replay();
    ctx.body = { lastSync };
    await next();
});

router.post("/query", async (ctx, next) => {
    const response = await pouchDBProcessor.query(ctx.request.body);
    ctx.body = response;
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
