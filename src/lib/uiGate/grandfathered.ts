// ─────────────────────────────────────────────────────────────────────────────
// UI-1a · WHAT PREDATES THE UI GATE — the worklist of UI-1b and UI-1c.
//
// Per file and kind, how many spellings outside the scale / the tokens / the
// shared list layout stood in the tree when the gate landed. `uiGate.test.ts`
// holds every row EQUAL to what it derives: a higher count is a new violation,
// a lower one means the row must shrink with the code. Nothing is appended here.
//
// No total is written in this comment. The rows are the count.
// ─────────────────────────────────────────────────────────────────────────────
import type { ColourKind, Counts, TypeKind } from './derive';

export const TYPE_GRANDFATHERED: Record<string, Counts<TypeKind>> = {
  'src/components/delivery/AgreementDrawdown.tsx': { 'arbitrary-size': 4 },
  'src/components/delivery/ChangeHistory.tsx': { 'arbitrary-size': 1 },
  'src/components/delivery/PolicyEditor.tsx': { 'arbitrary-size': 5 },
  'src/components/delivery/ReleaseCalendar.tsx': { 'arbitrary-size': 1 },
  'src/components/layout-v2/IdentityPanel.tsx': { 'arbitrary-size': 1 },
  'src/components/ui-v2/ExpandableWidget.tsx': { 'arbitrary-size': 1 },
  'src/components/ui-v2/GlossaryTermChip.tsx': { 'arbitrary-size': 2 },
  'src/components/ui-v2/GuidedLesson.tsx': { 'arbitrary-size': 1 },
  'src/components/ui-v2/IllustrativeNotice.tsx': { 'arbitrary-size': 1 },
  'src/components/ui-v2/LivenessPill.tsx': { 'arbitrary-size': 1 },
  'src/components/ui-v2/ModelMarker.tsx': { 'arbitrary-size': 1 },
  'src/components/ui-v2/NextActLine.tsx': { 'arbitrary-size': 2 },
  'src/components/ui-v2/ProvenanceMarker.tsx': { 'arbitrary-size': 2 },
  'src/components/ui-v2/SampleMaterialTag.tsx': { 'arbitrary-size': 1 },
  'src/components/ui-v2/ScoreBadge.tsx': { 'offscale-size': 1 },
  'src/components/ui-v2/SessionStampMarker.tsx': { 'arbitrary-size': 1 },
  'src/components/v2-features/BypassReasonDialog.tsx': { 'arbitrary-size': 1 },
  'src/components/v2-features/GRInspectionWizard.tsx': { 'arbitrary-size': 3 },
  'src/pages-v2/BuyerAnalytics.tsx': { 'inline-size': 17 },
  'src/pages-v2/BuyerChannelTriage.tsx': { 'arbitrary-size': 3 },
  'src/pages-v2/BuyerChase.tsx': { 'arbitrary-size': 2 },
  'src/pages-v2/BuyerCollaboration.tsx': { 'arbitrary-size': 3 },
  'src/pages-v2/BuyerCompliance.tsx': { 'bold': 1 },
  'src/pages-v2/BuyerContracts.tsx': { 'arbitrary-size': 3 },
  'src/pages-v2/BuyerDashboard.tsx': { 'arbitrary-size': 2, 'inline-size': 6 },
  'src/pages-v2/BuyerDeliveryAgreements.tsx': { 'arbitrary-size': 4 },
  'src/pages-v2/BuyerDiscovery.tsx': { 'arbitrary-size': 6, 'offscale-size': 4, 'bold': 4 },
  'src/pages-v2/BuyerInvoices.tsx': { 'inline-size': 4 },
  'src/pages-v2/BuyerRequisitions.tsx': { 'arbitrary-size': 4 },
  'src/pages-v2/BuyerRisk.tsx': { 'arbitrary-size': 2, 'inline-size': 1, 'offscale-size': 3, 'bold': 10 },
  'src/pages-v2/BuyerScorecard.tsx': { 'inline-size': 8, 'bold': 2 },
  'src/pages-v2/BuyerSourcing.tsx': { 'arbitrary-size': 11 },
  'src/pages-v2/BuyerSupplierApplications.tsx': { 'bold': 2 },
  'src/pages-v2/BuyerSupplierProfile.tsx': { 'offscale-size': 2 },
  'src/pages-v2/CommHubInbound.tsx': { 'arbitrary-size': 2 },
  'src/pages-v2/Glossary.tsx': { 'arbitrary-size': 16 },
  'src/pages-v2/ModulesBoard.tsx': { 'arbitrary-size': 4 },
  'src/pages-v2/ProcessFlows.tsx': { 'arbitrary-size': 16 },
  'src/pages-v2/RoleDetail.tsx': { 'arbitrary-size': 5 },
  'src/pages-v2/RolesCatalogue.tsx': { 'offscale-size': 1 },
  'src/pages-v2/SupplierDashboard.tsx': { 'arbitrary-size': 1, 'offscale-size': 1, 'bold': 1 },
  'src/pages-v2/SupplierForecasts.tsx': { 'arbitrary-size': 5, 'offscale-size': 1, 'bold': 7 },
  'src/pages-v2/SupplierInvoices.tsx': { 'arbitrary-size': 2 },
  'src/pages-v2/SupplierMyStorefront.tsx': { 'offscale-size': 2, 'bold': 1 },
  'src/pages-v2/SupplierOrders.tsx': { 'bold': 1 },
  'src/pages-v2/SupplierPerformance.tsx': { 'arbitrary-size': 2, 'inline-size': 11, 'bold': 2 },
  'src/pages-v2/SupplierRFQs.tsx': { 'arbitrary-size': 11, 'bold': 5 },
  'src/pages-v2/SupplierRegistration.tsx': { 'arbitrary-size': 1, 'offscale-size': 1, 'bold': 6 },
  'src/pages-v2/SupplierShipments.tsx': { 'bold': 3 },
  'src/pages-v2/SupplierStorefront.tsx': { 'offscale-size': 1 },
  'src/pages-v2/SupplierWhatsApp.tsx': { 'arbitrary-size': 16, 'bold': 11 },
  'src/pages-v2/modules/ModuleDetailDrawer.tsx': { 'arbitrary-size': 2 },
  'src/pages-v2/plan-grid/IntakeAdjustDrawer.tsx': { 'arbitrary-size': 5 },
  'src/pages-v2/plan-grid/IntakeReviewView.tsx': { 'arbitrary-size': 3 },
  'src/pages-v2/plan-grid/PlanCellMarker.tsx': { 'arbitrary-size': 2 },
  'src/pages-v2/plan-grid/TimePhasedGrid.tsx': { 'arbitrary-size': 10 },
  'src/pages-v2/process-flows/DerivedFlags.tsx': { 'arbitrary-size': 4 },
  'src/pages-v2/process-flows/FlowDiagram.tsx': { 'arbitrary-size': 6 },
  'src/pages-v2/process-flows/GuideMarkdown.tsx': { 'arbitrary-size': 4 },
  'src/pages-v2/process-flows/GuideTabs.tsx': { 'arbitrary-size': 18 },
  'src/pages-v2/process-flows/LifecycleWalk.tsx': { 'arbitrary-size': 9 },
  'src/pages-v2/rfqs/RfiAnswerForm.tsx': { 'arbitrary-size': 2 },
  'src/pages-v2/rfqs/RfpProposalForm.tsx': { 'arbitrary-size': 2 },
  'src/pages-v2/roles/CreateRolePanel.tsx': { 'arbitrary-size': 4 },
  'src/pages-v2/sourcing/StageTimeline.tsx': { 'arbitrary-size': 2 },
};

export const COLOUR_GRANDFATHERED: Record<string, Counts<ColourKind>> = {
  'src/components/ui-v2/Dialog.tsx': { 'arbitrary-colour': 1 },
  'src/components/ui-v2/ExpandableWidget.tsx': { 'arbitrary-colour': 1 },
  'src/components/ui-v2/SidePanel.tsx': { 'arbitrary-colour': 1 },
  'src/components/v2-features/GRInspectionWizard.tsx': { 'arbitrary-colour': 1 },
  'src/data/communicationProfiles.ts': { 'hex': 6 },
  'src/index.css': { 'hex': 29, 'rgb': 5 },
  'src/pages-v2/BuyerContracts.tsx': { 'arbitrary-colour': 2 },
  'src/pages-v2/BuyerScorecard.tsx': { 'hex': 8 },
  'src/pages-v2/BuyerSourcing.tsx': { 'arbitrary-colour': 2 },
  'src/pages-v2/SupplierDashboard.tsx': { 'hex': 10 },
  'src/pages-v2/SupplierInventory.tsx': { 'hex': 4 },
  'src/pages-v2/SupplierPerformance.tsx': { 'hex': 8 },
  'src/pages-v2/bulkStockGrid.css': { 'hex': 1 },
  'src/pages-v2/plan-grid/planGrid.css': { 'hex': 5 },
  'src/services/data/mock/fixtures/buyerAnalytics.ts': { 'hex': 7 },
  'src/services/data/mock/fixtures/buyerRisk.ts': { 'hex': 4 },
};

/** Files other than `DataTable` that write table markup by hand. */
export const RAW_TABLE_GRANDFATHERED: Record<string, number> = {
  'src/pages-v2/BuyerContracts.tsx': 5,
  'src/pages-v2/BuyerOrders.tsx': 2,
  'src/pages-v2/BuyerSourcing.tsx': 6,
  'src/pages-v2/process-flows/GuideMarkdown.tsx': 4,
  'src/pages-v2/sourcing/RfiAnswerMatrix.tsx': 6,
  'src/pages-v2/sourcing/RfpEvaluation.tsx': 12,
};

/** Routed pages that draw a table without `ListPage` / `DataTable`. */
export const LIST_LAYOUT_GRANDFATHERED: readonly string[] = [];
