import { ContractsInfo, EventProcessor, EventWithId, LastSync } from "ethereum-indexer";
import PouchDB from 'pouchdb';

function lexicographicNumber15(num: number): string {
    return num.toString().padStart(15, '0');
}

export class EventCache implements EventProcessor {

    protected eventDB: PouchDB.Database;
    constructor(folder: string, protected processor: EventProcessor) {
        this.eventDB = new PouchDB(`${folder}/event-stream.db`, {revs_limit: 0})
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

    async process(eventStream: EventWithId[], lastSync: LastSync): Promise<void> {
        await this.processor.process(eventStream, lastSync);
        if (eventStream.length > 0) {
            for (const event of eventStream) {
                await this.eventDB.put({
                    _id: lexicographicNumber15(event.streamID),
                    name: event.name,
                    topic: event.topic,
                    signature: event.signature,
                    args: event.args,
                    extra: event.extra
                })
            }
            
        }
        let lastLastSync;
        try {
            lastLastSync = await this.eventDB.get('lastSync');
        } catch(err) {}
        await this.eventDB.put({
            _id: 'lastSync',
            _rev: lastLastSync?._rev,
            ...lastSync
        })
    }
}