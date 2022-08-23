import { EventWithId } from "ethereum-indexer";
import { GenericPouchDBEventProcessor } from "../GenericPouchDBEventProcessor";
import { getSpace, updateChainAndReturnTransactionID } from "./utils";

export class ConquestEventProcessor extends GenericPouchDBEventProcessor {
    async onInitialized(event: EventWithId): Promise<void> {
        await updateChainAndReturnTransactionID(this.db, event);
        let space = await getSpace(this.db);

        space.address = event.address;

        // NOTE : this actually reset, maybe only set if zero ?
        space.minX = event.args.initialSpaceExpansion as number;
        space.maxX = event.args.initialSpaceExpansion as number;
        space.minY = event.args.initialSpaceExpansion as number;
        space.maxY = event.args.initialSpaceExpansion as number;
        space.expansionDelta = event.args.expansionDelta as number;

        await this.db.put(space);
    }

    async createIndexes(db: PouchDB.Database): Promise<void> {
        db.createIndex({
            index: {fields: ['kind']}
        }).then(() => undefined);
    }
}