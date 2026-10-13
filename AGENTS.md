# Agent Instructions — rjagro

## Database access

1. **Always use the postgres MCP** when trying to access the database.
2. If it fails, run the `rjdb` command — it opens the tunnel and sets the password for the `rjagro` profile. Then retry the MCP.
   - Note: `rjdb` is a fish function; from non-fish shells run `fish -c rjdb`.
3. If nothing works, **stop and notify the user**. Do not proceed forward and do not try alternative approaches.
