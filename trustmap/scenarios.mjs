import{blankModel,agentFactory,toolFactory,dataFactory,delegationFactory,clone}from'./model.mjs';

export const SCENARIOS=[
 {id:'bank',title:'AsterBank · Banking operations',summary:'Five agents verify a customer request, check KYC and fraud signals, prepare a transfer, and close the case.',focus:'Read-to-write delegation, payment authority, tenant retrieval and persistent case memory.',counts:'5 agents · 5 tools · 3 stores',tag:'Intentional security gaps'},
 {id:'insurance',title:'LumenCover · Insurance claims',summary:'Four agents extract claim documents, apply eligibility rules, update the case and request a payout.',focus:'Untrusted attachments, inherited browser sessions, missing approvals and background work.',counts:'4 agents · 4 tools · 3 stores',tag:'Intentional security gaps'},
 {id:'cloud',title:'CedarOps · Cloud remediation',summary:'Five agents investigate an alert, plan a fix, change cloud resources, deploy code and verify recovery.',focus:'Transitive privilege chains, shell isolation, CI/CD authority and delegation loops.',counts:'5 agents · 5 tools · 3 stores',tag:'Intentional security gaps'},
 {id:'commerce',title:'JuniperCart · Ecommerce refunds',summary:'Four agents read customer messages, check order policy, issue bounded refunds and notify customers.',focus:'Service-owned delegation, long-lived credentials, shared memory and outbound exports.',counts:'4 agents · 4 tools · 3 stores',tag:'Mixed safeguards'},
 {id:'bank-hardened',title:'AsterBank · Hardened reference',summary:'The same banking workflow with declared scoped grants, independent tool checks and isolated state.',focus:'Compare the proposed safe implementation against the original banking example.',counts:'5 agents · 5 tools · 3 stores',tag:'Declared controls to verify'}
];

const agent=(n,name,role,account,privilege='read',autonomy='observe',host='private')=>({...agentFactory(n),name,role,account,privilege,identity:'unique',autonomy,host});
const tool=(n,name,type,privilege,target,agents,extra={})=>({...toolFactory(`tool_${n}`),name,type,privilege,target,agents:agents.map(n=>`agent_${n}`),sensitivity:'sensitive',authz:'yes',credential:'scoped',egress:'yes',sandbox:'yes',approval:'yes',audience:'yes',...extra});
const source=(n,name,type,agents,extra={})=>({...dataFactory(`data_${n}`),name,type,agents:agents.map(n=>`agent_${n}`),trust:'untrusted',sensitivity:'sensitive',access:'read',tenantAcl:'yes',provenance:'yes',ingestion:'yes',memoryAuth:'yes',...extra});
const handoff=(n,from,to,extra={})=>({id:`delegation_${n}`,from:`agent_${from}`,to:`agent_${to}`,authorization:'scoped',contract:'yes',provenance:'yes',approval:'yes',queue:'no',replay:'yes',...extra});
function base(name){const m=blankModel();m.project={name,environment:'production',tenancy:'multi',entryTrust:'external'};m.controls=Object.fromEntries(Object.keys(m.controls).map(k=>[k,'yes']));m.stage=6;return m;}
function attach(m,id,company,workflow,records){const description=SCENARIOS.find(x=>x.id===id);m.scenario={id,company,summary:description.summary,workflow,records:records.map(([label,value])=>({label,value})),focus:description.focus,fictional:true};return m;}

export function scenarioModel(id='bank'){
 if(id==='bank'||id==='bank-hardened'){
  const m=base('AsterBank — Assisted banking operations');
  m.agents=[
   agent(1,'Case triage','Read service tickets and customer instructions','svc-aster-case-reader','read','observe','external'),
   agent(2,'KYC verifier','Extract uploaded identity-document facts','svc-aster-kyc-reader'),
   agent(3,'Fraud analyst','Check beneficiary and transaction risk signals','svc-aster-fraud-reader'),
   agent(4,'Payment operator','Prepare and execute approved bank transfers','svc-aster-payment-writer','write','autonomous'),
   agent(5,'Case closer','Update the CRM after the transaction outcome','svc-aster-crm-writer','write','approve')
  ];
  m.tools=[
   tool(1,'Service desk API','api','read','cases.asterbank.example/customer-cases',[1]),
   tool(2,'Document OCR gateway','api','read','kyc.asterbank.example/document-extracts',[2]),
   tool(3,'Fraud screening API','api','read','risk.asterbank.example/beneficiary-checks',[3]),
   tool(4,'Payment operations MCP','mcp','write','payments.asterbank.example/transfers',[4],{authz:'no',approval:'no',credential:'shared',audience:'unknown'}),
   tool(5,'CRM case update API','api','write','crm.asterbank.example/case-status',[5])
  ];
  m.delegations=[handoff(1,1,2),handoff(2,2,3),handoff(3,3,4,{authorization:'none',provenance:'no',approval:'no',queue:'yes',replay:'no'}),handoff(4,1,4,{authorization:'none',provenance:'no',approval:'no',queue:'yes',replay:'no'}),handoff(5,4,5)];
  m.data=[source(1,'Customer service knowledge','rag',[1,3],{tenantAcl:'no',ingestion:'unknown'}),source(2,'Uploaded KYC documents','files',[2]),source(3,'Shared case memory','memory',[1,3,4,5],{access:'write',memoryAuth:'no',provenance:'no'})];
  Object.assign(m.controls,{cancel:'no',approvalBinding:'no',revocation:'unknown',provider:'unknown'});
  attach(m,id,'AsterBank (fictional)', 'A customer uploads a beneficiary-change request. Triage sends it through KYC and fraud checks. The payment operator prepares a transfer, then the CRM agent closes the case.',[
   ['Sample case','CASE-DEMO-2026-0319'],['Synthetic customer','CUST-DEMO-0842 · Customer 0842'],['Requested transaction','TRANSFER-DEMO-5521 · ₹18,500 · beneficiary DEMO-BEN-062'],['Uploaded attachment','beneficiary_change_DEMO-0842.pdf'],['Workload','Illustrative 1,800 service requests / day'],['Tenant example','Retail-West-DEMO vs SME-East-DEMO'],['Queue label','bank-demo.payment-actions'],['Failure to explore','A read-only fraud or triage agent can request a write through the payment operator.']
  ]);
  if(id==='bank-hardened'){
   m.project.name='AsterBank — Hardened banking reference';m.agents[3].autonomy='approve';
   for(const d of m.delegations){d.authorization=['delegation_3','delegation_4'].includes(d.id)?'service':'scoped';d.contract='yes';d.provenance='yes';d.approval='yes';d.replay='yes';}
   for(const t of m.tools){t.authz='yes';t.approval='yes';t.credential='scoped';t.audience='yes';}
   for(const d of m.data){d.tenantAcl='yes';d.ingestion='yes';d.memoryAuth='yes';d.provenance='yes';}
   for(const k of Object.keys(m.controls))m.controls[k]='yes';
   m.scenario.records.push({label:'Bounded payment contract',value:'Only an explicitly approved transaction ID, target tenant and exact payload may execute; illustrative per-transfer limit ₹25,000.'},{label:'Verification status',value:'Safeguards are simulated declarations. No live bank or system was tested.'});
  }
  return m;
 }
 if(id==='insurance'){
  const m=base('LumenCover — Claims-to-payout automation');
  m.agents=[agent(1,'Claims intake','Read email, attachments and FNOL forms','svc-lumen-intake-read','read','observe','external'),agent(2,'Document analyst','Extract invoice and policy facts','svc-lumen-document-read'),agent(3,'Claims adjudicator','Update eligibility and claim status','svc-lumen-claims-write','write','autonomous'),agent(4,'Payout coordinator','Prepare payouts and update the payment portal','svc-lumen-payout-write','write','autonomous')];
  m.agents[3].identity='inherited';
  m.tools=[tool(1,'Intake mailbox API','api','read','mail.lumencover.example/claims-inbox',[1]),tool(2,'Invoice extraction API','api','read','docs.lumencover.example/extracted-claims',[2]),tool(3,'Claims administration MCP','mcp','write','claims.lumencover.example/adjudication',[3],{authz:'unknown',approval:'no'}),tool(4,'Payout portal browser','browser','write','portal.lumencover.example/payouts',[4],{sandbox:'no',credential:'inherited',authz:'no',approval:'no'})];
  m.delegations=[handoff(1,1,2,{provenance:'no'}),handoff(2,2,3,{authorization:'none',approval:'no'}),handoff(3,3,4,{authorization:'none',queue:'yes',approval:'no',replay:'no'}),handoff(4,1,4,{authorization:'unknown',queue:'yes'})];
  m.data=[source(1,'Claimant attachments','files',[1,2],{ingestion:'no'}),source(2,'Policy wording & claims rules','rag',[2,3],{trust:'trusted'}),source(3,'Claim processing checkpoints','shared',[2,3,4],{access:'write',memoryAuth:'no',provenance:'unknown'})];
  Object.assign(m.controls,{logging:'no',cancel:'no',approvalBinding:'no',provider:'unknown',revocation:'unknown'});
  return attach(m,id,'LumenCover (fictional)','An uploaded invoice is extracted into a claim summary. The adjudicator decides eligibility, then a background task uses a browser session to prepare payment.',[
   ['Sample claim','CLM-DEMO-2026-4417'],['Synthetic policy','POL-DEMO-AUTO-8802'],['Attachment','repair_invoice_DEMO-4417.pdf'],['Requested payout','₹46,200 · PAY-DEMO-0208'],['Illustrative event','Invoice comment becomes part of a delegated processing summary.'],['Browser profile','payout-operator-DEMO · inherited shared session'],['Queue label','claims-demo.payout-pending'],['Failure to explore','The attachment trust boundary and browser execution boundary are both weak.']
  ]);
 }
 if(id==='cloud'){
  const m=base('CedarOps — Agentic cloud incident remediation');m.project.tenancy='single';
  m.agents=[agent(1,'Alert investigator','Read alert details and cloud telemetry','svc-cedar-observer'),agent(2,'Remediation planner','Read runbooks and propose a remediation task','svc-cedar-plan-read'),agent(3,'Cloud remediator','Apply compute, network and IAM fixes','svc-cedar-cloud-admin','admin','autonomous'),agent(4,'Release operator','Patch repository code and trigger deployments','svc-cedar-release-write','write','autonomous'),agent(5,'Recovery verifier','Validate resource state and report unresolved alerts','svc-cedar-verify-read')];
  m.tools=[tool(1,'Telemetry query API','api','read','observe.cedarops.example/security-events',[1,5]),tool(2,'Cloud administration MCP','mcp','admin','cloud.cedarops.example/production-account',[3],{authz:'no',credential:'shared',approval:'no',audience:'no'}),tool(3,'Remote execution shell','shell','admin','runner-DEMO-03:/production-operations',[3],{sandbox:'no',credential:'inherited',authz:'no',approval:'no'}),tool(4,'Repository & deployment pipeline','cicd','write','git.cedarops.example/payments-service/releases',[4],{sandbox:'no',approval:'no'}),tool(5,'Incident case API','api','write','cases.cedarops.example/incident-status',[5])];
  m.delegations=[handoff(1,1,2,{authorization:'none',provenance:'no'}),handoff(2,2,3,{authorization:'none',provenance:'no',approval:'no',queue:'yes',replay:'no'}),handoff(3,3,4,{authorization:'none',approval:'no',queue:'yes'}),handoff(4,3,5),handoff(5,5,2,{authorization:'none',approval:'no',replay:'no'})];
  m.data=[source(1,'Incident tickets & enrichment','files',[1,2],{ingestion:'no'}),source(2,'Runbook knowledge index','rag',[2,3],{provenance:'no',ingestion:'no'}),source(3,'Remediation task checkpoints','shared',[2,3,4,5],{access:'write',memoryAuth:'no'})];
  Object.assign(m.controls,{policy:'no',revocation:'no',cancel:'no',approvalBinding:'no',budget:'no',supply:'no',restore:'unknown'});
  return attach(m,id,'CedarOps (fictional)','An alert opens an incident. The planner reads runbooks, asks the cloud remediator to act, and a release agent applies code changes. Verification can hand the task back to planning.',[
   ['Sample incident','INC-DEMO-00628 · unexpected service connectivity'],['Application','payments-api-DEMO · prod-eu-DEMO'],['Cloud account label','cedar-production-DEMO · no real account ID'],['Repository','git.cedarops.example/payments-service'],['Proposed change','Update an example security-group rule and redeploy release DEMO-v2.4.1.'],['Illustrative alert source','Untrusted ticket description and copied external scan output'],['Verification loop','Investigator → planner → remediator → verifier → planner'],['Failure to explore','A multi-hop read-to-admin path combines with an unbounded remediation loop.']
  ]);
 }
 if(id==='commerce'){
  const m=base('JuniperCart — Support and refund operations');
  m.agents=[agent(1,'Support triage','Read customer messages and classify issues','svc-juniper-support-read','read','observe','external'),agent(2,'Order policy checker','Check order facts and refund eligibility','svc-juniper-order-read'),agent(3,'Refund processor','Execute an explicitly bounded refund operation','svc-juniper-refund-write','write','approve'),agent(4,'Customer notifier','Send authorized status updates','svc-juniper-notify-write','write','approve')];
  m.tools=[tool(1,'Support ticket API','api','read','support.junipercart.example/tickets',[1]),tool(2,'Orders API','database','read','orders.junipercart.example/storefront-orders',[2]),tool(3,'Refund service API','api','write','pay.junipercart.example/refunds',[3],{credential:'longlived'}),tool(4,'Notification & CRM export API','http','write','notify.junipercart.example/messages-and-exports',[4],{egress:'no',credential:'shared'})];
  m.delegations=[handoff(1,1,2),handoff(2,2,3,{authorization:'service',contract:'yes',queue:'yes',replay:'unknown'}),handoff(3,3,4,{authorization:'service',contract:'yes',queue:'yes'})];
  m.data=[source(1,'Customer conversation archive','files',[1,2]),source(2,'Refund policy knowledge','rag',[2,3],{trust:'trusted'}),source(3,'Cross-store support memory','memory',[1,2,4],{access:'write',tenantAcl:'no',provenance:'unknown'})];
  Object.assign(m.controls,{cancel:'unknown',egress:'no',provider:'unknown'});
  return attach(m,id,'JuniperCart (fictional)','A customer reports a delayed order. The policy checker validates entitlement, a bounded refund service processes the approved request, and another agent sends a status update.',[
   ['Sample ticket','SUP-DEMO-01094'],['Synthetic order','ORDER-DEMO-77821 · customer CUST-DEMO-102'],['Refund request','₹1,249 · REFUND-DEMO-993'],['Store tenants','Juniper-Home-DEMO / Juniper-Style-DEMO'],['Illustrative service contract','Only an approved order and original payment can receive a refund; capped at ₹2,500 per example request.'],['Notification recipient','customer102@example.invalid'],['Potential export','CRM batch DEMO-014 · synthetic support history'],['Failure to explore','Delegation is bounded, but cross-store memory and external export safeguards are incomplete.']
  ]);
 }
 throw Error('Unknown fictional scenario.');
}
