# GRAP SOP Management – UI/UX POC (React)

This is the attached HTML mockup rebuilt as a React application. It's for bank Makers and Reviewers and follows the *GRAP Dashboard – SOP Management* functional requirements.

**Stack:** React 18, React Router 6 (hash routing), and Vite 5. There's no UI library: plain CSS uses Axis-style tokens, and the icons are an inline SVG sprite. Apart from React and the router, nothing else is needed at runtime.

## How to run

**Option A – no install.** Open `GRAP_SOP_Management_React.html` (the single-file build) in Chrome or Edge.

**Option B – from source** (Node 18 or later):
```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build -> dist/ (host on any static server)
npm run build:single   # one self-contained file -> dist-single/index.html
```

### Demo accounts (simulated SSO)
| Account | Persona | Shows |
|---|---|---|
| Anu Jha | Maker | My SOPs, Add/Edit, Make changes, Resubmit |
| Priya Singh | Reviewer | My SOPs + For My Review, Approve / Reject / Request modification |
| Rahul Mehta | Reviewer | A second reviewer, so you can review Priya's SOPs |
| Vikram Rao | none | The **Access not assigned** screen |

To switch user, open the avatar menu and choose **Switch demo user**. **Reset demo data** in the same menu restores the sample data. **POC guide** walks you through the full workflow.

### End-to-end scenario (about 3 minutes)
1. **Anu**: Add SOP → upload a PDF/Word file → **Save & Submit**. The status becomes *Submitted*.
2. **Priya**: For My Review → **Review** → **Request modification**, adding a remark. The status becomes *Requested Modification*.
3. **Anu**: **Make changes**. The status becomes *Modification In Progress*. Replace the file (this makes **v2**) → **Save & Resubmit**. The status becomes *Resubmitted*.
4. **Priya**: Review → **Compare versions** → **Approve & publish**. The status becomes *Approved*.
5. Open **Activity** to see the full history with versions.

## Project structure
```
src/
  App.jsx                  routes (hash router) + providers
  data/constants.js        users/personas, categories, statuses
  data/seed.js             sample SOPs covering every status
  store/StoreContext.jsx   data layer: saveSop, startChanges, decide, notifications (one function per future API call)
  store/UIContext.jsx      toasts, confirm dialog, activity drawer, list filters/sort
  pages/Login.jsx          Screen 1 – SSO sign-in
  pages/NoAccess.jsx       Access not assigned
  pages/SopList.jsx        Screen 2 – listing, tabs, search, filters, sort, row actions
  pages/SopForm.jsx        Screen 3 – Add / Edit / New version (validation, upload, preview, unsaved guard)
  pages/SopReview.jsx      Screen 4 – View / Review (preview, compare, remarks, decisions)
  components/ActivityDrawer.jsx  Screen 5 – activity timeline, filter, CSV export
  components/DocPreview.jsx      PDF / DOCX preview + version compare
  components/Header.jsx, AppShell.jsx, Modal.jsx, Icon.jsx, GuidePanel.jsx
  utils/files.js           .docx text extraction (no library), blob handling
  utils/format.js          dates, version rule, duplicate-name check
```

## Routes
`#/login` · `#/no-access` · `#/sops` · `#/sops/new` · `#/sops/:id` · `#/sops/:id/review` · `#/sops/:id/edit` · `#/sops/:id/new-version`

Deep links are protected. Only the creator can edit an SOP, and only while it is *Draft* or *Modification In Progress*. A Reviewer cannot review their own SOP. An unknown ID shows a "not found" message.

## How it covers the requirements
- **Sign-in:** simulated SSO with an account picker. The landing page depends on the persona, there's an **Access not assigned** screen, and the header shows the user's name, persona and Sign out.
- **Listing:** **My SOPs** and **For My Review** (Reviewers only; a user's own SOPs are never listed for them to review). Search by name or ID, and filter by Category, Sub-category, Status and date range. Every FSD column can be sorted. Status badges are shown, and each row offers only the actions its status and persona allow.
- **Add / Edit:** upload .doc, .docx or .pdf (max 10 MB) with a preview, required fields and inline errors. Buttons are Save as draft, Save & Submit (or Save & Resubmit) and Cancel. Reviewer remarks appear at the top, and the version number is set by the system.
- **Review:** document preview, details and the creator's comments. Remarks are mandatory to Reject or Request modification, and every decision asks for confirmation.
- **Activity:** every event, newest first, with date and time, action, name and email, status before → after, remarks, and the file version change.
- **General:** the full status flow, success and error toasts, loading skeleton, empty states, a responsive layout (the table turns into cards on mobile), and accessible markup.

## UX improvements beyond the FSD
- Clickable KPI cards for each persona.
- A "waiting N days" age tag for SOPs awaiting review.
- The latest remark shown inline in the list.
- **Compare versions**, so reviewers only check what changed.
- The previous review round shown on resubmissions.
- A "Journey" status path with the next step.
- Quick-pick remarks and an optional review checklist.
- A duplicate-name warning.
- A "What changed in this version?" prompt.
- **New version** for Approved SOPs (the live version stays published until the new one is approved).
- In-app notifications.
- An unsaved-changes guard, which also covers sign-out, switching user and closing the tab.
- Browser Back/Forward support and shareable URLs.
- CSV export of the activity history.
- Keyboard support, focus-trapped dialogs and a `/` shortcut to search.

## Simulated in this POC
- **SSO:** no identity provider is called. Users and personas come from `data/constants.js`.
- **Backend and storage:** data is held in browser localStorage. The functions in `StoreContext.jsx` are where the API calls would go.
- **Knowledge-base publishing, notifications and access requests** are front-end only.
- **Previews:** .docx previews show the extracted text. Legacy .doc files show a placeholder; in production they would be converted to PDF on upload.
- **Version comparison:** the redline is simulated for the sample SOPs. For uploaded files, a change summary is shown instead.

## Assumptions to confirm
- The 10 MB file-size limit (the FSD says "TBC").
- Category and Sub-category as dependent dropdowns rather than free text.
- Drafts need only a name.
- When the version number goes up (the version rule): replacing the file during a modification, or using "New version" on an Approved SOP, creates the next version.
