import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Leaderboard {
  'top_creators' : Array<[Principal, bigint]>,
  'most_liked' : Array<[string, bigint]>,
  'most_shared' : Array<[string, bigint]>,
}
export interface Vibe {
  'id' : string,
  'creator' : Principal,
  'content' : string,
  'shares' : bigint,
  'likes' : bigint,
  'timestamp' : bigint,
}
export interface _SERVICE {
  'claim_staking_rewards' : ActorMethod<[], bigint>,
  'get_leaderboard' : ActorMethod<[], Leaderboard>,
  'get_my_balance' : ActorMethod<[], bigint>,
  'get_my_reputation' : ActorMethod<[], number>,
  'get_my_vibes' : ActorMethod<[], Array<Vibe>>,
  'get_vibe_stats' : ActorMethod<[string], [bigint, bigint]>,
  'like_vibe' : ActorMethod<[string], bigint>,
  'mint_vibe' : ActorMethod<[string], string>,
  'reset_account' : ActorMethod<[], undefined>,
  'share_vibe' : ActorMethod<[string], bigint>,
  'stake_tokens' : ActorMethod<[bigint], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
