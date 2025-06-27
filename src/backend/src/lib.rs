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
const ANONYMOUS_PRINCIPAL: &str = "2vxsx-fae";

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
    top_creators: Vec<(Principal, u64)>, // (creator, total tokens)
    most_liked: Vec<(String, u64)>,      // (vibe ID, like count)
    most_shared: Vec<(String, u64)>,     // (vibe ID, share count)
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

// Helper to update Vibe objects when interactions occur
fn update_vibe_stats(vibe_id: &str, state: &mut State, likes: u64, shares: u64) {
    for (_, vibes) in state.user_vibes.iter_mut() {
        if let Some(vibe) = vibes.iter_mut().find(|v| v.id == vibe_id) {
            vibe.likes = likes;
            vibe.shares = shares;
            break;
        }
    }
}

// Completely rebuild leaderboard from current state
fn rebuild_leaderboard(state: &mut State) {
    // Get the actual anonymous principal
    let anonymous_principal = Principal::anonymous();

    // Rebuild top creators - filter out ONLY the anonymous principal
    let mut creators: Vec<(Principal, u64)> = state.token_balances
        .iter()
        .filter(|(p, _)| **p != anonymous_principal) // Only filter anonymous
        .map(|(p, b)| (*p, *b))
        .collect();

    creators.sort_by(|a, b| b.1.cmp(&a.1));
    state.leaderboard.top_creators = creators.into_iter().take(10).collect();

    // Rebuild most liked vibes
    let mut most_liked: Vec<(String, u64)> = state.vibe_interactions
        .iter()
        .map(|(id, stats)| (id.clone(), stats.likes))
        .collect();
    most_liked.sort_by(|a, b| b.1.cmp(&a.1));
    state.leaderboard.most_liked = most_liked.into_iter().take(10).collect();

    // Rebuild most shared vibes
    let mut most_shared: Vec<(String, u64)> = state.vibe_interactions
        .iter()
        .map(|(id, stats)| (id.clone(), stats.shares))
        .collect();
    most_shared.sort_by(|a, b| b.1.cmp(&a.1));
    state.leaderboard.most_shared = most_shared.into_iter().take(10).collect();
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
        rebuild_leaderboard(&mut state);

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
        rebuild_leaderboard(&mut state);
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

        // Get current stats without holding a reference
        let current_stats = state.vibe_interactions
            .get(&vibe_id)
            .cloned()
            .unwrap_or(InteractionStats { likes: 0, shares: 0 });

        let new_likes = current_stats.likes + 1;
        let current_shares = current_stats.shares;

        // Update interactions
        state.vibe_interactions.insert(
            vibe_id.clone(),
            InteractionStats {
                likes: new_likes,
                shares: current_shares
            }
        );

        // Update balances and reputation
        *state.token_balances.entry(owner).or_insert(INITIAL_BALANCE) += creator_reward;
        *state.token_balances.entry(user).or_insert(INITIAL_BALANCE) += user_reward;
        *state.reputation.entry(user).or_insert(1.0) += 0.01;
        *state.reputation.entry(owner).or_insert(1.0) += 0.05;

        // Update Vibe object and rebuild leaderboard
        update_vibe_stats(&vibe_id, &mut state, new_likes, current_shares);
        rebuild_leaderboard(&mut state);

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

        // Get current stats without holding a reference
        let current_stats = state.vibe_interactions
            .get(&vibe_id)
            .cloned()
            .unwrap_or(InteractionStats { likes: 0, shares: 0 });

        let new_shares = current_stats.shares + 1;
        let current_likes = current_stats.likes;

        // Update interactions
        state.vibe_interactions.insert(
            vibe_id.clone(),
            InteractionStats {
                likes: current_likes,
                shares: new_shares
            }
        );

        // Update balances and reputation
        *state.token_balances.entry(owner).or_insert(INITIAL_BALANCE) += creator_reward;
        *state.token_balances.entry(user).or_insert(INITIAL_BALANCE) += user_reward;
        *state.reputation.entry(user).or_insert(1.0) += 0.02;
        *state.reputation.entry(owner).or_insert(1.0) += 0.1;

        // Update Vibe object and rebuild leaderboard
        update_vibe_stats(&vibe_id, &mut state, current_likes, new_shares);
        rebuild_leaderboard(&mut state);

        new_shares
    })
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
            // Verify Vibe object was updated
            let vibe = state.user_vibes.get(&user1).unwrap().iter()
                .find(|v| v.id == vibe_id)
                .unwrap();
            assert_eq!(vibe.likes, 1);

            // Verify token balances
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
            // Verify Vibe object was updated
            let vibe = state.user_vibes.get(&user1).unwrap().iter()
                .find(|v| v.id == vibe_id)
                .unwrap();
            assert_eq!(vibe.shares, 1);

            // Verify token balances
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

    #[test]
    fn test_leaderboard_updates() {
        set_mock_time(1640995200);
        STATE.with(|s| *s.borrow_mut() = State::default());

        // Create non-anonymous principals for testing
        let user1 = Principal::from_slice(&[1; 29]);
        let user2 = Principal::from_slice(&[2; 29]);
        let user3 = Principal::from_slice(&[3; 29]);

        set_caller(user1);
        let vibe_id1 = mint_vibe("First vibe".to_string());
        let vibe_id2 = mint_vibe("Second vibe".to_string());

        // First user likes vibe1
        set_caller(user2);
        like_vibe(vibe_id1.clone());

        // Second user likes vibe1
        set_caller(user3);
        like_vibe(vibe_id1.clone());

        // First user shares vibe1
        set_caller(user2);
        share_vibe(vibe_id1.clone());

        // First user likes vibe2
        set_caller(user2);
        like_vibe(vibe_id2.clone());

        STATE.with(|s| {
            let state = s.borrow();
            let leaderboard = &state.leaderboard;

            // Verify top creators
            assert!(
                leaderboard.top_creators.iter().any(|(p, _)| *p == user1),
                "User1 not found in top creators"
            );

            // Verify most liked
            let most_liked_entry = leaderboard.most_liked.iter()
                .find(|(id, _)| *id == vibe_id1)
                .expect("Vibe not found in most liked");
            assert_eq!(most_liked_entry.1, 2, "Expected 2 likes");

            // Verify most shared
            let most_shared_entry = leaderboard.most_shared.iter()
                .find(|(id, _)| *id == vibe_id1)
                .expect("Vibe not found in most shared");
            assert_eq!(most_shared_entry.1, 1, "Expected 1 share");
        });
    }
}
