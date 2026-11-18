// Sample data so every status and both personas can be demonstrated immediately.
const P = 'priya.singh@axisbank.com', A = 'anu.jha@axisbank.com', R = 'rahul.mehta@axisbank.com';
const SN = 'sneha.iyer@axisbank.com', M = 'mohith.kumar@axisbank.com';

function mk(id, name, cat, sub, owner, comments, steps, diff) {
  let prev = '—', v = 1, live = null;
  const history = [];
  steps.forEach(([ts, action, by, to, remark, ver]) => {
    const vv = ver || v;
    history.push({ ts: ts + ':00+05:30', action, by, from: prev, to, remark: remark || '', ver: vv, verFrom: vv > v ? v : null });
    if (to === 'Approved') live = vv;
    prev = to;
    v = vv;
  });
  const files = {};
  for (let i = 1; i <= v; i++)
    files[i] = { name: name.replace(/[^A-Za-z0-9]+/g, '_') + '_v' + i + '.pdf', size: 420000 + i * 61000, type: 'pdf', sim: true };
  return {
    id, name, cat, sub, owner, comments, status: prev, version: v, liveVersion: live,
    createdAt: history[0].ts, updatedAt: history[history.length - 1].ts, history, files, diff: diff || null,
  };
}

export function seed() {
  const sops = [
    mk('SOP-0012', 'Credit Card Dispute Handling', 'Cards', 'Credit Card Dispute', P,
      'v3: added L3 Zonal Head to the escalation matrix. TAT revised to 30 days per the latest circular.', [
        ['2026-09-12T10:12', 'Created', P, 'Draft', '', 1], ['2026-09-12T16:40', 'Submitted', P, 'Submitted'],
        ['2026-09-14T11:05', 'Approved', R, 'Approved', 'Looks good. Published.'],
        ['2026-11-10T09:30', 'New version submitted', P, 'Submitted', 'Updated TAT from 45 to 30 days.', 2],
        ['2026-11-11T14:20', 'Modification requested', R, 'Requested Modification', 'Please add L3 Zonal Head to the escalation matrix.'],
        ['2026-11-12T10:02', 'Changes started', P, 'Modification In Progress'],
        ['2026-11-13T17:45', 'Resubmitted', P, 'Resubmitted', 'Added L3 escalation.', 3],
        ['2026-11-15T12:00', 'Approved', R, 'Approved', 'Approved and published.']],
      [['3. Procedure', 'Close the dispute <x>within 45 days</x><y>within 30 days</y> of receipt.'],
       ['5. Escalation matrix', 'L1 Team Lead · L2 Unit Head<y> · L3 Zonal Head</y>']]),
    mk('SOP-0018', 'UPI Failed Transaction Refund', 'Payments', 'UPI', P,
      'First version. Covers auto-reversal checks and manual refund via NPCI dispute.', [
        ['2026-11-14T09:15', 'Created', P, 'Draft'], ['2026-11-14T11:30', 'Submitted', P, 'Submitted']]),
    mk('SOP-0027', 'EMI Bounce Charges', 'Loans', 'EMI', P, 'Defines bounce charge levy and waiver process.', [
      ['2026-11-06T10:00', 'Created', P, 'Draft'], ['2026-11-06T15:10', 'Submitted', P, 'Submitted'],
      ['2026-11-12T12:40', 'Modification requested', R, 'Requested Modification', 'Add waiver delegation-of-power (DOP) limits by grade.'],
      ['2026-11-17T16:10', 'Changes started', P, 'Modification In Progress']]),
    mk('SOP-0022', 'Card Retained at ATM', 'ATM', 'Card Retained', P, '', [
      ['2026-11-17T18:20', 'Created', P, 'Draft'], ['2026-11-18T09:05', 'Saved as draft', P, 'Draft']]),
    mk('SOP-0009', 'ATM Cash Shortage', 'ATM', 'Cash Shortage', A, 'v2: revised branch reconciliation steps.', [
      ['2026-10-20T10:00', 'Created', A, 'Draft'], ['2026-10-20T12:00', 'Submitted', A, 'Submitted'],
      ['2026-10-22T11:15', 'Approved', P, 'Approved', 'Approved.'],
      ['2026-11-14T10:20', 'New version submitted', A, 'Submitted', 'Revised reconciliation steps.', 2],
      ['2026-11-16T15:30', 'Modification requested', P, 'Requested Modification', 'Please add the escalation matrix and the 5-day TAT for branch reconciliation.']],
      [['3. Procedure', 'Branch reconciles the ATM <x>at month end</x><y>on the next working day (EOD)</y>.']]),
    mk('SOP-0024', 'Legal Notice Handling', 'Legal & Statutory', 'Legal Notice', A,
      'v2: added acknowledgement format and 7-day reply timeline as requested.', [
        ['2026-11-03T11:00', 'Created', A, 'Draft'], ['2026-11-03T16:00', 'Submitted', A, 'Submitted'],
        ['2026-11-05T10:30', 'Modification requested', R, 'Requested Modification', 'Include the acknowledgement format to the sender and the 7-day reply timeline.'],
        ['2026-11-10T09:45', 'Changes started', A, 'Modification In Progress'],
        ['2026-11-18T10:34', 'Resubmitted', A, 'Resubmitted', 'Added acknowledgement format (Annexure A) and 7-day reply timeline.', 2]],
      [['3. Procedure', 'Send an acknowledgement to the sender<y> using Annexure A</y>.'],
       ['4. Turnaround time', 'Reply to the notice <x>at the earliest</x><y>within 7 working days</y>.']]),
    mk('SOP-0021', 'Loan Closure – Document Return', 'Loans', 'Documents', A, '', [['2026-11-16T14:00', 'Created', A, 'Draft']]),
    mk('SOP-0030', 'IMPS Reversal Handling', 'Payments', 'IMPS', A, 'Covers timed-out IMPS and beneficiary-not-credited cases.', [
      ['2026-11-17T14:40', 'Created', A, 'Draft'], ['2026-11-17T15:02', 'Submitted', A, 'Submitted']]),
    mk('SOP-0011', 'NEFT Return Handling', 'Payments', 'NEFT/RTGS', A, '', [
      ['2026-11-02T10:00', 'Created', A, 'Draft'], ['2026-11-03T09:20', 'Submitted', A, 'Submitted'],
      ['2026-11-05T17:05', 'Rejected', R, 'Rejected', 'Duplicates SOP-0007 (NEFT/RTGS Returns). Please raise a new version of that SOP instead.']]),
    mk('SOP-0025', 'Statutory Notice – LEA Requests', 'Legal & Statutory', 'Statutory Notice', R,
      'Handling of law-enforcement agency requests and freeze orders.', [
        ['2026-11-15T10:10', 'Created', R, 'Draft'], ['2026-11-15T10:40', 'Submitted', R, 'Submitted']]),
    mk('SOP-0016', 'Card Chargeback Process', 'Cards', 'Chargeback', SN,
      'Chargeback raising and representment timelines per network rules.', [
        ['2026-11-13T09:00', 'Created', SN, 'Draft'], ['2026-11-13T09:30', 'Submitted', SN, 'Submitted']]),
    mk('SOP-0014', 'Fees & Charges Reversal', 'Cards', 'Fees & Charges', M, '', [
      ['2026-10-01T10:00', 'Created', M, 'Draft'], ['2026-10-01T12:00', 'Submitted', M, 'Submitted'],
      ['2026-10-04T15:00', 'Approved', P, 'Approved', '']]),
    mk('SOP-0007', 'NEFT/RTGS Returns', 'Payments', 'NEFT/RTGS', SN, '', [
      ['2026-08-11T10:00', 'Created', SN, 'Draft'], ['2026-08-11T12:00', 'Submitted', SN, 'Submitted'],
      ['2026-08-13T11:00', 'Approved', R, 'Approved', '']]),
  ];

  const n = (to, ts, actor, verb, sopName, extra, sop, read, kind) =>
    ({ to, ts: ts + ':00+05:30', actor, verb, sopName, extra, sop, read: !!read, kind });
  const notifs = [
    n(P, '2026-11-18T10:34', A, 'resubmitted', 'Legal Notice Handling', ' (v2) for review', 'SOP-0024', 0, 'in'),
    n(P, '2026-11-17T15:02', A, 'submitted', 'IMPS Reversal Handling', ' for review', 'SOP-0030', 0, 'in'),
    n(P, '2026-11-15T12:00', R, 'approved', 'Credit Card Dispute Handling', ' v3 — now live', 'SOP-0012', 1, 'ok'),
    n(P, '2026-11-12T12:40', R, 'requested changes on', 'EMI Bounce Charges', '', 'SOP-0027', 1, 'mod'),
    n(A, '2026-11-16T15:30', P, 'requested changes on', 'ATM Cash Shortage', '', 'SOP-0009', 0, 'mod'),
    n(A, '2026-11-05T17:05', R, 'rejected', 'NEFT Return Handling', '', 'SOP-0011', 1, 'rej'),
    n(R, '2026-11-18T10:34', A, 'resubmitted', 'Legal Notice Handling', ' (v2) for review', 'SOP-0024', 0, 'in'),
    n(R, '2026-11-14T11:30', P, 'submitted', 'UPI Failed Transaction Refund', ' for review', 'SOP-0018', 0, 'in'),
  ];
  return { sops, notifs, seq: 31 };
}
