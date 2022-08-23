import { EventWithId } from "ethereum-indexer";
import { PouchDBSingleEventProcessor } from "./PouchDBProcessor";
// import {PouchDB} from './pouchdb';

export abstract class GenericPouchDBEventProcessor implements PouchDBSingleEventProcessor {
    
    protected db: PouchDB.Database;
    async processEvent(db: PouchDB.Database, event: EventWithId): Promise<void> {
        this.db = db; // short cut
        const functionName = `on${event.name}`;
        if (this[functionName]) {
            console.log(`processing ${event.name}...`);
            await this[functionName](event);
            console.log(`... done`);
        }
    }

    async get<T>(id: string): Promise<T & PouchDB.Core.IdMeta | null> {
        try {
            return this.db.get<T>(id);
        } catch(e) {
            return null;
        }
    }

    abstract createIndexes(db: PouchDB.Database): Promise<void>;

}
