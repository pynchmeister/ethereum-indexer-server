import { EventWithId } from "ethereum-indexer";
import { get } from "../pouchdb";
// import {PouchDB} from '../pouchdb';



export type Chain = PouchDB.Core.Document<{
    _id: 'Chain';
    blockHash: string;
    blockNumber: number;
}>

export type Space = PouchDB.Core.Document<{
    _id: 'Space';
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    expansionDelta: number;
    address?: string;
}>

export type Transaction = PouchDB.Core.Document<{
    kind: "Transaction";
    transactionHash: string;
}>

export async function updateChainAndReturnTransactionID(db: PouchDB.Database, event: EventWithId): Promise<string> {
  let chain: Chain = await get(db, 'Chain');
  if (!chain) {
    chain = {
       _id: 'Chain',
       blockHash: event.blockHash,
       blockNumber: event.blockNumber
   };
  } else {
    chain.blockHash = event.blockHash;
    chain.blockNumber = event.blockNumber;
  }
  await db.put(chain);

  let transactionId = event.transactionHash;
  let transaction: Transaction = await get(db, transactionId);
  if (!transaction) {
    transaction = {
      kind: 'Transaction',
      _id: transactionId,
      transactionHash: event.transactionHash
    };
    await db.put(transaction)
  }
  
  return transactionId;
}

export async function getSpace(db: PouchDB.Database): Promise<Space> {
    let space: Space = await get(db, 'Space');
    if (space == null) {
      space = {
          _id: 'Space',
          minX: 0,
          minY: 0, 
          maxX: 0,
          maxY: 0,
          expansionDelta: 0
      };

  
    //   space.stake_gas = ZERO;
    //   space.stake_num = ZERO;
  
    //   space.sending_gas = ZERO;
    //   space.sending_num = ZERO;
  
    //   space.resolving_gas = ZERO;
    //   space.resolving_num = ZERO;
  
    //   space.exit_attempt_gas = ZERO;
    //   space.exit_attempt_num = ZERO;
  
    //   space.totalStaked = ZERO;
    //   space.currentStake = ZERO;
  
    //   space.numPlanetsStaked = ZERO;
    //   space.numPlanetsStakedOnce = ZERO;
  
    //   space.numFleetsLaunched = ZERO;
    //   space.numFleetsResolved = ZERO;
  
    //   space.numPlanetsExitFinalized = ZERO;
    //   space.numPlanetsWithExit = ZERO;
    //   // space.totalCollected = ZERO;
    //   // space.playTokenInCirculation = ZERO;
    //   // space.playTokenInGame = ZERO;
    //   // space.freePlayTokenInCirculation = ZERO;
    //   // space.feeePlayTokenInGame = ZERO;
  
    //   // space.tokenToWithdraw = ZERO;
    }
    return space as Space;
  }
  
  