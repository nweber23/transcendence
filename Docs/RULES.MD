## Package Management

Use **pnpm** as the package manager for all dependencies.

### Guidelines:
- Use `pnpm install` instead of `npm install` or `yarn install`
- Keep `pnpm-lock.yaml` in version control
- Run `pnpm audit` regularly to check for vulnerabilities

---

## Agent Feature Verification

When implementing a new feature, always dispatch a sub-agent to test and verify the implementation.

### Verification Requirements:
1. Complete the feature implementation
2. Dispatch a sub-agent to review and test the implementation
3. Verify the feature works as expected
4. Confirm no regressions in existing functionality
5. Only consider the task complete after verification passes

---

## Frontend Testing & Verification

Use the Playwright MCP to verify changes that affect the frontend or have indirect contact with it.

### Testing Requirements:
- Run Playwright tests for any component changes
- Verify layout changes don't break other features
- Test responsive design on multiple screen sizes
- Check for visual regressions in related components
- Run tests before submitting for review

---

## Git Branching Strategy

All feature development must follow a structured branching workflow to ensure code quality and stability.

### Branching Rules:
1. **Create issue first**: Create a GitHub issue for each new feature before starting development
2. **Feature branches from issues**: Create a feature branch for each issue (GitHub allows creating branches directly from issues)
3. **Branch naming**: Use descriptive names following the pattern `feature/feature-name` or `fix/bug-name`
4. **Merge to dev first**: Submit a pull request to merge your feature branch into the `dev` branch for testing
5. **Test on dev**: Allow testing and verification on the dev branch before merging to main
6. **Merge to main**: Only merge to main after testing is complete and the PR is approved
7. **No direct commits to main**: Never commit directly to main—all changes must go through feature branches and dev
8. **Auto-delete enabled**: Repository is configured to automatically delete feature branches after merge—no manual cleanup needed

### Workflow:
```
feature/your-feature → dev (test) → main (production)
```

---

## Database Schema & Migrations

**Important**: The database schema is documented in [DB.md](./DB.md). This is the single source of truth.

### Rules for Database Changes:
1. **Before any schema change**: Read [DB.md](./DB.md) to understand the current design
2. **Update DB.md first**: Document your change in [DB.md](./DB.md) before implementing it
3. **Include migration scripts**: All schema changes require SQL migration files in `/migrations/`
4. **Test locally**: Run migrations on a dev database copy and verify rollback capability
5. **Reference DB.md in commits**: Every database-related commit must reference DB.md
6. **Maintain constraints**: Ensure all CHECK constraints, FK relationships, and indexes are documented
7. **Audit trail**: Keep an update log in DB.md with dates and who made changes

### DB.md Update Checklist:
- [ ] New tables added to "Core Tables" section
- [ ] New columns added to affected table definitions
- [ ] Indexes documented in "Indexing Strategy"
- [ ] Constraints explained in "Constraints & Data Integrity"
- [ ] Migration steps included in "Migration Guidelines"
- [ ] ER diagram updated if relationships changed
- [ ] Related documentation references updated
- [ ] Timestamps reflect when change was made