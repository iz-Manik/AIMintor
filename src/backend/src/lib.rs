// #![allow(deprecated)]

// use ic_cdk::{caller, query, update, init};
// use candid::{CandidType, Principal, Deserialize};
// use std::cell::RefCell;
// use std::collections::{HashMap, HashSet};

// thread_local! {
//     static STATE: RefCell<State> = RefCell::new(State::default());
// }

// #[derive(Default)]
// struct State {
//     user_vibes: HashMap<Principal, Vec<Vibe>>,
//     token_balances: HashMap<Principal, u64>,
//     vibe_interactions: HashMap<String, InteractionStats>,
//     user_likes: HashMap<Principal, HashSet<String>>,
// }

// #[derive(Clone, Debug, CandidType, Deserialize)]
// struct Vibe {
//     id: String,
//     content: String,
//     timestamp: u64,
//     likes: Option<u64>,
//     shares: Option<u64>,
// }

// #[derive(Default, CandidType, Deserialize)]
// struct InteractionStats {
//     likes: u64,
//     shares: u64,
// }

// #[init]
// fn init() {
//     ic_cdk::println!("Vibe canister initialized!");
// }

// #[update]
// fn mint_vibe(content: String) -> String {
//     let user = caller();
//     let timestamp = ic_cdk::api::time();
//     let id = format!("{}-{}", user.to_text(), timestamp);

//     STATE.with(|state| {
//         let mut state = state.borrow_mut();

//         let new_vibe = Vibe {
//             id: id.clone(),
//             content: content.clone(),
//             timestamp,
//             likes: Some(0),
//             shares: Some(0),
//         };

//         state.user_vibes.entry(user).or_default().push(new_vibe);

//         state.vibe_interactions.insert(
//             id.clone(),
//             InteractionStats {
//                 likes: 0,
//                 shares: 0,
//             },
//         );

//         let balance = state.token_balances.entry(user).or_insert(0);
//         *balance += 10;

//         id
//     })
// }

// #[query]
// fn get_my_vibes() -> Vec<Vibe> {
//     let user = caller();

//     STATE.with(|state| {
//         let state = state.borrow();

//         state.user_vibes
//             .get(&user)
//             .cloned()
//             .unwrap_or_default()
//             .into_iter()
//             .map(|mut vibe| {
//                 if let Some(stats) = state.vibe_interactions.get(&vibe.id) {
//                     vibe.likes = Some(stats.likes);
//                     vibe.shares = Some(stats.shares);
//                 }
//                 vibe
//             })
//             .collect()
//     })
// }

// #[query]
// fn get_my_balance() -> u64 {
//     let user = caller();

//     STATE.with(|state| {
//         *state.borrow()
//             .token_balances
//             .get(&user)
//             .unwrap_or(&0)
//     })
// }

// #[update]
// fn reset_account() {
//     let user = caller();

//     STATE.with(|state| {
//         let mut state = state.borrow_mut();
//         state.user_vibes.remove(&user);
//         state.user_likes.remove(&user);
//         state.token_balances.insert(user, 0);
//     })
// }

// #[update]
// fn like_vibe(vibe_id: String) -> u64 {
//     let user = caller();

//     STATE.with(|state| {
//         let mut state = state.borrow_mut();

//         let user_likes = state.user_likes.entry(user).or_default();
//         if user_likes.contains(&vibe_id) {
//             return state.vibe_interactions
//                 .get(&vibe_id)
//                 .map(|stats| stats.likes)
//                 .unwrap_or(0);
//         }

//         user_likes.insert(vibe_id.clone());

//         state.vibe_interactions
//             .entry(vibe_id.clone())
//             .or_default()
//             .likes += 1;

//         let owner_opt = state.user_vibes.iter()
//             .find_map(|(owner, vibes)| {
//                 if vibes.iter().any(|v| v.id == vibe_id) {
//                     Some(*owner)
//                 } else {
//                     None
//                 }
//             });

//         if let Some(owner) = owner_opt {
//             let balance = state.token_balances.entry(owner).or_insert(0);
//             *balance += 1;
//         }

//         state.vibe_interactions
//             .get(&vibe_id)
//             .map(|stats| stats.likes)
//             .unwrap_or(0)
//     })
// }

// #[update]
// fn share_vibe(vibe_id: String) -> u64 {
//     let user = caller();

//     STATE.with(|state| {
//         let mut state = state.borrow_mut();

//         state.vibe_interactions
//             .entry(vibe_id.clone())
//             .or_default()
//             .shares += 1;

//         let owner_opt = state.user_vibes.iter()
//             .find_map(|(owner, vibes)| {
//                 if vibes.iter().any(|v| v.id == vibe_id) {
//                     Some(*owner)
//                 } else {
//                     None
//                 }
//             });

//         if let Some(owner) = owner_opt {
//             let balance = state.token_balances.entry(owner).or_insert(0);
//             *balance += 2;
//         }

//         state.vibe_interactions
//             .get(&vibe_id)
//             .map(|stats| stats.shares)
//             .unwrap_or(0)
//     })
// }

// #[query]
// fn get_vibe_stats(vibe_id: String) -> (u64, u64) {
//     STATE.with(|state| {
//         let state = state.borrow();
//         state.vibe_interactions
//             .get(&vibe_id)
//             .map(|stats| (stats.likes, stats.shares))
//             .unwrap_or((0, 0))
//     })
// }

// #[cfg(test)]
// mod tests {
//     use super::*;
//     use candid::export_service;

//     export_service!();

//     #[test]
//     fn export_candid() {
//         std::fs::write("vibe_platform.did", __export_service()).unwrap();
//     }
// }


#![allow(deprecated)]

use ic_cdk::{query, update, init};
use candid::{CandidType, Principal, Deserialize};
use std::cell::RefCell;
use std::collections::{HashMap, HashSet};

// IC time API for production
#[cfg(not(test))]
use ic_cdk::api::time;

thread_local! {
    static STATE: RefCell<State> = RefCell::new(State::default());

    // Mock time storage for tests
    #[cfg(test)]
    static MOCK_TIME: RefCell<u64> = RefCell::new(1640995200);
}

const MINT_COST: u64 = 5;
const INITIAL_BALANCE: u64 = 100;
const LIKE_REWARD_USER: u64 = 1;
const LIKE_REWARD_CREATOR: u64 = 2;
const SHARE_REWARD_USER: u64 = 2;
const SHARE_REWARD_CREATOR: u64 = 3;

#[derive(Default, Clone)]
struct State {
    user_vibes: HashMap<Principal, Vec<Vibe>>,
    token_balances: HashMap<Principal, u64>,
    vibe_interactions: HashMap<String, InteractionStats>,
    user_likes: HashMap<Principal, HashSet<String>>,
    user_shares: HashMap<Principal, HashSet<String>>,
    reputation: HashMap<Principal, f32>,
    leaderboard: Leaderboard,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
struct Vibe {
    id: String,
    content: String,
    timestamp: u64,
    likes: u64,
    shares: u64,
    creator: Principal,
}

#[derive(Default, Clone, Debug, CandidType, Deserialize)]
struct InteractionStats {
    likes: u64,
    shares: u64,
}

#[derive(Default, Clone, CandidType, Deserialize)]
struct Leaderboard {
    top_creators: Vec<(Principal, u64)>,
    most_liked: Vec<(String, u64)>,
    most_shared: Vec<(String, u64)>,
}

#[init]
fn init() {
    ic_cdk::println!("Vibe canister initialized!");
}

fn get_timestamp() -> u64 {
    #[cfg(not(test))]
    {
        // IC time is in nanoseconds, convert to seconds
        ic_cdk::api::time() / 1_000_000_000
    }
    #[cfg(test)]
    {
        MOCK_TIME.with(|t| *t.borrow())
    }
}

fn current_caller() -> Principal {
    #[cfg(test)]
    {
        crate::tests::test_caller()
    }
    #[cfg(not(test))]
    {
        ic_cdk::caller()
    }
}

#[update]
fn mint_vibe(content: String) -> String {
    let user = current_caller();
    let timestamp = get_timestamp();
    let id = format!("{}-{}", user.to_text(), timestamp);

    STATE.with(|state| {
        let mut state = state.borrow_mut();

        if !state.token_balances.contains_key(&user) {
            state.token_balances.insert(user, INITIAL_BALANCE);
        }

        let balance = state.token_balances.get_mut(&user).unwrap();
        if *balance < MINT_COST {
            panic!("Insufficient balance to mint vibe");
        }

        *balance -= MINT_COST;

        let new_vibe = Vibe {
            id: id.clone(),
            content: content.clone(),
            timestamp,
            likes: 0,
            shares: 0,
            creator: user,
        };

        state.user_vibes.entry(user).or_default().push(new_vibe.clone());

        state.vibe_interactions.insert(
            id.clone(),
            InteractionStats {
                likes: 0,
                shares: 0,
            },
        );

        *state.reputation.entry(user).or_insert(1.0) += 0.1;
        update_leaderboard(&mut state, &new_vibe);

        id
    })
}

#[query]
fn get_my_vibes() -> Vec<Vibe> {
    let user = current_caller();

    STATE.with(|state| {
        let state = state.borrow();
        state.user_vibes
            .get(&user)
            .cloned()
            .unwrap_or_default()
    })
}

#[query]
fn get_my_balance() -> u64 {
    let user = current_caller();

    STATE.with(|state| {
        let state = state.borrow();
        *state.token_balances
            .get(&user)
            .unwrap_or(&INITIAL_BALANCE)
    })
}

#[query]
fn get_my_reputation() -> f32 {
    let user = current_caller();

    STATE.with(|state| {
        let state = state.borrow();
        *state.reputation
            .get(&user)
            .unwrap_or(&1.0)
    })
}

#[update]
fn reset_account() {
    let user = current_caller();

    STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.user_vibes.remove(&user);
        state.user_likes.remove(&user);
        state.user_shares.remove(&user);
        state.token_balances.insert(user, INITIAL_BALANCE);
        state.reputation.insert(user, 1.0);
    })
}

#[update]
fn like_vibe(vibe_id: String) -> u64 {
    let user = current_caller();

    STATE.with(|state| {
        let mut state = state.borrow_mut();

        if !state.token_balances.contains_key(&user) {
            state.token_balances.insert(user, INITIAL_BALANCE);
        }

        let user_likes = state.user_likes.entry(user).or_default();
        if user_likes.contains(&vibe_id) {
            return state.vibe_interactions
                .get(&vibe_id)
                .map(|stats| stats.likes)
                .unwrap_or(0);
        }

        user_likes.insert(vibe_id.clone());

        let owner = state.user_vibes.iter()
            .find_map(|(_, vibes)| {
                vibes.iter().find(|v| v.id == vibe_id).map(|v| v.creator)
            })
            .expect("Vibe not found");

        let reputation = *state.reputation.get(&owner).unwrap_or(&1.0);
        let creator_reward = (LIKE_REWARD_CREATOR as f32 * reputation) as u64;
        let user_reward = LIKE_REWARD_USER;

        let new_likes = state.vibe_interactions
            .entry(vibe_id.clone())
            .and_modify(|stats| stats.likes += 1)
            .or_insert(InteractionStats { likes: 1, shares: 0 })
            .likes;

        *state.token_balances.entry(owner).or_insert(INITIAL_BALANCE) += creator_reward;
        *state.token_balances.entry(user).or_insert(INITIAL_BALANCE) += user_reward;

        *state.reputation.entry(user).or_insert(1.0) += 0.01;
        *state.reputation.entry(owner).or_insert(1.0) += 0.05;

        update_leaderboard_after_interaction(&mut state, &vibe_id);

        new_likes
    })
}

#[update]
fn share_vibe(vibe_id: String) -> u64 {
    let user = current_caller();

    STATE.with(|state| {
        let mut state = state.borrow_mut();

        if !state.token_balances.contains_key(&user) {
            state.token_balances.insert(user, INITIAL_BALANCE);
        }

        let user_shares = state.user_shares.entry(user).or_default();
        if user_shares.contains(&vibe_id) {
            return state.vibe_interactions
                .get(&vibe_id)
                .map(|stats| stats.shares)
                .unwrap_or(0);
        }

        user_shares.insert(vibe_id.clone());

        let owner = state.user_vibes.iter()
            .find_map(|(_, vibes)| {
                vibes.iter().find(|v| v.id == vibe_id).map(|v| v.creator)
            })
            .expect("Vibe not found");

        let reputation = *state.reputation.get(&owner).unwrap_or(&1.0);
        let creator_reward = (SHARE_REWARD_CREATOR as f32 * reputation) as u64;
        let user_reward = SHARE_REWARD_USER;

        let new_shares = state.vibe_interactions
            .entry(vibe_id.clone())
            .and_modify(|stats| stats.shares += 1)
            .or_insert(InteractionStats { likes: 0, shares: 1 })
            .shares;

        *state.token_balances.entry(owner).or_insert(INITIAL_BALANCE) += creator_reward;
        *state.token_balances.entry(user).or_insert(INITIAL_BALANCE) += user_reward;

        *state.reputation.entry(user).or_insert(1.0) += 0.02;
        *state.reputation.entry(owner).or_insert(1.0) += 0.1;

        update_leaderboard_after_interaction(&mut state, &vibe_id);

        new_shares
    })
}

fn update_leaderboard_after_interaction(
    state: &mut State,
    vibe_id: &str,
) {
    if let Some(vibe) = state.user_vibes.iter()
        .flat_map(|(_, vibes)| vibes)
        .find(|v| v.id == vibe_id)
        .cloned()
    {
        update_leaderboard(state, &vibe);
    }
}

#[query]
fn get_vibe_stats(vibe_id: String) -> (u64, u64) {
    STATE.with(|state| {
        let state = state.borrow();
        state.vibe_interactions
            .get(&vibe_id)
            .map(|stats| (stats.likes, stats.shares))
            .unwrap_or((0, 0))
    })
}

#[query]
fn get_leaderboard() -> Leaderboard {
    STATE.with(|state| {
        let state = state.borrow();
        state.leaderboard.clone()
    })
}

fn update_leaderboard(state: &mut State, vibe: &Vibe) {
    state.leaderboard.most_liked.push((vibe.id.clone(), vibe.likes));
    state.leaderboard.most_liked.sort_by(|a, b| b.1.cmp(&a.1));
    state.leaderboard.most_liked.truncate(10);

    state.leaderboard.most_shared.push((vibe.id.clone(), vibe.shares));
    state.leaderboard.most_shared.sort_by(|a, b| b.1.cmp(&a.1));
    state.leaderboard.most_shared.truncate(10);

    let creator_score = state.token_balances.get(&vibe.creator).copied().unwrap_or(0);
    state.leaderboard.top_creators.push((vibe.creator, creator_score));
    state.leaderboard.top_creators.sort_by(|a, b| b.1.cmp(&a.1));
    state.leaderboard.top_creators.dedup_by(|a, b| a.0 == b.0);
    state.leaderboard.top_creators.truncate(10);
}

#[update]
fn stake_tokens(amount: u64) {
    let user = current_caller();

    STATE.with(|state| {
        let mut state = state.borrow_mut();
        let balance = state.token_balances.entry(user).or_insert(INITIAL_BALANCE);

        if *balance < amount {
            panic!("Insufficient balance");
        }

        *balance -= amount;
    });
}

#[update]
fn claim_staking_rewards() -> u64 {
    let user = current_caller();

    STATE.with(|state| {
        let mut state = state.borrow_mut();
        let rewards = 5; // Placeholder

        *state.token_balances.entry(user).or_insert(0) += rewards;
        rewards
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::export_service;
    use candid::Principal;
    use std::cell::RefCell;

    thread_local! {
        static TEST_CALLER: RefCell<Principal> = RefCell::new(Principal::anonymous());
    }

    pub fn test_caller() -> Principal {
        TEST_CALLER.with(|c| *c.borrow())
    }

    pub fn set_caller(principal: Principal) {
        TEST_CALLER.with(|c| *c.borrow_mut() = principal);
    }

    // Set mock timestamp for tests
    pub fn set_mock_time(ts: u64) {
        MOCK_TIME.with(|t| *t.borrow_mut() = ts);
    }

    export_service!();

    #[test]
    fn export_candid() {
        std::fs::write("vibe_platform.did", __export_service()).unwrap();
    }

    #[test]
    fn test_mint_and_engage() {
        set_mock_time(1640995200);
        STATE.with(|s| *s.borrow_mut() = State::default());

        let user1 = Principal::anonymous();
        let user2 = Principal::management_canister();

        set_caller(user1);
        let vibe_id = mint_vibe("Test vibe".to_string());

        STATE.with(|s| {
            let state = s.borrow();
            assert_eq!(state.token_balances.get(&user1), Some(&(INITIAL_BALANCE - MINT_COST)));
            assert_eq!(state.user_vibes.get(&user1).unwrap().len(), 1);

            // Verify timestamp is set correctly
            let vibe = &state.user_vibes.get(&user1).unwrap()[0];
            assert_eq!(vibe.timestamp, 1640995200);
        });

        set_caller(user2);
        let likes = like_vibe(vibe_id.clone());
        assert_eq!(likes, 1);

        STATE.with(|s| {
            let state = s.borrow();
            assert_eq!(
                state.token_balances.get(&user1),
                Some(&(INITIAL_BALANCE - MINT_COST + LIKE_REWARD_CREATOR))
            );
            assert_eq!(
                state.token_balances.get(&user2),
                Some(&(INITIAL_BALANCE + LIKE_REWARD_USER))
            );
        });

        set_caller(user2);
        let shares = share_vibe(vibe_id.clone());
        assert_eq!(shares, 1);

        STATE.with(|s| {
            let state = s.borrow();
            assert_eq!(
                state.token_balances.get(&user1),
                Some(&(INITIAL_BALANCE - MINT_COST + LIKE_REWARD_CREATOR + SHARE_REWARD_CREATOR))
            );
            assert_eq!(
                state.token_balances.get(&user2),
                Some(&(INITIAL_BALANCE + LIKE_REWARD_USER + SHARE_REWARD_USER))
            );
        });
    }
}