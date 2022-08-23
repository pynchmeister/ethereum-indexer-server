import { ContractsInfo, EventProcessor, EventWithId, LastSync, LogEvent } from "ethereum-indexer";
import {PouchDB} from './pouchdb';

export interface PouchDBSingleEventProcessor {
    processEvent(db : PouchDB.Database, event: EventWithId): Promise<void>;
    createIndexes(db: PouchDB.Database): Promise<void>;
}

export class PouchDBProcessor implements EventProcessor {

    protected db: PouchDB.Database<any>;
    
    private initialization: Promise<void> | undefined;    
    constructor(private folder: string, private singleEventProcessor: PouchDBSingleEventProcessor) {
        this.db = new PouchDB(`${this.folder}/data.db`, {revs_limit: 0})
        this.initialization = this.init();
    }


    private init(): Promise<void> {
        this.initialization = this.singleEventProcessor.createIndexes(this.db);
        return this.initialization;
    }

    async reset() {
        await this.db.destroy();
        this.db = new PouchDB(`${this.folder}/data.db`, {revs_limit: 0})
        this.initialization = undefined;
        await this.init();
    }

    async load(contractsData: ContractsInfo): Promise<LastSync> {
        // TODO check if contractsData matches old sync
        try {
            const lastSync = await this.db.get('lastSync');
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


    private lastEventID: number;
    private processing: boolean;
    async process(eventStream: EventWithId[], lastSync: LastSync): Promise<void> {
        if (this.processing) {
            throw new Error(`processing...`);
        }
        this.processing = true;
        // console.log(`processing stream (nextStreamID: ${lastSync.nextStreamID})`)

        try {
            for (const event of eventStream) {
                if (this.lastEventID && event.streamID <= this.lastEventID) {
                    continue;
                }
                await this.singleEventProcessor.processEvent(this.db, event);
                this.lastEventID = event.streamID;
                if (!this.initialization) {
                    break; // stop
                }
            }
            let lastLastSync;
            try {
                lastLastSync = await this.db.get('lastSync');
            } catch(err) {}
            const lastSyncDoc = {
                _id: 'lastSync',
                _rev: lastLastSync?._rev,
                ...lastSync,
            };
            await this.db.put(lastSyncDoc);
        } finally {
            this.processing = false;
        }
    }


    query<T>(request: PouchDB.Find.FindRequest<T>): Promise<PouchDB.Find.FindResponse<T>> {
        return this.db.find(request);
    }

    get<T>(id: string): Promise<PouchDB.Core.Document<T>> {
        return this.db.get(id);
    }
}
