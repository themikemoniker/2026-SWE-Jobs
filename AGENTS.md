# Repository Guidelines

## Project Structure & Module Organization
This repository is a curated set of Markdown lists for 2026 software engineering internships and new grad roles. Primary files:
- `README.md`: entry point with USA internships and links to other lists.
- `NEW_GRAD_USA.md`: USA new grad roles.
- `INTERN_INTL.md`: international internships.
- `NEW_GRAD_INTL.md`: international new grad roles.

Each list is organized into sections (e.g., FAANG+, Quant, Other) and table blocks bounded by markers like `<!-- TABLE_FAANG_START -->` / `<!-- TABLE_FAANG_END -->`. Preserve these markers when editing to avoid breaking automated updates.

## Build, Test, and Development Commands
There is no build system or runtime. Typical workflow is editing Markdown and checking diffs.
- `git status`: review changes before committing.
- `rg "TABLE_" README.md`: verify table markers remain intact.

## Coding Style & Naming Conventions
- Use Markdown with existing headings and emoji conventions.
- Keep tables aligned to the current column order in each file (Company, Position, Location, Salary/Posting, Age).
- Prefer consistent link formatting using `<a href=...><strong>Company</strong></a>` and the existing apply button image.

## Testing Guidelines
No automated tests are configured. Validate by reviewing rendered Markdown on GitHub or a local preview.

## Commit & Pull Request Guidelines
Recent commits follow a short, conventional format such as `chore: update tables`. Use a similar prefix and keep messages concise. For PRs, include:
- A brief summary of what list(s) were updated.
- Any data source notes if the update is not automated.
- Screenshots only if you changed formatting or layout.

## Data Integrity Tips
- Do not reorder or rename sections without a clear reason.
- Avoid editing the HTML comments that delimit table blocks.
- Keep job ages and posting links accurate and up to date.
