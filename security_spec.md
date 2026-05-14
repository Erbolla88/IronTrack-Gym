# Security Specification: IronFlow

## Data Invariants
1. A routine must belong to a signed-in user.
2. A day must belong to a valid routine owned by the user.
3. An exercise must belong to a valid day and routine owned by the user.
4. Timestamps (`createdAt`) must be server-generated and immutable.
5. All numeric values (reps, weight) must be non-negative.
6. Display names and routine names have strict size limits (100 chars).

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Create a routine with `userId: "attacker_id"`.
2. **Resource Poisoning**: Create a routine with `name: "A" * 1000`.
3. **State Shortcutting**: Update a routine's `weekStart` to an invalid string.
4. **Orphaned Writes**: Create a Day with a non-existent `routineId`.
5. **Shadow Update**: Add `isAdmin: true` to a User document.
6. **PII Blanket**: Attempt to `get` another user's `/users/{id}` document.
7. **Unbounded List**: Try to set a huge array (though we use subcollections, we check sizes).
8. **Identity Integrity**: Update a Routine's `userId` after creation.
9. **Timestamp Spoofing**: Provide a custom `createdAt: "2000-01-01T00:00:00Z"`.
10. **ID Poisoning**: Use a 10KB string for `routineId`.
11. **Negative Weight**: Exercise `weight: -100`.
12. **Negative Reps**: Exercise `reps: -5`.

## Test Runner (firestore.rules.test.ts)
... (To be implemented if testing tools were available, I will simulate logic instead)
