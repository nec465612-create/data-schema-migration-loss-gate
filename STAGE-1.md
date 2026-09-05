# Data Schema Migration Loss Gate — Stage 1

Research category: PROJECT
Canonical approval package: E:/Genlayer-Projects/_research-candidates-2026-09-01/CANONICAL-13-RESEARCH-R12.md
Approved package SHA-256: 3464E830908CB1D87504057567242D36BDCD0C4FD59934B7D22F6482C6799ED2
Candidate: C3
Anonymous research verdict: APPROVED

## C3 — Data Schema Migration Loss Gate

### Stage 1 / CANDIDATE QUALITY RECORD

Schema owner and mapper disagree on whether an explicit field mapping preserves every possible old record. Owner locks old/new schemas; mapper cannot redefine them. Validators judge only field meaning equivalence; deterministic representability/type/cardinality decides LOSSLESS/LOSS_FOUND. No execution or actual data claim. Eight fields each, no nested records, arbitrary casts or custom code. Easy: finite type table; hard: meanings equivalent despite renamed fields; control exact per-old-field SAME/DIFFERENT/UNKNOWN cells. Closest research-dataset-revision-checker checks source metadata; C3 specifies a migration transform. Closest C1 checks requirement/interface; C3 preserves old-record information. Reuse two-party infrastructure; new loss truth table. KEEP. Judge reproduces type reducer without model for structural losses; false semantic equivalence remains risk, UNKNOWN fallback safe.

