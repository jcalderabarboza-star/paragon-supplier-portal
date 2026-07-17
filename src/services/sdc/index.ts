// SDC — Supplier Data Collaboration. SDC-0: types + SIMULATED fixtures (the
// spine; see types.ts, fixtures.ts, FLAGS.md). SDC-1a: the P2 planner-
// consolidation read-model (pure selectors; consolidation.ts). SDC-2a: the P1
// submission spine — FLAG-2 visibility gate (visibility.ts), the
// SubmissionSession envelope helper (session.ts), and the pure submit payload
// model (submitModel.ts); the flow + CommandTarget ride the transitions/mock
// layers.
export * from './types';
export * from './fixtures';
export * from './consolidation';
export * from './visibility';
export * from './session';
export * from './submitModel';
