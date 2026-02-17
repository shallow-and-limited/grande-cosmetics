# Repo Name

[Link to the Notion space corresponding to this repo](https://notion.so/satelca/02f33d3f04eb47028615c0e7ebba037d?v=f0161da126a841689c0ade26d4b217df&pvs=4)
<!--
This template is meant for a monorepo approach where all the work
for a client is stored here, even if it has multiple components
or multiple projects.
Document all the technical details relevant to this client within
the repo itself.
-->

## 👥 Contributing
- [How to contribute to the codebase](./CONTRIBUTING.md#-how-can-i-contribute-to-the-code-base)
- [How to make a release](./CONTRIBUTING.md#-how-do-i-prepare-a-release)

> **Template note:** When a repository is created from this template, the `Template Cleanup` workflow automatically removes `.github/workflows/storefront-deploy_clean_theme.yml` and the `google-drive/` directory on the first push to `main`. This keeps downstream repositories lightweight while the template retains the Google Drive packaging workflow.

## :telescope: Overview
<!-- Give an overview of the client's main goal
the repo itself. --!>

<!-- If the repo has more than a theme, provide a context diagram:
![Context diagram](./docs/diagrams/context.png)
-->

This repository is a monorepo that will contain all the code base for
the client.

<!-- If the repo has more than a theme, provide a container diagram:
## :house: Architecture

![Container diagram](./docs/diagrams/container.png)
-->

## :jigsaw: Components

<!--
A component can be a theme, a react app, a python app, etc ...
Link to the README.md files in each component's folder.
Example:

### Backend apps

* [Thingy Integration app](thingy-integration-app/README.md)
-->
#### 🗂️ Repository Structure

This repository is organized as a monorepo, containing multiple components and utilities for the project. Below is an overview of the main directories:

- **storefront/**
  - Contains the main storefront codebase, likely for a web or e-commerce frontend.
  - Subfolders:
    - `templates/`, `snippets/`, `sections/`, `locales/`, `layout/`, `config/`, `assets/`: Standard structure for a modern web storefront (e.g., Shopify theme or similar).
  - Key files: `package.json`, `config.yml.example`, `.gitignore`, `.prettierignore`.


- **docs/**
  - Documentation, diagrams, and other project-related docs.
 
- **.github/workflows/**
  - Deployment related files 

- **Top-level files**
  - `README.md`: This file.
  - `CONTRIBUTING.md`: Contribution guidelines.
  - `.gitignore`: Git ignore rules.
  - `set_version.sh`: Shell script for version management.

### Google Drive Packaging (template only)

The template includes a workflow and scripts for packaging the storefront and uploading the archive to Google Drive:
- `.github/workflows/storefront-deploy_clean_theme.yml` – runs nightly in the **template** repository (and on manual dispatch/PRs) to create a `[CLEAN-THEME] YYYY-MM-DD.zip` archive and upload it to Drive.
- `google-drive/` – helper scripts and setup documentation used by the workflow (`upload_to_drive.py`, `generate_oauth_token.py`, `README.md`).

When a new repository is created from this template, the `Template Cleanup` workflow automatically removes the Drive workflow, the `google-drive/` directory, **and itself** on the first push to `main`, so downstream repos stay lightweight.

## :magic_wand: Processes

<!--
Sequence diagrams are stored in /docs/diagrams and rendered
in this section
-->
