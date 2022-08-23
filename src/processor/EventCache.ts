import { ContractsInfo, EventProcessor, EventWithId, LastSync } from "ethereum-indexer";
import {PouchDB} from './pouchdb';

function lexicographicNumber15(num: number): string {
    return num.toString().padStart(15, '0');
}

export class EventCache implements EventProcessor {

    protected eventDB: PouchDB.Database;
    protected initialization: Promise<void> | undefined;
    constructor(protected folder: string, protected processor: EventProcessor) {
        this.eventDB = new PouchDB(`${this.folder}/event-stream.db`, {revs_limit: 0})
        this.initialization = this.init();
    }

    protected init(): Promise<void> {
        this.initialization = this.eventDB.createIndex({
            index: {fields: ['batch']} // 'blockNumber', 'blockHash', 'address', 'transactionHash', 'name', 'signature', 'topic'
        }).then(() => undefined);
        return this.initialization;
    }

    async reset() {
        await this.processor.reset();
        await this.eventDB.destroy();
        this.eventDB = new PouchDB(`${this.folder}/event-stream.db`, {revs_limit: 0})
        this.initialization = undefined;
        await this.init();
    }

    async load(contractsData: ContractsInfo): Promise<LastSync> {
        // TODO check if contractsData matches old sync
        try {
            const lastSync = await this.eventDB.get('lastSync');
            return lastSync as unknown as LastSync;
        } catch (err) {
            return {
                lastToBlock: 0,
                latestBlock: 0,
                nextStreamID: 1,
                unconfirmedBlocks: []
            }
        }
    }

    protected _replaying: boolean;
    async replay() {
        if (this._replaying) {
            throw new Error(`already replaying`);
        }
        this._replaying = true;
        try {
            await this.processor.reset();

            const lastSync = await this.eventDB.get('lastSync') as LastSync & {batch: number};

            for (let i = 0; i < lastSync.batch; i++) {
                const events = (await this.eventDB.find({
                    selector: {
                        batch: i
                    },
                    sort: ['_id'],
                })).docs.filter(v => v._id !== 'lastSync') as unknown as EventWithId[];
                if (events.length > 0 ) {
                    const lastEvent = events[events.length -1];
                    await this.processor.process(events, {
                        lastToBlock: lastEvent.blockNumber,
                        latestBlock: lastEvent.blockNumber,
                        nextStreamID: lastEvent.streamID + 1,
                        unconfirmedBlocks: []
                    });
                }
                
            }
        } catch(err) {
            console.error({
                err
            })
        }
        
        this._replaying = false;
    }

    protected batchCounter = 0;
    async process(eventStream: EventWithId[], lastSync: LastSync): Promise<void> {
        await this.initialization;

        if (this._replaying) {
            throw new Error(`please wait while replaying is taking place`);
        }
        await this.processor.process(eventStream, lastSync);
        if (eventStream.length > 0) {
            for (const event of eventStream) {
                await this.eventDB.put({
                    _id: lexicographicNumber15(event.streamID),
                    streamID: event.streamID, // TODO remove ?
                    transactionHash: event.transactionHash,
                    logIndex: event.logIndex,
                    blockNumber: event.blockNumber,
                    blockHash: event.blockHash,
                    transactionIndex: event.transactionIndex,
                    topics: event.topics,
                    removed: event.removed,
                    address: event.address,
                    name: event.name,
                    data: event.data,
                    topic: event.topic,
                    signature: event.signature,
                    args: event.args,
                    extra: event.extra,
                    batch: this.batchCounter
                })
            }
            this.batchCounter ++;    
        }
        

        let lastLastSync;
        try {
            lastLastSync = await this.eventDB.get('lastSync');
        } catch(err) {}
        const lastSyncDoc = {
            _id: 'lastSync',
            _rev: lastLastSync?._rev,
            ...lastSync,
            batch: this.batchCounter
        };
        // console.log(`lastSync document`)
        // console.log(JSON.stringify(lastSyncDoc, null, 2))
        await this.eventDB.put(lastSyncDoc);
        
    }
}