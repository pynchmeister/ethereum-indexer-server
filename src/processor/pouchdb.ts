import PouchDB from 'pouchdb';
import PouchDBFindPlugin from 'pouchdb-find';
PouchDB.plugin(PouchDBFindPlugin);

export {
    PouchDB
};

export async function get<T>(db: PouchDB.Database, id: string): Promise<T | null> {
    let result: T | null;
    try {
        result = await db.get(id);
    } catch(e) {
        result = null;
    }
    return result;
}