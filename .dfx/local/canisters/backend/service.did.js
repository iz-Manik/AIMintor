export const idlFactory = ({ IDL }) => {
  const Leaderboard = IDL.Record({
    'top_creators' : IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat64)),
    'most_liked' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64)),
    'most_shared' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat64)),
  });
  const Vibe = IDL.Record({
    'id' : IDL.Text,
    'creator' : IDL.Principal,
    'content' : IDL.Text,
    'shares' : IDL.Nat64,
    'likes' : IDL.Nat64,
    'timestamp' : IDL.Nat64,
  });
  return IDL.Service({
    'claim_staking_rewards' : IDL.Func([], [IDL.Nat64], []),
    'get_leaderboard' : IDL.Func([], [Leaderboard], ['query']),
    'get_my_balance' : IDL.Func([], [IDL.Nat64], ['query']),
    'get_my_reputation' : IDL.Func([], [IDL.Float32], ['query']),
    'get_my_vibes' : IDL.Func([], [IDL.Vec(Vibe)], ['query']),
    'get_vibe_stats' : IDL.Func([IDL.Text], [IDL.Nat64, IDL.Nat64], ['query']),
    'like_vibe' : IDL.Func([IDL.Text], [IDL.Nat64], []),
    'mint_vibe' : IDL.Func([IDL.Text], [IDL.Text], []),
    'reset_account' : IDL.Func([], [], []),
    'share_vibe' : IDL.Func([IDL.Text], [IDL.Nat64], []),
    'stake_tokens' : IDL.Func([IDL.Nat64], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
