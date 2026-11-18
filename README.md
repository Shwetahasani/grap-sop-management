# GRAP SOP Management – UI/UX POC

An interactive proof of concept of the **GRAP SOP Management Dashboard**, where bank employees (Makers and Reviewers) upload, review and publish Standard Operating Procedures.

🔗 **Live demo:** https://shwetahasani.github.io/grap-sop-management/

---

## Tech stack
- **React 18** + **React Router 6**
- **Vite 5** (build tool)
- Plain CSS with Axis Bank–inspired theme, no UI library
- Deployed on **GitHub Pages** using GitHub Actions

## Getting started

```bash
npm install
npm run dev
```
Open **http://localhost:5173**

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build in `dist/` |
| `npm run build:single` | Single self-contained HTML file in `dist-single/` |
| `npm run preview` | Preview the production build |

> **Windows PowerShell:** if you see "running scripts is disabled", use Command Prompt or run `npm.cmd install`.

## Demo accounts (simulated SSO)

| User | Persona | What you can see |
|---|---|---|
| Anu Jha | Maker | Add, edit and submit SOPs; make requested changes |
| Priya Singh | Reviewer | Everything a Maker can do, plus review other users' SOPs |
| Rahul Mehta | Reviewer | Second reviewer |
| Vikram Rao | No role | "Access not assigned" screen |

Switch users anytime from the **avatar menu → Switch demo user**.

## Try the workflow
1. Sign in as **Anu Jha** → **Add SOP** → upload a PDF/Word file → **Save & Submit**
2. Switch to **Priya Singh** → **For My Review** → **Review** → **Request modification**
3. Switch to **Anu Jha** → **Make changes** → replace the file (v1 → v2) → **Save & Resubmit**
4. Switch to **Priya Singh** → **Compare versions** → **Approve & publish**
5. Open **Activity** to see the full history

## Features
- **SSO Sign-in:** persona-based access and an "Access not assigned" state
- **SOP Listing:** My SOPs / For My Review tabs, search, filters, sorting and status-based actions
- **Add / Edit SOP:** Word/PDF upload with preview, validation, Save as draft and Save & Submit
- **Review SOP:** document preview, version comparison, mandatory remarks and confirmations
- **SOP Activity:** complete history with user, time, status changes, remarks and versions

**Status flow:** Draft → Submitted → Requested Modification → Modification In Progress → Resubmitted → Approved / Rejected

## Project structure
```
src/
├── pages/        Login, NoAccess, SopList, SopForm, SopReview
├── components/   Header, ActivityDrawer, DocPreview, Modal, Icon
├── store/        App state (SOPs, users) and UI state
├── data/         Constants and sample data
└── utils/        Formatting, file handling
```

## Note
This is a front-end POC. SSO, backend storage, notifications and knowledge-base publishing are **simulated**. Data is stored in the browser's local storage; use **Reset demo data** from the avatar menu to start fresh.

---
**Author:** Shweta
